import { migration001 } from "./001_initial.ts";
import { migration002 } from "./002_cancellation.ts";
import { migration003 } from "./003_acg.ts";

import { migration004 } from "./004_dtco.ts";

export const migrations = [migration001, migration002, migration003, migration004] as const;
