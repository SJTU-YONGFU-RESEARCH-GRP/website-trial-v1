import { useState } from "react";
import { WorkspaceTabs, type WorkspaceTab } from "../components/WorkspaceTabs";
import { BenchmarkWorkspacePage } from "./benchmark/BenchmarkWorkspacePage";
import { BenchmarkRunPanel } from "./benchmark/run";

export function SpiceBenchmarkPage() {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("input");
  return (
    <div className="workspace-page">
      <WorkspaceTabs idPrefix="benchmark" active={activeTab} onChange={setActiveTab} />
      <section id="benchmark-input-panel" className="workspace-tab-panel workspace-region workspace-region--input" role="tabpanel" aria-labelledby="benchmark-input-tab" hidden={activeTab !== "input"}>
        <div className="workspace-region__content"><BenchmarkRunPanel /></div>
      </section>
      <section id="benchmark-results-panel" className="workspace-tab-panel workspace-region workspace-region--result" role="tabpanel" aria-labelledby="benchmark-results-tab" hidden={activeTab !== "results"}>
        <div className="workspace-region__content"><BenchmarkWorkspacePage /></div>
      </section>
    </div>
  );
}
