import { useMemo, useState } from "react";
import type { JobEventRecordV1, JobEventStream } from "../../shared/contracts/v1";
import { formatDate } from "./format";

const STREAMS: Array<JobEventStream | "all"> = ["all", "system", "stdout", "stderr", "progress", "artifact"];

export function EventLog({ events, liveState }: { events: JobEventRecordV1[]; liveState: string }): JSX.Element {
  const [stream, setStream] = useState<JobEventStream | "all">("all");
  const visible = useMemo(() => events.filter((event) => stream === "all" || event.stream === stream), [events, stream]);
  return (
    <section className="jobs-card" aria-labelledby="job-log-title">
      <div className="jobs-card__heading"><div><h2 id="job-log-title">Live log</h2><p>{events.length} persisted events</p></div><span className="jobs-live-state">{liveState}</span></div>
      <div className="jobs-log-tabs" role="tablist" aria-label="Log stream">
        {STREAMS.map((value) => <button type="button" role="tab" aria-selected={stream === value} className={stream === value ? "active" : ""} onClick={() => setStream(value)} key={value}>{value}</button>)}
      </div>
      <div className="jobs-log" aria-live="polite">
        {visible.length ? visible.map((event) => (
          <div className={`jobs-log__line jobs-log__line--${event.level}`} key={event.id}>
            <time>{formatDate(event.at)}</time><span className="jobs-log__stream">{event.stream}</span><pre>{event.message}</pre>
          </div>
        )) : <p>No events in this stream.</p>}
      </div>
    </section>
  );
}

