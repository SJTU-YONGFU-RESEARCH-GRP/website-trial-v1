export type WorkspaceTab = "input" | "results";

interface WorkspaceTabsProps {
  idPrefix: string;
  active: WorkspaceTab;
  onChange(tab: WorkspaceTab): void;
}

function InputIcon(): JSX.Element {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v11m0-11 4 4m-4-4L8 7M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4" /></svg>;
}

function ResultsIcon(): JSX.Element {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19V9m7 10V5m7 14v-7M3 19h18" /></svg>;
}

export function WorkspaceTabs({ idPrefix, active, onChange }: WorkspaceTabsProps): JSX.Element {
  return (
    <div className="workspace-tabs" role="tablist" aria-label="Workspace view">
      <button id={`${idPrefix}-input-tab`} type="button" role="tab" aria-selected={active === "input"} aria-controls={`${idPrefix}-input-panel`} className={active === "input" ? "is-active" : ""} onClick={() => onChange("input")}>
        <InputIcon /><span>Input</span>
      </button>
      <button id={`${idPrefix}-results-tab`} type="button" role="tab" aria-selected={active === "results"} aria-controls={`${idPrefix}-results-panel`} className={active === "results" ? "is-active" : ""} onClick={() => onChange("results")}>
        <ResultsIcon /><span>Results</span>
      </button>
    </div>
  );
}
