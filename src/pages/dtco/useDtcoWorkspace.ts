import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { DtcoExperiment, DtcoOptions } from "../../../shared/contracts/dtco";
import { getDtcoExperiment, getDtcoOptions, listDtcoExperiments, retryDtcoPoint, saveDtcoExperiment, submitDtcoExperiment } from "../../api/dtco/client";
import { definitionToForm, isActivePoint, parseDtcoForm, type DtcoForm } from "./helpers";

const message = (error: unknown): string => error instanceof Error ? error.message : String(error);
export function useDtcoWorkspace() {
  const [query, setQuery] = useSearchParams();
  const selectedId = query.get("experiment");
  const [options, setOptions] = useState<DtcoOptions | null>(null);
  const [history, setHistory] = useState<DtcoExperiment[]>([]);
  const [experiment, setExperiment] = useState<DtcoExperiment | null>(null);
  const [form, setForm] = useState<DtcoForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const lock = useRef(false);
  const generation = useRef(0);
  const mutation = useRef<AbortController | null>(null);
  const pollRequest = useRef<AbortController | null>(null);
  const selectionRequest = useRef<AbortController | null>(null);
  const acceptedId = useRef<string | null>(null);

  const remember = (next: DtcoExperiment) => {
    setExperiment(next);
    setHistory(current => [next, ...current.filter(item => item.id !== next.id)].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
  };
  const chooseUrl = (id: string | null) => {
    acceptedId.current = id;
    const next = new URLSearchParams(query);
    if (id) next.set("experiment", id); else next.delete("experiment");
    setQuery(next, { replace: true });
  };

  useEffect(() => {
    const controller = new AbortController();
    void Promise.all([getDtcoOptions(controller.signal), listDtcoExperiments(controller.signal)]).then(([nextOptions, nextHistory]) => {
      if (controller.signal.aborted) return;
      setOptions(nextOptions); setHistory(nextHistory);
      setForm(definitionToForm(nextOptions.defaults));
    }).catch(reason => { if (!controller.signal.aborted) setError(message(reason)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => { controller.abort(); mutation.current?.abort(); pollRequest.current?.abort(); selectionRequest.current?.abort(); generation.current++; };
  }, []);

  useEffect(() => {
    if (!options || selectedId === acceptedId.current) return;
    const controller = new AbortController();
    selectionRequest.current?.abort(); selectionRequest.current = controller;
    mutation.current?.abort(); lock.current = false; setBusy(false);
    generation.current++; pollRequest.current?.abort();
    if (!selectedId) {
      acceptedId.current = null; setExperiment(null); setForm(definitionToForm(options.defaults)); return;
    }
    setLoading(true); setError(null);
    void getDtcoExperiment(selectedId, controller.signal).then(next => {
      if (controller.signal.aborted) return;
      acceptedId.current = next.id; remember(next); setForm(definitionToForm(next.definition));
    }).catch(reason => { if (!controller.signal.aborted) setError(message(reason)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [selectedId, options]);

  const active = Boolean(experiment?.points.some(isActivePoint));
  useEffect(() => {
    if (!experiment || !active || busy || loading) return;
    const id = experiment.id, version = generation.current;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      const controller = new AbortController(); pollRequest.current = controller;
      try {
        const next = await getDtcoExperiment(id, controller.signal);
        if (stopped || controller.signal.aborted || version !== generation.current) return;
        remember(next); setError(null);
        if (!next.points.some(isActivePoint)) return;
      } catch (reason) {
        if (stopped || controller.signal.aborted || version !== generation.current) return;
        setError(`Progress refresh failed: ${message(reason)}`);
      }
      if (!stopped && version === generation.current) timer = setTimeout(() => { void poll(); }, 2000);
    };
    timer = setTimeout(() => { void poll(); }, 2000);
    return () => { stopped = true; clearTimeout(timer); pollRequest.current?.abort(); };
  }, [experiment?.id, active, busy, loading]);

  const validation = form && options ? parseDtcoForm(form, options) : null;
  const dirty = Boolean(form && options && JSON.stringify(form) !== JSON.stringify(definitionToForm(experiment?.definition ?? options.defaults)));
  async function perform(action: "save" | "submit" | "retry" | "select" | "new", target?: string) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError(null); setNotice(null);
    generation.current++; pollRequest.current?.abort(); selectionRequest.current?.abort();
    const controller = new AbortController(); mutation.current = controller;
    try {
      let saved = experiment;
      // Every batch uses the current form. Switching experiments also preserves valid edits.
      if ((action !== "retry") && (dirty || (!experiment && (action === "save" || action === "submit")))) {
        if (!validation?.definition) throw new Error(validation?.error ?? "Configuration is not ready.");
        saved = await saveDtcoExperiment(validation.definition, experiment?.id, controller.signal);
        if (controller.signal.aborted) return;
        remember(saved); setForm(definitionToForm(saved.definition)); chooseUrl(saved.id);
      }
      if (action === "submit") {
        if (!saved) throw new Error("Save the experiment before running.");
        const response = await submitDtcoExperiment(saved.id, controller.signal);
        if (controller.signal.aborted) return;
        remember(response.experiment);
        setNotice(`${response.submitted.length} combinations submitted; ${response.skipped.length} already submitted or completed.`);
        if (response.failed.length) setError(response.failed.map(item => item.message).join("; "));
      } else if (action === "retry" && target) {
        const point = experiment?.points.find(item => item.id === target);
        const attemptId = point?.attempts.at(-1)?.id;
        if (!attemptId) throw new Error("This combination has no attempt to retry. Submit unsubmitted combinations first.");
        const response = await retryDtcoPoint(target, attemptId, controller.signal);
        if (controller.signal.aborted) return;
        remember(response.experiment);
        setNotice(`${response.submitted.length} retry submitted.`);
        if (response.failed.length) setError(response.failed.map(item => item.message).join("; "));
      } else if (action === "select" && target) {
        const next = await getDtcoExperiment(target, controller.signal);
        if (controller.signal.aborted) return;
        remember(next); setForm(definitionToForm(next.definition)); chooseUrl(next.id);
      } else if (action === "new" && options) {
        setExperiment(null); setForm(definitionToForm(options.defaults)); chooseUrl(null);
      } else if (action === "save") setNotice("Experiment saved on the server.");
    } catch (reason) { if (!controller.signal.aborted) setError(message(reason)); }
    finally { if (!controller.signal.aborted) { lock.current = false; setBusy(false); } }
  }
  return { options, history, experiment, form, setForm, loading, busy, error, notice, validation, dirty, active, perform };
}
