import { useCallback, useEffect, useRef, useState } from "react";
import type { JobEventRecordV1 } from "../../shared/contracts/v1";
import { getJob, getJobEvents, type JobDetailV1 } from "../api/jobs";

type LiveState = "connecting" | "live" | "polling" | "complete";
const TERMINAL = new Set(["succeeded", "failed", "cancelled", "interrupted"]);

function mergeEvents(current: JobEventRecordV1[], incoming: JobEventRecordV1[]): JobEventRecordV1[] {
  const byId = new Map(current.map((event) => [event.id, event]));
  incoming.forEach((event) => byId.set(event.id, event));
  return [...byId.values()].sort((left, right) => left.id - right.id);
}

export function useJobDetail(jobId: string): {
  detail: JobDetailV1 | null;
  loading: boolean;
  error: string | null;
  liveState: LiveState;
  refresh: () => Promise<void>;
} {
  const [detail, setDetail] = useState<JobDetailV1 | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [liveState, setLiveState] = useState<LiveState>("connecting");
  const cursor = useRef(0);

  const refresh = useCallback(async (): Promise<void> => {
    try {
      const next = await getJob(jobId);
      setDetail((current) => ({ ...next, latestEvents: mergeEvents(current?.latestEvents ?? [], next.latestEvents) }));
      next.latestEvents.forEach((event) => { cursor.current = Math.max(cursor.current, event.id); });
      setError(null);
      if (TERMINAL.has(next.job.status)) setLiveState("complete");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : String(requestError));
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    let active = true;
    let source: EventSource | null = null;
    let pollTimer: number | null = null;
    void refresh();

    const poll = async (): Promise<void> => {
      if (!active) return;
      setLiveState("polling");
      try {
        const events = await getJobEvents(jobId, cursor.current);
        if (events.length) {
          events.forEach((event) => { cursor.current = Math.max(cursor.current, event.id); });
          setDetail((current) => current ? { ...current, latestEvents: mergeEvents(current.latestEvents, events) } : current);
          await refresh();
        }
      } catch {
        // The detail request exposes persistent failure while polling keeps retrying.
      }
      if (active) pollTimer = window.setTimeout(() => { void poll(); }, 3000);
    };

    if (typeof EventSource === "undefined") {
      void poll();
    } else {
      source = new EventSource(`/api/jobs/${encodeURIComponent(jobId)}/events?after=${cursor.current}`);
      source.onopen = () => setLiveState("live");
      source.addEventListener("job-event", (raw) => {
        let event: JobEventRecordV1;
        try { event = JSON.parse((raw as MessageEvent<string>).data) as JobEventRecordV1; }
        catch { return; }
        cursor.current = Math.max(cursor.current, event.id);
        setDetail((current) => current ? { ...current, latestEvents: mergeEvents(current.latestEvents, [event]) } : current);
        void refresh();
      });
      source.addEventListener("end", () => {
        source?.close();
        setLiveState("complete");
        void refresh();
      });
      source.onerror = () => {
        source?.close();
        source = null;
        if (!pollTimer) void poll();
      };
    }

    return () => {
      active = false;
      source?.close();
      if (pollTimer) window.clearTimeout(pollTimer);
    };
  }, [jobId, refresh]);

  return { detail, loading, error, liveState, refresh };
}
