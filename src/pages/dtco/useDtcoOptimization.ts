import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { DtcoOptimization, DtcoOptimizationDefinition, DtcoOptimizationOptions } from "../../../shared/contracts/dtco";
import { controlDtcoOptimization, createDtcoOptimization, getDtcoOptimization, listDtcoOptimizations } from "../../api/dtco/optimization";
import { isOptimizationActive, resumableIteration, validateOptimization } from "./optimizationHelpers";

export function useDtcoOptimization(options: DtcoOptimizationOptions | undefined) {
  const [query, setQuery] = useSearchParams();
  const selectedId = query.get("optimization");
  const [run, setRun] = useState<DtcoOptimization | null>(null);
  const [history, setHistory] = useState<DtcoOptimization[]>([]);
  const [form, setForm] = useState<DtcoOptimizationDefinition | null>(null);
  const [busy, setBusy] = useState(false), [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const accepted = useRef<string | null>(null), lock = useRef(false), generation = useRef(0);
  const request = useRef<AbortController | null>(null), pollRequest = useRef<AbortController | null>(null);
  const createKey = useRef<{ json: string; id: string } | null>(null);
  const remember = (next: DtcoOptimization) => {
    setRun(next);
    setHistory(current => [next, ...current.filter(item => item.id !== next.id)].sort((a,b) => b.updatedAt.localeCompare(a.updatedAt)));
  };
  const url = (id: string | null) => {
    accepted.current = id;
    setQuery(current => { const next = new URLSearchParams(current); if (id) next.set("optimization", id); else next.delete("optimization"); return next; }, { replace: true });
  };
  useEffect(() => {
    if (!options) return;
    const controller = new AbortController();
    setForm(current => current ?? structuredClone(options.defaults));
    void listDtcoOptimizations(controller.signal).then(next => { if (!controller.signal.aborted) setHistory(next); })
      .catch(reason => { if (!controller.signal.aborted) setError(String(reason instanceof Error ? reason.message : reason)); });
    return () => { controller.abort(); request.current?.abort(); pollRequest.current?.abort(); generation.current++; };
  }, [options]);
  useEffect(() => {
    if (!options || selectedId === accepted.current) return;
    request.current?.abort(); pollRequest.current?.abort(); generation.current++; lock.current = false; setBusy(false);
    if (!selectedId) { setLoading(false); setRun(null); setForm(structuredClone(options.defaults)); accepted.current = null; return; }
    const controller = new AbortController(); request.current = controller;
    setLoading(true); setError(null);
    void getDtcoOptimization(selectedId, controller.signal).then(next => {
      if (controller.signal.aborted) return;
      accepted.current = next.id; remember(next); setForm(structuredClone(next.definition));
    }).catch(reason => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : String(reason)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [options, selectedId]);
  const active = Boolean(run && isOptimizationActive(run));
  useEffect(() => {
    if (!run || !active || busy || loading) return;
    const id = run.id, version = generation.current;
    let stopped = false, timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      const controller = new AbortController(); pollRequest.current = controller;
      try {
        const next = await getDtcoOptimization(id, controller.signal);
        if (stopped || controller.signal.aborted || generation.current !== version) return;
        remember(next); setError(null);
        if (!isOptimizationActive(next)) return;
      } catch (reason) {
        if (stopped || controller.signal.aborted || generation.current !== version) return;
        setError(`Optimization refresh failed; retrying: ${reason instanceof Error ? reason.message : String(reason)}`);
      }
      if (!stopped) timer = setTimeout(() => { void poll(); }, 2000);
    };
    timer = setTimeout(() => { void poll(); }, 2000);
    return () => { stopped = true; clearTimeout(timer); pollRequest.current?.abort(); };
  }, [run?.id, active, busy, loading]);
  const validation = form && options ? validateOptimization(form, options) : null;
  async function perform(action: "create" | "start" | "stop" | "resume" | "select" | "new", target?: string) {
    if (lock.current || !options) return;
    lock.current = true; setBusy(true); setError(null); generation.current++;
    request.current?.abort(); pollRequest.current?.abort();
    const controller = new AbortController(); request.current = controller;
    try {
      const saveDraft = async () => {
        if (!form || validation) throw new Error(validation ?? "Configure the optimizer first.");
        const json = JSON.stringify(form);
        if (createKey.current?.json !== json) createKey.current = { json, id: crypto.randomUUID() };
        return createDtcoOptimization({ clientRequestId: createKey.current.id, definition: form }, controller.signal);
      };
      if ((action === "new" || action === "select") && !run && form && JSON.stringify(form) !== JSON.stringify(options.defaults)) {
        const saved = await saveDraft();
        if (controller.signal.aborted) return;
        remember(saved); url(saved.id);
      }
      if (action === "new") { setRun(null); setForm(structuredClone(options.defaults)); createKey.current = null; url(null); return; }
      let next: DtcoOptimization;
      if (action === "select" && target) next = await getDtcoOptimization(target, controller.signal);
      else if (action === "create") next = await saveDraft();
      else {
        if (!run) throw new Error("Save an optimization first.");
        const retry = resumableIteration(run);
        if (action === "resume" && !retry) throw new Error("This optimization has no resumable failed attempt.");
        next = await controlDtcoOptimization(run.id, action as "start" | "stop" | "resume", action === "resume" ? { iterationId: retry!.id, attemptId: retry!.attemptId! } : undefined, controller.signal);
      }
      if (controller.signal.aborted) return;
      remember(next); setForm(structuredClone(next.definition)); url(next.id);
    } catch (reason) { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : String(reason)); }
    finally { if (!controller.signal.aborted) { lock.current = false; setBusy(false); } }
  }
  return { run, history, form, setForm, loading, busy, error, validation, active, perform };
}
