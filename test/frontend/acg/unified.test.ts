import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { ArtifactRecordV1, ResultRecordV1 } from "../../../shared/contracts/v1";
import { unifiedDefaults, unifiedParameters, resultForFinishedJob } from "../../../src/pages/acg/unifiedHelpers";
import { AcgUnifiedSettings } from "../../../src/pages/acg/AcgUnifiedSettings";
import { AcgUnifiedResults } from "../../../src/pages/acg/AcgUnifiedResults";
import { filterAcgResults, AcgResultSelector } from "../../../src/pages/acg/AcgResultSelector";
import { retainAcgResults } from "../../../src/pages/acg/comparison";
import { acgCoreDefaults } from "../../../src/pages/acg/helpers";

const allowed = ["auto","dp","sa","sa_exp","ga"];
describe("One ACG workflow request", () => {
  it("uses bounded light defaults while preserving ordinary inherited configuration", () => {
    expect(unifiedParameters("mr",unifiedDefaults("mr"),allowed)).toEqual({ algorithms:["dp","sa"],trials:1,threads:1,maxCols:8,searchMaxAttempts:6,searchTotalBudgetSeconds:180,searchPerAttemptSeconds:30,searchTrackNums:[9,12,16],searchExtraCpp:[0,2,4] });
    expect(acgCoreDefaults([{toolId:"acg-mr",parameters:[{id:"trackNum",required:false,defaultValue:9}]}] as never,"mr").trackNum).toBe("");
  });
  it("accepts advanced native algorithm variants and normalizes search order without losing explicit zero", () => {
    const fields={...unifiedDefaults("mr"),algorithms:"sa_exp, ga",searchTrackNums:"16,5,9",searchExtraCpp:"4,0,2"};
    expect(unifiedParameters("mr",fields,allowed)).toMatchObject({algorithms:["sa_exp","ga"],searchTrackNums:[5,9,16],searchExtraCpp:[0,2,4]});
  });
  it("refuses unsupported algorithms, duplicate dimensions and invalid budgets before upload", () => {
    for(const fields of [{algorithms:"dp,dp"},{algorithms:"unknown"},{searchTrackNums:"9,9"},{searchTrackNums:"4"},{searchExtraCpp:"17"},{searchMaxAttempts:""},{searchTotalBudgetSeconds:"Infinity"},{trials:"1.5"},{threads:"5"}]) expect(()=>unifiedParameters("mr",{...unifiedDefaults("mr"),...fields},allowed)).toThrow();
  });
  it("honors the frozen native concurrency rather than merely the public upper limit", () => {
    expect(() => unifiedParameters("mr",{...unifiedDefaults("mr"),threads:"2"},allowed,1)).toThrow(/from 1 to 1/);
  });
  it("renders native algorithm choices as genuine independently checked checkboxes", () => {
    const html=renderToStaticMarkup(createElement(AcgUnifiedSettings,{engine:"mr",fields:unifiedDefaults("mr"),algorithms:allowed,onChange(){}}));
    expect(html.match(/type="checkbox"/g)).toHaveLength(allowed.length);
    expect(html.match(/checked=""/g)).toHaveLength(2);
    expect(html).not.toContain("<select");
    expect(html).toContain('role="group"');
  });
  it("sends no invented DR comparison algorithm and communicates unsupported native stages", () => {
    expect(unifiedParameters("dr",unifiedDefaults("dr"),["auto"]).algorithms).toEqual([]);
    const html=renderToStaticMarkup(createElement(AcgUnifiedSettings,{engine:"dr",fields:unifiedDefaults("dr"),algorithms:["auto"],onChange(){}}));
    expect(html).toContain("DR algorithm comparison and known-feasible search are unsupported");
    expect(html).not.toContain("Comparison algorithms");
    expect(html).toContain("Search total workflow budget");
  });
  it("prefers the job's retained result ID and falls back only to the exact job lineage", () => {
    const rows=[{id:"first",provenance:{jobId:"job"}},{id:"retained",provenance:{jobId:"other"}}] as ResultRecordV1[];
    expect(resultForFinishedJob(rows,{id:"job",resultId:"retained"})?.id).toBe("retained");
    expect(resultForFinishedJob(rows,{id:"job",resultId:null})?.id).toBe("first");
    expect(resultForFinishedJob(rows,{id:"missing",resultId:null})).toBeUndefined();
  });
});
describe("Unified workflow evidence",()=>{
  it("retains failed, partial and unsupported outcomes independently of job completion",()=>{
    const html=renderToStaticMarkup(createElement(AcgUnifiedResults,{value:{schemaVersion:"acg.unified.v1",stages:[{id:"generation",label:"Generate",status:"failed",exitCode:1,reason:"native rejected"},{id:"comparison",label:"Compare",status:"partial",reason:"timeout metrics retained"},{id:"search",label:"Search",status:"unsupported",reason:"DR cannot search"},{id:"report",label:"Report",status:"completed"}]},artifacts:[]}));
    for(const text of ["native rejected","timeout metrics retained","DR cannot search","failed","partial","unsupported"])expect(html).toContain(text);
    expect(html).not.toContain("is-passed");
  });
  it("binds same-name reports and witnesses to their exact stage directories",()=>{
    const artifacts=[{id:"comparison-md",relativePath:"results/acg/r/output/unified/comparison/REPORT.md"},{id:"search-md",relativePath:"results/acg/r/output/unified/search/REPORT.md"},{id:"report-md",relativePath:"results/acg/r/output/unified/report/REPORT.md"},{id:"report-json",relativePath:"results/acg/r/output/unified/report/REPORT.json"},{id:"witness",relativePath:"results/acg/r/output/unified/search/native/witness.gds"}] as ArtifactRecordV1[];
    const html=renderToStaticMarkup(createElement(AcgUnifiedResults,{value:{schemaVersion:"acg.unified.v1",stages:[],comparison:{rawReportPaths:["REPORT.md"]},search:{rawReportPaths:["REPORT.md"],cells:[{cellName:"custom",witnessPath:"native/witness.gds"}]},report:{rawReportPaths:["REPORT.md","REPORT.json"]}},artifacts}));
    expect(html).toContain('href="/api/artifacts/report-md/download">Download workflow report');
    for(const id of ["comparison-md","search-md","report-json","witness"])expect(html).toContain(`/api/artifacts/${id}/download`);
    expect(html).not.toContain("download unavailable");
  });
  it("keeps extensive stage artifacts collapsed and distinguishes trial execution",()=>{
    const html=renderToStaticMarkup(createElement(AcgUnifiedResults,{value:{stages:[{id:"comparison",status:"partial",evidencePaths:["output/summary.json",...Array.from({length:100},(_,i)=>`output/trial-${i}.log`)]}]},artifacts:[]}));
    expect(html).toContain("See trials");expect(html).toContain("100 additional artifacts</summary>");expect(html).toContain("<details>");expect(html).not.toContain("Not recorded");
  });
  it("binds comparison reports and capped search witnesses through retained artifact paths",()=>{
    const artifacts=[{id:"report",relativePath:"results/acg/result/output/workflow/report.md"}] as ArtifactRecordV1[];
    const html=renderToStaticMarkup(createElement(AcgUnifiedResults,{value:{schemaVersion:"acg.unified.v1",engine:"mr",stages:[],comparison:{metrics:[{cell:"custom_cell",nativeSuccess:true,timedOut:true,reportedAlgorithm:"sa_exp",minCpp:7,cost:123.5,hpwl:88.25,crossRows:2,placementMs:45,wallSeconds:1.75,rawTrial:{stdout:"native metrics"}}]},search:{cells:[{cellName:"custom_cell",status:"CAPPED_UNRESOLVED",attemptCount:6,validationLevel:"NOT_CHECKED",lvs1:"NOT_RUN",foundrySignoff:"NOT_RUN"}]},report:{rawReportPaths:["output/workflow/report.md"]}},artifacts}));
    for (const metric of ["min Cpp","123.5","88.25","cross Rows","placement Ms","1.75"]) expect(html).toContain(metric);
    expect(html).toContain("Download workflow report");
    expect(html).toContain("Native comparison metrics and trial outcomes"); expect(html).not.toContain("native metrics");
    expect(html).toContain("LVS0");
    expect(html).toContain("custom_cell");expect(html).toContain("sa_exp");expect(html).toContain("CAPPED_UNRESOLVED");expect(html).toContain("NOT_RUN");expect(html).toContain("/api/artifacts/report/download");
  });
});

