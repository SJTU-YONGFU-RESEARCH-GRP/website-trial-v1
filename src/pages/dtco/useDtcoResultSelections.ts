import { useEffect, useRef, useState } from "react";
import type { SelectionResult, SelectionRun } from "../../../shared/contracts/dtcoSelection";
import type { ApiSuccessV1, JobRecordV1, ResultRecordV1 } from "../../../shared/contracts/v1";
import { apiRequest } from "../../api/client";

// Completed reports are immutable. Cache them independently of the editable Input draft.
export function useDtcoResultSelections(history: JobRecordV1[], current: SelectionRun | null, active: boolean) {
  const cache = useRef(new Map<string, SelectionRun>());
  const [runs, setRuns] = useState<SelectionRun[]>([]), [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false), [retry, setRetry] = useState(0);
  const ids = history.filter(job => job.status === "succeeded").map(job => job.id).join("\n");
  useEffect(() => {
    if (!active) return;
    const controller = new AbortController();
    const initial = new Map(history.filter(job => job.status === "succeeded").map(job => [job.id, job]));
    let ordered = ids ? ids.split("\n") : [];
    if (current?.job.status === "succeeded" && current.result) { cache.current.set(current.job.id, current); initial.set(current.job.id, current.job); ordered = [...initial.keys()]; }
    const publish = () => { if (!controller.signal.aborted) setRuns(ordered.flatMap(id => cache.current.get(id) ?? [])); };
    publish(); setErrors([]);
    setLoading(true);
    const load = async () => {
      // Generic job pagination avoids the recent-history cap of the Input endpoint.
      try {
        let cursor: string | null = null;
        for (let page = 0; page < 100; page++) {
          const response: ApiSuccessV1<JobRecordV1[]> = await apiRequest<JobRecordV1[]>(`/jobs?moduleId=dtco&status=succeeded&limit=200${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`, { signal: controller.signal });
          if (!Array.isArray(response.data)) throw new Error("Job history response is unavailable.");
          for (const job of response.data) if (job.operation === "cell-selection") initial.set(job.id, job);
          const next: string | null | undefined = response.meta?.nextCursor;
          if (response.data.length < 200 || !next || next === cursor) break;
          if (page === 99) throw new Error("Job history pagination exceeded its safety limit; narrow the saved history before loading more.");
          cursor = next;
        }
      } catch (reason) {
        if (controller.signal.aborted) return;
        setErrors([`Complete selection history could not be enumerated; recent history remains available. ${reason instanceof Error ? reason.message : String(reason)}`]);
      }
      if (controller.signal.aborted) return;
      ordered = [...initial.keys()]; publish();
      const pending = ordered.filter(id => !cache.current.has(id));
      let index = 0;
      const worker = async () => {
        while (!controller.signal.aborted && index < pending.length) {
          const id = pending[index++], job = initial.get(id)!;
          try {
            let next: SelectionRun;
            if (job.resultId) {
              const record = (await apiRequest<ResultRecordV1>(`/results/dtco/${encodeURIComponent(job.resultId)}`, { signal: controller.signal })).data;
              const result = record?.data.dtcoSelection as unknown as SelectionResult | undefined;
              if (!result || record?.id !== job.resultId || !["dtco.cell-selection.result.v1", "dtco.cell-selection.result.v2"].includes(result?.schemaVersion ?? "")) throw new Error("Completed report is unavailable.");
              next = { job, result, artifacts: [] }; // Artifacts are requested only for checked evaluations.
            } else next = (await apiRequest<SelectionRun>(`/dtco/selection/runs/${encodeURIComponent(id)}`, { signal: controller.signal })).data;
            if (controller.signal.aborted) return;
            if (next?.job.id !== id || next.job.status !== "succeeded" || !next.result) throw new Error("Completed report is unavailable.");
            cache.current.set(id, next); publish();
          } catch (reason) {
            if (!controller.signal.aborted) setErrors(values => [...values, `${id}: ${reason instanceof Error ? reason.message : String(reason)}`]);
          }
        }
      };
      await Promise.all(Array.from({ length: Math.min(2, pending.length) }, worker));
    };
    void load().finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [ids, current, active, retry]);
  return { runs, loading, errors, retry: () => setRetry(value => value + 1) };
}
