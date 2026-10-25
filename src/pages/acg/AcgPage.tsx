import { useCallback, useState } from "react";
import { WorkspaceTabs, type WorkspaceTab } from "../../components/WorkspaceTabs";
import { AcgInputPanel } from "./AcgInputPanel";
import { AcgResultsPanel } from "./AcgResultsPanel";
import type { JobRecordV1 } from "../../../shared/contracts/v1";
import "../../digital-run.css";
import "../../acg.css";
export function AcgPage(): JSX.Element {
  const [tab, setTab] = useState<WorkspaceTab>("input");
  const [revision, setRevision] = useState(0);
  const [finishedJob, setFinishedJob] = useState<JobRecordV1 | null>(null);
  const finished = useCallback((job?: JobRecordV1) => {
    setRevision(value => value + 1);
    if (job) { setFinishedJob(job); setTab("results"); }
  }, []);
  return <div className="acg-page workspace-page">
    <WorkspaceTabs idPrefix="acg" active={tab} onChange={setTab} />
    <section id="acg-input-panel" className="workspace-tab-panel workspace-region workspace-region--input" role="tabpanel" aria-labelledby="acg-input-tab" hidden={tab !== "input"}><div className="workspace-region__content"><AcgInputPanel onFinished={finished} /></div></section>
    <section id="acg-results-panel" className="workspace-tab-panel workspace-region workspace-region--result" role="tabpanel" aria-labelledby="acg-results-tab" hidden={tab !== "results"}><div className="workspace-region__content"><AcgResultsPanel revision={revision} finishedJob={finishedJob} /></div></section>
  </div>;
}
