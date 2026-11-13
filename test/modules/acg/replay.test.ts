import { execFileSync } from "node:child_process";
import path from "node:path";
import { describe, expect, it } from "vitest";
const wrapper = path.resolve("scripts/acg/prepare_replay.py");
const fixture = path.resolve("test/fixtures/acg/raw-uneven-placement.json");
function runPython(body: string) {
  const script = `import sys, importlib.util, json, pathlib, tempfile, hashlib, copy\nsys.dont_write_bytecode=True\nspec=importlib.util.spec_from_file_location('replay',sys.argv[1])\nm=importlib.util.module_from_spec(spec)\nspec.loader.exec_module(m)\nsource=pathlib.Path(sys.argv[2])\n${body}`;
  return JSON.parse(execFileSync("python3", ["-c",script,wrapper,fixture], {encoding:"utf8"}));
}
describe("MR replay preparation", () => {
  it("self-tests alignment and byte-copy without native generation", () => {
    expect(JSON.parse(execFileSync("python3",[wrapper,"--self-test"],{encoding:"utf8"}))).toMatchObject({status:"passed",checks:["original_hash","right_dummy_padding","derived_hash","byte_copy"]});
  });
  it("matches native hashes on real unequal-row export and preserves every original device position", () => {
    const result = runPython(`
raw=source.read_bytes(); original=json.loads(raw)
with tempfile.TemporaryDirectory() as folder:
 root=pathlib.Path(folder); out=root/'work/prepared-placement.json'; artifacts=root/'output/replay'
 metadata=m.prepare(source,out,artifacts)
 derived=json.loads(out.read_bytes())
 for old,row in zip(original['grid']['rows'],derived['grid']['rows']):
  for kind in ('nmos','pmos'):
   assert row[kind][:old['width']] == old[kind]
   assert all(t==m.DUMMY for t in row[kind][old['width']:])
 for key in original:
  if key not in ('grid','placement_hash','parent_placement_hash'):
   assert original[key]==derived[key]
 assert source.read_bytes()==raw
 assert (artifacts/'source-placement.json').read_bytes()==raw
 assert out.read_bytes()==(artifacts/'prepared-placement.json').read_bytes()
 assert metadata==json.loads((artifacts/'preparation.json').read_bytes())
 assert metadata['derivedSha256']==hashlib.sha256(out.read_bytes()).hexdigest()
 print(json.dumps(metadata))
`);
    expect(result).toMatchObject({ changed:true, sourceRowWidths:[3,1,1], derivedRowWidths:[3,3,3], paddingColumnsPerRow:[0,2,2], sourcePlacementHash:"b02de05bff0d3be6", derivedPlacementHash:"d3434443ad7f2d3a", parentPlacementHash:"b02de05bff0d3be6", sourceSha256:"321e8099920fc794a9308311d4366110e6b79aae22fabcaa9cd5e973633c1f88", cellFingerprint:"e0778632b9a5eee6" });
  });
  it("copies an already aligned input byte for byte without changing lineage or formatting", () => {
    const result=runPython(`
with tempfile.TemporaryDirectory() as folder:
 root=pathlib.Path(folder); aligned=root/'aligned.json'; m.prepare(source,aligned,root/'first')
 raw=aligned.read_bytes(); metadata=m.prepare(aligned,root/'again.json',root/'second')
 assert (root/'again.json').read_bytes()==raw
 assert metadata['sourceSha256']==metadata['derivedSha256']
 assert metadata['sourcePlacementHash']==metadata['derivedPlacementHash']
 print(json.dumps(metadata))
`);
    expect(result).toMatchObject({changed:false,operation:"byte_copy",paddingColumnsPerRow:[0,0,0],parentPlacementHash:"b02de05bff0d3be6"});
  });
  it("rejects corruption, malformed rows and count mismatches before writing outputs", () => {
    const failures=runPython(`
original=json.loads(source.read_bytes()); cases=[]
for mutate in (
 lambda d: d.update(schema_version=2),
 lambda d: d.update(placement_hash='0000000000000000'),
 lambda d: d.update(num_rows=2),
 lambda d: d.update(cell_width_cpp=99),
 lambda d: d['grid']['rows'][1].update(width=4),
 lambda d: d['grid']['rows'][0]['nmos'].pop(),
 lambda d: d['grid']['rows'][0]['nmos'][0].update(width=float('nan')),
 lambda d: d['grid']['rows'][0]['nmos'][0].update(vt='unknown'),
):
 d=copy.deepcopy(original);mutate(d);cases.append(d)
failures=[]
with tempfile.TemporaryDirectory() as folder:
 root=pathlib.Path(folder)
 for index,d in enumerate(cases):
  input_path=root/f'{index}.json';input_path.write_text(json.dumps(d))
  output=root/f'{index}-prepared.json';artifact=root/f'output-{index}'
  try:m.prepare(input_path,output,artifact)
  except ValueError as error:failures.append(str(error))
  else:raise AssertionError('malformed replay accepted')
  assert not output.exists() and not artifact.exists()
 duplicate=root/'duplicate.json';duplicate.write_text('{"schema_version":1,"schema_version":1}')
 try:m.prepare(duplicate,root/'duplicate-out.json',root/'duplicate-output')
 except ValueError as error:failures.append(str(error))
 else:raise AssertionError('duplicate key accepted')
 print(json.dumps(failures))
`);
    expect(failures).toHaveLength(9);
    expect(failures).toContain("placement content hash mismatch (native README canonical JSON required)");
    expect(failures).toContain("duplicate JSON key: schema_version");
  });
});
