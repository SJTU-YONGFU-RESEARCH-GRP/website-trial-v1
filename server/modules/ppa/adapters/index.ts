import type { PpaFlowId } from "../types.ts";
import type { PpaFlowAdapter } from "./base.ts";
import { libreLaneAdapter } from "./librelane.ts";
import { openLane1Adapter } from "./openlane1.ts";
import { openRoadOrfsAdapter } from "./openroadOrfs.ts";

export const ppaFlowAdapters: Record<PpaFlowId, PpaFlowAdapter> = { "openroad-orfs": openRoadOrfsAdapter, openlane1: openLane1Adapter, librelane: libreLaneAdapter };
export { libreLaneAdapter, openLane1Adapter, openRoadOrfsAdapter };
