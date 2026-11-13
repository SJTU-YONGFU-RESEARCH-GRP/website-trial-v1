import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { ArtifactRecordV1, ResultRecordV1 } from "../../../shared/contracts/v1";
import { generatedCellGroups, resultResearchSections } from "../../../src/pages/acg/fullComparison";
import { AcgFullResultsComparison, ResultColumns } from "../../../src/pages/acg/AcgFullResultsComparison";
import { CellResult } from "../../../src/pages/acg/AcgCellResult";
const result = (id: string, cells: unknown[] = [], extra = {}): ResultRecordV1 => ({ id, title: id, createdAt: "2026-10-17", lifecycle: "complete", summary: {}, data: { acg: { cells, technology: "gf180" }, ...extra }, provenance: { parserId: "parser", parserVersion: "1", parameters: { engine: "mr" }, jobId: null } } as unknown as ResultRecordV1);
const render = (results: ResultRecordV1[]) => renderToStaticMarkup(createElement(AcgFullResultsComparison, { results, revision: 0, refresh: 0, canInspectJob: () => false, focusResultId: null, onFocused() {} }));
describe("Full Results comparison contract", () => {
  it("unions exact cell identities across every result and preserves selection/cell order", () => {
    const a = result("a", [{ cellName: "INV" }, { cellName: "NAND" }]), b = result("b", [{ cellName: "NAND" }, { cellName: "inv" }, { cellName: "XOR" }]);
    const groups = generatedCellGroups([b, a]);
    expect(groups.map(group => group.name)).toEqual(["NAND", "inv", "XOR", "INV"]);
    expect(Object.keys(groups[0].cells)).toEqual(["b", "a"]);
    expect(groups[2].cells.a).toBeUndefined();
    expect(generatedCellGroups([a]).map(group => group.name)).toEqual(["INV", "NAND"]);
    expect(generatedCellGroups([])).toEqual([]);
  });
  it("isolates unnamed records by result and position and never silently picks duplicate names", () => {
    const groups = generatedCellGroups([result("a", [{}, { cellName: "INV", status: "first" }, { cellName: "INV", status: "second" }]), result("b", [{}])]);
    expect(groups).toHaveLength(3);
    expect(groups[1].cells.a).toEqual([{ cellName: "INV", status: "first" }, { cellName: "INV", status: "second" }]);
    expect(Object.keys(groups[0].cells)).toEqual(["a"]); expect(Object.keys(groups[2].cells)).toEqual(["b"]);
  });
  it("represents every selected result in every section with explicit absent cells and no detail picker", () => {
    const html = render([result("selected-b", [{ cellName: "INV" }]), result("selected-a", [{ cellName: "NAND" }]), result("legacy", [], { acgResearch: { operation: "algorithm-matrix", metrics: [] } })]);
    const sections = html.split('data-comparison-section="').slice(1);
    expect(sections).toHaveLength(7); // overview, stages, trials, search, two cells, artifacts
    for (const section of sections) {
      expect(section.indexOf('data-result-id="selected-b"')).toBeLessThan(section.indexOf('data-result-id="selected-a"'));
      expect(section.indexOf('data-result-id="selected-a"')).toBeLessThan(section.indexOf('data-result-id="legacy"'));
    }
    expect(html.match(/class="chart-card acg-cell-result"/g)).toHaveLength(2);
    expect(html.match(/No generated cell detail or preview/g)).toHaveLength(4);
    for (const text of ["No unified stage evidence", "No algorithm comparison or trial", "No feasible-search", "No comparison report", "Result provenance", "Complete retained result payload"]) expect(html).toContain(text);
    expect(html).not.toContain("Inspect result details"); expect(html).not.toContain("Inspect cell");
  });
  it("retains all ambiguous records with an explicit notice and all-cell navigation", () => {
    const html = render([result("a", [{ cellName: "INV", status: "first" }, { cellName: "INV", status: "second" }, { cellName: "NAND" }])]);
    expect(html).toContain("Ambiguous cell identity: 2 records"); expect(html).toContain("Cell record 1"); expect(html).toContain("Cell record 2");
    expect(html).toContain('href="#acg-cell-group-1">NAND');
    expect(html.match(/class="chart-card acg-cell-result"/g)).toHaveLength(3);
  });
  it("shows explicit generated-cell absence when every selected result is research-only", () => {
    const html = render([result("a"), result("b")]);
    expect(html.match(/No parsed generated cells recorded/g)).toHaveLength(2);
    expect(html).not.toContain("GDS layout preview for");
  });
  it("dispatches unified and legacy phases independently without dropping either population", () => {
    const mixed = result("m", [], { acgUnified: { engine: "dr", comparison: { status: "unsupported" }, search: { status: "unsupported" }, report: { status: "partial" } }, acgResearch: { operation: "algorithm-matrix", engine: "mr", metrics: [{ trialIndex: 0 }] } });
    expect(resultResearchSections(mixed, "comparison").map(section => [section.origin, section.value.status, section.value.engine, section.stage])).toEqual([["Unified workflow", "unsupported", "dr", "comparison"], ["Legacy research", undefined, "mr", undefined]]);
    expect(resultResearchSections(mixed, "search")[0].value.operation).toBe("known-feasible");
    expect(resultResearchSections(result("empty"), "report")).toEqual([]);
    expect(render([mixed])).toContain("unsupported");
  });
  it("keeps per-result cell artifacts, previews, candidates, diagnostics and width evidence in their own columns", () => {
    const rows = [result("a"), result("b")];
    const html = renderToStaticMarkup(createElement(ResultColumns, { title: "Generated cell · INV", sectionKey: "generated-cell", results: rows, children: row => createElement(CellResult, {
      cell: { cellName: "INV", artifacts: [{ relativePath: "output/INV.svg" }], placement: { status: "completed", candidates: [{ seed: row.id }] }, routing: { status: "not_requested" }, verification: { profile: row.id, lvs0: { status: "failed", details: { reason: "retained" } } }, metrics: { placementWidthCpp: 7, widthEvidencePaths: ["output/width.json"] }, diagnostics: ["diagnostic-" + row.id] },
      artifacts: [{ id: row.id + "-preview", resultId: row.id, relativePath: "output/INV.svg", role: "acg-preview", mediaType: "image/svg+xml", sizeBytes: 1 }, { id: row.id + "-width", resultId: row.id, relativePath: "output/width.json", role: "acg-report", sizeBytes: 1 }] as ArtifactRecordV1[]
    }) }));
    const columns = html.split('class="acg-section-column"').slice(1);
    expect(columns).toHaveLength(2);
    rows.forEach((row, index) => {
      expect(columns[index]).toContain(`/api/artifacts/${row.id}-preview/download`);
      expect(columns[index]).toContain(`/api/artifacts/${row.id}-width/download`);
      expect(columns[index]).not.toContain(`/api/artifacts/${rows[1-index].id}-preview/download`);
      for (const text of ["Placement candidates", "Cell diagnostics", "Width evidence", "Verification evidence", "GDS layout preview", "Cell downloads", "failed"]) expect(columns[index]).toContain(text);
    });
  });
});

it("keeps preview controls accessible and retains imported/routed candidate evidence", () => {
  const html = renderToStaticMarkup(createElement(CellResult, {
    cell: { cellName: "INV", artifacts: [{ relativePath: "one.png" }, { relativePath: "two.png" }], routing: { importedCandidates: [{ source: "placement.json" }] }, routedCandidates: [{ status: "failed", reason: "congestion" }] },
    artifacts: ["one", "two"].map(id => ({ id, relativePath: id + ".png", role: "acg-preview", mediaType: "image/png", sizeBytes: 1 })) as ArtifactRecordV1[]
  }));
  expect(html).toContain('aria-label="GDS preview for INV"');
  expect(html).toContain("Imported routing candidates (1)"); expect(html).toContain("Routed candidates (1)");
  expect(html).not.toContain("congestion"); expect(html).toContain("Complete generated cell evidence");
  expect(html).toContain('loading="lazy"'); expect(html).toContain('decoding="async"');
  expect(html.match(/<option /g)).toHaveLength(2);
});
