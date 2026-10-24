"""Staging-only adapter tests. Native scripts are imported; no native workload runs."""
import importlib.util
import json
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest import mock

REPO = next(parent for parent in Path(__file__).resolve().parents if (parent / "scripts/acg/research_workflow.py").is_file())
SCRIPT = REPO / "scripts/acg/research_workflow.py"
spec = importlib.util.spec_from_file_location("research_adapter", SCRIPT)
workflow = importlib.util.module_from_spec(spec)
spec.loader.exec_module(workflow)
NATIVE = Path('/home/duhaochen/AutoCellGen_TY')
RESOURCES = {'scriptSha256':{'native.py':'abc'},'executableSha256':'def'}


class WorkflowTests(unittest.TestCase):
    def request(self, operation='algorithm-matrix', engine='mr', **params):
        return {'schemaVersion':workflow.REQUEST_VERSION, 'operation':operation, 'engine':engine, 'parameters':params}

    def test_explicit_controls_and_invalid_combinations(self):
        params=workflow.validate_request(self.request(rowCounts=[1,4],trials=2,threads=4,algorithms=['dp'],cells=['inv_x1']))
        self.assertEqual(params['rowCounts'],[1,4]); self.assertEqual(params['trials'],2)
        cases=[self.request(engine='dr'),self.request(engine='cmos',rowCounts=[2]),self.request(cells=['unknown']),
               self.request(cells=['inv_x1']*2),self.request(threads=0),self.request(arbitraryScript='x'),
               self.request('known-feasible','cmos',cells=['inv_x1']),
               self.request('known-feasible',cells=['inv_x1'],numRows=1,tracks=[5]),
               self.request('known-feasible',cells=['inv_x1'],numRows=2,tracks=[12,9]),
               self.request('known-feasible',cells=['inv_x1'],extraCpp=[17])]
        for value in cases:
            with self.subTest(value=value), self.assertRaises(ValueError): workflow.validate_request(value)

    def test_readme_canonical_225_runs_and_service_limit(self):
        request=self.request(cells=list(workflow.CELLS),algorithms=['dp','sa','greedy_min','hc_fi','sa_exp'],rowCounts=[1,2,3],trials=1)
        p=workflow.validate_request(request)
        self.assertEqual(len(p['cells'])*len(p['algorithms'])*len(p['rowCounts'])*p['trials'],225)
        request['parameters'].update(rowCounts=[1,2,3,4],trials=10)
        with self.assertRaises(ValueError):workflow.validate_request(request)

    def test_metrics_do_not_promote_timeout_or_nonzero_to_valid_layout(self):
        raw={'inv_x1':{'dp':{'success':True,'trials':[
            {'success':True,'timeout':True,'return_code':124,'min_cpp':3},
            {'success':True,'timeout':False,'return_code':7,'cost':2},
            {'success':True,'timeout':False,'return_code':0,'min_cpp':4}]}}}
        rows=workflow.normalize_matrix(raw)
        self.assertEqual([x['processCompleted'] for x in rows],[False,False,True])
        self.assertTrue(all(x['metricsCollected'] for x in rows))
        self.assertTrue(all(x['layoutValidity']=='NOT_EVALUATED' for x in rows))
        self.assertIsNone(workflow.normalize_matrix({'inv_x1':{'dp':{'success':True,'min_cpp':3}}})[0]['processCompleted'])

    def test_requested_and_native_reported_algorithm_alias_are_distinct(self):
        rows=workflow.normalize_matrix({'inv_x1':{'sa_r2':{'success':True,'trials':[{'success':True,'algo_line':'sa_exp','min_cpp':3,'return_code':0}]}}},'mr')
        self.assertEqual(rows[0]['requestedAlgorithm'],'sa')
        self.assertEqual(rows[0]['reportedAlgorithm'],'sa_exp')
        self.assertEqual(rows[0]['rowCount'],2)
        historical=workflow.normalize_matrix({'inv_x1':{'dp':{'success':True,'min_cpp':3}}},'cmos')
        self.assertIsNone(historical[0]['reportedAlgorithm'])
        self.assertEqual(historical[0]['rowCount'],1)

    def test_job_inputs_reject_paths_and_symlinks(self):
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder);(root/'input').write_text('x');(root/'link').symlink_to(root/'input')
            self.assertEqual(workflow.confined(root,'input'),root/'input')
            for path in ['/etc/passwd','../outside','link','a\\b']:
                with self.subTest(path=path), self.assertRaises(ValueError):workflow.confined(root,path)

    def test_native_sources_are_byte_identical_and_globals_scoped(self):
        for engine,project in [('mr','autocellgen-MR'),('cmos','autocellgen-cmos')]:
            with tempfile.TemporaryDirectory() as folder:
                workspace=Path(folder)/'project';native=NATIVE/'proj'/project
                # Test binary is data, never invoked.
                binary=Path(folder)/'stub';binary.write_bytes(b'stub')
                hashes=workflow.stage_resources(native,binary,workspace,'algorithm-matrix')
                for name in ['benchmark_runner.py','benchmark_report.py']:
                    self.assertEqual((workspace/'scripts'/name).read_bytes(),(native/'scripts'/name).read_bytes())
                    self.assertEqual(hashes[name],workflow.digest(native/'scripts'/name))
                module=workflow.load_module(workspace/'scripts/benchmark_runner.py','native_test_'+engine)
                self.assertEqual(module.timeout_for(2),120);self.assertEqual(module.timeout_for(62),600)
                self.assertFalse((workspace/'scripts/__pycache__').exists())

    def test_observer_retains_timeout_exception_and_exact_bytes(self):
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder);out=root/'attempt'
            observer=workflow.ObservedSubprocess(root)
            command=['stub','--output',str(out)]
            error=subprocess.TimeoutExpired(command,120,output=b'ALGO_RESULT\xff',stderr=b'err')
            with mock.patch.object(workflow.subprocess,'run',side_effect=error) as run:
                with self.assertRaises(subprocess.TimeoutExpired) as caught:observer.run(command,capture_output=True,text=True,timeout=120,cwd=str(root))
            self.assertIs(caught.exception,error)
            self.assertEqual((out/'autocell.stdout.log').read_bytes(),b'ALGO_RESULT\xff')
            self.assertEqual(run.call_args.kwargs['timeout'],120)

    def corpus_snapshot(self, root):
        p=workflow.validate_request(self.request('known-feasible',cells=['inv_x1'],maxAttempts=2,totalTimeoutSeconds=100,attemptTimeoutSeconds=10))
        previous=self.request('known-feasible',**p)
        workflow.write_json(root/'source-request.json',previous)
        workflow.write_json(root/'lineage.json',{'inputSha256':{'rules':'a','configBase':'b','netlist:inv_x1':'c'}})
        workflow.write_json(root/'summary.json',RESOURCES)
        native=root/'native/inv_x1';attempt=native/'attempts/001';attempt.mkdir(parents=True)
        (attempt/'placement.json').write_text('{"placement_hash":"unchanged"}')
        workflow.write_json(native/'manifest.json',{'status':'CAPPED_UNRESOLVED','manifest_path':str(native/'manifest.json'),
            'constraints':{'config_base':str(root/'_workspace/project/config/gf180/config.json'),'rules':str(root/'_workspace/project/config/gf180/rules_gf180.json')},
            'attempts':[{'ordinal':1,'wall_time_sec':5.25,'placement':str(attempt/'placement.json'),'source_diagnostic':None,'command':[str(root/'_workspace/project/build/bin/autocell')]}]})
        workflow.write_json(root/'snapshot-files.json',workflow.snapshot_inventory(root))
        return p

    def test_continuation_keeps_original_bytes_and_consumed_budget(self):
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder);source=root/'previous';source.mkdir();output=root/'next';output.mkdir()
            p=self.corpus_snapshot(source);p['maxAttempts']=4
            raw=(source/'native/inv_x1/manifest.json').read_bytes()
            lineage=workflow.continuation(source,output,p,{'rules':'a','configBase':'b','netlist:inv_x1':'c'},RESOURCES)
            self.assertEqual((output/'original-snapshot/native/inv_x1/manifest.json').read_bytes(),raw)
            relocated=workflow.read_json(output/'native/inv_x1/manifest.json')
            self.assertEqual(relocated['attempts'][0]['wall_time_sec'],5.25)
            self.assertEqual(relocated['attempts'][0]['placement'],str(output/'native/inv_x1/attempts/001/placement.json'))
            self.assertEqual(lineage['sourceOutputRoot'],str(source))
            self.assertEqual((output/'native/inv_x1/attempts/001/placement.json').read_bytes(),(source/'native/inv_x1/attempts/001/placement.json').read_bytes())
            self.assertEqual(relocated['attempts'][0]['command'],[str(source/'_workspace/project/build/bin/autocell')])
            self.assertEqual(relocated['constraints']['config_base'],str(output/'inputs/config.json'))

    def test_continuation_rejects_tamper_policy_reduction_and_external_path(self):
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder);source=root/'previous';source.mkdir();p=self.corpus_snapshot(source)
            with self.assertRaises(ValueError):workflow.continuation(source,root/'o1',{**p,'maxAttempts':1},{'rules':'a','configBase':'b','netlist:inv_x1':'c'},RESOURCES)
            with self.assertRaises(ValueError):workflow.continuation(source,root/'o2',p,{'rules':'different'},RESOURCES)
            (source/'native/inv_x1/attempts/001/placement.json').write_text('tampered')
            with self.assertRaises(ValueError):workflow.validate_snapshot(source)
            with self.assertRaises(ValueError):workflow.relocate_json({'source_placement':'/etc/passwd'},source,root/'o3')

    def test_continuation_rejects_changed_native_scripts_or_executable(self):
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder);source=root/'previous';source.mkdir();p=self.corpus_snapshot(source)
            inputs={'rules':'a','configBase':'b','netlist:inv_x1':'c'}
            for resources in [{**RESOURCES,'executableSha256':'changed'}, {**RESOURCES,'scriptSha256':{'native.py':'changed'}}]:
                with self.subTest(resources=resources),self.assertRaises(ValueError):
                    workflow.continuation(source,root/'next',p,inputs,resources)
            self.assertFalse((root/'next/original-snapshot').exists())

    def test_legacy_snapshot_runtime_resources_omitted_inputs_and_argv_retained(self):
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder);source=root/'previous';source.mkdir();p=self.corpus_snapshot(source)
            for name in ['build/bin/autocell','bin/ascii2gdsii.jar','scripts/build_known_feasible_corpus.py','config/gf180/config.json']:
                f=source/'_workspace/project'/name;f.parent.mkdir(parents=True,exist_ok=True);f.write_bytes(('resource:'+name).encode())
            nested=source/'original-snapshot/_workspace/project/build/bin/autocell';nested.parent.mkdir(parents=True);nested.write_bytes(b'older binary')
            workflow.write_json(source/'snapshot-files.json',workflow.snapshot_inventory(source))
            output=root/'next';output.mkdir()
            lineage=workflow.continuation(source,output,p,{'rules':'a','configBase':'b','netlist:inv_x1':'c'},RESOURCES)
            self.assertEqual(len(lineage['omittedRuntimeResourceSha256']),4)
            self.assertTrue((output/'original-snapshot/_workspace/project/config/gf180/config.json').is_file())
            self.assertFalse(any(f.name=='autocell' for f in output.rglob('*')))
            raw=workflow.read_json(output/'original-snapshot/native/inv_x1/manifest.json')
            derived=workflow.read_json(output/'native/inv_x1/manifest.json')
            self.assertEqual(raw['attempts'][0]['command'],derived['attempts'][0]['command'])

    def test_report_only_uses_unchanged_native_report_no_child_execution(self):
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder);(root/'work').mkdir();binary=root/'stub';binary.write_bytes(b'stub')
            aggregate={'inv_x1':{'transistors':2,'dp':{'success':True,'trials':[{'success':True,'min_cpp':3,'return_code':124,'timeout':True}]}}}
            workflow.write_json(root/'work/aggregate.json',aggregate)
            request=self.request('algorithm-report',maxCols=8)
            request.update(trustedResources={'nativeRoot':str(NATIVE),'executable':None,'executableSha256':None},inputs={'aggregate':'work/aggregate.json'})
            workflow.write_json(root/'work/request.json',request)
            with mock.patch.object(workflow.subprocess,'run',side_effect=AssertionError('no process allowed')):
                result=workflow.run(root/'work/request.json',root/'output/report',root)
            self.assertEqual(result['status'],'partial');self.assertEqual(result['nativeReturnCode'],0)
            self.assertEqual((root/'output/report/aggregate.json').read_bytes(),(root/'work/aggregate.json').read_bytes())
            self.assertTrue((root/'output/report/REPORT.md').is_file())
            workflow.validate_snapshot(root/'output/report')

    def setup_job(self, root, operation, **params):
        (root/'work').mkdir(); binary=root/'stub'; binary.write_bytes(b'stub')
        workflow.write_json(root/'work/config.json',{'tech':'gf180','num_rows':1,'track_num':9,'placement_algorithm':'dp'})
        workflow.write_json(root/'work/rules.json',{'trusted':'rule'})
        (root/'work/inv_x1.sp').write_text('.subckt inv_x1 A Y VDD VSS\n.ends\n')
        request=self.request(operation,**params)
        request.update(trustedResources={'nativeRoot':str(NATIVE),'executable':str(binary),'executableSha256':workflow.digest(binary)},
            inputs={'netlists':{'inv_x1':'work/inv_x1.sp'},'rules':'work/rules.json'})
        return request

    def test_native_matrix_trials_threads_rows_nonzero_and_raw_logs(self):
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder)
            request=self.setup_job(root,'algorithm-matrix',cells=['inv_x1'],algorithms=['dp'],rowCounts=[1,2],trials=2,threads=2)
            request['inputs']['configs']={'dp':'work/config.json'}
            workflow.write_json(root/'work/request.json',request)
            def child(command,**kwargs):
                self.assertEqual(kwargs['timeout'],120)
                config=workflow.read_json(Path(command[command.index('--config')+1]))
                self.assertIn(config['num_rows'],[1,2])
                self.assertTrue(Path(command[0]).is_relative_to(root/'work/native'))
                self.assertTrue(Path(kwargs['cwd']).is_relative_to(root/'work/native'))
                return subprocess.CompletedProcess(command,7,'ALGO_RESULT: algo=dp width=1 cpp=3 cost=2.0 hpwl=1.0 candidates=1 cross_rows=0\n','native error')
            with mock.patch.object(workflow.subprocess,'run',side_effect=child) as mocked:
                result=workflow.run(root/'work/request.json',root/'output/matrix',root)
            self.assertEqual(mocked.call_count,4)
            self.assertFalse((root/'output/matrix/_workspace').exists())
            self.assertTrue((root/'output/matrix/inputs/configs/dp.json').is_file())
            self.assertFalse(any(f.name=='autocell' for f in (root/'output/matrix').rglob('*')))
            self.assertEqual(len(result['metrics']),4)
            self.assertTrue(all(t['nativeSuccess'] and not t['processCompleted'] for t in result['metrics']))
            self.assertEqual(result['nativeReturnCode'],0)
            self.assertEqual(result['status'],'partial')
            self.assertEqual(len(list((root/'output/matrix/native').rglob('child-process.json'))),4)
            workflow.validate_snapshot(root/'output/matrix')

    def test_native_corpus_capped_resume_preserves_attempts_and_raw_manifest(self):
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder)
            request=self.setup_job(root,'known-feasible',cells=['inv_x1'],tracks=[9],extraCpp=[0],maxAttempts=1,totalTimeoutSeconds=10,attemptTimeoutSeconds=1)
            request['inputs']['configBase']='work/config.json'
            workflow.write_json(root/'work/request.json',request)
            def child(command,**kwargs):return subprocess.CompletedProcess(command,2,'no placement','native failure')
            with mock.patch.object(workflow.subprocess,'run',side_effect=child) as mocked:
                first=workflow.run(root/'work/request.json',root/'output/first',root)
            self.assertEqual(mocked.call_count,1)
            self.assertEqual(first['cells'][0]['status'],'CAPPED_UNRESOLVED')
            self.assertEqual(first['cells'][0]['attemptCount'],1)
            self.assertEqual(first['cells'][0]['lvs1'],'NOT_RUN')
            original=(root/'output/first/native/inv_x1/manifest.json').read_bytes()
            request['inputs']['resume']='output/first';request['parameters']['maxAttempts']=2
            workflow.write_json(root/'work/request.json',request)
            with mock.patch.object(workflow.subprocess,'run',side_effect=child) as mocked:
                second=workflow.run(root/'work/request.json',root/'output/second',root)
            self.assertEqual(mocked.call_count,1)
            self.assertEqual(second['cells'][0]['attemptCount'],2)
            self.assertEqual((root/'output/second/original-snapshot/native/inv_x1/manifest.json').read_bytes(),original)
            manifest=workflow.read_json(root/'output/second/native/inv_x1/manifest.json')
            self.assertTrue(all(Path(a['placement']).is_relative_to(root/'output/second') for a in manifest['attempts']))
            workflow.validate_snapshot(root/'output/second')

    def test_selftest(self):
        result=workflow.self_test();self.assertEqual(result['status'],'passed');self.assertEqual(result['wrapperSha256'],workflow.digest(SCRIPT))


if __name__=='__main__':unittest.main()
