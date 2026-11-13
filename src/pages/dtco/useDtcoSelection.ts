import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { SelectionOptions, SelectionRequest, SelectionRun } from "../../../shared/contracts/dtcoSelection";
import type { JobRecordV1 } from "../../../shared/contracts/v1";
import { apiJsonBody, apiRequest } from "../../api/client";
import { selectionActive, validateSelection } from "./selectionHelpers";

const root = "/dtco/selection";
const message = (error: unknown) => error instanceof Error ? error.message : String(error);
export function useDtcoSelection() {
  const [query, setQuery] = useSearchParams(), selectedId = query.get("selection");
  const [options, setOptions] = useState<SelectionOptions | null>(null), [form, setForm] = useState<SelectionRequest | null>(null);
  const [run, setRun] = useState<SelectionRun | null>(null), [history, setHistory] = useState<JobRecordV1[]>([]);
  const [error, setError] = useState<string | null>(null), [busy, setBusy] = useState(false), [loading, setLoading] = useState(true);
  const generation = useRef(0), lock = useRef(false);
  const controller = useRef<AbortController | null>(null);
  const remember = useCallback((value: SelectionRun) => {
    setRun(value);
    setHistory(current => [value.job, ...current.filter(row => row.id !== value.job.id)].sort((a,b) => b.createdAt.localeCompare(a.createdAt)));
  }, []);
  const select = useCallback((id: string | null) => {
    setQuery(current => { const next = new URLSearchParams(current); if (id) next.set("selection", id); else next.delete("selection"); return next; }, { replace: true });
  }, [setQuery]);
  useEffect(() => {
    const request = new AbortController();
    void Promise.all([apiRequest<SelectionOptions>(`${root}/options`, { signal: request.signal }), apiRequest<JobRecordV1[]>(`${root}/runs`, { signal: request.signal })])
      .then(([a,b]) => { if (!request.signal.aborted) { if (!a.data?.defaults || !Array.isArray(b.data)) throw new Error("Cell-selection options or history are unavailable."); setOptions(a.data); setForm(current => current ?? structuredClone(a.data.defaults)); setHistory(b.data); } })
      .catch(reason => { if (!request.signal.aborted) setError(message(reason)); })
      .finally(() => { if (!request.signal.aborted) setLoading(false); });
    return () => { request.abort(); controller.current?.abort(); generation.current++; };
  }, []);
  useEffect(() => {
    const version = ++generation.current;
    controller.current?.abort(); lock.current = false; setBusy(false); setRun(null);
    if (!selectedId) { if (options) setForm(structuredClone(options.defaults)); return; }
    const request = new AbortController(); controller.current = request; setLoading(true); setError(null);
    void apiRequest<SelectionRun>(`${root}/runs/${encodeURIComponent(selectedId)}`, { signal: request.signal })
      .then(value => { if (!request.signal.aborted && generation.current === version) { remember(value.data); const snapshot = value.data.job.parameters.dtcoSelectionSnapshot as { request?: SelectionRequest } | undefined; const saved = value.data.result?.request ?? snapshot?.request; if (saved) setForm(structuredClone(saved)); } })
      .catch(reason => { if (!request.signal.aborted) setError(message(reason)); })
      .finally(() => { if (!request.signal.aborted) setLoading(false); });
    return () => request.abort();
  }, [selectedId, options, remember]);
  const active = Boolean(run && selectionActive(run.job.status));
  useEffect(() => {
    if (!selectedId || !active || busy) return;
    let stopped = false, timer: ReturnType<typeof setTimeout>;
    const version = generation.current, request = new AbortController();
    const poll = async () => {
      try {
        const value = await apiRequest<SelectionRun>(`${root}/runs/${encodeURIComponent(selectedId)}`, { signal: request.signal });
        if (stopped || version !== generation.current) return;
        remember(value.data); setError(null);
        if (!selectionActive(value.data.job.status)) return;
      } catch (reason) { if (stopped) return; setError(`Selection refresh failed; retrying: ${message(reason)}`); }
      if (!stopped) timer = setTimeout(() => void poll(), 2000);
    };
    timer = setTimeout(() => void poll(), 2000);
    return () => { stopped = true; clearTimeout(timer); request.abort(); };
  }, [selectedId, active, busy, remember]);
  const validation = form ? validateSelection(form) : "Loading selection options.";
  async function perform(action: "run" | "retry" | "cancel" | "complete") {
    if (lock.current || !options) return;
    if (action === "run" && (!form || validation)) { setError(validation); return; }
    lock.current = true; setBusy(true); setError(null);
    const version = generation.current;
    const request = new AbortController(); controller.current = request;
    try {
      if (action === "cancel") {
        if (!run) return;
        await apiRequest(`/jobs/${encodeURIComponent(run.job.id)}/cancel`, { method: "POST", signal: request.signal });
        const next = await apiRequest<SelectionRun>(`${root}/runs/${encodeURIComponent(run.job.id)}`, { signal: request.signal });
        if (!request.signal.aborted && version === generation.current) remember(next.data);
      } else {
        const path = action === "run" ? `${root}/runs` : `${root}/runs/${encodeURIComponent(run!.job.id)}/${action === "complete" ? "complete-layout" : "retry"}`;
        const next = await apiRequest<JobRecordV1>(path, { method: "POST", body: action === "run" ? apiJsonBody(form) : undefined, signal: request.signal });
        if (request.signal.aborted || version !== generation.current) return;
        setHistory(current => [next.data, ...current.filter(row => row.id !== next.data.id)]); select(next.data.id);
      }
    } catch (reason) { if (!request.signal.aborted && version === generation.current) setError(message(reason)); }
    finally { if (version === generation.current) { lock.current = false; setBusy(false); } }
  }
  return { options, form, setForm, run, history, busy, loading, error, validation, active, select, perform };
}
export type DtcoSelectionState = ReturnType<typeof useDtcoSelection>;