describe("Multiple ACG result selection",()=>{
  const rows=[{id:"mr-id",title:"MR cell",createdAt:"2026-10-09T00:00:00Z",data:{acg:{cells:[]}},provenance:{parameters:{engine:"mr"}}},{id:"cmos-id",title:"CMOS cell",createdAt:"2026-10-09T00:00:00Z",data:{acg:{cells:[]}},provenance:{parameters:{engine:"cmos"}}}] as unknown as ResultRecordV1[];
  it("starts empty and retains only the currently available selected results",()=>{
    const html=renderToStaticMarkup(createElement(AcgResultSelector,{results:rows,selectedIds:[],onToggle(){},onClear(){}}));
    expect(html).toContain("Select results…");expect(html).not.toContain('name="acg-result"');
    expect(retainAcgResults([],rows)).toEqual([]);
    expect(retainAcgResults(["mr-id"],rows)).toEqual(["mr-id"]);
    expect(retainAcgResults(["mr-id","cmos-id"],rows)).toEqual(["mr-id","cmos-id"]);
    expect(retainAcgResults(["mr-id","cmos-id"],[rows[1]])).toEqual(["cmos-id"]);
    expect(retainAcgResults(["mr-id"],[])).toEqual([]);
  });
  it("filters by engine, full label and exact result ID without clearing the selected result",()=>{
    const selectedId="cmos-id";
    expect(filterAcgResults(rows,"",["mr"]).map(row=>row.id)).toEqual(["mr-id"]);
    expect(filterAcgResults(rows,"CMOS-ID",["mr","cmos"]).map(row=>row.id)).toEqual(["cmos-id"]);
    expect(filterAcgResults(rows,"missing",["mr","cmos"])).toEqual([]);
    expect(filterAcgResults(rows,"Multi Row",["mr","cmos"]).map(row=>row.id)).toEqual(["mr-id"]);
    expect(filterAcgResults(rows,"Double Row",["mr","cmos"])).toEqual([]);
    expect(selectedId).toBe("cmos-id");
    const html=renderToStaticMarkup(createElement(AcgResultSelector,{results:rows,selectedIds:[selectedId],onToggle(){},onClear(){}}));expect(html).toContain("1 result selected");expect(html).toContain(">Clear</button>");
  });
});
