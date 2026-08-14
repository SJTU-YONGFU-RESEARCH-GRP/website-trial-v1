import { migration001 } from "./001_initial.ts";
import { migration002 } from "./002_cancellation.ts";

export const migrations = [migration001, migration002] as const;
