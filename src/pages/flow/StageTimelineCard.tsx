import { Badge } from "./Badge";
import type { StageInfo } from "../../data/toolFlowTypes";

interface StageTimelineCardProps {
  stages: StageInfo[];
}

export function StageTimelineCard({ stages }: StageTimelineCardProps): JSX.Element {
  const stageCount = stages.filter((s) => s.status === "done" || s.status === "completed").length;

  return (
    <div className="chart-card">
      <h2>Stage Timeline</h2>
      <p className="hint">
        Progress: {stageCount} / {stages.length} stages completed
      </p>
      <div className="flow-timeline">
        {stages.map((s) => (
          <div key={s.id} className={`flow-timeline__item flow-timeline__item--${s.status}`}>
            <div className="flow-timeline__dot" />
            <div className="flow-timeline__body">
              <div className="flow-timeline__header">
                <span className="flow-timeline__name">{s.name}</span>
                <Badge status={s.status} />
              </div>
              <span className="flow-timeline__tool">{s.tool}</span>
              {s.duration !== "—" && (
                <span className="flow-timeline__duration">{s.duration}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
