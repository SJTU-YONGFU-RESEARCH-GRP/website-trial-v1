/* ═══════════════════════════════════════════════════════════════════ */
/*  SSE Event stream — typed subscriber with reconnect (goal.md §7.3)   */
/* ═══════════════════════════════════════════════════════════════════ */

import { connectSSE, type SSEController } from "./client";
import type { WorkflowEvent, WorkflowEventType } from "../types";

export type EventHandler = (event: WorkflowEvent) => void;

export type ConnectionState = "connecting" | "connected" | "disconnected" | "error";

export interface EventStreamState {
  connectionState: ConnectionState;
  lastSequence: number;
  lastEventId?: string;
}

/**
 * Subscribe to workflow events via SSE.
 * Returns a cleanup function.
 */
export function subscribeWorkflowEvents(
  workflowId: string,
  handlers: {
    onEvent?: EventHandler;
    onStepStarted?: (stepId: string, event: WorkflowEvent) => void;
    onStepProgress?: (stepId: string, progress: number, event: WorkflowEvent) => void;
    onStepLog?: (stepId: string, message: string, event: WorkflowEvent) => void;
    onStepSucceeded?: (stepId: string, event: WorkflowEvent) => void;
    onStepFailed?: (stepId: string, event: WorkflowEvent) => void;
    onWorkflowCompleted?: (status: "succeeded" | "partial" | "failed", event: WorkflowEvent) => void;
    onWorkflowCancelled?: (event: WorkflowEvent) => void;
    onConnectionChange?: (state: ConnectionState) => void;
    onError?: (err: Error) => void;
  },
  lastEventId?: string,
): { cleanup: () => void; state: () => EventStreamState } {
  const state: EventStreamState = {
    connectionState: "connecting",
    lastSequence: 0,
    lastEventId,
  };

  let ctrl: SSEController | null = null;

  function connect() {
    state.connectionState = "connecting";
    handlers.onConnectionChange?.("connecting");

    ctrl = connectSSE(
      `/workflows/${workflowId}/events`,
      ({ data, id }) => {
        state.connectionState = "connected";
        state.lastEventId = id;
        const event = data as WorkflowEvent;
        if (event.sequence) {
          state.lastSequence = Math.max(state.lastSequence, event.sequence);
        }

        // Generic handler
        handlers.onEvent?.(event);

        // Typed dispatch
        const et = event.eventType as WorkflowEventType;
        const stepId = event.stepId ?? "";

        switch (et) {
          case "step.started":
            handlers.onStepStarted?.(stepId, event);
            break;
          case "step.progress":
            handlers.onStepProgress?.(stepId, (event.payload?.progress as number) ?? 0, event);
            break;
          case "step.log":
            handlers.onStepLog?.(stepId, (event.payload?.message as string) ?? "", event);
            break;
          case "step.succeeded":
            handlers.onStepSucceeded?.(stepId, event);
            break;
          case "step.failed":
            handlers.onStepFailed?.(stepId, event);
            break;
          case "workflow.succeeded":
          case "workflow.partial":
          case "workflow.failed":
            handlers.onWorkflowCompleted?.(et.replace("workflow.", "") as "succeeded" | "partial" | "failed", event);
            break;
          case "workflow.cancelled":
            handlers.onWorkflowCancelled?.(event);
            break;
        }
      },
      (err) => {
        state.connectionState = "error";
        handlers.onConnectionChange?.("error");
        handlers.onError?.(err);

        // Auto-reconnect after 3s
        setTimeout(() => {
          if (ctrl) connect();
        }, 3000);
      },
      lastEventId,
    );
  }

  connect();

  return {
    cleanup: () => ctrl?.close(),
    state: () => ({ ...state }),
  };
}

/**
 * Parse event type into a label suitable for UI display.
 */
export function eventTypeLabel(et: WorkflowEventType): string {
  switch (et) {
    case "workflow.queued":
      return "Queued";
    case "workflow.started":
      return "Started";
    case "step.started":
      return "Step Started";
    case "step.progress":
      return "Progress";
    case "step.log":
      return "Log";
    case "artifact.created":
      return "Artifact Created";
    case "step.succeeded":
      return "Step Completed";
    case "step.failed":
      return "Step Failed";
    case "workflow.partial":
      return "Partially Complete";
    case "workflow.succeeded":
      return "Completed";
    case "workflow.failed":
      return "Failed";
    case "workflow.cancelled":
      return "Cancelled";
  }
}
