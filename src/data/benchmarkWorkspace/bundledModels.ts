/* ==================================================================
 *  bundledModels.ts (goal.md §6.2)
 *
 *  Pre-bundled model definitions for the "Bundled model" input mode.
 * ================================================================== */

import type { ModelArtifact, SpiceDialect } from "../../compat/spiceWorkflow/contracts";

export interface BundledModelEntry {
  modelId: string;
  filename: string;
  displayName: string;
  dialect: SpiceDialect;
  modelName: string;
  deviceType: "nmos" | "pmos" | "unknown";
  deviceClass: ModelArtifact["deviceClass"];
  modelFamily?: string;
  parameterCount: number;
  byteSize: number;
  description: string;
  origin: string;
  content: string;
}

export const BUNDLED_MODELS: BundledModelEntry[] = [
  {
    modelId: "bundled-bsim4-nmos-tt",
    filename: "bsim4_nmos_tt.lib",
    displayName: "BSIM4 NMOS TT",
    dialect: "ngspice",
    modelName: "nmos_bsim4",
    deviceType: "nmos",
    deviceClass: "mos",
    modelFamily: "BSIM4.5",
    parameterCount: 62,
    byteSize: 4096,
    description: "BSIM4.5 nominal NMOS model (TT corner).",
    origin: "Bundled demo model",
    content: `* BSIM4.5 NMOS TT Demo Model
* Bundled deterministic demonstration model
* Data origin: synthetic-demo

.model nmos_bsim4 nmos
+ level = 54
+ version = 4.5
+ toxe = 2.4e-9
+ xj = 1.5e-7
+ nch = 3.2e17
+ vth0 = 0.42
+ k1 = 0.35
+ k2 = -0.02
+ k3 = 5.0
+ k3b = 0.0
+ w0 = 1.1e-6
+ nlx = 1.7e-7
+ dvt0 = 2.2
+ dvt1 = 0.53
+ dvt2 = -0.01
+ u0 = 280
+ ua = 1.3e-9
+ ub = 2.0e-19
+ uc = 1.8e-11
+ vsat = 1.0e5
+ a0 = 1.1
+ ags = 0.25
+ b0 = 1.0e-7
+ b1 = 1.0e-7
+ keta = -0.04
+ a1 = 0.0
+ a2 = 1.0
+ rdsw = 200
+ prwg = 0.1
+ prwb = -0.01
+ wr = 1.0
+ wint = 5e-9
+ lint = 1.8e-8
+ dwg = 0.0
+ dwb = 0.0
+ voff = -0.08
+ nfactor = 1.2
+ cit = 0.0
+ cdsc = 1.0e-4
+ cdscb = 0.0
+ cdscd = 0.0
+ eta0 = 0.07
+ etab = -0.04
+ dsub = 0.56
+ pclm = 1.4
+ pdiblc1 = 0.02
+ pdiblc2 = 0.002
+ pdiblcb = -0.01
+ drout = 0.5
+ pscbe1 = 4.3e8
+ pscbe2 = 1.0e-5
+ pvag = 0.01
+ delta = 0.01
+ alpha0 = 1.0e-7
+ beta0 = 18
+ ntnoi = 1.0e25
+ rsh = 0
+ mobmod = 0
+ capmod = 2
+ igcmod = 0
+ igbmod = 0
+ geomod = 0
+ rdsmod = 0
`,
  },
  {
    modelId: "bundled-bsim4-pmos-tt",
    filename: "bsim4_pmos_tt.lib",
    displayName: "BSIM4 PMOS TT",
    dialect: "ngspice",
    modelName: "pmos_bsim4",
    deviceType: "pmos",
    deviceClass: "mos",
    modelFamily: "BSIM4.5",
    parameterCount: 62,
    byteSize: 4096,
    description: "BSIM4.5 nominal PMOS model (TT corner).",
    origin: "Bundled demo model",
    content: `* BSIM4.5 PMOS TT Demo Model
* Bundled deterministic demonstration model
* Data origin: synthetic-demo

.model pmos_bsim4 pmos
+ level = 54
+ version = 4.5
+ toxe = 2.5e-9
+ xj = 1.6e-7
+ nch = 2.8e17
+ vth0 = -0.40
+ k1 = 0.34
+ k2 = -0.018
+ u0 = 120
+ vsat = 8.5e4
+ nfactor = 1.1
`,
  },
];
