// Auto-generated: 2026-07-19T05:51:06.808Z
import type { SpiceTranslatorManifest } from "./SpiceTranslatorTypes";
export const TRANSLATOR_MANIFEST: SpiceTranslatorManifest = {
  "generatedAt": "2026-07-19T05:51:06.796Z",
  "defaultResultId": "full-batch",
  "allPdks": [
    "all",
    "asap7",
    "cadence14",
    "cadence180",
    "cadence45",
    "cadence90",
    "freepdk15",
    "freepdk3",
    "freepdk45",
    "gf180",
    "hlmc40lp",
    "hlmc55lp",
    "sky130",
    "smic180",
    "smic180HV",
    "synopsys14",
    "synopsys28",
    "tsmc65lp"
  ],
  "allSourceFormats": [
    "all",
    "hspice",
    "spectre",
    "ngspice"
  ],
  "allTargetFormats": [
    "all",
    "ngspice",
    "spectre",
    "hspice"
  ],
  "results": [
    {
      "resultId": "full-batch",
      "title": "Full Batch Translation Result",
      "description": "17 PDKs, full translation and verification pipeline.",
      "kind": "batch",
      "level": 0,
      "pdk": "all",
      "sourceFormat": "all",
      "targetFormat": "all",
      "generatedAt": "2026-04-19",
      "status": "completed",
      "reports": [
        {
          "name": "FINALBATCHRUN2.md",
          "relPath": "FINALBATCHRUN2.md",
          "size": "13.7 KB",
          "hash": "2d05eb4e",
          "fetchUrl": "translator/reports/FINALBATCHRUN2_2d05eb4e.md",
          "isOriginal": true
        }
      ],
      "plots": [
        {
          "name": "cds_ff_mpt_nch18_idvds.png",
          "relPath": "cds_ff_mpt_nch18_idvds.png",
          "format": "png",
          "size": "143.5 KB",
          "hash": "8c42b27a",
          "displayUrl": "translator/plots/cds_ff_mpt_nch18_idvds_8c42b27a.png",
          "scope": "cadence14_spectre-hspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "cds",
            "plotType": "idvds"
          }
        },
        {
          "name": "cds_ff_mpt_nch18_idvgs.png",
          "relPath": "cds_ff_mpt_nch18_idvgs.png",
          "format": "png",
          "size": "83.4 KB",
          "hash": "a3ac1e77",
          "displayUrl": "translator/plots/cds_ff_mpt_nch18_idvgs_a3ac1e77.png",
          "scope": "cadence14_spectre-hspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "cds",
            "plotType": "idvgs"
          }
        },
        {
          "name": "cds_ff_mpt_nhvt_idvds.png",
          "relPath": "cds_ff_mpt_nhvt_idvds.png",
          "format": "png",
          "size": "142.9 KB",
          "hash": "dc815673",
          "displayUrl": "translator/plots/cds_ff_mpt_nhvt_idvds_dc815673.png",
          "scope": "cadence14_spectre-hspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "cds",
            "plotType": "idvds"
          }
        },
        {
          "name": "cds_ff_mpt_nhvt_idvgs.png",
          "relPath": "cds_ff_mpt_nhvt_idvgs.png",
          "format": "png",
          "size": "65.5 KB",
          "hash": "0a86da8f",
          "displayUrl": "translator/plots/cds_ff_mpt_nhvt_idvgs_0a86da8f.png",
          "scope": "cadence14_spectre-hspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "cds",
            "plotType": "idvgs"
          }
        },
        {
          "name": "cds_ff_mpt_nlvt_idvds.png",
          "relPath": "cds_ff_mpt_nlvt_idvds.png",
          "format": "png",
          "size": "142.8 KB",
          "hash": "31b68e89",
          "displayUrl": "translator/plots/cds_ff_mpt_nlvt_idvds_31b68e89.png",
          "scope": "cadence14_spectre-hspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "cds",
            "plotType": "idvds"
          }
        },
        {
          "name": "cds_ff_mpt_nlvt_idvgs.png",
          "relPath": "cds_ff_mpt_nlvt_idvgs.png",
          "format": "png",
          "size": "65.3 KB",
          "hash": "9c71c20c",
          "displayUrl": "translator/plots/cds_ff_mpt_nlvt_idvgs_9c71c20c.png",
          "scope": "cadence14_spectre-hspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "cds",
            "plotType": "idvgs"
          }
        },
        {
          "name": "cds_ff_mpt_nsvt_idvds.png",
          "relPath": "cds_ff_mpt_nsvt_idvds.png",
          "format": "png",
          "size": "143.0 KB",
          "hash": "a113626f",
          "displayUrl": "translator/plots/cds_ff_mpt_nsvt_idvds_a113626f.png",
          "scope": "cadence14_spectre-hspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "cds",
            "plotType": "idvds"
          }
        },
        {
          "name": "cds_ff_mpt_nsvt_idvgs.png",
          "relPath": "cds_ff_mpt_nsvt_idvgs.png",
          "format": "png",
          "size": "65.7 KB",
          "hash": "b8f013ee",
          "displayUrl": "translator/plots/cds_ff_mpt_nsvt_idvgs_b8f013ee.png",
          "scope": "cadence14_spectre-hspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "cds",
            "plotType": "idvgs"
          }
        },
        {
          "name": "cds_ff_mpt_psvt_idvds.png",
          "relPath": "cds_ff_mpt_psvt_idvds.png",
          "format": "png",
          "size": "143.0 KB",
          "hash": "1959b5c6",
          "displayUrl": "translator/plots/cds_ff_mpt_psvt_idvds_1959b5c6.png",
          "scope": "cadence14_spectre-hspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "cds",
            "plotType": "idvds"
          }
        },
        {
          "name": "cds_ff_mpt_psvt_idvgs.png",
          "relPath": "cds_ff_mpt_psvt_idvgs.png",
          "format": "png",
          "size": "65.7 KB",
          "hash": "c9b0f05c",
          "displayUrl": "translator/plots/cds_ff_mpt_psvt_idvgs_c9b0f05c.png",
          "scope": "cadence14_spectre-hspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "cds",
            "plotType": "idvgs"
          }
        },
        {
          "name": "_ndio_iv.png",
          "relPath": "_ndio_iv.png",
          "format": "png",
          "size": "52.8 KB",
          "hash": "bb6e4754",
          "displayUrl": "translator/plots/_ndio_iv_bb6e4754.png",
          "scope": "cadence14_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": " ndio iv.png",
            "what": "Original verification output generated by the tool.",
            "why": "Part of the automated translation verification pipeline.",
            "device": "—",
            "plotType": "other"
          }
        },
        {
          "name": "_pdio_iv.png",
          "relPath": "_pdio_iv.png",
          "format": "png",
          "size": "52.4 KB",
          "hash": "efbf0080",
          "displayUrl": "translator/plots/_pdio_iv_efbf0080.png",
          "scope": "cadence14_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": " pdio iv.png",
            "what": "Original verification output generated by the tool.",
            "why": "Part of the automated translation verification pipeline.",
            "device": "—",
            "plotType": "other"
          }
        },
        {
          "name": "cds_ff_mpt_nch18_idvds.png",
          "relPath": "cds_ff_mpt_nch18_idvds.png",
          "format": "png",
          "size": "143.5 KB",
          "hash": "8c42b27a",
          "displayUrl": "translator/plots/cds_ff_mpt_nch18_idvds_8c42b27a.png",
          "scope": "cadence14_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "cds",
            "plotType": "idvds"
          }
        },
        {
          "name": "cds_ff_mpt_nch18_idvgs.png",
          "relPath": "cds_ff_mpt_nch18_idvgs.png",
          "format": "png",
          "size": "83.4 KB",
          "hash": "a3ac1e77",
          "displayUrl": "translator/plots/cds_ff_mpt_nch18_idvgs_a3ac1e77.png",
          "scope": "cadence14_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "cds",
            "plotType": "idvgs"
          }
        },
        {
          "name": "cds_ff_mpt_nd1hvt_iv.png",
          "relPath": "cds_ff_mpt_nd1hvt_iv.png",
          "format": "png",
          "size": "54.4 KB",
          "hash": "42b5f78b",
          "displayUrl": "translator/plots/cds_ff_mpt_nd1hvt_iv_42b5f78b.png",
          "scope": "cadence14_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "cds ff mpt nd1hvt iv.png",
            "what": "Original verification output generated by the tool.",
            "why": "Part of the automated translation verification pipeline.",
            "device": "—",
            "plotType": "other"
          }
        },
        {
          "name": "cds_ff_mpt_nd1lvt_iv.png",
          "relPath": "cds_ff_mpt_nd1lvt_iv.png",
          "format": "png",
          "size": "54.4 KB",
          "hash": "28ed587d",
          "displayUrl": "translator/plots/cds_ff_mpt_nd1lvt_iv_28ed587d.png",
          "scope": "cadence14_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "cds ff mpt nd1lvt iv.png",
            "what": "Original verification output generated by the tool.",
            "why": "Part of the automated translation verification pipeline.",
            "device": "—",
            "plotType": "other"
          }
        },
        {
          "name": "cds_ff_mpt_nd1svt_iv.png",
          "relPath": "cds_ff_mpt_nd1svt_iv.png",
          "format": "png",
          "size": "54.8 KB",
          "hash": "21b17a4a",
          "displayUrl": "translator/plots/cds_ff_mpt_nd1svt_iv_21b17a4a.png",
          "scope": "cadence14_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "cds ff mpt nd1svt iv.png",
            "what": "Original verification output generated by the tool.",
            "why": "Part of the automated translation verification pipeline.",
            "device": "—",
            "plotType": "other"
          }
        },
        {
          "name": "cds_ff_mpt_nd2svt_iv.png",
          "relPath": "cds_ff_mpt_nd2svt_iv.png",
          "format": "png",
          "size": "55.1 KB",
          "hash": "1e2d96fb",
          "displayUrl": "translator/plots/cds_ff_mpt_nd2svt_iv_1e2d96fb.png",
          "scope": "cadence14_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "cds ff mpt nd2svt iv.png",
            "what": "Original verification output generated by the tool.",
            "why": "Part of the automated translation verification pipeline.",
            "device": "—",
            "plotType": "other"
          }
        },
        {
          "name": "cds_ff_mpt_nhvt_idvds.png",
          "relPath": "cds_ff_mpt_nhvt_idvds.png",
          "format": "png",
          "size": "142.9 KB",
          "hash": "dc815673",
          "displayUrl": "translator/plots/cds_ff_mpt_nhvt_idvds_dc815673.png",
          "scope": "cadence14_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "cds",
            "plotType": "idvds"
          }
        },
        {
          "name": "cds_ff_mpt_nhvt_idvgs.png",
          "relPath": "cds_ff_mpt_nhvt_idvgs.png",
          "format": "png",
          "size": "65.5 KB",
          "hash": "0a86da8f",
          "displayUrl": "translator/plots/cds_ff_mpt_nhvt_idvgs_0a86da8f.png",
          "scope": "cadence14_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "cds",
            "plotType": "idvgs"
          }
        },
        {
          "name": "cds_ff_mpt_nlvt_idvds.png",
          "relPath": "cds_ff_mpt_nlvt_idvds.png",
          "format": "png",
          "size": "100.0 KB",
          "hash": "89a1e2f5",
          "displayUrl": "translator/plots/cds_ff_mpt_nlvt_idvds_89a1e2f5.png",
          "scope": "cadence14_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "cds",
            "plotType": "idvds"
          }
        },
        {
          "name": "cds_ff_mpt_nlvt_idvgs.png",
          "relPath": "cds_ff_mpt_nlvt_idvgs.png",
          "format": "png",
          "size": "65.3 KB",
          "hash": "b27715fb",
          "displayUrl": "translator/plots/cds_ff_mpt_nlvt_idvgs_b27715fb.png",
          "scope": "cadence14_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "cds",
            "plotType": "idvgs"
          }
        },
        {
          "name": "cds_ff_mpt_nsvt_idvds.png",
          "relPath": "cds_ff_mpt_nsvt_idvds.png",
          "format": "png",
          "size": "100.2 KB",
          "hash": "e82af04b",
          "displayUrl": "translator/plots/cds_ff_mpt_nsvt_idvds_e82af04b.png",
          "scope": "cadence14_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "cds",
            "plotType": "idvds"
          }
        },
        {
          "name": "cds_ff_mpt_nsvt_idvgs.png",
          "relPath": "cds_ff_mpt_nsvt_idvgs.png",
          "format": "png",
          "size": "65.8 KB",
          "hash": "0f41e0bf",
          "displayUrl": "translator/plots/cds_ff_mpt_nsvt_idvgs_0f41e0bf.png",
          "scope": "cadence14_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "cds",
            "plotType": "idvgs"
          }
        },
        {
          "name": "cds_ff_mpt_pd1svt_iv.png",
          "relPath": "cds_ff_mpt_pd1svt_iv.png",
          "format": "png",
          "size": "54.9 KB",
          "hash": "5b3dd63c",
          "displayUrl": "translator/plots/cds_ff_mpt_pd1svt_iv_5b3dd63c.png",
          "scope": "cadence14_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "cds ff mpt pd1svt iv.png",
            "what": "Original verification output generated by the tool.",
            "why": "Part of the automated translation verification pipeline.",
            "device": "—",
            "plotType": "other"
          }
        },
        {
          "name": "cds_ff_mpt_psvt_idvds.png",
          "relPath": "cds_ff_mpt_psvt_idvds.png",
          "format": "png",
          "size": "100.2 KB",
          "hash": "03396a5d",
          "displayUrl": "translator/plots/cds_ff_mpt_psvt_idvds_03396a5d.png",
          "scope": "cadence14_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "cds",
            "plotType": "idvds"
          }
        },
        {
          "name": "cds_ff_mpt_psvt_idvgs.png",
          "relPath": "cds_ff_mpt_psvt_idvgs.png",
          "format": "png",
          "size": "65.7 KB",
          "hash": "2af257c4",
          "displayUrl": "translator/plots/cds_ff_mpt_psvt_idvgs_2af257c4.png",
          "scope": "cadence14_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "cds",
            "plotType": "idvgs"
          }
        },
        {
          "name": "nwdio_iv.png",
          "relPath": "nwdio_iv.png",
          "format": "png",
          "size": "53.2 KB",
          "hash": "e722df3d",
          "displayUrl": "translator/plots/nwdio_iv_e722df3d.png",
          "scope": "cadence14_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "nwdio iv.png",
            "what": "Original verification output generated by the tool.",
            "why": "Part of the automated translation verification pipeline.",
            "device": "—",
            "plotType": "other"
          }
        },
        {
          "name": "nmos25_idvds.png",
          "relPath": "nmos25_idvds.png",
          "format": "png",
          "size": "142.3 KB",
          "hash": "1f1b688c",
          "displayUrl": "translator/plots/nmos25_idvds_1f1b688c.png",
          "scope": "cadence180_spectre-hspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "nmos25",
            "plotType": "idvds"
          }
        },
        {
          "name": "nmos25_idvgs.png",
          "relPath": "nmos25_idvgs.png",
          "format": "png",
          "size": "80.3 KB",
          "hash": "d2897f3b",
          "displayUrl": "translator/plots/nmos25_idvgs_d2897f3b.png",
          "scope": "cadence180_spectre-hspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "nmos25",
            "plotType": "idvgs"
          }
        },
        {
          "name": "nmos_rf_idvds.png",
          "relPath": "nmos_rf_idvds.png",
          "format": "png",
          "size": "141.9 KB",
          "hash": "f2e7c62d",
          "displayUrl": "translator/plots/nmos_rf_idvds_f2e7c62d.png",
          "scope": "cadence180_spectre-hspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "nmos",
            "plotType": "idvds"
          }
        },
        {
          "name": "nmos_rf_idvgs.png",
          "relPath": "nmos_rf_idvgs.png",
          "format": "png",
          "size": "79.5 KB",
          "hash": "0f50e725",
          "displayUrl": "translator/plots/nmos_rf_idvgs_0f50e725.png",
          "scope": "cadence180_spectre-hspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "nmos",
            "plotType": "idvgs"
          }
        },
        {
          "name": "nplusreslw_idvds.png",
          "relPath": "nplusreslw_idvds.png",
          "format": "png",
          "size": "142.7 KB",
          "hash": "b970e203",
          "displayUrl": "translator/plots/nplusreslw_idvds_b970e203.png",
          "scope": "cadence180_spectre-hspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "nplusreslw",
            "plotType": "idvds"
          }
        },
        {
          "name": "nplusreslw_idvgs.png",
          "relPath": "nplusreslw_idvgs.png",
          "format": "png",
          "size": "81.2 KB",
          "hash": "bcc8b3f6",
          "displayUrl": "translator/plots/nplusreslw_idvgs_bcc8b3f6.png",
          "scope": "cadence180_spectre-hspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "nplusreslw",
            "plotType": "idvgs"
          }
        },
        {
          "name": "nwellreslw_idvds.png",
          "relPath": "nwellreslw_idvds.png",
          "format": "png",
          "size": "142.7 KB",
          "hash": "d501f447",
          "displayUrl": "translator/plots/nwellreslw_idvds_d501f447.png",
          "scope": "cadence180_spectre-hspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "nwellreslw",
            "plotType": "idvds"
          }
        },
        {
          "name": "nwellreslw_idvgs.png",
          "relPath": "nwellreslw_idvgs.png",
          "format": "png",
          "size": "80.4 KB",
          "hash": "16c8849c",
          "displayUrl": "translator/plots/nwellreslw_idvgs_16c8849c.png",
          "scope": "cadence180_spectre-hspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "nwellreslw",
            "plotType": "idvgs"
          }
        },
        {
          "name": "pmos25_idvds.png",
          "relPath": "pmos25_idvds.png",
          "format": "png",
          "size": "142.1 KB",
          "hash": "75129d56",
          "displayUrl": "translator/plots/pmos25_idvds_75129d56.png",
          "scope": "cadence180_spectre-hspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "pmos25",
            "plotType": "idvds"
          }
        },
        {
          "name": "pmos25_idvgs.png",
          "relPath": "pmos25_idvgs.png",
          "format": "png",
          "size": "63.8 KB",
          "hash": "4c68c320",
          "displayUrl": "translator/plots/pmos25_idvgs_4c68c320.png",
          "scope": "cadence180_spectre-hspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "pmos25",
            "plotType": "idvgs"
          }
        },
        {
          "name": "pmos_rf_idvds.png",
          "relPath": "pmos_rf_idvds.png",
          "format": "png",
          "size": "141.6 KB",
          "hash": "7a0fcbbe",
          "displayUrl": "translator/plots/pmos_rf_idvds_7a0fcbbe.png",
          "scope": "cadence180_spectre-hspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "pmos",
            "plotType": "idvds"
          }
        },
        {
          "name": "pmos_rf_idvgs.png",
          "relPath": "pmos_rf_idvgs.png",
          "format": "png",
          "size": "63.0 KB",
          "hash": "bcac3440",
          "displayUrl": "translator/plots/pmos_rf_idvgs_bcac3440.png",
          "scope": "cadence180_spectre-hspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "pmos",
            "plotType": "idvgs"
          }
        },
        {
          "name": "pplusreslw_idvds.png",
          "relPath": "pplusreslw_idvds.png",
          "format": "png",
          "size": "142.8 KB",
          "hash": "a44216c7",
          "displayUrl": "translator/plots/pplusreslw_idvds_a44216c7.png",
          "scope": "cadence180_spectre-hspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "pplusreslw",
            "plotType": "idvds"
          }
        },
        {
          "name": "pplusreslw_idvgs.png",
          "relPath": "pplusreslw_idvgs.png",
          "format": "png",
          "size": "81.3 KB",
          "hash": "06e66822",
          "displayUrl": "translator/plots/pplusreslw_idvgs_06e66822.png",
          "scope": "cadence180_spectre-hspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "pplusreslw",
            "plotType": "idvgs"
          }
        },
        {
          "name": "ndio_iv.png",
          "relPath": "ndio_iv.png",
          "format": "png",
          "size": "49.5 KB",
          "hash": "39f5d0d5",
          "displayUrl": "translator/plots/ndio_iv_39f5d0d5.png",
          "scope": "cadence180_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "ndio iv.png",
            "what": "Original verification output generated by the tool.",
            "why": "Part of the automated translation verification pipeline.",
            "device": "—",
            "plotType": "other"
          }
        },
        {
          "name": "nmos1_int_idvds.png",
          "relPath": "nmos1_int_idvds.png",
          "format": "png",
          "size": "90.0 KB",
          "hash": "888077ea",
          "displayUrl": "translator/plots/nmos1_int_idvds_888077ea.png",
          "scope": "cadence180_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "nmos1",
            "plotType": "idvds"
          }
        },
        {
          "name": "nmos1_int_idvgs.png",
          "relPath": "nmos1_int_idvgs.png",
          "format": "png",
          "size": "62.3 KB",
          "hash": "19a47157",
          "displayUrl": "translator/plots/nmos1_int_idvgs_19a47157.png",
          "scope": "cadence180_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "nmos1",
            "plotType": "idvgs"
          }
        },
        {
          "name": "nmos25_idvds.png",
          "relPath": "nmos25_idvds.png",
          "format": "png",
          "size": "142.3 KB",
          "hash": "1f1b688c",
          "displayUrl": "translator/plots/nmos25_idvds_1f1b688c.png",
          "scope": "cadence180_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "nmos25",
            "plotType": "idvds"
          }
        },
        {
          "name": "nmos25_idvgs.png",
          "relPath": "nmos25_idvgs.png",
          "format": "png",
          "size": "80.3 KB",
          "hash": "d2897f3b",
          "displayUrl": "translator/plots/nmos25_idvgs_d2897f3b.png",
          "scope": "cadence180_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "nmos25",
            "plotType": "idvgs"
          }
        },
        {
          "name": "nmos_rf_idvds.png",
          "relPath": "nmos_rf_idvds.png",
          "format": "png",
          "size": "141.9 KB",
          "hash": "f2e7c62d",
          "displayUrl": "translator/plots/nmos_rf_idvds_f2e7c62d.png",
          "scope": "cadence180_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "nmos",
            "plotType": "idvds"
          }
        },
        {
          "name": "nmos_rf_idvgs.png",
          "relPath": "nmos_rf_idvgs.png",
          "format": "png",
          "size": "79.5 KB",
          "hash": "0f50e725",
          "displayUrl": "translator/plots/nmos_rf_idvgs_0f50e725.png",
          "scope": "cadence180_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "nmos",
            "plotType": "idvgs"
          }
        },
        {
          "name": "npn_gummel.png",
          "relPath": "npn_gummel.png",
          "format": "png",
          "size": "76.0 KB",
          "hash": "f01e1105",
          "displayUrl": "translator/plots/npn_gummel_f01e1105.png",
          "scope": "cadence180_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Gummel Plot",
            "what": "Collector and base current vs base-emitter voltage for BJT devices.",
            "why": "Validates current gain (beta) and junction characteristics after translation.",
            "device": "npn",
            "plotType": "gummel"
          }
        },
        {
          "name": "nwdiodejv_iv.png",
          "relPath": "nwdiodejv_iv.png",
          "format": "png",
          "size": "54.2 KB",
          "hash": "a41f0ad9",
          "displayUrl": "translator/plots/nwdiodejv_iv_a41f0ad9.png",
          "scope": "cadence180_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "nwdiodejv iv.png",
            "what": "Original verification output generated by the tool.",
            "why": "Part of the automated translation verification pipeline.",
            "device": "—",
            "plotType": "other"
          }
        },
        {
          "name": "pdio_iv.png",
          "relPath": "pdio_iv.png",
          "format": "png",
          "size": "52.2 KB",
          "hash": "df331e41",
          "displayUrl": "translator/plots/pdio_iv_df331e41.png",
          "scope": "cadence180_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "pdio iv.png",
            "what": "Original verification output generated by the tool.",
            "why": "Part of the automated translation verification pipeline.",
            "device": "—",
            "plotType": "other"
          }
        },
        {
          "name": "pdiodejv_iv.png",
          "relPath": "pdiodejv_iv.png",
          "format": "png",
          "size": "53.3 KB",
          "hash": "8c126a2a",
          "displayUrl": "translator/plots/pdiodejv_iv_8c126a2a.png",
          "scope": "cadence180_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "pdiodejv iv.png",
            "what": "Original verification output generated by the tool.",
            "why": "Part of the automated translation verification pipeline.",
            "device": "—",
            "plotType": "other"
          }
        },
        {
          "name": "pmos1_int_idvds.png",
          "relPath": "pmos1_int_idvds.png",
          "format": "png",
          "size": "90.0 KB",
          "hash": "12bf4838",
          "displayUrl": "translator/plots/pmos1_int_idvds_12bf4838.png",
          "scope": "cadence180_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "pmos1",
            "plotType": "idvds"
          }
        },
        {
          "name": "pmos1_int_idvgs.png",
          "relPath": "pmos1_int_idvgs.png",
          "format": "png",
          "size": "61.2 KB",
          "hash": "08de8460",
          "displayUrl": "translator/plots/pmos1_int_idvgs_08de8460.png",
          "scope": "cadence180_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "pmos1",
            "plotType": "idvgs"
          }
        },
        {
          "name": "pmos25_idvds.png",
          "relPath": "pmos25_idvds.png",
          "format": "png",
          "size": "142.1 KB",
          "hash": "75129d56",
          "displayUrl": "translator/plots/pmos25_idvds_75129d56.png",
          "scope": "cadence180_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "pmos25",
            "plotType": "idvds"
          }
        },
        {
          "name": "pmos25_idvgs.png",
          "relPath": "pmos25_idvgs.png",
          "format": "png",
          "size": "63.8 KB",
          "hash": "4c68c320",
          "displayUrl": "translator/plots/pmos25_idvgs_4c68c320.png",
          "scope": "cadence180_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "pmos25",
            "plotType": "idvgs"
          }
        },
        {
          "name": "pmos_rf_idvds.png",
          "relPath": "pmos_rf_idvds.png",
          "format": "png",
          "size": "141.6 KB",
          "hash": "7a0fcbbe",
          "displayUrl": "translator/plots/pmos_rf_idvds_7a0fcbbe.png",
          "scope": "cadence180_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "pmos",
            "plotType": "idvds"
          }
        },
        {
          "name": "pmos_rf_idvgs.png",
          "relPath": "pmos_rf_idvgs.png",
          "format": "png",
          "size": "63.0 KB",
          "hash": "bcac3440",
          "displayUrl": "translator/plots/pmos_rf_idvgs_bcac3440.png",
          "scope": "cadence180_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "pmos",
            "plotType": "idvgs"
          }
        },
        {
          "name": "pnp_gummel.png",
          "relPath": "pnp_gummel.png",
          "format": "png",
          "size": "89.9 KB",
          "hash": "4386d021",
          "displayUrl": "translator/plots/pnp_gummel_4386d021.png",
          "scope": "cadence180_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Gummel Plot",
            "what": "Collector and base current vs base-emitter voltage for BJT devices.",
            "why": "Validates current gain (beta) and junction characteristics after translation.",
            "device": "pnp",
            "plotType": "gummel"
          }
        },
        {
          "name": "vpnp_gummel.png",
          "relPath": "vpnp_gummel.png",
          "format": "png",
          "size": "90.6 KB",
          "hash": "51f37574",
          "displayUrl": "translator/plots/vpnp_gummel_51f37574.png",
          "scope": "cadence180_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Gummel Plot",
            "what": "Collector and base current vs base-emitter voltage for BJT devices.",
            "why": "Validates current gain (beta) and junction characteristics after translation.",
            "device": "vpnp",
            "plotType": "gummel"
          }
        },
        {
          "name": "g45inda_idvds.png",
          "relPath": "g45inda_idvds.png",
          "format": "png",
          "size": "142.3 KB",
          "hash": "7811d7f4",
          "displayUrl": "translator/plots/g45inda_idvds_7811d7f4.png",
          "scope": "cadence45_spectre-hspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "g45inda",
            "plotType": "idvds"
          }
        },
        {
          "name": "g45inda_idvgs.png",
          "relPath": "g45inda_idvgs.png",
          "format": "png",
          "size": "80.3 KB",
          "hash": "b96938b6",
          "displayUrl": "translator/plots/g45inda_idvgs_b96938b6.png",
          "scope": "cadence45_spectre-hspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "g45inda",
            "plotType": "idvgs"
          }
        },
        {
          "name": "g45inds_idvds.png",
          "relPath": "g45inds_idvds.png",
          "format": "png",
          "size": "142.3 KB",
          "hash": "015c99ff",
          "displayUrl": "translator/plots/g45inds_idvds_015c99ff.png",
          "scope": "cadence45_spectre-hspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "g45inds",
            "plotType": "idvds"
          }
        },
        {
          "name": "g45inds_idvgs.png",
          "relPath": "g45inds_idvgs.png",
          "format": "png",
          "size": "80.1 KB",
          "hash": "4b7917e1",
          "displayUrl": "translator/plots/g45inds_idvgs_4b7917e1.png",
          "scope": "cadence45_spectre-hspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "g45inds",
            "plotType": "idvgs"
          }
        },
        {
          "name": "nch18_idvds.png",
          "relPath": "nch18_idvds.png",
          "format": "png",
          "size": "141.6 KB",
          "hash": "4518d515",
          "displayUrl": "translator/plots/nch18_idvds_4518d515.png",
          "scope": "cadence45_spectre-hspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "nch18",
            "plotType": "idvds"
          }
        },
        {
          "name": "nch18_idvgs.png",
          "relPath": "nch18_idvgs.png",
          "format": "png",
          "size": "79.1 KB",
          "hash": "6697aed7",
          "displayUrl": "translator/plots/nch18_idvgs_6697aed7.png",
          "scope": "cadence45_spectre-hspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "nch18",
            "plotType": "idvgs"
          }
        },
        {
          "name": "nch18_mac_idvds.png",
          "relPath": "nch18_mac_idvds.png",
          "format": "png",
          "size": "142.2 KB",
          "hash": "9c7a0ee2",
          "displayUrl": "translator/plots/nch18_mac_idvds_9c7a0ee2.png",
          "scope": "cadence45_spectre-hspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "nch18",
            "plotType": "idvds"
          }
        },
        {
          "name": "nch18_mac_idvgs.png",
          "relPath": "nch18_mac_idvgs.png",
          "format": "png",
          "size": "80.2 KB",
          "hash": "b49cfa04",
          "displayUrl": "translator/plots/nch18_mac_idvgs_b49cfa04.png",
          "scope": "cadence45_spectre-hspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "nch18",
            "plotType": "idvgs"
          }
        },
        {
          "name": "nch18_na_idvds.png",
          "relPath": "nch18_na_idvds.png",
          "format": "png",
          "size": "141.9 KB",
          "hash": "718cac46",
          "displayUrl": "translator/plots/nch18_na_idvds_718cac46.png",
          "scope": "cadence45_spectre-hspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "nch18",
            "plotType": "idvds"
          }
        },
        {
          "name": "nch18_na_idvgs.png",
          "relPath": "nch18_na_idvgs.png",
          "format": "png",
          "size": "79.7 KB",
          "hash": "373e85d6",
          "displayUrl": "translator/plots/nch18_na_idvgs_373e85d6.png",
          "scope": "cadence45_spectre-hspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "nch18",
            "plotType": "idvgs"
          }
        },
        {
          "name": "nch_idvds.png",
          "relPath": "nch_idvds.png",
          "format": "png",
          "size": "140.9 KB",
          "hash": "19a7ab51",
          "displayUrl": "translator/plots/nch_idvds_19a7ab51.png",
          "scope": "cadence45_spectre-hspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "nch",
            "plotType": "idvds"
          }
        },
        {
          "name": "nch_idvgs.png",
          "relPath": "nch_idvgs.png",
          "format": "png",
          "size": "77.6 KB",
          "hash": "32f53816",
          "displayUrl": "translator/plots/nch_idvgs_32f53816.png",
          "scope": "cadence45_spectre-hspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "nch",
            "plotType": "idvgs"
          }
        },
        {
          "name": "nch_mac_idvds.png",
          "relPath": "nch_mac_idvds.png",
          "format": "png",
          "size": "142.1 KB",
          "hash": "43759a56",
          "displayUrl": "translator/plots/nch_mac_idvds_43759a56.png",
          "scope": "cadence45_spectre-hspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "nch",
            "plotType": "idvds"
          }
        },
        {
          "name": "nch_mac_idvgs.png",
          "relPath": "nch_mac_idvgs.png",
          "format": "png",
          "size": "79.6 KB",
          "hash": "0bf474a3",
          "displayUrl": "translator/plots/nch_mac_idvgs_0bf474a3.png",
          "scope": "cadence45_spectre-hspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "nch",
            "plotType": "idvgs"
          }
        },
        {
          "name": "pch18_mac_idvds.png",
          "relPath": "pch18_mac_idvds.png",
          "format": "png",
          "size": "142.3 KB",
          "hash": "956da3df",
          "displayUrl": "translator/plots/pch18_mac_idvds_956da3df.png",
          "scope": "cadence45_spectre-hspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "pch18",
            "plotType": "idvds"
          }
        },
        {
          "name": "pch18_mac_idvgs.png",
          "relPath": "pch18_mac_idvgs.png",
          "format": "png",
          "size": "64.1 KB",
          "hash": "5a4585c3",
          "displayUrl": "translator/plots/pch18_mac_idvgs_5a4585c3.png",
          "scope": "cadence45_spectre-hspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "pch18",
            "plotType": "idvgs"
          }
        },
        {
          "name": "pch_idvds.png",
          "relPath": "pch_idvds.png",
          "format": "png",
          "size": "140.7 KB",
          "hash": "b9c7fd88",
          "displayUrl": "translator/plots/pch_idvds_b9c7fd88.png",
          "scope": "cadence45_spectre-hspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "pch",
            "plotType": "idvds"
          }
        },
        {
          "name": "pch_idvgs.png",
          "relPath": "pch_idvgs.png",
          "format": "png",
          "size": "60.9 KB",
          "hash": "7ae09f9e",
          "displayUrl": "translator/plots/pch_idvgs_7ae09f9e.png",
          "scope": "cadence45_spectre-hspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "pch",
            "plotType": "idvgs"
          }
        },
        {
          "name": "g45inda_idvds.png",
          "relPath": "g45inda_idvds.png",
          "format": "png",
          "size": "142.3 KB",
          "hash": "7811d7f4",
          "displayUrl": "translator/plots/g45inda_idvds_7811d7f4.png",
          "scope": "cadence45_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "g45inda",
            "plotType": "idvds"
          }
        },
        {
          "name": "g45inda_idvgs.png",
          "relPath": "g45inda_idvgs.png",
          "format": "png",
          "size": "80.3 KB",
          "hash": "b96938b6",
          "displayUrl": "translator/plots/g45inda_idvgs_b96938b6.png",
          "scope": "cadence45_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "g45inda",
            "plotType": "idvgs"
          }
        },
        {
          "name": "g45inds_idvds.png",
          "relPath": "g45inds_idvds.png",
          "format": "png",
          "size": "142.3 KB",
          "hash": "015c99ff",
          "displayUrl": "translator/plots/g45inds_idvds_015c99ff.png",
          "scope": "cadence45_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "g45inds",
            "plotType": "idvds"
          }
        },
        {
          "name": "g45inds_idvgs.png",
          "relPath": "g45inds_idvgs.png",
          "format": "png",
          "size": "80.1 KB",
          "hash": "4b7917e1",
          "displayUrl": "translator/plots/g45inds_idvgs_4b7917e1.png",
          "scope": "cadence45_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "g45inds",
            "plotType": "idvgs"
          }
        },
        {
          "name": "g45nd1hvt_iv.png",
          "relPath": "g45nd1hvt_iv.png",
          "format": "png",
          "size": "53.5 KB",
          "hash": "bb64a720",
          "displayUrl": "translator/plots/g45nd1hvt_iv_bb64a720.png",
          "scope": "cadence45_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "g45nd1hvt iv.png",
            "what": "Original verification output generated by the tool.",
            "why": "Part of the automated translation verification pipeline.",
            "device": "—",
            "plotType": "other"
          }
        },
        {
          "name": "g45nd1lvt_iv.png",
          "relPath": "g45nd1lvt_iv.png",
          "format": "png",
          "size": "53.5 KB",
          "hash": "0135b2fc",
          "displayUrl": "translator/plots/g45nd1lvt_iv_0135b2fc.png",
          "scope": "cadence45_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "g45nd1lvt iv.png",
            "what": "Original verification output generated by the tool.",
            "why": "Part of the automated translation verification pipeline.",
            "device": "—",
            "plotType": "other"
          }
        },
        {
          "name": "g45nd1nvt_iv.png",
          "relPath": "g45nd1nvt_iv.png",
          "format": "png",
          "size": "53.4 KB",
          "hash": "c5da3bee",
          "displayUrl": "translator/plots/g45nd1nvt_iv_c5da3bee.png",
          "scope": "cadence45_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "g45nd1nvt iv.png",
            "what": "Original verification output generated by the tool.",
            "why": "Part of the automated translation verification pipeline.",
            "device": "—",
            "plotType": "other"
          }
        },
        {
          "name": "g45nd1svt_iv.png",
          "relPath": "g45nd1svt_iv.png",
          "format": "png",
          "size": "53.8 KB",
          "hash": "c6f4dee8",
          "displayUrl": "translator/plots/g45nd1svt_iv_c6f4dee8.png",
          "scope": "cadence45_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "g45nd1svt iv.png",
            "what": "Original verification output generated by the tool.",
            "why": "Part of the automated translation verification pipeline.",
            "device": "—",
            "plotType": "other"
          }
        },
        {
          "name": "g45nd2svt_iv.png",
          "relPath": "g45nd2svt_iv.png",
          "format": "png",
          "size": "54.1 KB",
          "hash": "1c5b1d34",
          "displayUrl": "translator/plots/g45nd2svt_iv_1c5b1d34.png",
          "scope": "cadence45_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "g45nd2svt iv.png",
            "what": "Original verification output generated by the tool.",
            "why": "Part of the automated translation verification pipeline.",
            "device": "—",
            "plotType": "other"
          }
        },
        {
          "name": "g45nrdio_iv.png",
          "relPath": "g45nrdio_iv.png",
          "format": "png",
          "size": "53.2 KB",
          "hash": "4cf98022",
          "displayUrl": "translator/plots/g45nrdio_iv_4cf98022.png",
          "scope": "cadence45_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "g45nrdio iv.png",
            "what": "Original verification output generated by the tool.",
            "why": "Part of the automated translation verification pipeline.",
            "device": "—",
            "plotType": "other"
          }
        },
        {
          "name": "g45pd1svt_iv.png",
          "relPath": "g45pd1svt_iv.png",
          "format": "png",
          "size": "53.9 KB",
          "hash": "5bdd94e7",
          "displayUrl": "translator/plots/g45pd1svt_iv_5bdd94e7.png",
          "scope": "cadence45_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "g45pd1svt iv.png",
            "what": "Original verification output generated by the tool.",
            "why": "Part of the automated translation verification pipeline.",
            "device": "—",
            "plotType": "other"
          }
        },
        {
          "name": "g45prdio_iv.png",
          "relPath": "g45prdio_iv.png",
          "format": "png",
          "size": "53.6 KB",
          "hash": "723ebaa9",
          "displayUrl": "translator/plots/g45prdio_iv_723ebaa9.png",
          "scope": "cadence45_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "g45prdio iv.png",
            "what": "Original verification output generated by the tool.",
            "why": "Part of the automated translation verification pipeline.",
            "device": "—",
            "plotType": "other"
          }
        },
        {
          "name": "nch18_idvds.png",
          "relPath": "nch18_idvds.png",
          "format": "png",
          "size": "141.6 KB",
          "hash": "4518d515",
          "displayUrl": "translator/plots/nch18_idvds_4518d515.png",
          "scope": "cadence45_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "nch18",
            "plotType": "idvds"
          }
        },
        {
          "name": "nch18_idvgs.png",
          "relPath": "nch18_idvgs.png",
          "format": "png",
          "size": "79.1 KB",
          "hash": "6697aed7",
          "displayUrl": "translator/plots/nch18_idvgs_6697aed7.png",
          "scope": "cadence45_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "nch18",
            "plotType": "idvgs"
          }
        },
        {
          "name": "nch18_mac_idvds.png",
          "relPath": "nch18_mac_idvds.png",
          "format": "png",
          "size": "142.2 KB",
          "hash": "9c7a0ee2",
          "displayUrl": "translator/plots/nch18_mac_idvds_9c7a0ee2.png",
          "scope": "cadence45_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "nch18",
            "plotType": "idvds"
          }
        },
        {
          "name": "nch18_mac_idvgs.png",
          "relPath": "nch18_mac_idvgs.png",
          "format": "png",
          "size": "80.2 KB",
          "hash": "b49cfa04",
          "displayUrl": "translator/plots/nch18_mac_idvgs_b49cfa04.png",
          "scope": "cadence45_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "nch18",
            "plotType": "idvgs"
          }
        },
        {
          "name": "nch18_na_idvds.png",
          "relPath": "nch18_na_idvds.png",
          "format": "png",
          "size": "141.9 KB",
          "hash": "718cac46",
          "displayUrl": "translator/plots/nch18_na_idvds_718cac46.png",
          "scope": "cadence45_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "nch18",
            "plotType": "idvds"
          }
        },
        {
          "name": "nch18_na_idvgs.png",
          "relPath": "nch18_na_idvgs.png",
          "format": "png",
          "size": "79.7 KB",
          "hash": "373e85d6",
          "displayUrl": "translator/plots/nch18_na_idvgs_373e85d6.png",
          "scope": "cadence45_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "nch18",
            "plotType": "idvgs"
          }
        },
        {
          "name": "nch_hvt_idvds.png",
          "relPath": "nch_hvt_idvds.png",
          "format": "png",
          "size": "141.8 KB",
          "hash": "4da968d3",
          "displayUrl": "translator/plots/nch_hvt_idvds_4da968d3.png",
          "scope": "cadence45_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "nch",
            "plotType": "idvds"
          }
        },
        {
          "name": "nch_hvt_idvgs.png",
          "relPath": "nch_hvt_idvgs.png",
          "format": "png",
          "size": "79.0 KB",
          "hash": "6ff767ec",
          "displayUrl": "translator/plots/nch_hvt_idvgs_6ff767ec.png",
          "scope": "cadence45_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "nch",
            "plotType": "idvgs"
          }
        },
        {
          "name": "nch_idvds.png",
          "relPath": "nch_idvds.png",
          "format": "png",
          "size": "140.9 KB",
          "hash": "19a7ab51",
          "displayUrl": "translator/plots/nch_idvds_19a7ab51.png",
          "scope": "cadence45_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "nch",
            "plotType": "idvds"
          }
        },
        {
          "name": "nch_idvgs.png",
          "relPath": "nch_idvgs.png",
          "format": "png",
          "size": "77.6 KB",
          "hash": "32f53816",
          "displayUrl": "translator/plots/nch_idvgs_32f53816.png",
          "scope": "cadence45_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "nch",
            "plotType": "idvgs"
          }
        },
        {
          "name": "nch_mac_idvds.png",
          "relPath": "nch_mac_idvds.png",
          "format": "png",
          "size": "142.1 KB",
          "hash": "43759a56",
          "displayUrl": "translator/plots/nch_mac_idvds_43759a56.png",
          "scope": "cadence45_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "nch",
            "plotType": "idvds"
          }
        },
        {
          "name": "nch_mac_idvgs.png",
          "relPath": "nch_mac_idvgs.png",
          "format": "png",
          "size": "79.6 KB",
          "hash": "0bf474a3",
          "displayUrl": "translator/plots/nch_mac_idvgs_0bf474a3.png",
          "scope": "cadence45_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "nch",
            "plotType": "idvgs"
          }
        },
        {
          "name": "nwdio_iv.png",
          "relPath": "nwdio_iv.png",
          "format": "png",
          "size": "53.2 KB",
          "hash": "e722df3d",
          "displayUrl": "translator/plots/nwdio_iv_e722df3d.png",
          "scope": "cadence45_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "nwdio iv.png",
            "what": "Original verification output generated by the tool.",
            "why": "Part of the automated translation verification pipeline.",
            "device": "—",
            "plotType": "other"
          }
        },
        {
          "name": "pch18_mac_idvds.png",
          "relPath": "pch18_mac_idvds.png",
          "format": "png",
          "size": "142.3 KB",
          "hash": "956da3df",
          "displayUrl": "translator/plots/pch18_mac_idvds_956da3df.png",
          "scope": "cadence45_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "pch18",
            "plotType": "idvds"
          }
        },
        {
          "name": "pch18_mac_idvgs.png",
          "relPath": "pch18_mac_idvgs.png",
          "format": "png",
          "size": "64.1 KB",
          "hash": "5a4585c3",
          "displayUrl": "translator/plots/pch18_mac_idvgs_5a4585c3.png",
          "scope": "cadence45_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "pch18",
            "plotType": "idvgs"
          }
        },
        {
          "name": "pch_idvds.png",
          "relPath": "pch_idvds.png",
          "format": "png",
          "size": "140.7 KB",
          "hash": "b9c7fd88",
          "displayUrl": "translator/plots/pch_idvds_b9c7fd88.png",
          "scope": "cadence45_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "pch",
            "plotType": "idvds"
          }
        },
        {
          "name": "pch_idvgs.png",
          "relPath": "pch_idvgs.png",
          "format": "png",
          "size": "60.9 KB",
          "hash": "7ae09f9e",
          "displayUrl": "translator/plots/pch_idvgs_7ae09f9e.png",
          "scope": "cadence45_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "pch",
            "plotType": "idvgs"
          }
        },
        {
          "name": "pch_mac_idvds.png",
          "relPath": "pch_mac_idvds.png",
          "format": "png",
          "size": "141.7 KB",
          "hash": "bff93ced",
          "displayUrl": "translator/plots/pch_mac_idvds_bff93ced.png",
          "scope": "cadence45_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "pch",
            "plotType": "idvds"
          }
        },
        {
          "name": "pch_mac_idvgs.png",
          "relPath": "pch_mac_idvgs.png",
          "format": "png",
          "size": "62.7 KB",
          "hash": "95f990ba",
          "displayUrl": "translator/plots/pch_mac_idvgs_95f990ba.png",
          "scope": "cadence45_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "pch",
            "plotType": "idvgs"
          }
        },
        {
          "name": "gpdk090_nmos1v_iso_idvds.png",
          "relPath": "gpdk090_nmos1v_iso_idvds.png",
          "format": "png",
          "size": "144.4 KB",
          "hash": "d75c7cb2",
          "displayUrl": "translator/plots/gpdk090_nmos1v_iso_idvds_d75c7cb2.png",
          "scope": "cadence90_spectre-hspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "gpdk090",
            "plotType": "idvds"
          }
        },
        {
          "name": "gpdk090_nmos1v_iso_idvgs.png",
          "relPath": "gpdk090_nmos1v_iso_idvgs.png",
          "format": "png",
          "size": "85.3 KB",
          "hash": "90f935f9",
          "displayUrl": "translator/plots/gpdk090_nmos1v_iso_idvgs_90f935f9.png",
          "scope": "cadence90_spectre-hspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "gpdk090",
            "plotType": "idvgs"
          }
        },
        {
          "name": "resnspdiff_idvds.png",
          "relPath": "resnspdiff_idvds.png",
          "format": "png",
          "size": "142.6 KB",
          "hash": "a312dffc",
          "displayUrl": "translator/plots/resnspdiff_idvds_a312dffc.png",
          "scope": "cadence90_spectre-hspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "resnspdiff",
            "plotType": "idvds"
          }
        },
        {
          "name": "resnspdiff_idvgs.png",
          "relPath": "resnspdiff_idvgs.png",
          "format": "png",
          "size": "81.2 KB",
          "hash": "52f8e4fd",
          "displayUrl": "translator/plots/resnspdiff_idvgs_52f8e4fd.png",
          "scope": "cadence90_spectre-hspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "resnspdiff",
            "plotType": "idvgs"
          }
        },
        {
          "name": "ressndiff_idvds.png",
          "relPath": "ressndiff_idvds.png",
          "format": "png",
          "size": "142.3 KB",
          "hash": "2c6f17b7",
          "displayUrl": "translator/plots/ressndiff_idvds_2c6f17b7.png",
          "scope": "cadence90_spectre-hspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "ressndiff",
            "plotType": "idvds"
          }
        },
        {
          "name": "ressndiff_idvgs.png",
          "relPath": "ressndiff_idvgs.png",
          "format": "png",
          "size": "79.9 KB",
          "hash": "9297d1ad",
          "displayUrl": "translator/plots/ressndiff_idvgs_9297d1ad.png",
          "scope": "cadence90_spectre-hspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "ressndiff",
            "plotType": "idvgs"
          }
        },
        {
          "name": "resspdiff_idvds.png",
          "relPath": "resspdiff_idvds.png",
          "format": "png",
          "size": "142.3 KB",
          "hash": "666357f8",
          "displayUrl": "translator/plots/resspdiff_idvds_666357f8.png",
          "scope": "cadence90_spectre-hspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "resspdiff",
            "plotType": "idvds"
          }
        },
        {
          "name": "resspdiff_idvgs.png",
          "relPath": "resspdiff_idvgs.png",
          "format": "png",
          "size": "80.2 KB",
          "hash": "c6b1aa1a",
          "displayUrl": "translator/plots/resspdiff_idvgs_c6b1aa1a.png",
          "scope": "cadence90_spectre-hspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "resspdiff",
            "plotType": "idvgs"
          }
        },
        {
          "name": "gpdk090_nmos1v_hvt_idvds.png",
          "relPath": "gpdk090_nmos1v_hvt_idvds.png",
          "format": "png",
          "size": "144.3 KB",
          "hash": "81f64049",
          "displayUrl": "translator/plots/gpdk090_nmos1v_hvt_idvds_81f64049.png",
          "scope": "cadence90_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "gpdk090",
            "plotType": "idvds"
          }
        },
        {
          "name": "gpdk090_nmos1v_hvt_idvgs.png",
          "relPath": "gpdk090_nmos1v_hvt_idvgs.png",
          "format": "png",
          "size": "84.9 KB",
          "hash": "8fdcf5c5",
          "displayUrl": "translator/plots/gpdk090_nmos1v_hvt_idvgs_8fdcf5c5.png",
          "scope": "cadence90_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "gpdk090",
            "plotType": "idvgs"
          }
        },
        {
          "name": "gpdk090_nmos1v_hvt_x_idvds.png",
          "relPath": "gpdk090_nmos1v_hvt_x_idvds.png",
          "format": "png",
          "size": "144.6 KB",
          "hash": "4073dc6b",
          "displayUrl": "translator/plots/gpdk090_nmos1v_hvt_x_idvds_4073dc6b.png",
          "scope": "cadence90_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "gpdk090",
            "plotType": "idvds"
          }
        },
        {
          "name": "gpdk090_nmos1v_hvt_x_idvgs.png",
          "relPath": "gpdk090_nmos1v_hvt_x_idvgs.png",
          "format": "png",
          "size": "85.5 KB",
          "hash": "a974300f",
          "displayUrl": "translator/plots/gpdk090_nmos1v_hvt_x_idvgs_a974300f.png",
          "scope": "cadence90_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "gpdk090",
            "plotType": "idvgs"
          }
        },
        {
          "name": "gpdk090_nmos1v_iso_idvds.png",
          "relPath": "gpdk090_nmos1v_iso_idvds.png",
          "format": "png",
          "size": "144.4 KB",
          "hash": "d75c7cb2",
          "displayUrl": "translator/plots/gpdk090_nmos1v_iso_idvds_d75c7cb2.png",
          "scope": "cadence90_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "gpdk090",
            "plotType": "idvds"
          }
        },
        {
          "name": "gpdk090_nmos1v_iso_idvgs.png",
          "relPath": "gpdk090_nmos1v_iso_idvgs.png",
          "format": "png",
          "size": "85.3 KB",
          "hash": "90f935f9",
          "displayUrl": "translator/plots/gpdk090_nmos1v_iso_idvgs_90f935f9.png",
          "scope": "cadence90_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "gpdk090",
            "plotType": "idvgs"
          }
        },
        {
          "name": "gpdk090_nmos1v_nat_x_idvds.png",
          "relPath": "gpdk090_nmos1v_nat_x_idvds.png",
          "format": "png",
          "size": "144.5 KB",
          "hash": "9b9de4f6",
          "displayUrl": "translator/plots/gpdk090_nmos1v_nat_x_idvds_9b9de4f6.png",
          "scope": "cadence90_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "gpdk090",
            "plotType": "idvds"
          }
        },
        {
          "name": "gpdk090_nmos1v_nat_x_idvgs.png",
          "relPath": "gpdk090_nmos1v_nat_x_idvgs.png",
          "format": "png",
          "size": "85.5 KB",
          "hash": "f1375986",
          "displayUrl": "translator/plots/gpdk090_nmos1v_nat_x_idvgs_f1375986.png",
          "scope": "cadence90_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "gpdk090",
            "plotType": "idvgs"
          }
        },
        {
          "name": "gpdk090_nmos1v_x_idvds.png",
          "relPath": "gpdk090_nmos1v_x_idvds.png",
          "format": "png",
          "size": "144.1 KB",
          "hash": "1ece243f",
          "displayUrl": "translator/plots/gpdk090_nmos1v_x_idvds_1ece243f.png",
          "scope": "cadence90_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "gpdk090",
            "plotType": "idvds"
          }
        },
        {
          "name": "gpdk090_nmos1v_x_idvgs.png",
          "relPath": "gpdk090_nmos1v_x_idvgs.png",
          "format": "png",
          "size": "84.5 KB",
          "hash": "eb02b849",
          "displayUrl": "translator/plots/gpdk090_nmos1v_x_idvgs_eb02b849.png",
          "scope": "cadence90_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "gpdk090",
            "plotType": "idvgs"
          }
        },
        {
          "name": "gpdk090_nmoscap1v_hvt_idvds.png",
          "relPath": "gpdk090_nmoscap1v_hvt_idvds.png",
          "format": "png",
          "size": "144.8 KB",
          "hash": "d8cbef19",
          "displayUrl": "translator/plots/gpdk090_nmoscap1v_hvt_idvds_d8cbef19.png",
          "scope": "cadence90_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "gpdk090",
            "plotType": "idvds"
          }
        },
        {
          "name": "gpdk090_nmoscap1v_hvt_idvgs.png",
          "relPath": "gpdk090_nmoscap1v_hvt_idvgs.png",
          "format": "png",
          "size": "86.2 KB",
          "hash": "5e54aa90",
          "displayUrl": "translator/plots/gpdk090_nmoscap1v_hvt_idvgs_5e54aa90.png",
          "scope": "cadence90_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "gpdk090",
            "plotType": "idvgs"
          }
        },
        {
          "name": "gpdk090_nmoscap1v_idvds.png",
          "relPath": "gpdk090_nmoscap1v_idvds.png",
          "format": "png",
          "size": "144.2 KB",
          "hash": "7aa3185c",
          "displayUrl": "translator/plots/gpdk090_nmoscap1v_idvds_7aa3185c.png",
          "scope": "cadence90_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "gpdk090",
            "plotType": "idvds"
          }
        },
        {
          "name": "gpdk090_nmoscap1v_idvgs.png",
          "relPath": "gpdk090_nmoscap1v_idvgs.png",
          "format": "png",
          "size": "85.3 KB",
          "hash": "65e8c182",
          "displayUrl": "translator/plots/gpdk090_nmoscap1v_idvgs_65e8c182.png",
          "scope": "cadence90_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "gpdk090",
            "plotType": "idvgs"
          }
        },
        {
          "name": "gpdk090_nmoscap2v_idvds.png",
          "relPath": "gpdk090_nmoscap2v_idvds.png",
          "format": "png",
          "size": "144.4 KB",
          "hash": "61caeaa8",
          "displayUrl": "translator/plots/gpdk090_nmoscap2v_idvds_61caeaa8.png",
          "scope": "cadence90_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "gpdk090",
            "plotType": "idvds"
          }
        },
        {
          "name": "gpdk090_nmoscap2v_idvgs.png",
          "relPath": "gpdk090_nmoscap2v_idvgs.png",
          "format": "png",
          "size": "85.5 KB",
          "hash": "d8cab669",
          "displayUrl": "translator/plots/gpdk090_nmoscap2v_idvgs_d8cab669.png",
          "scope": "cadence90_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "gpdk090",
            "plotType": "idvgs"
          }
        },
        {
          "name": "gpdk090_npn_gummel.png",
          "relPath": "gpdk090_npn_gummel.png",
          "format": "png",
          "size": "91.0 KB",
          "hash": "4b6230ff",
          "displayUrl": "translator/plots/gpdk090_npn_gummel_4b6230ff.png",
          "scope": "cadence90_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Gummel Plot",
            "what": "Collector and base current vs base-emitter voltage for BJT devices.",
            "why": "Validates current gain (beta) and junction characteristics after translation.",
            "device": "gpdk090",
            "plotType": "gummel"
          }
        },
        {
          "name": "gpdk090_pmos1v_hvt_idvds.png",
          "relPath": "gpdk090_pmos1v_hvt_idvds.png",
          "format": "png",
          "size": "144.2 KB",
          "hash": "3a83c16e",
          "displayUrl": "translator/plots/gpdk090_pmos1v_hvt_idvds_3a83c16e.png",
          "scope": "cadence90_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "gpdk090",
            "plotType": "idvds"
          }
        },
        {
          "name": "gpdk090_pmos1v_hvt_idvgs.png",
          "relPath": "gpdk090_pmos1v_hvt_idvgs.png",
          "format": "png",
          "size": "68.3 KB",
          "hash": "a96ce645",
          "displayUrl": "translator/plots/gpdk090_pmos1v_hvt_idvgs_a96ce645.png",
          "scope": "cadence90_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "gpdk090",
            "plotType": "idvgs"
          }
        },
        {
          "name": "gpdk090_pmos1v_x_idvds.png",
          "relPath": "gpdk090_pmos1v_x_idvds.png",
          "format": "png",
          "size": "144.0 KB",
          "hash": "1306dc9c",
          "displayUrl": "translator/plots/gpdk090_pmos1v_x_idvds_1306dc9c.png",
          "scope": "cadence90_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "gpdk090",
            "plotType": "idvds"
          }
        },
        {
          "name": "gpdk090_pmos1v_x_idvgs.png",
          "relPath": "gpdk090_pmos1v_x_idvgs.png",
          "format": "png",
          "size": "67.9 KB",
          "hash": "fae0b02e",
          "displayUrl": "translator/plots/gpdk090_pmos1v_x_idvgs_fae0b02e.png",
          "scope": "cadence90_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "gpdk090",
            "plotType": "idvgs"
          }
        },
        {
          "name": "gpdk090_pmoscap2v_idvds.png",
          "relPath": "gpdk090_pmoscap2v_idvds.png",
          "format": "png",
          "size": "144.4 KB",
          "hash": "0f7a365a",
          "displayUrl": "translator/plots/gpdk090_pmoscap2v_idvds_0f7a365a.png",
          "scope": "cadence90_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "gpdk090",
            "plotType": "idvds"
          }
        },
        {
          "name": "gpdk090_pmoscap2v_idvgs.png",
          "relPath": "gpdk090_pmoscap2v_idvgs.png",
          "format": "png",
          "size": "68.6 KB",
          "hash": "df48dd86",
          "displayUrl": "translator/plots/gpdk090_pmoscap2v_idvgs_df48dd86.png",
          "scope": "cadence90_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "gpdk090",
            "plotType": "idvgs"
          }
        },
        {
          "name": "gpdk090_pnp_gummel.png",
          "relPath": "gpdk090_pnp_gummel.png",
          "format": "png",
          "size": "88.3 KB",
          "hash": "009214f5",
          "displayUrl": "translator/plots/gpdk090_pnp_gummel_009214f5.png",
          "scope": "cadence90_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Gummel Plot",
            "what": "Collector and base current vs base-emitter voltage for BJT devices.",
            "why": "Validates current gain (beta) and junction characteristics after translation.",
            "device": "gpdk090",
            "plotType": "gummel"
          }
        },
        {
          "name": "NMOS_THKOX_idvds.png",
          "relPath": "NMOS_THKOX_idvds.png",
          "format": "png",
          "size": "94.8 KB",
          "hash": "7e70bfec",
          "displayUrl": "translator/plots/NMOS_THKOX_idvds_7e70bfec.png",
          "scope": "freepdk45_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "NMOS",
            "plotType": "idvds"
          }
        },
        {
          "name": "NMOS_THKOX_idvgs.png",
          "relPath": "NMOS_THKOX_idvgs.png",
          "format": "png",
          "size": "73.4 KB",
          "hash": "37b7da04",
          "displayUrl": "translator/plots/NMOS_THKOX_idvgs_37b7da04.png",
          "scope": "freepdk45_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "NMOS",
            "plotType": "idvgs"
          }
        },
        {
          "name": "NMOS_VTG_idvds.png",
          "relPath": "NMOS_VTG_idvds.png",
          "format": "png",
          "size": "135.0 KB",
          "hash": "9c536ad7",
          "displayUrl": "translator/plots/NMOS_VTG_idvds_9c536ad7.png",
          "scope": "freepdk45_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "NMOS",
            "plotType": "idvds"
          }
        },
        {
          "name": "NMOS_VTG_idvgs.png",
          "relPath": "NMOS_VTG_idvgs.png",
          "format": "png",
          "size": "78.8 KB",
          "hash": "9440e12e",
          "displayUrl": "translator/plots/NMOS_VTG_idvgs_9440e12e.png",
          "scope": "freepdk45_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "NMOS",
            "plotType": "idvgs"
          }
        },
        {
          "name": "NMOS_VTH_idvds.png",
          "relPath": "NMOS_VTH_idvds.png",
          "format": "png",
          "size": "130.0 KB",
          "hash": "9022d5eb",
          "displayUrl": "translator/plots/NMOS_VTH_idvds_9022d5eb.png",
          "scope": "freepdk45_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "NMOS",
            "plotType": "idvds"
          }
        },
        {
          "name": "NMOS_VTH_idvgs.png",
          "relPath": "NMOS_VTH_idvgs.png",
          "format": "png",
          "size": "78.6 KB",
          "hash": "73a4a08b",
          "displayUrl": "translator/plots/NMOS_VTH_idvgs_73a4a08b.png",
          "scope": "freepdk45_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "NMOS",
            "plotType": "idvgs"
          }
        },
        {
          "name": "NMOS_VTL_idvds.png",
          "relPath": "NMOS_VTL_idvds.png",
          "format": "png",
          "size": "134.4 KB",
          "hash": "ba3d3b50",
          "displayUrl": "translator/plots/NMOS_VTL_idvds_ba3d3b50.png",
          "scope": "freepdk45_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "NMOS",
            "plotType": "idvds"
          }
        },
        {
          "name": "NMOS_VTL_idvgs.png",
          "relPath": "NMOS_VTL_idvgs.png",
          "format": "png",
          "size": "75.8 KB",
          "hash": "27f82fcb",
          "displayUrl": "translator/plots/NMOS_VTL_idvgs_27f82fcb.png",
          "scope": "freepdk45_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "NMOS",
            "plotType": "idvgs"
          }
        },
        {
          "name": "PMOS_VTG_idvds.png",
          "relPath": "PMOS_VTG_idvds.png",
          "format": "png",
          "size": "135.1 KB",
          "hash": "7a735bf6",
          "displayUrl": "translator/plots/PMOS_VTG_idvds_7a735bf6.png",
          "scope": "freepdk45_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "PMOS",
            "plotType": "idvds"
          }
        },
        {
          "name": "PMOS_VTG_idvgs.png",
          "relPath": "PMOS_VTG_idvgs.png",
          "format": "png",
          "size": "59.9 KB",
          "hash": "8e63b5c0",
          "displayUrl": "translator/plots/PMOS_VTG_idvgs_8e63b5c0.png",
          "scope": "freepdk45_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "PMOS",
            "plotType": "idvgs"
          }
        },
        {
          "name": "verification_summary.png",
          "relPath": "verification_summary.png",
          "format": "png",
          "size": "396.1 KB",
          "hash": "77c9b3be",
          "displayUrl": "translator/plots/verification_summary_77c9b3be.png",
          "scope": "freepdk45_hspice-ngspice",
          "width": 2197,
          "height": 1181,
          "aspectRatio": 1.86,
          "caption": {
            "title": "Verification Summary",
            "what": "Overview of all verification checks for this result.",
            "why": "Confirms translation correctness across DC, AC, transient, and noise domains.",
            "device": "—",
            "plotType": "verification_summary"
          }
        },
        {
          "name": "dnwpsubdio_iv.png",
          "relPath": "dnwpsubdio_iv.png",
          "format": "png",
          "size": "56.7 KB",
          "hash": "62c41e9b",
          "displayUrl": "translator/plots/dnwpsubdio_iv_62c41e9b.png",
          "scope": "hlmc40lp_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "dnwpsubdio iv.png",
            "what": "Original verification output generated by the tool.",
            "why": "Part of the automated translation verification pipeline.",
            "device": "—",
            "plotType": "other"
          }
        },
        {
          "name": "dnwpsubdio_rf_iv.png",
          "relPath": "dnwpsubdio_rf_iv.png",
          "format": "png",
          "size": "56.9 KB",
          "hash": "f5079829",
          "displayUrl": "translator/plots/dnwpsubdio_rf_iv_f5079829.png",
          "scope": "hlmc40lp_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "dnwpsubdio rf iv.png",
            "what": "Original verification output generated by the tool.",
            "why": "Part of the automated translation verification pipeline.",
            "device": "—",
            "plotType": "other"
          }
        },
        {
          "name": "n11hvt_idvds.png",
          "relPath": "n11hvt_idvds.png",
          "format": "png",
          "size": "132.0 KB",
          "hash": "a387d38f",
          "displayUrl": "translator/plots/n11hvt_idvds_a387d38f.png",
          "scope": "hlmc40lp_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "n11hvt",
            "plotType": "idvds"
          }
        },
        {
          "name": "n11hvt_idvgs.png",
          "relPath": "n11hvt_idvgs.png",
          "format": "png",
          "size": "75.9 KB",
          "hash": "aa6dd455",
          "displayUrl": "translator/plots/n11hvt_idvgs_aa6dd455.png",
          "scope": "hlmc40lp_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "n11hvt",
            "plotType": "idvgs"
          }
        },
        {
          "name": "n11lvt_idvds.png",
          "relPath": "n11lvt_idvds.png",
          "format": "png",
          "size": "134.8 KB",
          "hash": "c0a453f5",
          "displayUrl": "translator/plots/n11lvt_idvds_c0a453f5.png",
          "scope": "hlmc40lp_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "n11lvt",
            "plotType": "idvds"
          }
        },
        {
          "name": "n11lvt_idvgs.png",
          "relPath": "n11lvt_idvgs.png",
          "format": "png",
          "size": "72.9 KB",
          "hash": "d4521397",
          "displayUrl": "translator/plots/n11lvt_idvgs_d4521397.png",
          "scope": "hlmc40lp_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "n11lvt",
            "plotType": "idvgs"
          }
        },
        {
          "name": "n11rvt_idvds.png",
          "relPath": "n11rvt_idvds.png",
          "format": "png",
          "size": "135.2 KB",
          "hash": "8035f34e",
          "displayUrl": "translator/plots/n11rvt_idvds_8035f34e.png",
          "scope": "hlmc40lp_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "n11rvt",
            "plotType": "idvds"
          }
        },
        {
          "name": "n11rvt_idvgs.png",
          "relPath": "n11rvt_idvgs.png",
          "format": "png",
          "size": "72.8 KB",
          "hash": "c1a41381",
          "displayUrl": "translator/plots/n11rvt_idvgs_c1a41381.png",
          "scope": "hlmc40lp_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "n11rvt",
            "plotType": "idvgs"
          }
        },
        {
          "name": "ndio11hvt_rf_f_iv.png",
          "relPath": "ndio11hvt_rf_f_iv.png",
          "format": "png",
          "size": "51.2 KB",
          "hash": "6f4016d7",
          "displayUrl": "translator/plots/ndio11hvt_rf_f_iv_6f4016d7.png",
          "scope": "hlmc40lp_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "ndio11hvt rf f iv.png",
            "what": "Original verification output generated by the tool.",
            "why": "Part of the automated translation verification pipeline.",
            "device": "—",
            "plotType": "other"
          }
        },
        {
          "name": "ndio11rvt_rf_iv.png",
          "relPath": "ndio11rvt_rf_iv.png",
          "format": "png",
          "size": "56.3 KB",
          "hash": "0ec75783",
          "displayUrl": "translator/plots/ndio11rvt_rf_iv_0ec75783.png",
          "scope": "hlmc40lp_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "ndio11rvt rf iv.png",
            "what": "Original verification output generated by the tool.",
            "why": "Part of the automated translation verification pipeline.",
            "device": "—",
            "plotType": "other"
          }
        },
        {
          "name": "ndio1_iv.png",
          "relPath": "ndio1_iv.png",
          "format": "png",
          "size": "55.4 KB",
          "hash": "512a5656",
          "displayUrl": "translator/plots/ndio1_iv_512a5656.png",
          "scope": "hlmc40lp_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "ndio1 iv.png",
            "what": "Original verification output generated by the tool.",
            "why": "Part of the automated translation verification pipeline.",
            "device": "—",
            "plotType": "other"
          }
        },
        {
          "name": "ndio_rf_iv.png",
          "relPath": "ndio_rf_iv.png",
          "format": "png",
          "size": "50.4 KB",
          "hash": "d7063f6d",
          "displayUrl": "translator/plots/ndio_rf_iv_d7063f6d.png",
          "scope": "hlmc40lp_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "ndio rf iv.png",
            "what": "Original verification output generated by the tool.",
            "why": "Part of the automated translation verification pipeline.",
            "device": "—",
            "plotType": "other"
          }
        },
        {
          "name": "p11rvt_idvds.png",
          "relPath": "p11rvt_idvds.png",
          "format": "png",
          "size": "134.5 KB",
          "hash": "e66b1f02",
          "displayUrl": "translator/plots/p11rvt_idvds_e66b1f02.png",
          "scope": "hlmc40lp_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "p11rvt",
            "plotType": "idvds"
          }
        },
        {
          "name": "p11rvt_idvgs.png",
          "relPath": "p11rvt_idvgs.png",
          "format": "png",
          "size": "60.5 KB",
          "hash": "e3d50216",
          "displayUrl": "translator/plots/p11rvt_idvgs_e3d50216.png",
          "scope": "hlmc40lp_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "p11rvt",
            "plotType": "idvgs"
          }
        },
        {
          "name": "pwdnwdio_iv.png",
          "relPath": "pwdnwdio_iv.png",
          "format": "png",
          "size": "53.2 KB",
          "hash": "967aaf9f",
          "displayUrl": "translator/plots/pwdnwdio_iv_967aaf9f.png",
          "scope": "hlmc40lp_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "pwdnwdio iv.png",
            "what": "Original verification output generated by the tool.",
            "why": "Part of the automated translation verification pipeline.",
            "device": "—",
            "plotType": "other"
          }
        },
        {
          "name": "N12_LP_idvds.png",
          "relPath": "N12_LP_idvds.png",
          "format": "png",
          "size": "136.3 KB",
          "hash": "b56bf9ac",
          "displayUrl": "translator/plots/N12_LP_idvds_b56bf9ac.png",
          "scope": "hlmc55lp_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "N12",
            "plotType": "idvds"
          }
        },
        {
          "name": "N12_LP_idvgs.png",
          "relPath": "N12_LP_idvgs.png",
          "format": "png",
          "size": "73.5 KB",
          "hash": "f4a31c23",
          "displayUrl": "translator/plots/N12_LP_idvgs_f4a31c23.png",
          "scope": "hlmc55lp_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "N12",
            "plotType": "idvgs"
          }
        },
        {
          "name": "N25OD33_LP_idvds.png",
          "relPath": "N25OD33_LP_idvds.png",
          "format": "png",
          "size": "146.3 KB",
          "hash": "12ad6583",
          "displayUrl": "translator/plots/N25OD33_LP_idvds_12ad6583.png",
          "scope": "hlmc55lp_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "N25OD33",
            "plotType": "idvds"
          }
        },
        {
          "name": "N25OD33_LP_idvgs.png",
          "relPath": "N25OD33_LP_idvgs.png",
          "format": "png",
          "size": "79.5 KB",
          "hash": "23ba61ef",
          "displayUrl": "translator/plots/N25OD33_LP_idvgs_23ba61ef.png",
          "scope": "hlmc55lp_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "N25OD33",
            "plotType": "idvgs"
          }
        },
        {
          "name": "N25_LP_idvds.png",
          "relPath": "N25_LP_idvds.png",
          "format": "png",
          "size": "144.8 KB",
          "hash": "932c6d72",
          "displayUrl": "translator/plots/N25_LP_idvds_932c6d72.png",
          "scope": "hlmc55lp_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "N25",
            "plotType": "idvds"
          }
        },
        {
          "name": "N25_LP_idvgs.png",
          "relPath": "N25_LP_idvgs.png",
          "format": "png",
          "size": "76.6 KB",
          "hash": "7294a556",
          "displayUrl": "translator/plots/N25_LP_idvgs_7294a556.png",
          "scope": "hlmc55lp_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "N25",
            "plotType": "idvgs"
          }
        },
        {
          "name": "NHVT12_LP_idvds.png",
          "relPath": "NHVT12_LP_idvds.png",
          "format": "png",
          "size": "127.8 KB",
          "hash": "d682e967",
          "displayUrl": "translator/plots/NHVT12_LP_idvds_d682e967.png",
          "scope": "hlmc55lp_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "NHVT12",
            "plotType": "idvds"
          }
        },
        {
          "name": "NHVT12_LP_idvgs.png",
          "relPath": "NHVT12_LP_idvgs.png",
          "format": "png",
          "size": "79.9 KB",
          "hash": "514f0610",
          "displayUrl": "translator/plots/NHVT12_LP_idvgs_514f0610.png",
          "scope": "hlmc55lp_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "NHVT12",
            "plotType": "idvgs"
          }
        },
        {
          "name": "NPN12A100_LP_gummel.png",
          "relPath": "NPN12A100_LP_gummel.png",
          "format": "png",
          "size": "92.2 KB",
          "hash": "21b1ca6c",
          "displayUrl": "translator/plots/NPN12A100_LP_gummel_21b1ca6c.png",
          "scope": "hlmc55lp_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Gummel Plot",
            "what": "Collector and base current vs base-emitter voltage for BJT devices.",
            "why": "Validates current gain (beta) and junction characteristics after translation.",
            "device": "NPN12A100",
            "plotType": "gummel"
          }
        },
        {
          "name": "NPN12A25_LP_gummel.png",
          "relPath": "NPN12A25_LP_gummel.png",
          "format": "png",
          "size": "92.2 KB",
          "hash": "0b4524d9",
          "displayUrl": "translator/plots/NPN12A25_LP_gummel_0b4524d9.png",
          "scope": "hlmc55lp_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Gummel Plot",
            "what": "Collector and base current vs base-emitter voltage for BJT devices.",
            "why": "Validates current gain (beta) and junction characteristics after translation.",
            "device": "NPN12A25",
            "plotType": "gummel"
          }
        },
        {
          "name": "NPN12A4_LP_gummel.png",
          "relPath": "NPN12A4_LP_gummel.png",
          "format": "png",
          "size": "90.5 KB",
          "hash": "574b2725",
          "displayUrl": "translator/plots/NPN12A4_LP_gummel_574b2725.png",
          "scope": "hlmc55lp_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Gummel Plot",
            "what": "Collector and base current vs base-emitter voltage for BJT devices.",
            "why": "Validates current gain (beta) and junction characteristics after translation.",
            "device": "NPN12A4",
            "plotType": "gummel"
          }
        },
        {
          "name": "P12_LP_idvds.png",
          "relPath": "P12_LP_idvds.png",
          "format": "png",
          "size": "139.7 KB",
          "hash": "c369d201",
          "displayUrl": "translator/plots/P12_LP_idvds_c369d201.png",
          "scope": "hlmc55lp_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "P12",
            "plotType": "idvds"
          }
        },
        {
          "name": "P12_LP_idvgs.png",
          "relPath": "P12_LP_idvgs.png",
          "format": "png",
          "size": "57.8 KB",
          "hash": "b5831318",
          "displayUrl": "translator/plots/P12_LP_idvgs_b5831318.png",
          "scope": "hlmc55lp_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "P12",
            "plotType": "idvgs"
          }
        },
        {
          "name": "PNP12A100_LP_gummel.png",
          "relPath": "PNP12A100_LP_gummel.png",
          "format": "png",
          "size": "91.1 KB",
          "hash": "8ec8c53e",
          "displayUrl": "translator/plots/PNP12A100_LP_gummel_8ec8c53e.png",
          "scope": "hlmc55lp_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Gummel Plot",
            "what": "Collector and base current vs base-emitter voltage for BJT devices.",
            "why": "Validates current gain (beta) and junction characteristics after translation.",
            "device": "PNP12A100",
            "plotType": "gummel"
          }
        },
        {
          "name": "PNP12A25_LP_gummel.png",
          "relPath": "PNP12A25_LP_gummel.png",
          "format": "png",
          "size": "91.6 KB",
          "hash": "a7d8108f",
          "displayUrl": "translator/plots/PNP12A25_LP_gummel_a7d8108f.png",
          "scope": "hlmc55lp_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Gummel Plot",
            "what": "Collector and base current vs base-emitter voltage for BJT devices.",
            "why": "Validates current gain (beta) and junction characteristics after translation.",
            "device": "PNP12A25",
            "plotType": "gummel"
          }
        },
        {
          "name": "PNP12A4_LP_gummel.png",
          "relPath": "PNP12A4_LP_gummel.png",
          "format": "png",
          "size": "90.9 KB",
          "hash": "e403f3e2",
          "displayUrl": "translator/plots/PNP12A4_LP_gummel_e403f3e2.png",
          "scope": "hlmc55lp_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Gummel Plot",
            "what": "Collector and base current vs base-emitter voltage for BJT devices.",
            "why": "Validates current gain (beta) and junction characteristics after translation.",
            "device": "PNP12A4",
            "plotType": "gummel"
          }
        },
        {
          "name": "dioddpnbl_iv.png",
          "relPath": "dioddpnbl_iv.png",
          "format": "png",
          "size": "51.5 KB",
          "hash": "f8bd9ffb",
          "displayUrl": "translator/plots/dioddpnbl_iv_f8bd9ffb.png",
          "scope": "smic180HV_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "dioddpnbl iv.png",
            "what": "Original verification output generated by the tool.",
            "why": "Part of the automated translation verification pipeline.",
            "device": "—",
            "plotType": "other"
          }
        },
        {
          "name": "dionbl_iv.png",
          "relPath": "dionbl_iv.png",
          "format": "png",
          "size": "52.3 KB",
          "hash": "47129c11",
          "displayUrl": "translator/plots/dionbl_iv_47129c11.png",
          "scope": "smic180HV_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "dionbl iv.png",
            "what": "Original verification output generated by the tool.",
            "why": "Part of the automated translation verification pipeline.",
            "device": "—",
            "plotType": "other"
          }
        },
        {
          "name": "diondfddp_1_iv.png",
          "relPath": "diondfddp_1_iv.png",
          "format": "png",
          "size": "54.9 KB",
          "hash": "8c17668c",
          "displayUrl": "translator/plots/diondfddp_1_iv_8c17668c.png",
          "scope": "smic180HV_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "diondfddp 1 iv.png",
            "what": "Original verification output generated by the tool.",
            "why": "Part of the automated translation verification pipeline.",
            "device": "—",
            "plotType": "other"
          }
        },
        {
          "name": "diondfddp_iv.png",
          "relPath": "diondfddp_iv.png",
          "format": "png",
          "size": "54.8 KB",
          "hash": "543c6081",
          "displayUrl": "translator/plots/diondfddp_iv_543c6081.png",
          "scope": "smic180HV_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "diondfddp iv.png",
            "what": "Original verification output generated by the tool.",
            "why": "Part of the automated translation verification pipeline.",
            "device": "—",
            "plotType": "other"
          }
        },
        {
          "name": "n18_ckt_idvds.png",
          "relPath": "n18_ckt_idvds.png",
          "format": "png",
          "size": "131.7 KB",
          "hash": "411b932b",
          "displayUrl": "translator/plots/n18_ckt_idvds_411b932b.png",
          "scope": "smic180HV_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "n18",
            "plotType": "idvds"
          }
        },
        {
          "name": "n18_ckt_idvgs.png",
          "relPath": "n18_ckt_idvgs.png",
          "format": "png",
          "size": "75.0 KB",
          "hash": "611e9c5b",
          "displayUrl": "translator/plots/n18_ckt_idvgs_611e9c5b.png",
          "scope": "smic180HV_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "n18",
            "plotType": "idvgs"
          }
        },
        {
          "name": "n18_gg_iso_iv.png",
          "relPath": "n18_gg_iso_iv.png",
          "format": "png",
          "size": "59.5 KB",
          "hash": "318f6fc2",
          "displayUrl": "translator/plots/n18_gg_iso_iv_318f6fc2.png",
          "scope": "smic180HV_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "n18 gg iso iv.png",
            "what": "Original verification output generated by the tool.",
            "why": "Part of the automated translation verification pipeline.",
            "device": "—",
            "plotType": "other"
          }
        },
        {
          "name": "n18_gg_iv.png",
          "relPath": "n18_gg_iv.png",
          "format": "png",
          "size": "58.6 KB",
          "hash": "19c00968",
          "displayUrl": "translator/plots/n18_gg_iv_19c00968.png",
          "scope": "smic180HV_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "n18 gg iv.png",
            "what": "Original verification output generated by the tool.",
            "why": "Part of the automated translation verification pipeline.",
            "device": "—",
            "plotType": "other"
          }
        },
        {
          "name": "n18_idvds.png",
          "relPath": "n18_idvds.png",
          "format": "png",
          "size": "131.4 KB",
          "hash": "819af494",
          "displayUrl": "translator/plots/n18_idvds_819af494.png",
          "scope": "smic180HV_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "n18",
            "plotType": "idvds"
          }
        },
        {
          "name": "n18_idvgs.png",
          "relPath": "n18_idvgs.png",
          "format": "png",
          "size": "73.7 KB",
          "hash": "5b951408",
          "displayUrl": "translator/plots/n18_idvgs_5b951408.png",
          "scope": "smic180HV_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "n18",
            "plotType": "idvgs"
          }
        },
        {
          "name": "n18_iso_ckt_idvds.png",
          "relPath": "n18_iso_ckt_idvds.png",
          "format": "png",
          "size": "132.3 KB",
          "hash": "0b6274ee",
          "displayUrl": "translator/plots/n18_iso_ckt_idvds_0b6274ee.png",
          "scope": "smic180HV_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "n18",
            "plotType": "idvds"
          }
        },
        {
          "name": "n18_iso_ckt_idvgs.png",
          "relPath": "n18_iso_ckt_idvgs.png",
          "format": "png",
          "size": "76.7 KB",
          "hash": "f4a2fc84",
          "displayUrl": "translator/plots/n18_iso_ckt_idvgs_f4a2fc84.png",
          "scope": "smic180HV_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "n18",
            "plotType": "idvgs"
          }
        },
        {
          "name": "n50_gg_iv.png",
          "relPath": "n50_gg_iv.png",
          "format": "png",
          "size": "59.1 KB",
          "hash": "25157473",
          "displayUrl": "translator/plots/n50_gg_iv_25157473.png",
          "scope": "smic180HV_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "n50 gg iv.png",
            "what": "Original verification output generated by the tool.",
            "why": "Part of the automated translation verification pipeline.",
            "device": "—",
            "plotType": "other"
          }
        },
        {
          "name": "nde40_semi_iso_ckt_idvds.png",
          "relPath": "nde40_semi_iso_ckt_idvds.png",
          "format": "png",
          "size": "125.5 KB",
          "hash": "cd0c12a9",
          "displayUrl": "translator/plots/nde40_semi_iso_ckt_idvds_cd0c12a9.png",
          "scope": "smic180HV_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "nde40",
            "plotType": "idvds"
          }
        },
        {
          "name": "nde40_semi_iso_ckt_idvgs.png",
          "relPath": "nde40_semi_iso_ckt_idvgs.png",
          "format": "png",
          "size": "84.8 KB",
          "hash": "a8566008",
          "displayUrl": "translator/plots/nde40_semi_iso_ckt_idvgs_a8566008.png",
          "scope": "smic180HV_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "nde40",
            "plotType": "idvgs"
          }
        },
        {
          "name": "nde40udvt_ckt_idvds.png",
          "relPath": "nde40udvt_ckt_idvds.png",
          "format": "png",
          "size": "163.7 KB",
          "hash": "72673482",
          "displayUrl": "translator/plots/nde40udvt_ckt_idvds_72673482.png",
          "scope": "smic180HV_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "nde40udvt",
            "plotType": "idvds"
          }
        },
        {
          "name": "nde40udvt_ckt_idvgs.png",
          "relPath": "nde40udvt_ckt_idvgs.png",
          "format": "png",
          "size": "73.7 KB",
          "hash": "d701a051",
          "displayUrl": "translator/plots/nde40udvt_ckt_idvgs_d701a051.png",
          "scope": "smic180HV_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "nde40udvt",
            "plotType": "idvgs"
          }
        },
        {
          "name": "ndio18_iv.png",
          "relPath": "ndio18_iv.png",
          "format": "png",
          "size": "52.3 KB",
          "hash": "b875ed6c",
          "displayUrl": "translator/plots/ndio18_iv_b875ed6c.png",
          "scope": "smic180HV_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "ndio18 iv.png",
            "what": "Original verification output generated by the tool.",
            "why": "Part of the automated translation verification pipeline.",
            "device": "—",
            "plotType": "other"
          }
        },
        {
          "name": "nld200_idvds.png",
          "relPath": "nld200_idvds.png",
          "format": "png",
          "size": "121.0 KB",
          "hash": "fbc5425d",
          "displayUrl": "translator/plots/nld200_idvds_fbc5425d.png",
          "scope": "smic180HV_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "nld200",
            "plotType": "idvds"
          }
        },
        {
          "name": "nld200_idvgs.png",
          "relPath": "nld200_idvgs.png",
          "format": "png",
          "size": "62.4 KB",
          "hash": "c89c2ffe",
          "displayUrl": "translator/plots/nld200_idvgs_c89c2ffe.png",
          "scope": "smic180HV_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "nld200",
            "plotType": "idvgs"
          }
        },
        {
          "name": "nld90_idvds.png",
          "relPath": "nld90_idvds.png",
          "format": "png",
          "size": "115.7 KB",
          "hash": "c2ab92d9",
          "displayUrl": "translator/plots/nld90_idvds_c2ab92d9.png",
          "scope": "smic180HV_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "nld90",
            "plotType": "idvds"
          }
        },
        {
          "name": "nld90_idvgs.png",
          "relPath": "nld90_idvgs.png",
          "format": "png",
          "size": "74.2 KB",
          "hash": "e4baff69",
          "displayUrl": "translator/plots/nld90_idvgs_e4baff69.png",
          "scope": "smic180HV_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "nld90",
            "plotType": "idvgs"
          }
        },
        {
          "name": "nnt18_idvds.png",
          "relPath": "nnt18_idvds.png",
          "format": "png",
          "size": "151.1 KB",
          "hash": "75fc7071",
          "displayUrl": "translator/plots/nnt18_idvds_75fc7071.png",
          "scope": "smic180HV_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "nnt18",
            "plotType": "idvds"
          }
        },
        {
          "name": "nnt18_idvgs.png",
          "relPath": "nnt18_idvgs.png",
          "format": "png",
          "size": "77.0 KB",
          "hash": "efaceb29",
          "displayUrl": "translator/plots/nnt18_idvgs_efaceb29.png",
          "scope": "smic180HV_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "nnt18",
            "plotType": "idvgs"
          }
        },
        {
          "name": "npn18a100_gummel.png",
          "relPath": "npn18a100_gummel.png",
          "format": "png",
          "size": "91.9 KB",
          "hash": "85aecf25",
          "displayUrl": "translator/plots/npn18a100_gummel_85aecf25.png",
          "scope": "smic180HV_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Gummel Plot",
            "what": "Collector and base current vs base-emitter voltage for BJT devices.",
            "why": "Validates current gain (beta) and junction characteristics after translation.",
            "device": "npn18a100",
            "plotType": "gummel"
          }
        },
        {
          "name": "npn18a25_gummel.png",
          "relPath": "npn18a25_gummel.png",
          "format": "png",
          "size": "91.1 KB",
          "hash": "80542f56",
          "displayUrl": "translator/plots/npn18a25_gummel_80542f56.png",
          "scope": "smic180HV_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Gummel Plot",
            "what": "Collector and base current vs base-emitter voltage for BJT devices.",
            "why": "Validates current gain (beta) and junction characteristics after translation.",
            "device": "npn18a25",
            "plotType": "gummel"
          }
        },
        {
          "name": "npn18a4_gummel.png",
          "relPath": "npn18a4_gummel.png",
          "format": "png",
          "size": "91.6 KB",
          "hash": "354ed34f",
          "displayUrl": "translator/plots/npn18a4_gummel_354ed34f.png",
          "scope": "smic180HV_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Gummel Plot",
            "what": "Collector and base current vs base-emitter voltage for BJT devices.",
            "why": "Validates current gain (beta) and junction characteristics after translation.",
            "device": "npn18a4",
            "plotType": "gummel"
          }
        },
        {
          "name": "npn_nde16_24mod_gummel.png",
          "relPath": "npn_nde16_24mod_gummel.png",
          "format": "png",
          "size": "73.7 KB",
          "hash": "c38fdfed",
          "displayUrl": "translator/plots/npn_nde16_24mod_gummel_c38fdfed.png",
          "scope": "smic180HV_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Gummel Plot",
            "what": "Collector and base current vs base-emitter voltage for BJT devices.",
            "why": "Validates current gain (beta) and junction characteristics after translation.",
            "device": "npn",
            "plotType": "gummel"
          }
        },
        {
          "name": "npn_nde28mod_gummel.png",
          "relPath": "npn_nde28mod_gummel.png",
          "format": "png",
          "size": "73.7 KB",
          "hash": "a754d4e2",
          "displayUrl": "translator/plots/npn_nde28mod_gummel_a754d4e2.png",
          "scope": "smic180HV_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Gummel Plot",
            "what": "Collector and base current vs base-emitter voltage for BJT devices.",
            "why": "Validates current gain (beta) and junction characteristics after translation.",
            "device": "npn",
            "plotType": "gummel"
          }
        },
        {
          "name": "npn_nde32mod_gummel.png",
          "relPath": "npn_nde32mod_gummel.png",
          "format": "png",
          "size": "73.8 KB",
          "hash": "eb6d7308",
          "displayUrl": "translator/plots/npn_nde32mod_gummel_eb6d7308.png",
          "scope": "smic180HV_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Gummel Plot",
            "what": "Collector and base current vs base-emitter voltage for BJT devices.",
            "why": "Validates current gain (beta) and junction characteristics after translation.",
            "device": "npn",
            "plotType": "gummel"
          }
        },
        {
          "name": "npn_nld36_40mos_gummel.png",
          "relPath": "npn_nld36_40mos_gummel.png",
          "format": "png",
          "size": "93.5 KB",
          "hash": "5ef238df",
          "displayUrl": "translator/plots/npn_nld36_40mos_gummel_5ef238df.png",
          "scope": "smic180HV_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Gummel Plot",
            "what": "Collector and base current vs base-emitter voltage for BJT devices.",
            "why": "Validates current gain (beta) and junction characteristics after translation.",
            "device": "npn",
            "plotType": "gummel"
          }
        },
        {
          "name": "npn_nld9_32mos_gummel.png",
          "relPath": "npn_nld9_32mos_gummel.png",
          "format": "png",
          "size": "92.5 KB",
          "hash": "8207c5fb",
          "displayUrl": "translator/plots/npn_nld9_32mos_gummel_8207c5fb.png",
          "scope": "smic180HV_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Gummel Plot",
            "what": "Collector and base current vs base-emitter voltage for BJT devices.",
            "why": "Validates current gain (beta) and junction characteristics after translation.",
            "device": "npn",
            "plotType": "gummel"
          }
        },
        {
          "name": "p18_ckt_idvds.png",
          "relPath": "p18_ckt_idvds.png",
          "format": "png",
          "size": "136.8 KB",
          "hash": "4164d4a8",
          "displayUrl": "translator/plots/p18_ckt_idvds_4164d4a8.png",
          "scope": "smic180HV_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "p18",
            "plotType": "idvds"
          }
        },
        {
          "name": "p18_ckt_idvgs.png",
          "relPath": "p18_ckt_idvgs.png",
          "format": "png",
          "size": "59.1 KB",
          "hash": "40608dea",
          "displayUrl": "translator/plots/p18_ckt_idvgs_40608dea.png",
          "scope": "smic180HV_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "p18",
            "plotType": "idvgs"
          }
        },
        {
          "name": "p18_idvds.png",
          "relPath": "p18_idvds.png",
          "format": "png",
          "size": "136.0 KB",
          "hash": "e140f784",
          "displayUrl": "translator/plots/p18_idvds_e140f784.png",
          "scope": "smic180HV_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "p18",
            "plotType": "idvds"
          }
        },
        {
          "name": "p18_idvgs.png",
          "relPath": "p18_idvgs.png",
          "format": "png",
          "size": "57.4 KB",
          "hash": "1ba46adf",
          "displayUrl": "translator/plots/p18_idvgs_1ba46adf.png",
          "scope": "smic180HV_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "p18",
            "plotType": "idvgs"
          }
        },
        {
          "name": "pdio18_iv.png",
          "relPath": "pdio18_iv.png",
          "format": "png",
          "size": "53.8 KB",
          "hash": "4a133057",
          "displayUrl": "translator/plots/pdio18_iv_4a133057.png",
          "scope": "smic180HV_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "pdio18 iv.png",
            "what": "Original verification output generated by the tool.",
            "why": "Part of the automated translation verification pipeline.",
            "device": "—",
            "plotType": "other"
          }
        },
        {
          "name": "pdio18m_iv.png",
          "relPath": "pdio18m_iv.png",
          "format": "png",
          "size": "54.1 KB",
          "hash": "816fe06c",
          "displayUrl": "translator/plots/pdio18m_iv_816fe06c.png",
          "scope": "smic180HV_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "pdio18m iv.png",
            "what": "Original verification output generated by the tool.",
            "why": "Part of the automated translation verification pipeline.",
            "device": "—",
            "plotType": "other"
          }
        },
        {
          "name": "pdrfdio_iv.png",
          "relPath": "pdrfdio_iv.png",
          "format": "png",
          "size": "53.2 KB",
          "hash": "827fe45a",
          "displayUrl": "translator/plots/pdrfdio_iv_827fe45a.png",
          "scope": "smic180HV_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "pdrfdio iv.png",
            "what": "Original verification output generated by the tool.",
            "why": "Part of the automated translation verification pipeline.",
            "device": "—",
            "plotType": "other"
          }
        },
        {
          "name": "pnp18a100_gummel.png",
          "relPath": "pnp18a100_gummel.png",
          "format": "png",
          "size": "90.8 KB",
          "hash": "23f25f2e",
          "displayUrl": "translator/plots/pnp18a100_gummel_23f25f2e.png",
          "scope": "smic180HV_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Gummel Plot",
            "what": "Collector and base current vs base-emitter voltage for BJT devices.",
            "why": "Validates current gain (beta) and junction characteristics after translation.",
            "device": "pnp18a100",
            "plotType": "gummel"
          }
        },
        {
          "name": "pnp18a25_gummel.png",
          "relPath": "pnp18a25_gummel.png",
          "format": "png",
          "size": "92.0 KB",
          "hash": "cabb58ad",
          "displayUrl": "translator/plots/pnp18a25_gummel_cabb58ad.png",
          "scope": "smic180HV_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Gummel Plot",
            "what": "Collector and base current vs base-emitter voltage for BJT devices.",
            "why": "Validates current gain (beta) and junction characteristics after translation.",
            "device": "pnp18a25",
            "plotType": "gummel"
          }
        },
        {
          "name": "pnp18a4_gummel.png",
          "relPath": "pnp18a4_gummel.png",
          "format": "png",
          "size": "90.8 KB",
          "hash": "9eb7b553",
          "displayUrl": "translator/plots/pnp18a4_gummel_9eb7b553.png",
          "scope": "smic180HV_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Gummel Plot",
            "what": "Collector and base current vs base-emitter voltage for BJT devices.",
            "why": "Validates current gain (beta) and junction characteristics after translation.",
            "device": "pnp18a4",
            "plotType": "gummel"
          }
        },
        {
          "name": "pnp_nd9_80mos_gummel.png",
          "relPath": "pnp_nd9_80mos_gummel.png",
          "format": "png",
          "size": "92.0 KB",
          "hash": "b5e21703",
          "displayUrl": "translator/plots/pnp_nd9_80mos_gummel_b5e21703.png",
          "scope": "smic180HV_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Gummel Plot",
            "what": "Collector and base current vs base-emitter voltage for BJT devices.",
            "why": "Validates current gain (beta) and junction characteristics after translation.",
            "device": "pnp",
            "plotType": "gummel"
          }
        },
        {
          "name": "dsdnw_iv.png",
          "relPath": "dsdnw_iv.png",
          "format": "png",
          "size": "54.9 KB",
          "hash": "6f88e546",
          "displayUrl": "translator/plots/dsdnw_iv_6f88e546.png",
          "scope": "smic180_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "dsdnw iv.png",
            "what": "Original verification output generated by the tool.",
            "why": "Part of the automated translation verification pipeline.",
            "device": "—",
            "plotType": "other"
          }
        },
        {
          "name": "dsdpw_iv.png",
          "relPath": "dsdpw_iv.png",
          "format": "png",
          "size": "54.9 KB",
          "hash": "d57c9552",
          "displayUrl": "translator/plots/dsdpw_iv_d57c9552.png",
          "scope": "smic180_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "dsdpw iv.png",
            "what": "Original verification output generated by the tool.",
            "why": "Part of the automated translation verification pipeline.",
            "device": "—",
            "plotType": "other"
          }
        },
        {
          "name": "dz1_iv.png",
          "relPath": "dz1_iv.png",
          "format": "png",
          "size": "55.2 KB",
          "hash": "3fc98a53",
          "displayUrl": "translator/plots/dz1_iv_3fc98a53.png",
          "scope": "smic180_hspice-ngspice",
          "width": 1621,
          "height": 721,
          "aspectRatio": 2.248,
          "caption": {
            "title": "dz1 iv.png",
            "what": "Original verification output generated by the tool.",
            "why": "Part of the automated translation verification pipeline.",
            "device": "—",
            "plotType": "other"
          }
        },
        {
          "name": "dz3_iv.png",
          "relPath": "dz3_iv.png",
          "format": "png",
          "size": "61.8 KB",
          "hash": "fd33894d",
          "displayUrl": "translator/plots/dz3_iv_fd33894d.png",
          "scope": "smic180_hspice-ngspice",
          "width": 1621,
          "height": 721,
          "aspectRatio": 2.248,
          "caption": {
            "title": "dz3 iv.png",
            "what": "Original verification output generated by the tool.",
            "why": "Part of the automated translation verification pipeline.",
            "device": "—",
            "plotType": "other"
          }
        },
        {
          "name": "n18_idvds.png",
          "relPath": "n18_idvds.png",
          "format": "png",
          "size": "129.4 KB",
          "hash": "f2173e03",
          "displayUrl": "translator/plots/n18_idvds_f2173e03.png",
          "scope": "smic180_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "n18",
            "plotType": "idvds"
          }
        },
        {
          "name": "n18_idvgs.png",
          "relPath": "n18_idvgs.png",
          "format": "png",
          "size": "72.3 KB",
          "hash": "f64f2f06",
          "displayUrl": "translator/plots/n18_idvgs_f64f2f06.png",
          "scope": "smic180_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "n18",
            "plotType": "idvgs"
          }
        },
        {
          "name": "n18_lvt_idvds.png",
          "relPath": "n18_lvt_idvds.png",
          "format": "png",
          "size": "147.9 KB",
          "hash": "393dc014",
          "displayUrl": "translator/plots/n18_lvt_idvds_393dc014.png",
          "scope": "smic180_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "n18",
            "plotType": "idvds"
          }
        },
        {
          "name": "n18_lvt_idvgs.png",
          "relPath": "n18_lvt_idvgs.png",
          "format": "png",
          "size": "73.2 KB",
          "hash": "e0bc8cda",
          "displayUrl": "translator/plots/n18_lvt_idvgs_e0bc8cda.png",
          "scope": "smic180_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "n18",
            "plotType": "idvgs"
          }
        },
        {
          "name": "n1d8_esd_idvds.png",
          "relPath": "n1d8_esd_idvds.png",
          "format": "png",
          "size": "122.1 KB",
          "hash": "5829b95d",
          "displayUrl": "translator/plots/n1d8_esd_idvds_5829b95d.png",
          "scope": "smic180_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "n1d8",
            "plotType": "idvds"
          }
        },
        {
          "name": "n1d8_esd_idvgs.png",
          "relPath": "n1d8_esd_idvgs.png",
          "format": "png",
          "size": "63.5 KB",
          "hash": "790ca305",
          "displayUrl": "translator/plots/n1d8_esd_idvgs_790ca305.png",
          "scope": "smic180_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "n1d8",
            "plotType": "idvgs"
          }
        },
        {
          "name": "n25_idvds.png",
          "relPath": "n25_idvds.png",
          "format": "png",
          "size": "137.2 KB",
          "hash": "b3ee4fde",
          "displayUrl": "translator/plots/n25_idvds_b3ee4fde.png",
          "scope": "smic180_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "n25",
            "plotType": "idvds"
          }
        },
        {
          "name": "n25_idvgs.png",
          "relPath": "n25_idvgs.png",
          "format": "png",
          "size": "75.8 KB",
          "hash": "1a7575a8",
          "displayUrl": "translator/plots/n25_idvgs_1a7575a8.png",
          "scope": "smic180_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "n25",
            "plotType": "idvgs"
          }
        },
        {
          "name": "ndio18_iv.png",
          "relPath": "ndio18_iv.png",
          "format": "png",
          "size": "51.3 KB",
          "hash": "3e6d3515",
          "displayUrl": "translator/plots/ndio18_iv_3e6d3515.png",
          "scope": "smic180_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "ndio18 iv.png",
            "what": "Original verification output generated by the tool.",
            "why": "Part of the automated translation verification pipeline.",
            "device": "—",
            "plotType": "other"
          }
        },
        {
          "name": "nld12g5_gs_idvds.png",
          "relPath": "nld12g5_gs_idvds.png",
          "format": "png",
          "size": "113.6 KB",
          "hash": "2383f899",
          "displayUrl": "translator/plots/nld12g5_gs_idvds_2383f899.png",
          "scope": "smic180_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "nld12g5",
            "plotType": "idvds"
          }
        },
        {
          "name": "nld12g5_gs_idvgs.png",
          "relPath": "nld12g5_gs_idvgs.png",
          "format": "png",
          "size": "79.5 KB",
          "hash": "9478dd4e",
          "displayUrl": "translator/plots/nld12g5_gs_idvgs_9478dd4e.png",
          "scope": "smic180_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "nld12g5",
            "plotType": "idvgs"
          }
        },
        {
          "name": "nld6g5_sa_idvds.png",
          "relPath": "nld6g5_sa_idvds.png",
          "format": "png",
          "size": "122.0 KB",
          "hash": "3257e68f",
          "displayUrl": "translator/plots/nld6g5_sa_idvds_3257e68f.png",
          "scope": "smic180_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "nld6g5",
            "plotType": "idvds"
          }
        },
        {
          "name": "nld6g5_sa_idvgs.png",
          "relPath": "nld6g5_sa_idvgs.png",
          "format": "png",
          "size": "75.6 KB",
          "hash": "206c64f0",
          "displayUrl": "translator/plots/nld6g5_sa_idvgs_206c64f0.png",
          "scope": "smic180_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "nld6g5",
            "plotType": "idvgs"
          }
        },
        {
          "name": "nnt18_idvds.png",
          "relPath": "nnt18_idvds.png",
          "format": "png",
          "size": "141.5 KB",
          "hash": "bc2cea1c",
          "displayUrl": "translator/plots/nnt18_idvds_bc2cea1c.png",
          "scope": "smic180_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "nnt18",
            "plotType": "idvds"
          }
        },
        {
          "name": "nnt18_idvgs.png",
          "relPath": "nnt18_idvgs.png",
          "format": "png",
          "size": "78.6 KB",
          "hash": "d7a19bce",
          "displayUrl": "translator/plots/nnt18_idvgs_d7a19bce.png",
          "scope": "smic180_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "nnt18",
            "plotType": "idvgs"
          }
        },
        {
          "name": "npn50a100_gummel.png",
          "relPath": "npn50a100_gummel.png",
          "format": "png",
          "size": "92.1 KB",
          "hash": "2cf8efb4",
          "displayUrl": "translator/plots/npn50a100_gummel_2cf8efb4.png",
          "scope": "smic180_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Gummel Plot",
            "what": "Collector and base current vs base-emitter voltage for BJT devices.",
            "why": "Validates current gain (beta) and junction characteristics after translation.",
            "device": "npn50a100",
            "plotType": "gummel"
          }
        },
        {
          "name": "npn50a25_gummel.png",
          "relPath": "npn50a25_gummel.png",
          "format": "png",
          "size": "92.1 KB",
          "hash": "2241610e",
          "displayUrl": "translator/plots/npn50a25_gummel_2241610e.png",
          "scope": "smic180_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Gummel Plot",
            "what": "Collector and base current vs base-emitter voltage for BJT devices.",
            "why": "Validates current gain (beta) and junction characteristics after translation.",
            "device": "npn50a25",
            "plotType": "gummel"
          }
        },
        {
          "name": "npnhva100_gummel.png",
          "relPath": "npnhva100_gummel.png",
          "format": "png",
          "size": "91.6 KB",
          "hash": "8fb8ee0f",
          "displayUrl": "translator/plots/npnhva100_gummel_8fb8ee0f.png",
          "scope": "smic180_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Gummel Plot",
            "what": "Collector and base current vs base-emitter voltage for BJT devices.",
            "why": "Validates current gain (beta) and junction characteristics after translation.",
            "device": "npnhva100",
            "plotType": "gummel"
          }
        },
        {
          "name": "npnhva25_gummel.png",
          "relPath": "npnhva25_gummel.png",
          "format": "png",
          "size": "91.8 KB",
          "hash": "dd4907a6",
          "displayUrl": "translator/plots/npnhva25_gummel_dd4907a6.png",
          "scope": "smic180_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Gummel Plot",
            "what": "Collector and base current vs base-emitter voltage for BJT devices.",
            "why": "Validates current gain (beta) and junction characteristics after translation.",
            "device": "npnhva25",
            "plotType": "gummel"
          }
        },
        {
          "name": "nwdio18_iv.png",
          "relPath": "nwdio18_iv.png",
          "format": "png",
          "size": "54.9 KB",
          "hash": "bdca30e2",
          "displayUrl": "translator/plots/nwdio18_iv_bdca30e2.png",
          "scope": "smic180_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "nwdio18 iv.png",
            "what": "Original verification output generated by the tool.",
            "why": "Part of the automated translation verification pipeline.",
            "device": "—",
            "plotType": "other"
          }
        },
        {
          "name": "p18_idvds.png",
          "relPath": "p18_idvds.png",
          "format": "png",
          "size": "141.2 KB",
          "hash": "7a262be4",
          "displayUrl": "translator/plots/p18_idvds_7a262be4.png",
          "scope": "smic180_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "p18",
            "plotType": "idvds"
          }
        },
        {
          "name": "p18_idvgs.png",
          "relPath": "p18_idvgs.png",
          "format": "png",
          "size": "61.5 KB",
          "hash": "653a31be",
          "displayUrl": "translator/plots/p18_idvgs_653a31be.png",
          "scope": "smic180_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "p18",
            "plotType": "idvgs"
          }
        },
        {
          "name": "pdio18_iv.png",
          "relPath": "pdio18_iv.png",
          "format": "png",
          "size": "51.4 KB",
          "hash": "c2b6c448",
          "displayUrl": "translator/plots/pdio18_iv_c2b6c448.png",
          "scope": "smic180_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "pdio18 iv.png",
            "what": "Original verification output generated by the tool.",
            "why": "Part of the automated translation verification pipeline.",
            "device": "—",
            "plotType": "other"
          }
        },
        {
          "name": "pnp18a100_gummel.png",
          "relPath": "pnp18a100_gummel.png",
          "format": "png",
          "size": "90.9 KB",
          "hash": "b9514ca9",
          "displayUrl": "translator/plots/pnp18a100_gummel_b9514ca9.png",
          "scope": "smic180_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Gummel Plot",
            "what": "Collector and base current vs base-emitter voltage for BJT devices.",
            "why": "Validates current gain (beta) and junction characteristics after translation.",
            "device": "pnp18a100",
            "plotType": "gummel"
          }
        },
        {
          "name": "pnp18a25_gummel.png",
          "relPath": "pnp18a25_gummel.png",
          "format": "png",
          "size": "91.4 KB",
          "hash": "6ae2f9d3",
          "displayUrl": "translator/plots/pnp18a25_gummel_6ae2f9d3.png",
          "scope": "smic180_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Gummel Plot",
            "what": "Collector and base current vs base-emitter voltage for BJT devices.",
            "why": "Validates current gain (beta) and junction characteristics after translation.",
            "device": "pnp18a25",
            "plotType": "gummel"
          }
        },
        {
          "name": "pnp18a4_gummel.png",
          "relPath": "pnp18a4_gummel.png",
          "format": "png",
          "size": "89.6 KB",
          "hash": "8c998147",
          "displayUrl": "translator/plots/pnp18a4_gummel_8c998147.png",
          "scope": "smic180_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Gummel Plot",
            "what": "Collector and base current vs base-emitter voltage for BJT devices.",
            "why": "Validates current gain (beta) and junction characteristics after translation.",
            "device": "pnp18a4",
            "plotType": "gummel"
          }
        },
        {
          "name": "pnp50a100_gummel.png",
          "relPath": "pnp50a100_gummel.png",
          "format": "png",
          "size": "90.9 KB",
          "hash": "c2f78757",
          "displayUrl": "translator/plots/pnp50a100_gummel_c2f78757.png",
          "scope": "smic180_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Gummel Plot",
            "what": "Collector and base current vs base-emitter voltage for BJT devices.",
            "why": "Validates current gain (beta) and junction characteristics after translation.",
            "device": "pnp50a100",
            "plotType": "gummel"
          }
        },
        {
          "name": "pnp50a25_gummel.png",
          "relPath": "pnp50a25_gummel.png",
          "format": "png",
          "size": "91.7 KB",
          "hash": "46653122",
          "displayUrl": "translator/plots/pnp50a25_gummel_46653122.png",
          "scope": "smic180_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Gummel Plot",
            "what": "Collector and base current vs base-emitter voltage for BJT devices.",
            "why": "Validates current gain (beta) and junction characteristics after translation.",
            "device": "pnp50a25",
            "plotType": "gummel"
          }
        },
        {
          "name": "pnphva100_gummel.png",
          "relPath": "pnphva100_gummel.png",
          "format": "png",
          "size": "91.4 KB",
          "hash": "ddf7ea75",
          "displayUrl": "translator/plots/pnphva100_gummel_ddf7ea75.png",
          "scope": "smic180_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Gummel Plot",
            "what": "Collector and base current vs base-emitter voltage for BJT devices.",
            "why": "Validates current gain (beta) and junction characteristics after translation.",
            "device": "pnphva100",
            "plotType": "gummel"
          }
        },
        {
          "name": "pnphva25_gummel.png",
          "relPath": "pnphva25_gummel.png",
          "format": "png",
          "size": "91.0 KB",
          "hash": "5a9fdbe2",
          "displayUrl": "translator/plots/pnphva25_gummel_5a9fdbe2.png",
          "scope": "smic180_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Gummel Plot",
            "what": "Collector and base current vs base-emitter voltage for BJT devices.",
            "why": "Validates current gain (beta) and junction characteristics after translation.",
            "device": "pnphva25",
            "plotType": "gummel"
          }
        },
        {
          "name": "verification_summary.png",
          "relPath": "verification_summary.png",
          "format": "png",
          "size": "88.8 KB",
          "hash": "d6a8a7a3",
          "displayUrl": "translator/plots/verification_summary_d6a8a7a3.png",
          "scope": "smic180_hspice-ngspice",
          "width": 1471,
          "height": 507,
          "aspectRatio": 2.901,
          "caption": {
            "title": "Verification Summary",
            "what": "Overview of all verification checks for this result.",
            "why": "Confirms translation correctness across DC, AC, transient, and noise domains.",
            "device": "—",
            "plotType": "verification_summary"
          }
        },
        {
          "name": "ndiode_m_iv.png",
          "relPath": "ndiode_m_iv.png",
          "format": "png",
          "size": "47.1 KB",
          "hash": "4f5ce813",
          "displayUrl": "translator/plots/ndiode_m_iv_4f5ce813.png",
          "scope": "synopsys14_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "ndiode m iv.png",
            "what": "Original verification output generated by the tool.",
            "why": "Part of the automated translation verification pipeline.",
            "device": "—",
            "plotType": "other"
          }
        },
        {
          "name": "nvpnp.1_idvds.png",
          "relPath": "nvpnp.1_idvds.png",
          "format": "png",
          "size": "138.6 KB",
          "hash": "47a81862",
          "displayUrl": "translator/plots/nvpnp.1_idvds_47a81862.png",
          "scope": "synopsys14_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "nvpnp1",
            "plotType": "idvds"
          }
        },
        {
          "name": "nvpnp.1_idvgs.png",
          "relPath": "nvpnp.1_idvgs.png",
          "format": "png",
          "size": "73.3 KB",
          "hash": "6852a510",
          "displayUrl": "translator/plots/nvpnp.1_idvgs_6852a510.png",
          "scope": "synopsys14_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "nvpnp1",
            "plotType": "idvgs"
          }
        },
        {
          "name": "pdiode_m_iv.png",
          "relPath": "pdiode_m_iv.png",
          "format": "png",
          "size": "46.6 KB",
          "hash": "69b9f800",
          "displayUrl": "translator/plots/pdiode_m_iv_69b9f800.png",
          "scope": "synopsys14_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "pdiode m iv.png",
            "what": "Original verification output generated by the tool.",
            "why": "Part of the automated translation verification pipeline.",
            "device": "—",
            "plotType": "other"
          }
        },
        {
          "name": "qvpnp_gummel.png",
          "relPath": "qvpnp_gummel.png",
          "format": "png",
          "size": "87.8 KB",
          "hash": "1481eedb",
          "displayUrl": "translator/plots/qvpnp_gummel_1481eedb.png",
          "scope": "synopsys14_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Gummel Plot",
            "what": "Collector and base current vs base-emitter voltage for BJT devices.",
            "why": "Validates current gain (beta) and junction characteristics after translation.",
            "device": "qvpnp",
            "plotType": "gummel"
          }
        },
        {
          "name": "tondiode_m_iv.png",
          "relPath": "tondiode_m_iv.png",
          "format": "png",
          "size": "47.0 KB",
          "hash": "45b4a209",
          "displayUrl": "translator/plots/tondiode_m_iv_45b4a209.png",
          "scope": "synopsys14_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "tondiode m iv.png",
            "what": "Original verification output generated by the tool.",
            "why": "Part of the automated translation verification pipeline.",
            "device": "—",
            "plotType": "other"
          }
        },
        {
          "name": "n105_hvt_idvds.png",
          "relPath": "n105_hvt_idvds.png",
          "format": "png",
          "size": "117.1 KB",
          "hash": "057addde",
          "displayUrl": "translator/plots/n105_hvt_idvds_057addde.png",
          "scope": "synopsys28_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "n105",
            "plotType": "idvds"
          }
        },
        {
          "name": "n105_hvt_idvgs.png",
          "relPath": "n105_hvt_idvgs.png",
          "format": "png",
          "size": "74.1 KB",
          "hash": "f9c931a6",
          "displayUrl": "translator/plots/n105_hvt_idvgs_f9c931a6.png",
          "scope": "synopsys28_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "n105",
            "plotType": "idvgs"
          }
        },
        {
          "name": "n105_idvds.png",
          "relPath": "n105_idvds.png",
          "format": "png",
          "size": "116.5 KB",
          "hash": "05eb0702",
          "displayUrl": "translator/plots/n105_idvds_05eb0702.png",
          "scope": "synopsys28_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "n105",
            "plotType": "idvds"
          }
        },
        {
          "name": "n105_idvgs.png",
          "relPath": "n105_idvgs.png",
          "format": "png",
          "size": "72.8 KB",
          "hash": "358ffe51",
          "displayUrl": "translator/plots/n105_idvgs_358ffe51.png",
          "scope": "synopsys28_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "n105",
            "plotType": "idvgs"
          }
        },
        {
          "name": "n105_lvt_idvds.png",
          "relPath": "n105_lvt_idvds.png",
          "format": "png",
          "size": "117.2 KB",
          "hash": "666b72fa",
          "displayUrl": "translator/plots/n105_lvt_idvds_666b72fa.png",
          "scope": "synopsys28_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "n105",
            "plotType": "idvds"
          }
        },
        {
          "name": "n105_lvt_idvgs.png",
          "relPath": "n105_lvt_idvgs.png",
          "format": "png",
          "size": "74.0 KB",
          "hash": "4cbf1e1d",
          "displayUrl": "translator/plots/n105_lvt_idvgs_4cbf1e1d.png",
          "scope": "synopsys28_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "n105",
            "plotType": "idvgs"
          }
        },
        {
          "name": "n18_idvds.png",
          "relPath": "n18_idvds.png",
          "format": "png",
          "size": "112.8 KB",
          "hash": "059d4219",
          "displayUrl": "translator/plots/n18_idvds_059d4219.png",
          "scope": "synopsys28_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "n18",
            "plotType": "idvds"
          }
        },
        {
          "name": "n18_idvgs.png",
          "relPath": "n18_idvgs.png",
          "format": "png",
          "size": "71.8 KB",
          "hash": "d73d5405",
          "displayUrl": "translator/plots/n18_idvgs_d73d5405.png",
          "scope": "synopsys28_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "n18",
            "plotType": "idvgs"
          }
        },
        {
          "name": "p18_idvds.png",
          "relPath": "p18_idvds.png",
          "format": "png",
          "size": "109.9 KB",
          "hash": "2aa7e257",
          "displayUrl": "translator/plots/p18_idvds_2aa7e257.png",
          "scope": "synopsys28_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "p18",
            "plotType": "idvds"
          }
        },
        {
          "name": "p18_idvgs.png",
          "relPath": "p18_idvgs.png",
          "format": "png",
          "size": "59.6 KB",
          "hash": "5252546e",
          "displayUrl": "translator/plots/p18_idvgs_5252546e.png",
          "scope": "synopsys28_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "p18",
            "plotType": "idvgs"
          }
        },
        {
          "name": "dio_dnwpsub_iv.png",
          "relPath": "dio_dnwpsub_iv.png",
          "format": "png",
          "size": "58.4 KB",
          "hash": "386902de",
          "displayUrl": "translator/plots/dio_dnwpsub_iv_386902de.png",
          "scope": "tsmc65lp_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "dio dnwpsub iv.png",
            "what": "Original verification output generated by the tool.",
            "why": "Part of the automated translation verification pipeline.",
            "device": "—",
            "plotType": "other"
          }
        },
        {
          "name": "dio_nwpsub_iv.png",
          "relPath": "dio_nwpsub_iv.png",
          "format": "png",
          "size": "58.5 KB",
          "hash": "279424fe",
          "displayUrl": "translator/plots/dio_nwpsub_iv_279424fe.png",
          "scope": "tsmc65lp_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "dio nwpsub iv.png",
            "what": "Original verification output generated by the tool.",
            "why": "Part of the automated translation verification pipeline.",
            "device": "—",
            "plotType": "other"
          }
        },
        {
          "name": "nch.10_idvds.png",
          "relPath": "nch.10_idvds.png",
          "format": "png",
          "size": "137.5 KB",
          "hash": "978e4a67",
          "displayUrl": "translator/plots/nch.10_idvds_978e4a67.png",
          "scope": "tsmc65lp_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "nch10",
            "plotType": "idvds"
          }
        },
        {
          "name": "nch.10_idvgs.png",
          "relPath": "nch.10_idvgs.png",
          "format": "png",
          "size": "74.5 KB",
          "hash": "3ecbfab4",
          "displayUrl": "translator/plots/nch.10_idvgs_3ecbfab4.png",
          "scope": "tsmc65lp_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "nch10",
            "plotType": "idvgs"
          }
        },
        {
          "name": "nch.11_idvds.png",
          "relPath": "nch.11_idvds.png",
          "format": "png",
          "size": "133.5 KB",
          "hash": "8b6a2e75",
          "displayUrl": "translator/plots/nch.11_idvds_8b6a2e75.png",
          "scope": "tsmc65lp_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "nch11",
            "plotType": "idvds"
          }
        },
        {
          "name": "nch.11_idvgs.png",
          "relPath": "nch.11_idvgs.png",
          "format": "png",
          "size": "74.8 KB",
          "hash": "09d3930e",
          "displayUrl": "translator/plots/nch.11_idvgs_09d3930e.png",
          "scope": "tsmc65lp_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "nch11",
            "plotType": "idvgs"
          }
        },
        {
          "name": "nch.1_idvds.png",
          "relPath": "nch.1_idvds.png",
          "format": "png",
          "size": "133.6 KB",
          "hash": "d8ae4632",
          "displayUrl": "translator/plots/nch.1_idvds_d8ae4632.png",
          "scope": "tsmc65lp_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "nch1",
            "plotType": "idvds"
          }
        },
        {
          "name": "nch.1_idvgs.png",
          "relPath": "nch.1_idvgs.png",
          "format": "png",
          "size": "74.8 KB",
          "hash": "69ba286c",
          "displayUrl": "translator/plots/nch.1_idvgs_69ba286c.png",
          "scope": "tsmc65lp_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "nch1",
            "plotType": "idvgs"
          }
        },
        {
          "name": "nch_rf.1_idvds.png",
          "relPath": "nch_rf.1_idvds.png",
          "format": "png",
          "size": "123.7 KB",
          "hash": "9eff64bc",
          "displayUrl": "translator/plots/nch_rf.1_idvds_9eff64bc.png",
          "scope": "tsmc65lp_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "nch",
            "plotType": "idvds"
          }
        },
        {
          "name": "nch_rf.1_idvgs.png",
          "relPath": "nch_rf.1_idvgs.png",
          "format": "png",
          "size": "76.7 KB",
          "hash": "27780848",
          "displayUrl": "translator/plots/nch_rf.1_idvgs_27780848.png",
          "scope": "tsmc65lp_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "nch",
            "plotType": "idvgs"
          }
        },
        {
          "name": "nch_rf.2_idvds.png",
          "relPath": "nch_rf.2_idvds.png",
          "format": "png",
          "size": "129.5 KB",
          "hash": "294d8646",
          "displayUrl": "translator/plots/nch_rf.2_idvds_294d8646.png",
          "scope": "tsmc65lp_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "nch",
            "plotType": "idvds"
          }
        },
        {
          "name": "nch_rf.2_idvgs.png",
          "relPath": "nch_rf.2_idvgs.png",
          "format": "png",
          "size": "77.2 KB",
          "hash": "7948a96e",
          "displayUrl": "translator/plots/nch_rf.2_idvgs_7948a96e.png",
          "scope": "tsmc65lp_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "nch",
            "plotType": "idvgs"
          }
        },
        {
          "name": "nch_rf.3_idvds.png",
          "relPath": "nch_rf.3_idvds.png",
          "format": "png",
          "size": "124.1 KB",
          "hash": "ede6a007",
          "displayUrl": "translator/plots/nch_rf.3_idvds_ede6a007.png",
          "scope": "tsmc65lp_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "nch",
            "plotType": "idvds"
          }
        },
        {
          "name": "nch_rf.3_idvgs.png",
          "relPath": "nch_rf.3_idvgs.png",
          "format": "png",
          "size": "77.4 KB",
          "hash": "f2577e6e",
          "displayUrl": "translator/plots/nch_rf.3_idvgs_f2577e6e.png",
          "scope": "tsmc65lp_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "nch",
            "plotType": "idvgs"
          }
        },
        {
          "name": "ndio_rf_f_iv.png",
          "relPath": "ndio_rf_f_iv.png",
          "format": "png",
          "size": "51.5 KB",
          "hash": "3bcdb02a",
          "displayUrl": "translator/plots/ndio_rf_f_iv_3bcdb02a.png",
          "scope": "tsmc65lp_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "ndio rf f iv.png",
            "what": "Original verification output generated by the tool.",
            "why": "Part of the automated translation verification pipeline.",
            "device": "—",
            "plotType": "other"
          }
        },
        {
          "name": "ndio_rf_g_iv.png",
          "relPath": "ndio_rf_g_iv.png",
          "format": "png",
          "size": "51.7 KB",
          "hash": "6d12f4b9",
          "displayUrl": "translator/plots/ndio_rf_g_iv_6d12f4b9.png",
          "scope": "tsmc65lp_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "ndio rf g iv.png",
            "what": "Original verification output generated by the tool.",
            "why": "Part of the automated translation verification pipeline.",
            "device": "—",
            "plotType": "other"
          }
        },
        {
          "name": "pdio_rf_f_iv.png",
          "relPath": "pdio_rf_f_iv.png",
          "format": "png",
          "size": "51.6 KB",
          "hash": "9e4dcb38",
          "displayUrl": "translator/plots/pdio_rf_f_iv_9e4dcb38.png",
          "scope": "tsmc65lp_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "pdio rf f iv.png",
            "what": "Original verification output generated by the tool.",
            "why": "Part of the automated translation verification pipeline.",
            "device": "—",
            "plotType": "other"
          }
        },
        {
          "name": "verification_summary.png",
          "relPath": "verification_summary.png",
          "format": "png",
          "size": "455.7 KB",
          "hash": "e98e39d8",
          "displayUrl": "translator/plots/verification_summary_e98e39d8.png",
          "scope": "_root",
          "width": 2197,
          "height": 1181,
          "aspectRatio": 1.86,
          "caption": {
            "title": "Verification Summary",
            "what": "Overview of all verification checks for this result.",
            "why": "Confirms translation correctness across DC, AC, transient, and noise domains.",
            "device": "—",
            "plotType": "verification_summary"
          }
        }
      ],
      "dataArtifacts": [
        {
          "name": "pdk_confidence_tiers.csv",
          "relPath": "reports/pdk_confidence_tiers.csv",
          "format": "csv",
          "size": "2.8 KB",
          "hash": "d81dd533",
          "rowCount": 17,
          "columns": [
            "pdk",
            "tier",
            "min_raw_success_percent",
            "min_effective_model_deck_success_percent",
            "excluded_non_model_files",
            "total_files",
            "excluded_ratio_percent",
            "model_deck_failed",
            "models_out_total",
            "verified",
            "verified_files",
            "verified_tests",
            "verified_pass_rate_percent",
            "rationale"
          ]
        },
        {
          "name": "pdk_translation_effective_summary.csv",
          "relPath": "reports/pdk_translation_effective_summary.csv",
          "format": "csv",
          "size": "6.7 KB",
          "hash": "131aa723",
          "rowCount": 34,
          "columns": [
            "pdk",
            "source_format",
            "target",
            "successful",
            "failed",
            "models_out",
            "total_files",
            "success_rate_percent",
            "effective_model_deck_success_percent",
            "excluded_non_model_files",
            "model_deck_files",
            "model_deck_successful",
            "model_deck_failed",
            "dominant_exclusion_class",
            "total_duration_ms",
            "failure_reason",
            "failed_sections",
            "notes"
          ]
        },
        {
          "name": "pdk_translation_summary.csv",
          "relPath": "reports/pdk_translation_summary.csv",
          "format": "csv",
          "size": "6.7 KB",
          "hash": "131aa723",
          "rowCount": 34,
          "columns": [
            "pdk",
            "source_format",
            "target",
            "successful",
            "failed",
            "models_out",
            "total_files",
            "success_rate_percent",
            "effective_model_deck_success_percent",
            "excluded_non_model_files",
            "model_deck_files",
            "model_deck_successful",
            "model_deck_failed",
            "dominant_exclusion_class",
            "total_duration_ms",
            "failure_reason",
            "failed_sections",
            "notes"
          ]
        },
        {
          "name": "pdk_verification_summary.csv",
          "relPath": "reports/pdk_verification_summary.csv",
          "format": "csv",
          "size": "505 B",
          "hash": "3691d89c",
          "rowCount": 15,
          "columns": [
            "pdk",
            "total_files",
            "total_tests",
            "passed",
            "failed",
            "pass_rate_percent",
            "bsim4_errors"
          ]
        },
        {
          "name": "plot_inventory.csv",
          "relPath": "reports/plot_inventory.csv",
          "format": "csv",
          "size": "498 B",
          "hash": "6b60bd82",
          "rowCount": 17,
          "columns": [
            "pdk_or_scope",
            "png_count"
          ]
        },
        {
          "name": "batch_all_summary.json",
          "relPath": "raw/batch_all_summary.json",
          "format": "json",
          "size": "364.2 KB",
          "hash": "4d8f7ab5"
        },
        {
          "name": "verification_report.json",
          "relPath": "raw/verification_report.json",
          "format": "json",
          "size": "12.5 KB",
          "hash": "8a41e8e2"
        }
      ],
      "otherArtifacts": [
        {
          "name": "pdk_confidence_tier_table.tex",
          "relPath": "reports/pdk_confidence_tier_table.tex",
          "size": "3.0 KB",
          "hash": "19eb8fcb",
          "format": "tex"
        },
        {
          "name": "verification_summary.png",
          "relPath": "plots/verification_summary.png",
          "size": "241.9 KB",
          "hash": "c82c558f",
          "format": ".png"
        }
      ],
      "summary": {
        "totalReports": 1,
        "totalPlots": 296,
        "totalData": 7,
        "hero": {
          "sourceFiles": "322",
          "successfulTranslations": "224",
          "modelsTranslated": "6,638",
          "verification": "587",
          "roundTrip": "52",
          "monteCarlo": "52",
          "pdks": "17"
        }
      }
    },
    {
      "resultId": "pdk-asap7-hspice-ngspice",
      "title": "asap7: hspice → ngspice",
      "description": "6 files, 6 successful, 100.0% success, 48 models.",
      "kind": "pdk_target",
      "level": 1,
      "pdk": "asap7",
      "sourceFormat": "hspice",
      "targetFormat": "ngspice",
      "generatedAt": "2026-04-19",
      "status": "completed",
      "reports": [],
      "plots": [],
      "dataArtifacts": [
        {
          "name": "pdk_translation_summary.csv",
          "relPath": "reports/pdk_translation_summary.csv",
          "format": "csv",
          "size": "6.7 KB",
          "hash": "131aa723",
          "columns": [
            "pdk",
            "source_format",
            "target",
            "successful",
            "failed",
            "models_out",
            "total_files",
            "success_rate_percent",
            "effective_model_deck_success_percent",
            "excluded_non_model_files",
            "model_deck_files",
            "model_deck_successful",
            "model_deck_failed",
            "dominant_exclusion_class",
            "total_duration_ms",
            "failure_reason",
            "failed_sections",
            "notes"
          ],
          "rowCount": 1
        }
      ],
      "otherArtifacts": [],
      "summary": {
        "totalReports": 0,
        "totalPlots": 0,
        "totalData": 1,
        "stats": {
          "files": "6",
          "successful": "6",
          "failed": "0",
          "rawSuccess": "100.0",
          "effectiveSuccess": "100.0",
          "modelsOut": "48",
          "duration": "98.9",
          "failureReason": "-",
          "notes": "No blocking translation issues"
        }
      }
    },
    {
      "resultId": "pdk-asap7-hspice-spectre",
      "title": "asap7: hspice → spectre",
      "description": "6 files, 6 successful, 100.0% success, 48 models.",
      "kind": "pdk_target",
      "level": 1,
      "pdk": "asap7",
      "sourceFormat": "hspice",
      "targetFormat": "spectre",
      "generatedAt": "2026-04-19",
      "status": "completed",
      "reports": [],
      "plots": [],
      "dataArtifacts": [
        {
          "name": "pdk_translation_summary.csv",
          "relPath": "reports/pdk_translation_summary.csv",
          "format": "csv",
          "size": "6.7 KB",
          "hash": "131aa723",
          "columns": [
            "pdk",
            "source_format",
            "target",
            "successful",
            "failed",
            "models_out",
            "total_files",
            "success_rate_percent",
            "effective_model_deck_success_percent",
            "excluded_non_model_files",
            "model_deck_files",
            "model_deck_successful",
            "model_deck_failed",
            "dominant_exclusion_class",
            "total_duration_ms",
            "failure_reason",
            "failed_sections",
            "notes"
          ],
          "rowCount": 1
        }
      ],
      "otherArtifacts": [],
      "summary": {
        "totalReports": 0,
        "totalPlots": 0,
        "totalData": 1,
        "stats": {
          "files": "6",
          "successful": "6",
          "failed": "0",
          "rawSuccess": "100.0",
          "effectiveSuccess": "100.0",
          "modelsOut": "48",
          "duration": "77.9",
          "failureReason": "-",
          "notes": "No blocking translation issues"
        }
      }
    },
    {
      "resultId": "pdk-cadence14-spectre-hspice",
      "title": "cadence14: spectre → hspice",
      "description": "6 files, 5 successful, 83.3% success, 24 models.",
      "kind": "pdk_target",
      "level": 1,
      "pdk": "cadence14",
      "sourceFormat": "spectre",
      "targetFormat": "hspice",
      "generatedAt": "2026-04-19",
      "status": "partial",
      "reports": [],
      "plots": [
        {
          "name": "cds_ff_mpt_nch18_idvds.png",
          "relPath": "cds_ff_mpt_nch18_idvds.png",
          "format": "png",
          "size": "143.5 KB",
          "hash": "8c42b27a",
          "displayUrl": "translator/plots/cds_ff_mpt_nch18_idvds_8c42b27a.png",
          "scope": "cadence14_spectre-hspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "cds",
            "plotType": "idvds"
          }
        },
        {
          "name": "cds_ff_mpt_nch18_idvgs.png",
          "relPath": "cds_ff_mpt_nch18_idvgs.png",
          "format": "png",
          "size": "83.4 KB",
          "hash": "a3ac1e77",
          "displayUrl": "translator/plots/cds_ff_mpt_nch18_idvgs_a3ac1e77.png",
          "scope": "cadence14_spectre-hspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "cds",
            "plotType": "idvgs"
          }
        },
        {
          "name": "cds_ff_mpt_nhvt_idvds.png",
          "relPath": "cds_ff_mpt_nhvt_idvds.png",
          "format": "png",
          "size": "142.9 KB",
          "hash": "dc815673",
          "displayUrl": "translator/plots/cds_ff_mpt_nhvt_idvds_dc815673.png",
          "scope": "cadence14_spectre-hspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "cds",
            "plotType": "idvds"
          }
        },
        {
          "name": "cds_ff_mpt_nhvt_idvgs.png",
          "relPath": "cds_ff_mpt_nhvt_idvgs.png",
          "format": "png",
          "size": "65.5 KB",
          "hash": "0a86da8f",
          "displayUrl": "translator/plots/cds_ff_mpt_nhvt_idvgs_0a86da8f.png",
          "scope": "cadence14_spectre-hspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "cds",
            "plotType": "idvgs"
          }
        },
        {
          "name": "cds_ff_mpt_nlvt_idvds.png",
          "relPath": "cds_ff_mpt_nlvt_idvds.png",
          "format": "png",
          "size": "142.8 KB",
          "hash": "31b68e89",
          "displayUrl": "translator/plots/cds_ff_mpt_nlvt_idvds_31b68e89.png",
          "scope": "cadence14_spectre-hspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "cds",
            "plotType": "idvds"
          }
        },
        {
          "name": "cds_ff_mpt_nlvt_idvgs.png",
          "relPath": "cds_ff_mpt_nlvt_idvgs.png",
          "format": "png",
          "size": "65.3 KB",
          "hash": "9c71c20c",
          "displayUrl": "translator/plots/cds_ff_mpt_nlvt_idvgs_9c71c20c.png",
          "scope": "cadence14_spectre-hspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "cds",
            "plotType": "idvgs"
          }
        },
        {
          "name": "cds_ff_mpt_nsvt_idvds.png",
          "relPath": "cds_ff_mpt_nsvt_idvds.png",
          "format": "png",
          "size": "143.0 KB",
          "hash": "a113626f",
          "displayUrl": "translator/plots/cds_ff_mpt_nsvt_idvds_a113626f.png",
          "scope": "cadence14_spectre-hspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "cds",
            "plotType": "idvds"
          }
        },
        {
          "name": "cds_ff_mpt_nsvt_idvgs.png",
          "relPath": "cds_ff_mpt_nsvt_idvgs.png",
          "format": "png",
          "size": "65.7 KB",
          "hash": "b8f013ee",
          "displayUrl": "translator/plots/cds_ff_mpt_nsvt_idvgs_b8f013ee.png",
          "scope": "cadence14_spectre-hspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "cds",
            "plotType": "idvgs"
          }
        },
        {
          "name": "cds_ff_mpt_psvt_idvds.png",
          "relPath": "cds_ff_mpt_psvt_idvds.png",
          "format": "png",
          "size": "143.0 KB",
          "hash": "1959b5c6",
          "displayUrl": "translator/plots/cds_ff_mpt_psvt_idvds_1959b5c6.png",
          "scope": "cadence14_spectre-hspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "cds",
            "plotType": "idvds"
          }
        },
        {
          "name": "cds_ff_mpt_psvt_idvgs.png",
          "relPath": "cds_ff_mpt_psvt_idvgs.png",
          "format": "png",
          "size": "65.7 KB",
          "hash": "c9b0f05c",
          "displayUrl": "translator/plots/cds_ff_mpt_psvt_idvgs_c9b0f05c.png",
          "scope": "cadence14_spectre-hspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "cds",
            "plotType": "idvgs"
          }
        }
      ],
      "dataArtifacts": [
        {
          "name": "pdk_translation_summary.csv",
          "relPath": "reports/pdk_translation_summary.csv",
          "format": "csv",
          "size": "6.7 KB",
          "hash": "131aa723",
          "columns": [
            "pdk",
            "source_format",
            "target",
            "successful",
            "failed",
            "models_out",
            "total_files",
            "success_rate_percent",
            "effective_model_deck_success_percent",
            "excluded_non_model_files",
            "model_deck_files",
            "model_deck_successful",
            "model_deck_failed",
            "dominant_exclusion_class",
            "total_duration_ms",
            "failure_reason",
            "failed_sections",
            "notes"
          ],
          "rowCount": 1
        }
      ],
      "otherArtifacts": [],
      "summary": {
        "totalReports": 0,
        "totalPlots": 10,
        "totalData": 1,
        "stats": {
          "files": "6",
          "successful": "5",
          "failed": "1",
          "rawSuccess": "83.3",
          "effectiveSuccess": "100.0",
          "modelsOut": "24",
          "duration": "45.1",
          "failureReason": "Invalid models provided",
          "notes": "All model-deck files translated; failures concentrated in excluded wrapper/helper files"
        }
      }
    },
    {
      "resultId": "pdk-cadence14-spectre-ngspice",
      "title": "cadence14: spectre → ngspice",
      "description": "6 files, 5 successful, 83.3% success, 24 models.",
      "kind": "pdk_target",
      "level": 1,
      "pdk": "cadence14",
      "sourceFormat": "spectre",
      "targetFormat": "ngspice",
      "generatedAt": "2026-04-19",
      "status": "partial",
      "reports": [],
      "plots": [
        {
          "name": "_ndio_iv.png",
          "relPath": "_ndio_iv.png",
          "format": "png",
          "size": "52.8 KB",
          "hash": "bb6e4754",
          "displayUrl": "translator/plots/_ndio_iv_bb6e4754.png",
          "scope": "cadence14_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": " ndio iv.png",
            "what": "Original verification output generated by the tool.",
            "why": "Part of the automated translation verification pipeline.",
            "device": "—",
            "plotType": "other"
          }
        },
        {
          "name": "_pdio_iv.png",
          "relPath": "_pdio_iv.png",
          "format": "png",
          "size": "52.4 KB",
          "hash": "efbf0080",
          "displayUrl": "translator/plots/_pdio_iv_efbf0080.png",
          "scope": "cadence14_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": " pdio iv.png",
            "what": "Original verification output generated by the tool.",
            "why": "Part of the automated translation verification pipeline.",
            "device": "—",
            "plotType": "other"
          }
        },
        {
          "name": "cds_ff_mpt_nch18_idvds.png",
          "relPath": "cds_ff_mpt_nch18_idvds.png",
          "format": "png",
          "size": "143.5 KB",
          "hash": "8c42b27a",
          "displayUrl": "translator/plots/cds_ff_mpt_nch18_idvds_8c42b27a.png",
          "scope": "cadence14_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "cds",
            "plotType": "idvds"
          }
        },
        {
          "name": "cds_ff_mpt_nch18_idvgs.png",
          "relPath": "cds_ff_mpt_nch18_idvgs.png",
          "format": "png",
          "size": "83.4 KB",
          "hash": "a3ac1e77",
          "displayUrl": "translator/plots/cds_ff_mpt_nch18_idvgs_a3ac1e77.png",
          "scope": "cadence14_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "cds",
            "plotType": "idvgs"
          }
        },
        {
          "name": "cds_ff_mpt_nd1hvt_iv.png",
          "relPath": "cds_ff_mpt_nd1hvt_iv.png",
          "format": "png",
          "size": "54.4 KB",
          "hash": "42b5f78b",
          "displayUrl": "translator/plots/cds_ff_mpt_nd1hvt_iv_42b5f78b.png",
          "scope": "cadence14_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "cds ff mpt nd1hvt iv.png",
            "what": "Original verification output generated by the tool.",
            "why": "Part of the automated translation verification pipeline.",
            "device": "—",
            "plotType": "other"
          }
        },
        {
          "name": "cds_ff_mpt_nd1lvt_iv.png",
          "relPath": "cds_ff_mpt_nd1lvt_iv.png",
          "format": "png",
          "size": "54.4 KB",
          "hash": "28ed587d",
          "displayUrl": "translator/plots/cds_ff_mpt_nd1lvt_iv_28ed587d.png",
          "scope": "cadence14_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "cds ff mpt nd1lvt iv.png",
            "what": "Original verification output generated by the tool.",
            "why": "Part of the automated translation verification pipeline.",
            "device": "—",
            "plotType": "other"
          }
        },
        {
          "name": "cds_ff_mpt_nd1svt_iv.png",
          "relPath": "cds_ff_mpt_nd1svt_iv.png",
          "format": "png",
          "size": "54.8 KB",
          "hash": "21b17a4a",
          "displayUrl": "translator/plots/cds_ff_mpt_nd1svt_iv_21b17a4a.png",
          "scope": "cadence14_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "cds ff mpt nd1svt iv.png",
            "what": "Original verification output generated by the tool.",
            "why": "Part of the automated translation verification pipeline.",
            "device": "—",
            "plotType": "other"
          }
        },
        {
          "name": "cds_ff_mpt_nd2svt_iv.png",
          "relPath": "cds_ff_mpt_nd2svt_iv.png",
          "format": "png",
          "size": "55.1 KB",
          "hash": "1e2d96fb",
          "displayUrl": "translator/plots/cds_ff_mpt_nd2svt_iv_1e2d96fb.png",
          "scope": "cadence14_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "cds ff mpt nd2svt iv.png",
            "what": "Original verification output generated by the tool.",
            "why": "Part of the automated translation verification pipeline.",
            "device": "—",
            "plotType": "other"
          }
        },
        {
          "name": "cds_ff_mpt_nhvt_idvds.png",
          "relPath": "cds_ff_mpt_nhvt_idvds.png",
          "format": "png",
          "size": "142.9 KB",
          "hash": "dc815673",
          "displayUrl": "translator/plots/cds_ff_mpt_nhvt_idvds_dc815673.png",
          "scope": "cadence14_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "cds",
            "plotType": "idvds"
          }
        },
        {
          "name": "cds_ff_mpt_nhvt_idvgs.png",
          "relPath": "cds_ff_mpt_nhvt_idvgs.png",
          "format": "png",
          "size": "65.5 KB",
          "hash": "0a86da8f",
          "displayUrl": "translator/plots/cds_ff_mpt_nhvt_idvgs_0a86da8f.png",
          "scope": "cadence14_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "cds",
            "plotType": "idvgs"
          }
        },
        {
          "name": "cds_ff_mpt_nlvt_idvds.png",
          "relPath": "cds_ff_mpt_nlvt_idvds.png",
          "format": "png",
          "size": "100.0 KB",
          "hash": "89a1e2f5",
          "displayUrl": "translator/plots/cds_ff_mpt_nlvt_idvds_89a1e2f5.png",
          "scope": "cadence14_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "cds",
            "plotType": "idvds"
          }
        },
        {
          "name": "cds_ff_mpt_nlvt_idvgs.png",
          "relPath": "cds_ff_mpt_nlvt_idvgs.png",
          "format": "png",
          "size": "65.3 KB",
          "hash": "b27715fb",
          "displayUrl": "translator/plots/cds_ff_mpt_nlvt_idvgs_b27715fb.png",
          "scope": "cadence14_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "cds",
            "plotType": "idvgs"
          }
        },
        {
          "name": "cds_ff_mpt_nsvt_idvds.png",
          "relPath": "cds_ff_mpt_nsvt_idvds.png",
          "format": "png",
          "size": "100.2 KB",
          "hash": "e82af04b",
          "displayUrl": "translator/plots/cds_ff_mpt_nsvt_idvds_e82af04b.png",
          "scope": "cadence14_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "cds",
            "plotType": "idvds"
          }
        },
        {
          "name": "cds_ff_mpt_nsvt_idvgs.png",
          "relPath": "cds_ff_mpt_nsvt_idvgs.png",
          "format": "png",
          "size": "65.8 KB",
          "hash": "0f41e0bf",
          "displayUrl": "translator/plots/cds_ff_mpt_nsvt_idvgs_0f41e0bf.png",
          "scope": "cadence14_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "cds",
            "plotType": "idvgs"
          }
        },
        {
          "name": "cds_ff_mpt_pd1svt_iv.png",
          "relPath": "cds_ff_mpt_pd1svt_iv.png",
          "format": "png",
          "size": "54.9 KB",
          "hash": "5b3dd63c",
          "displayUrl": "translator/plots/cds_ff_mpt_pd1svt_iv_5b3dd63c.png",
          "scope": "cadence14_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "cds ff mpt pd1svt iv.png",
            "what": "Original verification output generated by the tool.",
            "why": "Part of the automated translation verification pipeline.",
            "device": "—",
            "plotType": "other"
          }
        },
        {
          "name": "cds_ff_mpt_psvt_idvds.png",
          "relPath": "cds_ff_mpt_psvt_idvds.png",
          "format": "png",
          "size": "100.2 KB",
          "hash": "03396a5d",
          "displayUrl": "translator/plots/cds_ff_mpt_psvt_idvds_03396a5d.png",
          "scope": "cadence14_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "cds",
            "plotType": "idvds"
          }
        },
        {
          "name": "cds_ff_mpt_psvt_idvgs.png",
          "relPath": "cds_ff_mpt_psvt_idvgs.png",
          "format": "png",
          "size": "65.7 KB",
          "hash": "2af257c4",
          "displayUrl": "translator/plots/cds_ff_mpt_psvt_idvgs_2af257c4.png",
          "scope": "cadence14_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "cds",
            "plotType": "idvgs"
          }
        },
        {
          "name": "nwdio_iv.png",
          "relPath": "nwdio_iv.png",
          "format": "png",
          "size": "53.2 KB",
          "hash": "e722df3d",
          "displayUrl": "translator/plots/nwdio_iv_e722df3d.png",
          "scope": "cadence14_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "nwdio iv.png",
            "what": "Original verification output generated by the tool.",
            "why": "Part of the automated translation verification pipeline.",
            "device": "—",
            "plotType": "other"
          }
        }
      ],
      "dataArtifacts": [
        {
          "name": "pdk_translation_summary.csv",
          "relPath": "reports/pdk_translation_summary.csv",
          "format": "csv",
          "size": "6.7 KB",
          "hash": "131aa723",
          "columns": [
            "pdk",
            "source_format",
            "target",
            "successful",
            "failed",
            "models_out",
            "total_files",
            "success_rate_percent",
            "effective_model_deck_success_percent",
            "excluded_non_model_files",
            "model_deck_files",
            "model_deck_successful",
            "model_deck_failed",
            "dominant_exclusion_class",
            "total_duration_ms",
            "failure_reason",
            "failed_sections",
            "notes"
          ],
          "rowCount": 1
        }
      ],
      "otherArtifacts": [],
      "summary": {
        "totalReports": 0,
        "totalPlots": 18,
        "totalData": 1,
        "stats": {
          "files": "6",
          "successful": "5",
          "failed": "1",
          "rawSuccess": "83.3",
          "effectiveSuccess": "100.0",
          "modelsOut": "24",
          "duration": "116.1",
          "failureReason": "Invalid models provided",
          "notes": "All model-deck files translated; failures concentrated in excluded wrapper/helper files"
        }
      }
    },
    {
      "resultId": "pdk-cadence180-spectre-hspice",
      "title": "cadence180: spectre → hspice",
      "description": "14 files, 11 successful, 78.6% success, 29 models.",
      "kind": "pdk_target",
      "level": 1,
      "pdk": "cadence180",
      "sourceFormat": "spectre",
      "targetFormat": "hspice",
      "generatedAt": "2026-04-19",
      "status": "partial",
      "reports": [],
      "plots": [
        {
          "name": "nmos25_idvds.png",
          "relPath": "nmos25_idvds.png",
          "format": "png",
          "size": "142.3 KB",
          "hash": "1f1b688c",
          "displayUrl": "translator/plots/nmos25_idvds_1f1b688c.png",
          "scope": "cadence180_spectre-hspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "nmos25",
            "plotType": "idvds"
          }
        },
        {
          "name": "nmos25_idvgs.png",
          "relPath": "nmos25_idvgs.png",
          "format": "png",
          "size": "80.3 KB",
          "hash": "d2897f3b",
          "displayUrl": "translator/plots/nmos25_idvgs_d2897f3b.png",
          "scope": "cadence180_spectre-hspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "nmos25",
            "plotType": "idvgs"
          }
        },
        {
          "name": "nmos_rf_idvds.png",
          "relPath": "nmos_rf_idvds.png",
          "format": "png",
          "size": "141.9 KB",
          "hash": "f2e7c62d",
          "displayUrl": "translator/plots/nmos_rf_idvds_f2e7c62d.png",
          "scope": "cadence180_spectre-hspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "nmos",
            "plotType": "idvds"
          }
        },
        {
          "name": "nmos_rf_idvgs.png",
          "relPath": "nmos_rf_idvgs.png",
          "format": "png",
          "size": "79.5 KB",
          "hash": "0f50e725",
          "displayUrl": "translator/plots/nmos_rf_idvgs_0f50e725.png",
          "scope": "cadence180_spectre-hspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "nmos",
            "plotType": "idvgs"
          }
        },
        {
          "name": "nplusreslw_idvds.png",
          "relPath": "nplusreslw_idvds.png",
          "format": "png",
          "size": "142.7 KB",
          "hash": "b970e203",
          "displayUrl": "translator/plots/nplusreslw_idvds_b970e203.png",
          "scope": "cadence180_spectre-hspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "nplusreslw",
            "plotType": "idvds"
          }
        },
        {
          "name": "nplusreslw_idvgs.png",
          "relPath": "nplusreslw_idvgs.png",
          "format": "png",
          "size": "81.2 KB",
          "hash": "bcc8b3f6",
          "displayUrl": "translator/plots/nplusreslw_idvgs_bcc8b3f6.png",
          "scope": "cadence180_spectre-hspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "nplusreslw",
            "plotType": "idvgs"
          }
        },
        {
          "name": "nwellreslw_idvds.png",
          "relPath": "nwellreslw_idvds.png",
          "format": "png",
          "size": "142.7 KB",
          "hash": "d501f447",
          "displayUrl": "translator/plots/nwellreslw_idvds_d501f447.png",
          "scope": "cadence180_spectre-hspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "nwellreslw",
            "plotType": "idvds"
          }
        },
        {
          "name": "nwellreslw_idvgs.png",
          "relPath": "nwellreslw_idvgs.png",
          "format": "png",
          "size": "80.4 KB",
          "hash": "16c8849c",
          "displayUrl": "translator/plots/nwellreslw_idvgs_16c8849c.png",
          "scope": "cadence180_spectre-hspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "nwellreslw",
            "plotType": "idvgs"
          }
        },
        {
          "name": "pmos25_idvds.png",
          "relPath": "pmos25_idvds.png",
          "format": "png",
          "size": "142.1 KB",
          "hash": "75129d56",
          "displayUrl": "translator/plots/pmos25_idvds_75129d56.png",
          "scope": "cadence180_spectre-hspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "pmos25",
            "plotType": "idvds"
          }
        },
        {
          "name": "pmos25_idvgs.png",
          "relPath": "pmos25_idvgs.png",
          "format": "png",
          "size": "63.8 KB",
          "hash": "4c68c320",
          "displayUrl": "translator/plots/pmos25_idvgs_4c68c320.png",
          "scope": "cadence180_spectre-hspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "pmos25",
            "plotType": "idvgs"
          }
        },
        {
          "name": "pmos_rf_idvds.png",
          "relPath": "pmos_rf_idvds.png",
          "format": "png",
          "size": "141.6 KB",
          "hash": "7a0fcbbe",
          "displayUrl": "translator/plots/pmos_rf_idvds_7a0fcbbe.png",
          "scope": "cadence180_spectre-hspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "pmos",
            "plotType": "idvds"
          }
        },
        {
          "name": "pmos_rf_idvgs.png",
          "relPath": "pmos_rf_idvgs.png",
          "format": "png",
          "size": "63.0 KB",
          "hash": "bcac3440",
          "displayUrl": "translator/plots/pmos_rf_idvgs_bcac3440.png",
          "scope": "cadence180_spectre-hspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "pmos",
            "plotType": "idvgs"
          }
        },
        {
          "name": "pplusreslw_idvds.png",
          "relPath": "pplusreslw_idvds.png",
          "format": "png",
          "size": "142.8 KB",
          "hash": "a44216c7",
          "displayUrl": "translator/plots/pplusreslw_idvds_a44216c7.png",
          "scope": "cadence180_spectre-hspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "pplusreslw",
            "plotType": "idvds"
          }
        },
        {
          "name": "pplusreslw_idvgs.png",
          "relPath": "pplusreslw_idvgs.png",
          "format": "png",
          "size": "81.3 KB",
          "hash": "06e66822",
          "displayUrl": "translator/plots/pplusreslw_idvgs_06e66822.png",
          "scope": "cadence180_spectre-hspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "pplusreslw",
            "plotType": "idvgs"
          }
        }
      ],
      "dataArtifacts": [
        {
          "name": "pdk_translation_summary.csv",
          "relPath": "reports/pdk_translation_summary.csv",
          "format": "csv",
          "size": "6.7 KB",
          "hash": "131aa723",
          "columns": [
            "pdk",
            "source_format",
            "target",
            "successful",
            "failed",
            "models_out",
            "total_files",
            "success_rate_percent",
            "effective_model_deck_success_percent",
            "excluded_non_model_files",
            "model_deck_files",
            "model_deck_successful",
            "model_deck_failed",
            "dominant_exclusion_class",
            "total_duration_ms",
            "failure_reason",
            "failed_sections",
            "notes"
          ],
          "rowCount": 1
        }
      ],
      "otherArtifacts": [],
      "summary": {
        "totalReports": 0,
        "totalPlots": 14,
        "totalData": 1,
        "stats": {
          "files": "14",
          "successful": "11",
          "failed": "3",
          "rawSuccess": "78.6",
          "effectiveSuccess": "100.0",
          "modelsOut": "29",
          "duration": "35.0",
          "failureReason": "Invalid models provided",
          "notes": "All model-deck files translated; failures concentrated in excluded wrapper/helper files"
        }
      }
    },
    {
      "resultId": "pdk-cadence180-spectre-ngspice",
      "title": "cadence180: spectre → ngspice",
      "description": "14 files, 11 successful, 78.6% success, 29 models.",
      "kind": "pdk_target",
      "level": 1,
      "pdk": "cadence180",
      "sourceFormat": "spectre",
      "targetFormat": "ngspice",
      "generatedAt": "2026-04-19",
      "status": "partial",
      "reports": [],
      "plots": [
        {
          "name": "ndio_iv.png",
          "relPath": "ndio_iv.png",
          "format": "png",
          "size": "49.5 KB",
          "hash": "39f5d0d5",
          "displayUrl": "translator/plots/ndio_iv_39f5d0d5.png",
          "scope": "cadence180_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "ndio iv.png",
            "what": "Original verification output generated by the tool.",
            "why": "Part of the automated translation verification pipeline.",
            "device": "—",
            "plotType": "other"
          }
        },
        {
          "name": "nmos1_int_idvds.png",
          "relPath": "nmos1_int_idvds.png",
          "format": "png",
          "size": "90.0 KB",
          "hash": "888077ea",
          "displayUrl": "translator/plots/nmos1_int_idvds_888077ea.png",
          "scope": "cadence180_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "nmos1",
            "plotType": "idvds"
          }
        },
        {
          "name": "nmos1_int_idvgs.png",
          "relPath": "nmos1_int_idvgs.png",
          "format": "png",
          "size": "62.3 KB",
          "hash": "19a47157",
          "displayUrl": "translator/plots/nmos1_int_idvgs_19a47157.png",
          "scope": "cadence180_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "nmos1",
            "plotType": "idvgs"
          }
        },
        {
          "name": "nmos25_idvds.png",
          "relPath": "nmos25_idvds.png",
          "format": "png",
          "size": "142.3 KB",
          "hash": "1f1b688c",
          "displayUrl": "translator/plots/nmos25_idvds_1f1b688c.png",
          "scope": "cadence180_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "nmos25",
            "plotType": "idvds"
          }
        },
        {
          "name": "nmos25_idvgs.png",
          "relPath": "nmos25_idvgs.png",
          "format": "png",
          "size": "80.3 KB",
          "hash": "d2897f3b",
          "displayUrl": "translator/plots/nmos25_idvgs_d2897f3b.png",
          "scope": "cadence180_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "nmos25",
            "plotType": "idvgs"
          }
        },
        {
          "name": "nmos_rf_idvds.png",
          "relPath": "nmos_rf_idvds.png",
          "format": "png",
          "size": "141.9 KB",
          "hash": "f2e7c62d",
          "displayUrl": "translator/plots/nmos_rf_idvds_f2e7c62d.png",
          "scope": "cadence180_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "nmos",
            "plotType": "idvds"
          }
        },
        {
          "name": "nmos_rf_idvgs.png",
          "relPath": "nmos_rf_idvgs.png",
          "format": "png",
          "size": "79.5 KB",
          "hash": "0f50e725",
          "displayUrl": "translator/plots/nmos_rf_idvgs_0f50e725.png",
          "scope": "cadence180_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "nmos",
            "plotType": "idvgs"
          }
        },
        {
          "name": "npn_gummel.png",
          "relPath": "npn_gummel.png",
          "format": "png",
          "size": "76.0 KB",
          "hash": "f01e1105",
          "displayUrl": "translator/plots/npn_gummel_f01e1105.png",
          "scope": "cadence180_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Gummel Plot",
            "what": "Collector and base current vs base-emitter voltage for BJT devices.",
            "why": "Validates current gain (beta) and junction characteristics after translation.",
            "device": "npn",
            "plotType": "gummel"
          }
        },
        {
          "name": "nwdiodejv_iv.png",
          "relPath": "nwdiodejv_iv.png",
          "format": "png",
          "size": "54.2 KB",
          "hash": "a41f0ad9",
          "displayUrl": "translator/plots/nwdiodejv_iv_a41f0ad9.png",
          "scope": "cadence180_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "nwdiodejv iv.png",
            "what": "Original verification output generated by the tool.",
            "why": "Part of the automated translation verification pipeline.",
            "device": "—",
            "plotType": "other"
          }
        },
        {
          "name": "pdio_iv.png",
          "relPath": "pdio_iv.png",
          "format": "png",
          "size": "52.2 KB",
          "hash": "df331e41",
          "displayUrl": "translator/plots/pdio_iv_df331e41.png",
          "scope": "cadence180_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "pdio iv.png",
            "what": "Original verification output generated by the tool.",
            "why": "Part of the automated translation verification pipeline.",
            "device": "—",
            "plotType": "other"
          }
        },
        {
          "name": "pdiodejv_iv.png",
          "relPath": "pdiodejv_iv.png",
          "format": "png",
          "size": "53.3 KB",
          "hash": "8c126a2a",
          "displayUrl": "translator/plots/pdiodejv_iv_8c126a2a.png",
          "scope": "cadence180_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "pdiodejv iv.png",
            "what": "Original verification output generated by the tool.",
            "why": "Part of the automated translation verification pipeline.",
            "device": "—",
            "plotType": "other"
          }
        },
        {
          "name": "pmos1_int_idvds.png",
          "relPath": "pmos1_int_idvds.png",
          "format": "png",
          "size": "90.0 KB",
          "hash": "12bf4838",
          "displayUrl": "translator/plots/pmos1_int_idvds_12bf4838.png",
          "scope": "cadence180_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "pmos1",
            "plotType": "idvds"
          }
        },
        {
          "name": "pmos1_int_idvgs.png",
          "relPath": "pmos1_int_idvgs.png",
          "format": "png",
          "size": "61.2 KB",
          "hash": "08de8460",
          "displayUrl": "translator/plots/pmos1_int_idvgs_08de8460.png",
          "scope": "cadence180_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "pmos1",
            "plotType": "idvgs"
          }
        },
        {
          "name": "pmos25_idvds.png",
          "relPath": "pmos25_idvds.png",
          "format": "png",
          "size": "142.1 KB",
          "hash": "75129d56",
          "displayUrl": "translator/plots/pmos25_idvds_75129d56.png",
          "scope": "cadence180_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "pmos25",
            "plotType": "idvds"
          }
        },
        {
          "name": "pmos25_idvgs.png",
          "relPath": "pmos25_idvgs.png",
          "format": "png",
          "size": "63.8 KB",
          "hash": "4c68c320",
          "displayUrl": "translator/plots/pmos25_idvgs_4c68c320.png",
          "scope": "cadence180_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "pmos25",
            "plotType": "idvgs"
          }
        },
        {
          "name": "pmos_rf_idvds.png",
          "relPath": "pmos_rf_idvds.png",
          "format": "png",
          "size": "141.6 KB",
          "hash": "7a0fcbbe",
          "displayUrl": "translator/plots/pmos_rf_idvds_7a0fcbbe.png",
          "scope": "cadence180_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "pmos",
            "plotType": "idvds"
          }
        },
        {
          "name": "pmos_rf_idvgs.png",
          "relPath": "pmos_rf_idvgs.png",
          "format": "png",
          "size": "63.0 KB",
          "hash": "bcac3440",
          "displayUrl": "translator/plots/pmos_rf_idvgs_bcac3440.png",
          "scope": "cadence180_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "pmos",
            "plotType": "idvgs"
          }
        },
        {
          "name": "pnp_gummel.png",
          "relPath": "pnp_gummel.png",
          "format": "png",
          "size": "89.9 KB",
          "hash": "4386d021",
          "displayUrl": "translator/plots/pnp_gummel_4386d021.png",
          "scope": "cadence180_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Gummel Plot",
            "what": "Collector and base current vs base-emitter voltage for BJT devices.",
            "why": "Validates current gain (beta) and junction characteristics after translation.",
            "device": "pnp",
            "plotType": "gummel"
          }
        },
        {
          "name": "vpnp_gummel.png",
          "relPath": "vpnp_gummel.png",
          "format": "png",
          "size": "90.6 KB",
          "hash": "51f37574",
          "displayUrl": "translator/plots/vpnp_gummel_51f37574.png",
          "scope": "cadence180_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Gummel Plot",
            "what": "Collector and base current vs base-emitter voltage for BJT devices.",
            "why": "Validates current gain (beta) and junction characteristics after translation.",
            "device": "vpnp",
            "plotType": "gummel"
          }
        }
      ],
      "dataArtifacts": [
        {
          "name": "pdk_translation_summary.csv",
          "relPath": "reports/pdk_translation_summary.csv",
          "format": "csv",
          "size": "6.7 KB",
          "hash": "131aa723",
          "columns": [
            "pdk",
            "source_format",
            "target",
            "successful",
            "failed",
            "models_out",
            "total_files",
            "success_rate_percent",
            "effective_model_deck_success_percent",
            "excluded_non_model_files",
            "model_deck_files",
            "model_deck_successful",
            "model_deck_failed",
            "dominant_exclusion_class",
            "total_duration_ms",
            "failure_reason",
            "failed_sections",
            "notes"
          ],
          "rowCount": 1
        }
      ],
      "otherArtifacts": [],
      "summary": {
        "totalReports": 0,
        "totalPlots": 19,
        "totalData": 1,
        "stats": {
          "files": "14",
          "successful": "11",
          "failed": "3",
          "rawSuccess": "78.6",
          "effectiveSuccess": "100.0",
          "modelsOut": "29",
          "duration": "56.6",
          "failureReason": "Invalid models provided",
          "notes": "All model-deck files translated; failures concentrated in excluded wrapper/helper files"
        }
      }
    },
    {
      "resultId": "pdk-cadence45-spectre-hspice",
      "title": "cadence45: spectre → hspice",
      "description": "9 files, 7 successful, 77.8% success, 49 models.",
      "kind": "pdk_target",
      "level": 1,
      "pdk": "cadence45",
      "sourceFormat": "spectre",
      "targetFormat": "hspice",
      "generatedAt": "2026-04-19",
      "status": "partial",
      "reports": [],
      "plots": [
        {
          "name": "g45inda_idvds.png",
          "relPath": "g45inda_idvds.png",
          "format": "png",
          "size": "142.3 KB",
          "hash": "7811d7f4",
          "displayUrl": "translator/plots/g45inda_idvds_7811d7f4.png",
          "scope": "cadence45_spectre-hspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "g45inda",
            "plotType": "idvds"
          }
        },
        {
          "name": "g45inda_idvgs.png",
          "relPath": "g45inda_idvgs.png",
          "format": "png",
          "size": "80.3 KB",
          "hash": "b96938b6",
          "displayUrl": "translator/plots/g45inda_idvgs_b96938b6.png",
          "scope": "cadence45_spectre-hspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "g45inda",
            "plotType": "idvgs"
          }
        },
        {
          "name": "g45inds_idvds.png",
          "relPath": "g45inds_idvds.png",
          "format": "png",
          "size": "142.3 KB",
          "hash": "015c99ff",
          "displayUrl": "translator/plots/g45inds_idvds_015c99ff.png",
          "scope": "cadence45_spectre-hspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "g45inds",
            "plotType": "idvds"
          }
        },
        {
          "name": "g45inds_idvgs.png",
          "relPath": "g45inds_idvgs.png",
          "format": "png",
          "size": "80.1 KB",
          "hash": "4b7917e1",
          "displayUrl": "translator/plots/g45inds_idvgs_4b7917e1.png",
          "scope": "cadence45_spectre-hspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "g45inds",
            "plotType": "idvgs"
          }
        },
        {
          "name": "nch18_idvds.png",
          "relPath": "nch18_idvds.png",
          "format": "png",
          "size": "141.6 KB",
          "hash": "4518d515",
          "displayUrl": "translator/plots/nch18_idvds_4518d515.png",
          "scope": "cadence45_spectre-hspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "nch18",
            "plotType": "idvds"
          }
        },
        {
          "name": "nch18_idvgs.png",
          "relPath": "nch18_idvgs.png",
          "format": "png",
          "size": "79.1 KB",
          "hash": "6697aed7",
          "displayUrl": "translator/plots/nch18_idvgs_6697aed7.png",
          "scope": "cadence45_spectre-hspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "nch18",
            "plotType": "idvgs"
          }
        },
        {
          "name": "nch18_mac_idvds.png",
          "relPath": "nch18_mac_idvds.png",
          "format": "png",
          "size": "142.2 KB",
          "hash": "9c7a0ee2",
          "displayUrl": "translator/plots/nch18_mac_idvds_9c7a0ee2.png",
          "scope": "cadence45_spectre-hspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "nch18",
            "plotType": "idvds"
          }
        },
        {
          "name": "nch18_mac_idvgs.png",
          "relPath": "nch18_mac_idvgs.png",
          "format": "png",
          "size": "80.2 KB",
          "hash": "b49cfa04",
          "displayUrl": "translator/plots/nch18_mac_idvgs_b49cfa04.png",
          "scope": "cadence45_spectre-hspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "nch18",
            "plotType": "idvgs"
          }
        },
        {
          "name": "nch18_na_idvds.png",
          "relPath": "nch18_na_idvds.png",
          "format": "png",
          "size": "141.9 KB",
          "hash": "718cac46",
          "displayUrl": "translator/plots/nch18_na_idvds_718cac46.png",
          "scope": "cadence45_spectre-hspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "nch18",
            "plotType": "idvds"
          }
        },
        {
          "name": "nch18_na_idvgs.png",
          "relPath": "nch18_na_idvgs.png",
          "format": "png",
          "size": "79.7 KB",
          "hash": "373e85d6",
          "displayUrl": "translator/plots/nch18_na_idvgs_373e85d6.png",
          "scope": "cadence45_spectre-hspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "nch18",
            "plotType": "idvgs"
          }
        },
        {
          "name": "nch_idvds.png",
          "relPath": "nch_idvds.png",
          "format": "png",
          "size": "140.9 KB",
          "hash": "19a7ab51",
          "displayUrl": "translator/plots/nch_idvds_19a7ab51.png",
          "scope": "cadence45_spectre-hspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "nch",
            "plotType": "idvds"
          }
        },
        {
          "name": "nch_idvgs.png",
          "relPath": "nch_idvgs.png",
          "format": "png",
          "size": "77.6 KB",
          "hash": "32f53816",
          "displayUrl": "translator/plots/nch_idvgs_32f53816.png",
          "scope": "cadence45_spectre-hspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "nch",
            "plotType": "idvgs"
          }
        },
        {
          "name": "nch_mac_idvds.png",
          "relPath": "nch_mac_idvds.png",
          "format": "png",
          "size": "142.1 KB",
          "hash": "43759a56",
          "displayUrl": "translator/plots/nch_mac_idvds_43759a56.png",
          "scope": "cadence45_spectre-hspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "nch",
            "plotType": "idvds"
          }
        },
        {
          "name": "nch_mac_idvgs.png",
          "relPath": "nch_mac_idvgs.png",
          "format": "png",
          "size": "79.6 KB",
          "hash": "0bf474a3",
          "displayUrl": "translator/plots/nch_mac_idvgs_0bf474a3.png",
          "scope": "cadence45_spectre-hspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "nch",
            "plotType": "idvgs"
          }
        },
        {
          "name": "pch18_mac_idvds.png",
          "relPath": "pch18_mac_idvds.png",
          "format": "png",
          "size": "142.3 KB",
          "hash": "956da3df",
          "displayUrl": "translator/plots/pch18_mac_idvds_956da3df.png",
          "scope": "cadence45_spectre-hspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "pch18",
            "plotType": "idvds"
          }
        },
        {
          "name": "pch18_mac_idvgs.png",
          "relPath": "pch18_mac_idvgs.png",
          "format": "png",
          "size": "64.1 KB",
          "hash": "5a4585c3",
          "displayUrl": "translator/plots/pch18_mac_idvgs_5a4585c3.png",
          "scope": "cadence45_spectre-hspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "pch18",
            "plotType": "idvgs"
          }
        },
        {
          "name": "pch_idvds.png",
          "relPath": "pch_idvds.png",
          "format": "png",
          "size": "140.7 KB",
          "hash": "b9c7fd88",
          "displayUrl": "translator/plots/pch_idvds_b9c7fd88.png",
          "scope": "cadence45_spectre-hspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "pch",
            "plotType": "idvds"
          }
        },
        {
          "name": "pch_idvgs.png",
          "relPath": "pch_idvgs.png",
          "format": "png",
          "size": "60.9 KB",
          "hash": "7ae09f9e",
          "displayUrl": "translator/plots/pch_idvgs_7ae09f9e.png",
          "scope": "cadence45_spectre-hspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "pch",
            "plotType": "idvgs"
          }
        }
      ],
      "dataArtifacts": [
        {
          "name": "pdk_translation_summary.csv",
          "relPath": "reports/pdk_translation_summary.csv",
          "format": "csv",
          "size": "6.7 KB",
          "hash": "131aa723",
          "columns": [
            "pdk",
            "source_format",
            "target",
            "successful",
            "failed",
            "models_out",
            "total_files",
            "success_rate_percent",
            "effective_model_deck_success_percent",
            "excluded_non_model_files",
            "model_deck_files",
            "model_deck_successful",
            "model_deck_failed",
            "dominant_exclusion_class",
            "total_duration_ms",
            "failure_reason",
            "failed_sections",
            "notes"
          ],
          "rowCount": 1
        }
      ],
      "otherArtifacts": [],
      "summary": {
        "totalReports": 0,
        "totalPlots": 18,
        "totalData": 1,
        "stats": {
          "files": "9",
          "successful": "7",
          "failed": "2",
          "rawSuccess": "77.8",
          "effectiveSuccess": "87.5",
          "modelsOut": "49",
          "duration": "1346.8",
          "failureReason": "Invalid models provided",
          "notes": "Primary failures are top-level wrappers without standalone model cards"
        }
      }
    },
    {
      "resultId": "pdk-cadence45-spectre-ngspice",
      "title": "cadence45: spectre → ngspice",
      "description": "9 files, 7 successful, 77.8% success, 49 models.",
      "kind": "pdk_target",
      "level": 1,
      "pdk": "cadence45",
      "sourceFormat": "spectre",
      "targetFormat": "ngspice",
      "generatedAt": "2026-04-19",
      "status": "partial",
      "reports": [],
      "plots": [
        {
          "name": "g45inda_idvds.png",
          "relPath": "g45inda_idvds.png",
          "format": "png",
          "size": "142.3 KB",
          "hash": "7811d7f4",
          "displayUrl": "translator/plots/g45inda_idvds_7811d7f4.png",
          "scope": "cadence45_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "g45inda",
            "plotType": "idvds"
          }
        },
        {
          "name": "g45inda_idvgs.png",
          "relPath": "g45inda_idvgs.png",
          "format": "png",
          "size": "80.3 KB",
          "hash": "b96938b6",
          "displayUrl": "translator/plots/g45inda_idvgs_b96938b6.png",
          "scope": "cadence45_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "g45inda",
            "plotType": "idvgs"
          }
        },
        {
          "name": "g45inds_idvds.png",
          "relPath": "g45inds_idvds.png",
          "format": "png",
          "size": "142.3 KB",
          "hash": "015c99ff",
          "displayUrl": "translator/plots/g45inds_idvds_015c99ff.png",
          "scope": "cadence45_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "g45inds",
            "plotType": "idvds"
          }
        },
        {
          "name": "g45inds_idvgs.png",
          "relPath": "g45inds_idvgs.png",
          "format": "png",
          "size": "80.1 KB",
          "hash": "4b7917e1",
          "displayUrl": "translator/plots/g45inds_idvgs_4b7917e1.png",
          "scope": "cadence45_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "g45inds",
            "plotType": "idvgs"
          }
        },
        {
          "name": "g45nd1hvt_iv.png",
          "relPath": "g45nd1hvt_iv.png",
          "format": "png",
          "size": "53.5 KB",
          "hash": "bb64a720",
          "displayUrl": "translator/plots/g45nd1hvt_iv_bb64a720.png",
          "scope": "cadence45_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "g45nd1hvt iv.png",
            "what": "Original verification output generated by the tool.",
            "why": "Part of the automated translation verification pipeline.",
            "device": "—",
            "plotType": "other"
          }
        },
        {
          "name": "g45nd1lvt_iv.png",
          "relPath": "g45nd1lvt_iv.png",
          "format": "png",
          "size": "53.5 KB",
          "hash": "0135b2fc",
          "displayUrl": "translator/plots/g45nd1lvt_iv_0135b2fc.png",
          "scope": "cadence45_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "g45nd1lvt iv.png",
            "what": "Original verification output generated by the tool.",
            "why": "Part of the automated translation verification pipeline.",
            "device": "—",
            "plotType": "other"
          }
        },
        {
          "name": "g45nd1nvt_iv.png",
          "relPath": "g45nd1nvt_iv.png",
          "format": "png",
          "size": "53.4 KB",
          "hash": "c5da3bee",
          "displayUrl": "translator/plots/g45nd1nvt_iv_c5da3bee.png",
          "scope": "cadence45_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "g45nd1nvt iv.png",
            "what": "Original verification output generated by the tool.",
            "why": "Part of the automated translation verification pipeline.",
            "device": "—",
            "plotType": "other"
          }
        },
        {
          "name": "g45nd1svt_iv.png",
          "relPath": "g45nd1svt_iv.png",
          "format": "png",
          "size": "53.8 KB",
          "hash": "c6f4dee8",
          "displayUrl": "translator/plots/g45nd1svt_iv_c6f4dee8.png",
          "scope": "cadence45_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "g45nd1svt iv.png",
            "what": "Original verification output generated by the tool.",
            "why": "Part of the automated translation verification pipeline.",
            "device": "—",
            "plotType": "other"
          }
        },
        {
          "name": "g45nd2svt_iv.png",
          "relPath": "g45nd2svt_iv.png",
          "format": "png",
          "size": "54.1 KB",
          "hash": "1c5b1d34",
          "displayUrl": "translator/plots/g45nd2svt_iv_1c5b1d34.png",
          "scope": "cadence45_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "g45nd2svt iv.png",
            "what": "Original verification output generated by the tool.",
            "why": "Part of the automated translation verification pipeline.",
            "device": "—",
            "plotType": "other"
          }
        },
        {
          "name": "g45nrdio_iv.png",
          "relPath": "g45nrdio_iv.png",
          "format": "png",
          "size": "53.2 KB",
          "hash": "4cf98022",
          "displayUrl": "translator/plots/g45nrdio_iv_4cf98022.png",
          "scope": "cadence45_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "g45nrdio iv.png",
            "what": "Original verification output generated by the tool.",
            "why": "Part of the automated translation verification pipeline.",
            "device": "—",
            "plotType": "other"
          }
        },
        {
          "name": "g45pd1svt_iv.png",
          "relPath": "g45pd1svt_iv.png",
          "format": "png",
          "size": "53.9 KB",
          "hash": "5bdd94e7",
          "displayUrl": "translator/plots/g45pd1svt_iv_5bdd94e7.png",
          "scope": "cadence45_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "g45pd1svt iv.png",
            "what": "Original verification output generated by the tool.",
            "why": "Part of the automated translation verification pipeline.",
            "device": "—",
            "plotType": "other"
          }
        },
        {
          "name": "g45prdio_iv.png",
          "relPath": "g45prdio_iv.png",
          "format": "png",
          "size": "53.6 KB",
          "hash": "723ebaa9",
          "displayUrl": "translator/plots/g45prdio_iv_723ebaa9.png",
          "scope": "cadence45_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "g45prdio iv.png",
            "what": "Original verification output generated by the tool.",
            "why": "Part of the automated translation verification pipeline.",
            "device": "—",
            "plotType": "other"
          }
        },
        {
          "name": "nch18_idvds.png",
          "relPath": "nch18_idvds.png",
          "format": "png",
          "size": "141.6 KB",
          "hash": "4518d515",
          "displayUrl": "translator/plots/nch18_idvds_4518d515.png",
          "scope": "cadence45_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "nch18",
            "plotType": "idvds"
          }
        },
        {
          "name": "nch18_idvgs.png",
          "relPath": "nch18_idvgs.png",
          "format": "png",
          "size": "79.1 KB",
          "hash": "6697aed7",
          "displayUrl": "translator/plots/nch18_idvgs_6697aed7.png",
          "scope": "cadence45_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "nch18",
            "plotType": "idvgs"
          }
        },
        {
          "name": "nch18_mac_idvds.png",
          "relPath": "nch18_mac_idvds.png",
          "format": "png",
          "size": "142.2 KB",
          "hash": "9c7a0ee2",
          "displayUrl": "translator/plots/nch18_mac_idvds_9c7a0ee2.png",
          "scope": "cadence45_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "nch18",
            "plotType": "idvds"
          }
        },
        {
          "name": "nch18_mac_idvgs.png",
          "relPath": "nch18_mac_idvgs.png",
          "format": "png",
          "size": "80.2 KB",
          "hash": "b49cfa04",
          "displayUrl": "translator/plots/nch18_mac_idvgs_b49cfa04.png",
          "scope": "cadence45_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "nch18",
            "plotType": "idvgs"
          }
        },
        {
          "name": "nch18_na_idvds.png",
          "relPath": "nch18_na_idvds.png",
          "format": "png",
          "size": "141.9 KB",
          "hash": "718cac46",
          "displayUrl": "translator/plots/nch18_na_idvds_718cac46.png",
          "scope": "cadence45_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "nch18",
            "plotType": "idvds"
          }
        },
        {
          "name": "nch18_na_idvgs.png",
          "relPath": "nch18_na_idvgs.png",
          "format": "png",
          "size": "79.7 KB",
          "hash": "373e85d6",
          "displayUrl": "translator/plots/nch18_na_idvgs_373e85d6.png",
          "scope": "cadence45_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "nch18",
            "plotType": "idvgs"
          }
        },
        {
          "name": "nch_hvt_idvds.png",
          "relPath": "nch_hvt_idvds.png",
          "format": "png",
          "size": "141.8 KB",
          "hash": "4da968d3",
          "displayUrl": "translator/plots/nch_hvt_idvds_4da968d3.png",
          "scope": "cadence45_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "nch",
            "plotType": "idvds"
          }
        },
        {
          "name": "nch_hvt_idvgs.png",
          "relPath": "nch_hvt_idvgs.png",
          "format": "png",
          "size": "79.0 KB",
          "hash": "6ff767ec",
          "displayUrl": "translator/plots/nch_hvt_idvgs_6ff767ec.png",
          "scope": "cadence45_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "nch",
            "plotType": "idvgs"
          }
        },
        {
          "name": "nch_idvds.png",
          "relPath": "nch_idvds.png",
          "format": "png",
          "size": "140.9 KB",
          "hash": "19a7ab51",
          "displayUrl": "translator/plots/nch_idvds_19a7ab51.png",
          "scope": "cadence45_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "nch",
            "plotType": "idvds"
          }
        },
        {
          "name": "nch_idvgs.png",
          "relPath": "nch_idvgs.png",
          "format": "png",
          "size": "77.6 KB",
          "hash": "32f53816",
          "displayUrl": "translator/plots/nch_idvgs_32f53816.png",
          "scope": "cadence45_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "nch",
            "plotType": "idvgs"
          }
        },
        {
          "name": "nch_mac_idvds.png",
          "relPath": "nch_mac_idvds.png",
          "format": "png",
          "size": "142.1 KB",
          "hash": "43759a56",
          "displayUrl": "translator/plots/nch_mac_idvds_43759a56.png",
          "scope": "cadence45_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "nch",
            "plotType": "idvds"
          }
        },
        {
          "name": "nch_mac_idvgs.png",
          "relPath": "nch_mac_idvgs.png",
          "format": "png",
          "size": "79.6 KB",
          "hash": "0bf474a3",
          "displayUrl": "translator/plots/nch_mac_idvgs_0bf474a3.png",
          "scope": "cadence45_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "nch",
            "plotType": "idvgs"
          }
        },
        {
          "name": "nwdio_iv.png",
          "relPath": "nwdio_iv.png",
          "format": "png",
          "size": "53.2 KB",
          "hash": "e722df3d",
          "displayUrl": "translator/plots/nwdio_iv_e722df3d.png",
          "scope": "cadence45_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "nwdio iv.png",
            "what": "Original verification output generated by the tool.",
            "why": "Part of the automated translation verification pipeline.",
            "device": "—",
            "plotType": "other"
          }
        },
        {
          "name": "pch18_mac_idvds.png",
          "relPath": "pch18_mac_idvds.png",
          "format": "png",
          "size": "142.3 KB",
          "hash": "956da3df",
          "displayUrl": "translator/plots/pch18_mac_idvds_956da3df.png",
          "scope": "cadence45_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "pch18",
            "plotType": "idvds"
          }
        },
        {
          "name": "pch18_mac_idvgs.png",
          "relPath": "pch18_mac_idvgs.png",
          "format": "png",
          "size": "64.1 KB",
          "hash": "5a4585c3",
          "displayUrl": "translator/plots/pch18_mac_idvgs_5a4585c3.png",
          "scope": "cadence45_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "pch18",
            "plotType": "idvgs"
          }
        },
        {
          "name": "pch_idvds.png",
          "relPath": "pch_idvds.png",
          "format": "png",
          "size": "140.7 KB",
          "hash": "b9c7fd88",
          "displayUrl": "translator/plots/pch_idvds_b9c7fd88.png",
          "scope": "cadence45_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "pch",
            "plotType": "idvds"
          }
        },
        {
          "name": "pch_idvgs.png",
          "relPath": "pch_idvgs.png",
          "format": "png",
          "size": "60.9 KB",
          "hash": "7ae09f9e",
          "displayUrl": "translator/plots/pch_idvgs_7ae09f9e.png",
          "scope": "cadence45_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "pch",
            "plotType": "idvgs"
          }
        },
        {
          "name": "pch_mac_idvds.png",
          "relPath": "pch_mac_idvds.png",
          "format": "png",
          "size": "141.7 KB",
          "hash": "bff93ced",
          "displayUrl": "translator/plots/pch_mac_idvds_bff93ced.png",
          "scope": "cadence45_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "pch",
            "plotType": "idvds"
          }
        },
        {
          "name": "pch_mac_idvgs.png",
          "relPath": "pch_mac_idvgs.png",
          "format": "png",
          "size": "62.7 KB",
          "hash": "95f990ba",
          "displayUrl": "translator/plots/pch_mac_idvgs_95f990ba.png",
          "scope": "cadence45_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "pch",
            "plotType": "idvgs"
          }
        }
      ],
      "dataArtifacts": [
        {
          "name": "pdk_translation_summary.csv",
          "relPath": "reports/pdk_translation_summary.csv",
          "format": "csv",
          "size": "6.7 KB",
          "hash": "131aa723",
          "columns": [
            "pdk",
            "source_format",
            "target",
            "successful",
            "failed",
            "models_out",
            "total_files",
            "success_rate_percent",
            "effective_model_deck_success_percent",
            "excluded_non_model_files",
            "model_deck_files",
            "model_deck_successful",
            "model_deck_failed",
            "dominant_exclusion_class",
            "total_duration_ms",
            "failure_reason",
            "failed_sections",
            "notes"
          ],
          "rowCount": 1
        }
      ],
      "otherArtifacts": [],
      "summary": {
        "totalReports": 0,
        "totalPlots": 31,
        "totalData": 1,
        "stats": {
          "files": "9",
          "successful": "7",
          "failed": "2",
          "rawSuccess": "77.8",
          "effectiveSuccess": "87.5",
          "modelsOut": "49",
          "duration": "4051.5",
          "failureReason": "Invalid models provided",
          "notes": "Primary failures are top-level wrappers without standalone model cards"
        }
      }
    },
    {
      "resultId": "pdk-cadence90-spectre-hspice",
      "title": "cadence90: spectre → hspice",
      "description": "9 files, 8 successful, 88.9% success, 57 models.",
      "kind": "pdk_target",
      "level": 1,
      "pdk": "cadence90",
      "sourceFormat": "spectre",
      "targetFormat": "hspice",
      "generatedAt": "2026-04-19",
      "status": "partial",
      "reports": [],
      "plots": [
        {
          "name": "gpdk090_nmos1v_iso_idvds.png",
          "relPath": "gpdk090_nmos1v_iso_idvds.png",
          "format": "png",
          "size": "144.4 KB",
          "hash": "d75c7cb2",
          "displayUrl": "translator/plots/gpdk090_nmos1v_iso_idvds_d75c7cb2.png",
          "scope": "cadence90_spectre-hspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "gpdk090",
            "plotType": "idvds"
          }
        },
        {
          "name": "gpdk090_nmos1v_iso_idvgs.png",
          "relPath": "gpdk090_nmos1v_iso_idvgs.png",
          "format": "png",
          "size": "85.3 KB",
          "hash": "90f935f9",
          "displayUrl": "translator/plots/gpdk090_nmos1v_iso_idvgs_90f935f9.png",
          "scope": "cadence90_spectre-hspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "gpdk090",
            "plotType": "idvgs"
          }
        },
        {
          "name": "resnspdiff_idvds.png",
          "relPath": "resnspdiff_idvds.png",
          "format": "png",
          "size": "142.6 KB",
          "hash": "a312dffc",
          "displayUrl": "translator/plots/resnspdiff_idvds_a312dffc.png",
          "scope": "cadence90_spectre-hspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "resnspdiff",
            "plotType": "idvds"
          }
        },
        {
          "name": "resnspdiff_idvgs.png",
          "relPath": "resnspdiff_idvgs.png",
          "format": "png",
          "size": "81.2 KB",
          "hash": "52f8e4fd",
          "displayUrl": "translator/plots/resnspdiff_idvgs_52f8e4fd.png",
          "scope": "cadence90_spectre-hspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "resnspdiff",
            "plotType": "idvgs"
          }
        },
        {
          "name": "ressndiff_idvds.png",
          "relPath": "ressndiff_idvds.png",
          "format": "png",
          "size": "142.3 KB",
          "hash": "2c6f17b7",
          "displayUrl": "translator/plots/ressndiff_idvds_2c6f17b7.png",
          "scope": "cadence90_spectre-hspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "ressndiff",
            "plotType": "idvds"
          }
        },
        {
          "name": "ressndiff_idvgs.png",
          "relPath": "ressndiff_idvgs.png",
          "format": "png",
          "size": "79.9 KB",
          "hash": "9297d1ad",
          "displayUrl": "translator/plots/ressndiff_idvgs_9297d1ad.png",
          "scope": "cadence90_spectre-hspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "ressndiff",
            "plotType": "idvgs"
          }
        },
        {
          "name": "resspdiff_idvds.png",
          "relPath": "resspdiff_idvds.png",
          "format": "png",
          "size": "142.3 KB",
          "hash": "666357f8",
          "displayUrl": "translator/plots/resspdiff_idvds_666357f8.png",
          "scope": "cadence90_spectre-hspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "resspdiff",
            "plotType": "idvds"
          }
        },
        {
          "name": "resspdiff_idvgs.png",
          "relPath": "resspdiff_idvgs.png",
          "format": "png",
          "size": "80.2 KB",
          "hash": "c6b1aa1a",
          "displayUrl": "translator/plots/resspdiff_idvgs_c6b1aa1a.png",
          "scope": "cadence90_spectre-hspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "resspdiff",
            "plotType": "idvgs"
          }
        }
      ],
      "dataArtifacts": [
        {
          "name": "pdk_translation_summary.csv",
          "relPath": "reports/pdk_translation_summary.csv",
          "format": "csv",
          "size": "6.7 KB",
          "hash": "131aa723",
          "columns": [
            "pdk",
            "source_format",
            "target",
            "successful",
            "failed",
            "models_out",
            "total_files",
            "success_rate_percent",
            "effective_model_deck_success_percent",
            "excluded_non_model_files",
            "model_deck_files",
            "model_deck_successful",
            "model_deck_failed",
            "dominant_exclusion_class",
            "total_duration_ms",
            "failure_reason",
            "failed_sections",
            "notes"
          ],
          "rowCount": 1
        }
      ],
      "otherArtifacts": [],
      "summary": {
        "totalReports": 0,
        "totalPlots": 8,
        "totalData": 1,
        "stats": {
          "files": "9",
          "successful": "8",
          "failed": "1",
          "rawSuccess": "88.9",
          "effectiveSuccess": "100.0",
          "modelsOut": "57",
          "duration": "47.5",
          "failureReason": "Invalid models provided",
          "notes": "All model-deck files translated; failures concentrated in excluded wrapper/helper files"
        }
      }
    },
    {
      "resultId": "pdk-cadence90-spectre-ngspice",
      "title": "cadence90: spectre → ngspice",
      "description": "9 files, 8 successful, 88.9% success, 57 models.",
      "kind": "pdk_target",
      "level": 1,
      "pdk": "cadence90",
      "sourceFormat": "spectre",
      "targetFormat": "ngspice",
      "generatedAt": "2026-04-19",
      "status": "partial",
      "reports": [],
      "plots": [
        {
          "name": "gpdk090_nmos1v_hvt_idvds.png",
          "relPath": "gpdk090_nmos1v_hvt_idvds.png",
          "format": "png",
          "size": "144.3 KB",
          "hash": "81f64049",
          "displayUrl": "translator/plots/gpdk090_nmos1v_hvt_idvds_81f64049.png",
          "scope": "cadence90_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "gpdk090",
            "plotType": "idvds"
          }
        },
        {
          "name": "gpdk090_nmos1v_hvt_idvgs.png",
          "relPath": "gpdk090_nmos1v_hvt_idvgs.png",
          "format": "png",
          "size": "84.9 KB",
          "hash": "8fdcf5c5",
          "displayUrl": "translator/plots/gpdk090_nmos1v_hvt_idvgs_8fdcf5c5.png",
          "scope": "cadence90_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "gpdk090",
            "plotType": "idvgs"
          }
        },
        {
          "name": "gpdk090_nmos1v_hvt_x_idvds.png",
          "relPath": "gpdk090_nmos1v_hvt_x_idvds.png",
          "format": "png",
          "size": "144.6 KB",
          "hash": "4073dc6b",
          "displayUrl": "translator/plots/gpdk090_nmos1v_hvt_x_idvds_4073dc6b.png",
          "scope": "cadence90_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "gpdk090",
            "plotType": "idvds"
          }
        },
        {
          "name": "gpdk090_nmos1v_hvt_x_idvgs.png",
          "relPath": "gpdk090_nmos1v_hvt_x_idvgs.png",
          "format": "png",
          "size": "85.5 KB",
          "hash": "a974300f",
          "displayUrl": "translator/plots/gpdk090_nmos1v_hvt_x_idvgs_a974300f.png",
          "scope": "cadence90_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "gpdk090",
            "plotType": "idvgs"
          }
        },
        {
          "name": "gpdk090_nmos1v_iso_idvds.png",
          "relPath": "gpdk090_nmos1v_iso_idvds.png",
          "format": "png",
          "size": "144.4 KB",
          "hash": "d75c7cb2",
          "displayUrl": "translator/plots/gpdk090_nmos1v_iso_idvds_d75c7cb2.png",
          "scope": "cadence90_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "gpdk090",
            "plotType": "idvds"
          }
        },
        {
          "name": "gpdk090_nmos1v_iso_idvgs.png",
          "relPath": "gpdk090_nmos1v_iso_idvgs.png",
          "format": "png",
          "size": "85.3 KB",
          "hash": "90f935f9",
          "displayUrl": "translator/plots/gpdk090_nmos1v_iso_idvgs_90f935f9.png",
          "scope": "cadence90_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "gpdk090",
            "plotType": "idvgs"
          }
        },
        {
          "name": "gpdk090_nmos1v_nat_x_idvds.png",
          "relPath": "gpdk090_nmos1v_nat_x_idvds.png",
          "format": "png",
          "size": "144.5 KB",
          "hash": "9b9de4f6",
          "displayUrl": "translator/plots/gpdk090_nmos1v_nat_x_idvds_9b9de4f6.png",
          "scope": "cadence90_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "gpdk090",
            "plotType": "idvds"
          }
        },
        {
          "name": "gpdk090_nmos1v_nat_x_idvgs.png",
          "relPath": "gpdk090_nmos1v_nat_x_idvgs.png",
          "format": "png",
          "size": "85.5 KB",
          "hash": "f1375986",
          "displayUrl": "translator/plots/gpdk090_nmos1v_nat_x_idvgs_f1375986.png",
          "scope": "cadence90_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "gpdk090",
            "plotType": "idvgs"
          }
        },
        {
          "name": "gpdk090_nmos1v_x_idvds.png",
          "relPath": "gpdk090_nmos1v_x_idvds.png",
          "format": "png",
          "size": "144.1 KB",
          "hash": "1ece243f",
          "displayUrl": "translator/plots/gpdk090_nmos1v_x_idvds_1ece243f.png",
          "scope": "cadence90_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "gpdk090",
            "plotType": "idvds"
          }
        },
        {
          "name": "gpdk090_nmos1v_x_idvgs.png",
          "relPath": "gpdk090_nmos1v_x_idvgs.png",
          "format": "png",
          "size": "84.5 KB",
          "hash": "eb02b849",
          "displayUrl": "translator/plots/gpdk090_nmos1v_x_idvgs_eb02b849.png",
          "scope": "cadence90_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "gpdk090",
            "plotType": "idvgs"
          }
        },
        {
          "name": "gpdk090_nmoscap1v_hvt_idvds.png",
          "relPath": "gpdk090_nmoscap1v_hvt_idvds.png",
          "format": "png",
          "size": "144.8 KB",
          "hash": "d8cbef19",
          "displayUrl": "translator/plots/gpdk090_nmoscap1v_hvt_idvds_d8cbef19.png",
          "scope": "cadence90_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "gpdk090",
            "plotType": "idvds"
          }
        },
        {
          "name": "gpdk090_nmoscap1v_hvt_idvgs.png",
          "relPath": "gpdk090_nmoscap1v_hvt_idvgs.png",
          "format": "png",
          "size": "86.2 KB",
          "hash": "5e54aa90",
          "displayUrl": "translator/plots/gpdk090_nmoscap1v_hvt_idvgs_5e54aa90.png",
          "scope": "cadence90_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "gpdk090",
            "plotType": "idvgs"
          }
        },
        {
          "name": "gpdk090_nmoscap1v_idvds.png",
          "relPath": "gpdk090_nmoscap1v_idvds.png",
          "format": "png",
          "size": "144.2 KB",
          "hash": "7aa3185c",
          "displayUrl": "translator/plots/gpdk090_nmoscap1v_idvds_7aa3185c.png",
          "scope": "cadence90_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "gpdk090",
            "plotType": "idvds"
          }
        },
        {
          "name": "gpdk090_nmoscap1v_idvgs.png",
          "relPath": "gpdk090_nmoscap1v_idvgs.png",
          "format": "png",
          "size": "85.3 KB",
          "hash": "65e8c182",
          "displayUrl": "translator/plots/gpdk090_nmoscap1v_idvgs_65e8c182.png",
          "scope": "cadence90_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "gpdk090",
            "plotType": "idvgs"
          }
        },
        {
          "name": "gpdk090_nmoscap2v_idvds.png",
          "relPath": "gpdk090_nmoscap2v_idvds.png",
          "format": "png",
          "size": "144.4 KB",
          "hash": "61caeaa8",
          "displayUrl": "translator/plots/gpdk090_nmoscap2v_idvds_61caeaa8.png",
          "scope": "cadence90_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "gpdk090",
            "plotType": "idvds"
          }
        },
        {
          "name": "gpdk090_nmoscap2v_idvgs.png",
          "relPath": "gpdk090_nmoscap2v_idvgs.png",
          "format": "png",
          "size": "85.5 KB",
          "hash": "d8cab669",
          "displayUrl": "translator/plots/gpdk090_nmoscap2v_idvgs_d8cab669.png",
          "scope": "cadence90_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "gpdk090",
            "plotType": "idvgs"
          }
        },
        {
          "name": "gpdk090_npn_gummel.png",
          "relPath": "gpdk090_npn_gummel.png",
          "format": "png",
          "size": "91.0 KB",
          "hash": "4b6230ff",
          "displayUrl": "translator/plots/gpdk090_npn_gummel_4b6230ff.png",
          "scope": "cadence90_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Gummel Plot",
            "what": "Collector and base current vs base-emitter voltage for BJT devices.",
            "why": "Validates current gain (beta) and junction characteristics after translation.",
            "device": "gpdk090",
            "plotType": "gummel"
          }
        },
        {
          "name": "gpdk090_pmos1v_hvt_idvds.png",
          "relPath": "gpdk090_pmos1v_hvt_idvds.png",
          "format": "png",
          "size": "144.2 KB",
          "hash": "3a83c16e",
          "displayUrl": "translator/plots/gpdk090_pmos1v_hvt_idvds_3a83c16e.png",
          "scope": "cadence90_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "gpdk090",
            "plotType": "idvds"
          }
        },
        {
          "name": "gpdk090_pmos1v_hvt_idvgs.png",
          "relPath": "gpdk090_pmos1v_hvt_idvgs.png",
          "format": "png",
          "size": "68.3 KB",
          "hash": "a96ce645",
          "displayUrl": "translator/plots/gpdk090_pmos1v_hvt_idvgs_a96ce645.png",
          "scope": "cadence90_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "gpdk090",
            "plotType": "idvgs"
          }
        },
        {
          "name": "gpdk090_pmos1v_x_idvds.png",
          "relPath": "gpdk090_pmos1v_x_idvds.png",
          "format": "png",
          "size": "144.0 KB",
          "hash": "1306dc9c",
          "displayUrl": "translator/plots/gpdk090_pmos1v_x_idvds_1306dc9c.png",
          "scope": "cadence90_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "gpdk090",
            "plotType": "idvds"
          }
        },
        {
          "name": "gpdk090_pmos1v_x_idvgs.png",
          "relPath": "gpdk090_pmos1v_x_idvgs.png",
          "format": "png",
          "size": "67.9 KB",
          "hash": "fae0b02e",
          "displayUrl": "translator/plots/gpdk090_pmos1v_x_idvgs_fae0b02e.png",
          "scope": "cadence90_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "gpdk090",
            "plotType": "idvgs"
          }
        },
        {
          "name": "gpdk090_pmoscap2v_idvds.png",
          "relPath": "gpdk090_pmoscap2v_idvds.png",
          "format": "png",
          "size": "144.4 KB",
          "hash": "0f7a365a",
          "displayUrl": "translator/plots/gpdk090_pmoscap2v_idvds_0f7a365a.png",
          "scope": "cadence90_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "gpdk090",
            "plotType": "idvds"
          }
        },
        {
          "name": "gpdk090_pmoscap2v_idvgs.png",
          "relPath": "gpdk090_pmoscap2v_idvgs.png",
          "format": "png",
          "size": "68.6 KB",
          "hash": "df48dd86",
          "displayUrl": "translator/plots/gpdk090_pmoscap2v_idvgs_df48dd86.png",
          "scope": "cadence90_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "gpdk090",
            "plotType": "idvgs"
          }
        },
        {
          "name": "gpdk090_pnp_gummel.png",
          "relPath": "gpdk090_pnp_gummel.png",
          "format": "png",
          "size": "88.3 KB",
          "hash": "009214f5",
          "displayUrl": "translator/plots/gpdk090_pnp_gummel_009214f5.png",
          "scope": "cadence90_spectre-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Gummel Plot",
            "what": "Collector and base current vs base-emitter voltage for BJT devices.",
            "why": "Validates current gain (beta) and junction characteristics after translation.",
            "device": "gpdk090",
            "plotType": "gummel"
          }
        }
      ],
      "dataArtifacts": [
        {
          "name": "pdk_translation_summary.csv",
          "relPath": "reports/pdk_translation_summary.csv",
          "format": "csv",
          "size": "6.7 KB",
          "hash": "131aa723",
          "columns": [
            "pdk",
            "source_format",
            "target",
            "successful",
            "failed",
            "models_out",
            "total_files",
            "success_rate_percent",
            "effective_model_deck_success_percent",
            "excluded_non_model_files",
            "model_deck_files",
            "model_deck_successful",
            "model_deck_failed",
            "dominant_exclusion_class",
            "total_duration_ms",
            "failure_reason",
            "failed_sections",
            "notes"
          ],
          "rowCount": 1
        }
      ],
      "otherArtifacts": [],
      "summary": {
        "totalReports": 0,
        "totalPlots": 24,
        "totalData": 1,
        "stats": {
          "files": "9",
          "successful": "8",
          "failed": "1",
          "rawSuccess": "88.9",
          "effectiveSuccess": "100.0",
          "modelsOut": "57",
          "duration": "96.8",
          "failureReason": "Invalid models provided",
          "notes": "All model-deck files translated; failures concentrated in excluded wrapper/helper files"
        }
      }
    },
    {
      "resultId": "pdk-freepdk15-hspice-ngspice",
      "title": "freepdk15: hspice → ngspice",
      "description": "6 files, 6 successful, 100.0% success, 12 models.",
      "kind": "pdk_target",
      "level": 1,
      "pdk": "freepdk15",
      "sourceFormat": "hspice",
      "targetFormat": "ngspice",
      "generatedAt": "2026-04-19",
      "status": "completed",
      "reports": [],
      "plots": [],
      "dataArtifacts": [
        {
          "name": "pdk_translation_summary.csv",
          "relPath": "reports/pdk_translation_summary.csv",
          "format": "csv",
          "size": "6.7 KB",
          "hash": "131aa723",
          "columns": [
            "pdk",
            "source_format",
            "target",
            "successful",
            "failed",
            "models_out",
            "total_files",
            "success_rate_percent",
            "effective_model_deck_success_percent",
            "excluded_non_model_files",
            "model_deck_files",
            "model_deck_successful",
            "model_deck_failed",
            "dominant_exclusion_class",
            "total_duration_ms",
            "failure_reason",
            "failed_sections",
            "notes"
          ],
          "rowCount": 1
        }
      ],
      "otherArtifacts": [],
      "summary": {
        "totalReports": 0,
        "totalPlots": 0,
        "totalData": 1,
        "stats": {
          "files": "6",
          "successful": "6",
          "failed": "0",
          "rawSuccess": "100.0",
          "effectiveSuccess": "100.0",
          "modelsOut": "12",
          "duration": "18.0",
          "failureReason": "-",
          "notes": "No blocking translation issues"
        }
      }
    },
    {
      "resultId": "pdk-freepdk15-hspice-spectre",
      "title": "freepdk15: hspice → spectre",
      "description": "6 files, 6 successful, 100.0% success, 12 models.",
      "kind": "pdk_target",
      "level": 1,
      "pdk": "freepdk15",
      "sourceFormat": "hspice",
      "targetFormat": "spectre",
      "generatedAt": "2026-04-19",
      "status": "completed",
      "reports": [],
      "plots": [],
      "dataArtifacts": [
        {
          "name": "pdk_translation_summary.csv",
          "relPath": "reports/pdk_translation_summary.csv",
          "format": "csv",
          "size": "6.7 KB",
          "hash": "131aa723",
          "columns": [
            "pdk",
            "source_format",
            "target",
            "successful",
            "failed",
            "models_out",
            "total_files",
            "success_rate_percent",
            "effective_model_deck_success_percent",
            "excluded_non_model_files",
            "model_deck_files",
            "model_deck_successful",
            "model_deck_failed",
            "dominant_exclusion_class",
            "total_duration_ms",
            "failure_reason",
            "failed_sections",
            "notes"
          ],
          "rowCount": 1
        }
      ],
      "otherArtifacts": [],
      "summary": {
        "totalReports": 0,
        "totalPlots": 0,
        "totalData": 1,
        "stats": {
          "files": "6",
          "successful": "6",
          "failed": "0",
          "rawSuccess": "100.0",
          "effectiveSuccess": "100.0",
          "modelsOut": "12",
          "duration": "18.0",
          "failureReason": "-",
          "notes": "No blocking translation issues"
        }
      }
    },
    {
      "resultId": "pdk-freepdk3-hspice-ngspice",
      "title": "freepdk3: hspice → ngspice",
      "description": "1 files, 1 successful, 100.0% success, 2 models.",
      "kind": "pdk_target",
      "level": 1,
      "pdk": "freepdk3",
      "sourceFormat": "hspice",
      "targetFormat": "ngspice",
      "generatedAt": "2026-04-19",
      "status": "completed",
      "reports": [],
      "plots": [],
      "dataArtifacts": [
        {
          "name": "pdk_translation_summary.csv",
          "relPath": "reports/pdk_translation_summary.csv",
          "format": "csv",
          "size": "6.7 KB",
          "hash": "131aa723",
          "columns": [
            "pdk",
            "source_format",
            "target",
            "successful",
            "failed",
            "models_out",
            "total_files",
            "success_rate_percent",
            "effective_model_deck_success_percent",
            "excluded_non_model_files",
            "model_deck_files",
            "model_deck_successful",
            "model_deck_failed",
            "dominant_exclusion_class",
            "total_duration_ms",
            "failure_reason",
            "failed_sections",
            "notes"
          ],
          "rowCount": 1
        }
      ],
      "otherArtifacts": [],
      "summary": {
        "totalReports": 0,
        "totalPlots": 0,
        "totalData": 1,
        "stats": {
          "files": "1",
          "successful": "1",
          "failed": "0",
          "rawSuccess": "100.0",
          "effectiveSuccess": "100.0",
          "modelsOut": "2",
          "duration": "3.0",
          "failureReason": "-",
          "notes": "No blocking translation issues"
        }
      }
    },
    {
      "resultId": "pdk-freepdk3-hspice-spectre",
      "title": "freepdk3: hspice → spectre",
      "description": "1 files, 1 successful, 100.0% success, 2 models.",
      "kind": "pdk_target",
      "level": 1,
      "pdk": "freepdk3",
      "sourceFormat": "hspice",
      "targetFormat": "spectre",
      "generatedAt": "2026-04-19",
      "status": "completed",
      "reports": [],
      "plots": [],
      "dataArtifacts": [
        {
          "name": "pdk_translation_summary.csv",
          "relPath": "reports/pdk_translation_summary.csv",
          "format": "csv",
          "size": "6.7 KB",
          "hash": "131aa723",
          "columns": [
            "pdk",
            "source_format",
            "target",
            "successful",
            "failed",
            "models_out",
            "total_files",
            "success_rate_percent",
            "effective_model_deck_success_percent",
            "excluded_non_model_files",
            "model_deck_files",
            "model_deck_successful",
            "model_deck_failed",
            "dominant_exclusion_class",
            "total_duration_ms",
            "failure_reason",
            "failed_sections",
            "notes"
          ],
          "rowCount": 1
        }
      ],
      "otherArtifacts": [],
      "summary": {
        "totalReports": 0,
        "totalPlots": 0,
        "totalData": 1,
        "stats": {
          "files": "1",
          "successful": "1",
          "failed": "0",
          "rawSuccess": "100.0",
          "effectiveSuccess": "100.0",
          "modelsOut": "2",
          "duration": "2.9",
          "failureReason": "-",
          "notes": "No blocking translation issues"
        }
      }
    },
    {
      "resultId": "pdk-freepdk45-hspice-ngspice",
      "title": "freepdk45: hspice → ngspice",
      "description": "12 files, 12 successful, 100.0% success, 96 models.",
      "kind": "pdk_target",
      "level": 1,
      "pdk": "freepdk45",
      "sourceFormat": "hspice",
      "targetFormat": "ngspice",
      "generatedAt": "2026-04-19",
      "status": "completed",
      "reports": [],
      "plots": [
        {
          "name": "NMOS_THKOX_idvds.png",
          "relPath": "NMOS_THKOX_idvds.png",
          "format": "png",
          "size": "94.8 KB",
          "hash": "7e70bfec",
          "displayUrl": "translator/plots/NMOS_THKOX_idvds_7e70bfec.png",
          "scope": "freepdk45_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "NMOS",
            "plotType": "idvds"
          }
        },
        {
          "name": "NMOS_THKOX_idvgs.png",
          "relPath": "NMOS_THKOX_idvgs.png",
          "format": "png",
          "size": "73.4 KB",
          "hash": "37b7da04",
          "displayUrl": "translator/plots/NMOS_THKOX_idvgs_37b7da04.png",
          "scope": "freepdk45_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "NMOS",
            "plotType": "idvgs"
          }
        },
        {
          "name": "NMOS_VTG_idvds.png",
          "relPath": "NMOS_VTG_idvds.png",
          "format": "png",
          "size": "135.0 KB",
          "hash": "9c536ad7",
          "displayUrl": "translator/plots/NMOS_VTG_idvds_9c536ad7.png",
          "scope": "freepdk45_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "NMOS",
            "plotType": "idvds"
          }
        },
        {
          "name": "NMOS_VTG_idvgs.png",
          "relPath": "NMOS_VTG_idvgs.png",
          "format": "png",
          "size": "78.8 KB",
          "hash": "9440e12e",
          "displayUrl": "translator/plots/NMOS_VTG_idvgs_9440e12e.png",
          "scope": "freepdk45_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "NMOS",
            "plotType": "idvgs"
          }
        },
        {
          "name": "NMOS_VTH_idvds.png",
          "relPath": "NMOS_VTH_idvds.png",
          "format": "png",
          "size": "130.0 KB",
          "hash": "9022d5eb",
          "displayUrl": "translator/plots/NMOS_VTH_idvds_9022d5eb.png",
          "scope": "freepdk45_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "NMOS",
            "plotType": "idvds"
          }
        },
        {
          "name": "NMOS_VTH_idvgs.png",
          "relPath": "NMOS_VTH_idvgs.png",
          "format": "png",
          "size": "78.6 KB",
          "hash": "73a4a08b",
          "displayUrl": "translator/plots/NMOS_VTH_idvgs_73a4a08b.png",
          "scope": "freepdk45_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "NMOS",
            "plotType": "idvgs"
          }
        },
        {
          "name": "NMOS_VTL_idvds.png",
          "relPath": "NMOS_VTL_idvds.png",
          "format": "png",
          "size": "134.4 KB",
          "hash": "ba3d3b50",
          "displayUrl": "translator/plots/NMOS_VTL_idvds_ba3d3b50.png",
          "scope": "freepdk45_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "NMOS",
            "plotType": "idvds"
          }
        },
        {
          "name": "NMOS_VTL_idvgs.png",
          "relPath": "NMOS_VTL_idvgs.png",
          "format": "png",
          "size": "75.8 KB",
          "hash": "27f82fcb",
          "displayUrl": "translator/plots/NMOS_VTL_idvgs_27f82fcb.png",
          "scope": "freepdk45_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "NMOS",
            "plotType": "idvgs"
          }
        },
        {
          "name": "PMOS_VTG_idvds.png",
          "relPath": "PMOS_VTG_idvds.png",
          "format": "png",
          "size": "135.1 KB",
          "hash": "7a735bf6",
          "displayUrl": "translator/plots/PMOS_VTG_idvds_7a735bf6.png",
          "scope": "freepdk45_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "PMOS",
            "plotType": "idvds"
          }
        },
        {
          "name": "PMOS_VTG_idvgs.png",
          "relPath": "PMOS_VTG_idvgs.png",
          "format": "png",
          "size": "59.9 KB",
          "hash": "8e63b5c0",
          "displayUrl": "translator/plots/PMOS_VTG_idvgs_8e63b5c0.png",
          "scope": "freepdk45_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "PMOS",
            "plotType": "idvgs"
          }
        },
        {
          "name": "verification_summary.png",
          "relPath": "verification_summary.png",
          "format": "png",
          "size": "396.1 KB",
          "hash": "77c9b3be",
          "displayUrl": "translator/plots/verification_summary_77c9b3be.png",
          "scope": "freepdk45_hspice-ngspice",
          "width": 2197,
          "height": 1181,
          "aspectRatio": 1.86,
          "caption": {
            "title": "Verification Summary",
            "what": "Overview of all verification checks for this result.",
            "why": "Confirms translation correctness across DC, AC, transient, and noise domains.",
            "device": "—",
            "plotType": "verification_summary"
          }
        }
      ],
      "dataArtifacts": [
        {
          "name": "pdk_translation_summary.csv",
          "relPath": "reports/pdk_translation_summary.csv",
          "format": "csv",
          "size": "6.7 KB",
          "hash": "131aa723",
          "columns": [
            "pdk",
            "source_format",
            "target",
            "successful",
            "failed",
            "models_out",
            "total_files",
            "success_rate_percent",
            "effective_model_deck_success_percent",
            "excluded_non_model_files",
            "model_deck_files",
            "model_deck_successful",
            "model_deck_failed",
            "dominant_exclusion_class",
            "total_duration_ms",
            "failure_reason",
            "failed_sections",
            "notes"
          ],
          "rowCount": 1
        }
      ],
      "otherArtifacts": [],
      "summary": {
        "totalReports": 0,
        "totalPlots": 11,
        "totalData": 1,
        "stats": {
          "files": "12",
          "successful": "12",
          "failed": "0",
          "rawSuccess": "100.0",
          "effectiveSuccess": "100.0",
          "modelsOut": "96",
          "duration": "214.0",
          "failureReason": "-",
          "notes": "No blocking translation issues"
        }
      }
    },
    {
      "resultId": "pdk-freepdk45-hspice-spectre",
      "title": "freepdk45: hspice → spectre",
      "description": "12 files, 12 successful, 100.0% success, 96 models.",
      "kind": "pdk_target",
      "level": 1,
      "pdk": "freepdk45",
      "sourceFormat": "hspice",
      "targetFormat": "spectre",
      "generatedAt": "2026-04-19",
      "status": "completed",
      "reports": [],
      "plots": [],
      "dataArtifacts": [
        {
          "name": "pdk_translation_summary.csv",
          "relPath": "reports/pdk_translation_summary.csv",
          "format": "csv",
          "size": "6.7 KB",
          "hash": "131aa723",
          "columns": [
            "pdk",
            "source_format",
            "target",
            "successful",
            "failed",
            "models_out",
            "total_files",
            "success_rate_percent",
            "effective_model_deck_success_percent",
            "excluded_non_model_files",
            "model_deck_files",
            "model_deck_successful",
            "model_deck_failed",
            "dominant_exclusion_class",
            "total_duration_ms",
            "failure_reason",
            "failed_sections",
            "notes"
          ],
          "rowCount": 1
        }
      ],
      "otherArtifacts": [],
      "summary": {
        "totalReports": 0,
        "totalPlots": 0,
        "totalData": 1,
        "stats": {
          "files": "12",
          "successful": "12",
          "failed": "0",
          "rawSuccess": "100.0",
          "effectiveSuccess": "100.0",
          "modelsOut": "96",
          "duration": "246.2",
          "failureReason": "-",
          "notes": "No blocking translation issues"
        }
      }
    },
    {
      "resultId": "pdk-gf180-ngspice-hspice",
      "title": "gf180: ngspice → hspice",
      "description": "56 files, 0 successful, 0.0% success, 0 models.",
      "kind": "pdk_target",
      "level": 1,
      "pdk": "gf180",
      "sourceFormat": "ngspice",
      "targetFormat": "hspice",
      "generatedAt": "2026-04-19",
      "status": "partial",
      "reports": [],
      "plots": [],
      "dataArtifacts": [
        {
          "name": "pdk_translation_summary.csv",
          "relPath": "reports/pdk_translation_summary.csv",
          "format": "csv",
          "size": "6.7 KB",
          "hash": "131aa723",
          "columns": [
            "pdk",
            "source_format",
            "target",
            "successful",
            "failed",
            "models_out",
            "total_files",
            "success_rate_percent",
            "effective_model_deck_success_percent",
            "excluded_non_model_files",
            "model_deck_files",
            "model_deck_successful",
            "model_deck_failed",
            "dominant_exclusion_class",
            "total_duration_ms",
            "failure_reason",
            "failed_sections",
            "notes"
          ],
          "rowCount": 1
        }
      ],
      "otherArtifacts": [],
      "summary": {
        "totalReports": 0,
        "totalPlots": 0,
        "totalData": 1,
        "stats": {
          "files": "56",
          "successful": "0",
          "failed": "56",
          "rawSuccess": "0.0",
          "effectiveSuccess": "0.0",
          "modelsOut": "0",
          "duration": "6256.0",
          "failureReason": "Invalid models provided",
          "notes": "\"Low raw success is mainly corpus composition (wrappers/testbenches/helpers)"
        }
      }
    },
    {
      "resultId": "pdk-gf180-ngspice-spectre",
      "title": "gf180: ngspice → spectre",
      "description": "56 files, 0 successful, 0.0% success, 0 models.",
      "kind": "pdk_target",
      "level": 1,
      "pdk": "gf180",
      "sourceFormat": "ngspice",
      "targetFormat": "spectre",
      "generatedAt": "2026-04-19",
      "status": "partial",
      "reports": [],
      "plots": [],
      "dataArtifacts": [
        {
          "name": "pdk_translation_summary.csv",
          "relPath": "reports/pdk_translation_summary.csv",
          "format": "csv",
          "size": "6.7 KB",
          "hash": "131aa723",
          "columns": [
            "pdk",
            "source_format",
            "target",
            "successful",
            "failed",
            "models_out",
            "total_files",
            "success_rate_percent",
            "effective_model_deck_success_percent",
            "excluded_non_model_files",
            "model_deck_files",
            "model_deck_successful",
            "model_deck_failed",
            "dominant_exclusion_class",
            "total_duration_ms",
            "failure_reason",
            "failed_sections",
            "notes"
          ],
          "rowCount": 1
        }
      ],
      "otherArtifacts": [],
      "summary": {
        "totalReports": 0,
        "totalPlots": 0,
        "totalData": 1,
        "stats": {
          "files": "56",
          "successful": "0",
          "failed": "56",
          "rawSuccess": "0.0",
          "effectiveSuccess": "0.0",
          "modelsOut": "0",
          "duration": "33.3",
          "failureReason": "Invalid models provided",
          "notes": "\"Low raw success is mainly corpus composition (wrappers/testbenches/helpers)"
        }
      }
    },
    {
      "resultId": "pdk-hlmc40lp-hspice-ngspice",
      "title": "hlmc40lp: hspice → ngspice",
      "description": "4 files, 2 successful, 50.0% success, 227 models.",
      "kind": "pdk_target",
      "level": 1,
      "pdk": "hlmc40lp",
      "sourceFormat": "hspice",
      "targetFormat": "ngspice",
      "generatedAt": "2026-04-19",
      "status": "partial",
      "reports": [],
      "plots": [
        {
          "name": "dnwpsubdio_iv.png",
          "relPath": "dnwpsubdio_iv.png",
          "format": "png",
          "size": "56.7 KB",
          "hash": "62c41e9b",
          "displayUrl": "translator/plots/dnwpsubdio_iv_62c41e9b.png",
          "scope": "hlmc40lp_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "dnwpsubdio iv.png",
            "what": "Original verification output generated by the tool.",
            "why": "Part of the automated translation verification pipeline.",
            "device": "—",
            "plotType": "other"
          }
        },
        {
          "name": "dnwpsubdio_rf_iv.png",
          "relPath": "dnwpsubdio_rf_iv.png",
          "format": "png",
          "size": "56.9 KB",
          "hash": "f5079829",
          "displayUrl": "translator/plots/dnwpsubdio_rf_iv_f5079829.png",
          "scope": "hlmc40lp_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "dnwpsubdio rf iv.png",
            "what": "Original verification output generated by the tool.",
            "why": "Part of the automated translation verification pipeline.",
            "device": "—",
            "plotType": "other"
          }
        },
        {
          "name": "n11hvt_idvds.png",
          "relPath": "n11hvt_idvds.png",
          "format": "png",
          "size": "132.0 KB",
          "hash": "a387d38f",
          "displayUrl": "translator/plots/n11hvt_idvds_a387d38f.png",
          "scope": "hlmc40lp_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "n11hvt",
            "plotType": "idvds"
          }
        },
        {
          "name": "n11hvt_idvgs.png",
          "relPath": "n11hvt_idvgs.png",
          "format": "png",
          "size": "75.9 KB",
          "hash": "aa6dd455",
          "displayUrl": "translator/plots/n11hvt_idvgs_aa6dd455.png",
          "scope": "hlmc40lp_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "n11hvt",
            "plotType": "idvgs"
          }
        },
        {
          "name": "n11lvt_idvds.png",
          "relPath": "n11lvt_idvds.png",
          "format": "png",
          "size": "134.8 KB",
          "hash": "c0a453f5",
          "displayUrl": "translator/plots/n11lvt_idvds_c0a453f5.png",
          "scope": "hlmc40lp_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "n11lvt",
            "plotType": "idvds"
          }
        },
        {
          "name": "n11lvt_idvgs.png",
          "relPath": "n11lvt_idvgs.png",
          "format": "png",
          "size": "72.9 KB",
          "hash": "d4521397",
          "displayUrl": "translator/plots/n11lvt_idvgs_d4521397.png",
          "scope": "hlmc40lp_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "n11lvt",
            "plotType": "idvgs"
          }
        },
        {
          "name": "n11rvt_idvds.png",
          "relPath": "n11rvt_idvds.png",
          "format": "png",
          "size": "135.2 KB",
          "hash": "8035f34e",
          "displayUrl": "translator/plots/n11rvt_idvds_8035f34e.png",
          "scope": "hlmc40lp_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "n11rvt",
            "plotType": "idvds"
          }
        },
        {
          "name": "n11rvt_idvgs.png",
          "relPath": "n11rvt_idvgs.png",
          "format": "png",
          "size": "72.8 KB",
          "hash": "c1a41381",
          "displayUrl": "translator/plots/n11rvt_idvgs_c1a41381.png",
          "scope": "hlmc40lp_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "n11rvt",
            "plotType": "idvgs"
          }
        },
        {
          "name": "ndio11hvt_rf_f_iv.png",
          "relPath": "ndio11hvt_rf_f_iv.png",
          "format": "png",
          "size": "51.2 KB",
          "hash": "6f4016d7",
          "displayUrl": "translator/plots/ndio11hvt_rf_f_iv_6f4016d7.png",
          "scope": "hlmc40lp_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "ndio11hvt rf f iv.png",
            "what": "Original verification output generated by the tool.",
            "why": "Part of the automated translation verification pipeline.",
            "device": "—",
            "plotType": "other"
          }
        },
        {
          "name": "ndio11rvt_rf_iv.png",
          "relPath": "ndio11rvt_rf_iv.png",
          "format": "png",
          "size": "56.3 KB",
          "hash": "0ec75783",
          "displayUrl": "translator/plots/ndio11rvt_rf_iv_0ec75783.png",
          "scope": "hlmc40lp_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "ndio11rvt rf iv.png",
            "what": "Original verification output generated by the tool.",
            "why": "Part of the automated translation verification pipeline.",
            "device": "—",
            "plotType": "other"
          }
        },
        {
          "name": "ndio1_iv.png",
          "relPath": "ndio1_iv.png",
          "format": "png",
          "size": "55.4 KB",
          "hash": "512a5656",
          "displayUrl": "translator/plots/ndio1_iv_512a5656.png",
          "scope": "hlmc40lp_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "ndio1 iv.png",
            "what": "Original verification output generated by the tool.",
            "why": "Part of the automated translation verification pipeline.",
            "device": "—",
            "plotType": "other"
          }
        },
        {
          "name": "ndio_rf_iv.png",
          "relPath": "ndio_rf_iv.png",
          "format": "png",
          "size": "50.4 KB",
          "hash": "d7063f6d",
          "displayUrl": "translator/plots/ndio_rf_iv_d7063f6d.png",
          "scope": "hlmc40lp_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "ndio rf iv.png",
            "what": "Original verification output generated by the tool.",
            "why": "Part of the automated translation verification pipeline.",
            "device": "—",
            "plotType": "other"
          }
        },
        {
          "name": "p11rvt_idvds.png",
          "relPath": "p11rvt_idvds.png",
          "format": "png",
          "size": "134.5 KB",
          "hash": "e66b1f02",
          "displayUrl": "translator/plots/p11rvt_idvds_e66b1f02.png",
          "scope": "hlmc40lp_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "p11rvt",
            "plotType": "idvds"
          }
        },
        {
          "name": "p11rvt_idvgs.png",
          "relPath": "p11rvt_idvgs.png",
          "format": "png",
          "size": "60.5 KB",
          "hash": "e3d50216",
          "displayUrl": "translator/plots/p11rvt_idvgs_e3d50216.png",
          "scope": "hlmc40lp_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "p11rvt",
            "plotType": "idvgs"
          }
        },
        {
          "name": "pwdnwdio_iv.png",
          "relPath": "pwdnwdio_iv.png",
          "format": "png",
          "size": "53.2 KB",
          "hash": "967aaf9f",
          "displayUrl": "translator/plots/pwdnwdio_iv_967aaf9f.png",
          "scope": "hlmc40lp_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "pwdnwdio iv.png",
            "what": "Original verification output generated by the tool.",
            "why": "Part of the automated translation verification pipeline.",
            "device": "—",
            "plotType": "other"
          }
        }
      ],
      "dataArtifacts": [
        {
          "name": "pdk_translation_summary.csv",
          "relPath": "reports/pdk_translation_summary.csv",
          "format": "csv",
          "size": "6.7 KB",
          "hash": "131aa723",
          "columns": [
            "pdk",
            "source_format",
            "target",
            "successful",
            "failed",
            "models_out",
            "total_files",
            "success_rate_percent",
            "effective_model_deck_success_percent",
            "excluded_non_model_files",
            "model_deck_files",
            "model_deck_successful",
            "model_deck_failed",
            "dominant_exclusion_class",
            "total_duration_ms",
            "failure_reason",
            "failed_sections",
            "notes"
          ],
          "rowCount": 1
        }
      ],
      "otherArtifacts": [],
      "summary": {
        "totalReports": 0,
        "totalPlots": 15,
        "totalData": 1,
        "stats": {
          "files": "4",
          "successful": "2",
          "failed": "2",
          "rawSuccess": "50.0",
          "effectiveSuccess": "100.0",
          "modelsOut": "227",
          "duration": "700.1",
          "failureReason": "Invalid models provided",
          "notes": "All model-deck files translated; failures concentrated in excluded wrapper/helper files"
        }
      }
    },
    {
      "resultId": "pdk-hlmc40lp-hspice-spectre",
      "title": "hlmc40lp: hspice → spectre",
      "description": "4 files, 2 successful, 50.0% success, 227 models.",
      "kind": "pdk_target",
      "level": 1,
      "pdk": "hlmc40lp",
      "sourceFormat": "hspice",
      "targetFormat": "spectre",
      "generatedAt": "2026-04-19",
      "status": "partial",
      "reports": [],
      "plots": [],
      "dataArtifacts": [
        {
          "name": "pdk_translation_summary.csv",
          "relPath": "reports/pdk_translation_summary.csv",
          "format": "csv",
          "size": "6.7 KB",
          "hash": "131aa723",
          "columns": [
            "pdk",
            "source_format",
            "target",
            "successful",
            "failed",
            "models_out",
            "total_files",
            "success_rate_percent",
            "effective_model_deck_success_percent",
            "excluded_non_model_files",
            "model_deck_files",
            "model_deck_successful",
            "model_deck_failed",
            "dominant_exclusion_class",
            "total_duration_ms",
            "failure_reason",
            "failed_sections",
            "notes"
          ],
          "rowCount": 1
        }
      ],
      "otherArtifacts": [],
      "summary": {
        "totalReports": 0,
        "totalPlots": 0,
        "totalData": 1,
        "stats": {
          "files": "4",
          "successful": "2",
          "failed": "2",
          "rawSuccess": "50.0",
          "effectiveSuccess": "100.0",
          "modelsOut": "227",
          "duration": "639.5",
          "failureReason": "Invalid models provided",
          "notes": "All model-deck files translated; failures concentrated in excluded wrapper/helper files"
        }
      }
    },
    {
      "resultId": "pdk-hlmc55lp-hspice-ngspice",
      "title": "hlmc55lp: hspice → ngspice",
      "description": "9 files, 1 successful, 11.1% success, 48 models.",
      "kind": "pdk_target",
      "level": 1,
      "pdk": "hlmc55lp",
      "sourceFormat": "hspice",
      "targetFormat": "ngspice",
      "generatedAt": "2026-04-19",
      "status": "partial",
      "reports": [],
      "plots": [
        {
          "name": "N12_LP_idvds.png",
          "relPath": "N12_LP_idvds.png",
          "format": "png",
          "size": "136.3 KB",
          "hash": "b56bf9ac",
          "displayUrl": "translator/plots/N12_LP_idvds_b56bf9ac.png",
          "scope": "hlmc55lp_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "N12",
            "plotType": "idvds"
          }
        },
        {
          "name": "N12_LP_idvgs.png",
          "relPath": "N12_LP_idvgs.png",
          "format": "png",
          "size": "73.5 KB",
          "hash": "f4a31c23",
          "displayUrl": "translator/plots/N12_LP_idvgs_f4a31c23.png",
          "scope": "hlmc55lp_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "N12",
            "plotType": "idvgs"
          }
        },
        {
          "name": "N25OD33_LP_idvds.png",
          "relPath": "N25OD33_LP_idvds.png",
          "format": "png",
          "size": "146.3 KB",
          "hash": "12ad6583",
          "displayUrl": "translator/plots/N25OD33_LP_idvds_12ad6583.png",
          "scope": "hlmc55lp_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "N25OD33",
            "plotType": "idvds"
          }
        },
        {
          "name": "N25OD33_LP_idvgs.png",
          "relPath": "N25OD33_LP_idvgs.png",
          "format": "png",
          "size": "79.5 KB",
          "hash": "23ba61ef",
          "displayUrl": "translator/plots/N25OD33_LP_idvgs_23ba61ef.png",
          "scope": "hlmc55lp_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "N25OD33",
            "plotType": "idvgs"
          }
        },
        {
          "name": "N25_LP_idvds.png",
          "relPath": "N25_LP_idvds.png",
          "format": "png",
          "size": "144.8 KB",
          "hash": "932c6d72",
          "displayUrl": "translator/plots/N25_LP_idvds_932c6d72.png",
          "scope": "hlmc55lp_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "N25",
            "plotType": "idvds"
          }
        },
        {
          "name": "N25_LP_idvgs.png",
          "relPath": "N25_LP_idvgs.png",
          "format": "png",
          "size": "76.6 KB",
          "hash": "7294a556",
          "displayUrl": "translator/plots/N25_LP_idvgs_7294a556.png",
          "scope": "hlmc55lp_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "N25",
            "plotType": "idvgs"
          }
        },
        {
          "name": "NHVT12_LP_idvds.png",
          "relPath": "NHVT12_LP_idvds.png",
          "format": "png",
          "size": "127.8 KB",
          "hash": "d682e967",
          "displayUrl": "translator/plots/NHVT12_LP_idvds_d682e967.png",
          "scope": "hlmc55lp_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "NHVT12",
            "plotType": "idvds"
          }
        },
        {
          "name": "NHVT12_LP_idvgs.png",
          "relPath": "NHVT12_LP_idvgs.png",
          "format": "png",
          "size": "79.9 KB",
          "hash": "514f0610",
          "displayUrl": "translator/plots/NHVT12_LP_idvgs_514f0610.png",
          "scope": "hlmc55lp_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "NHVT12",
            "plotType": "idvgs"
          }
        },
        {
          "name": "NPN12A100_LP_gummel.png",
          "relPath": "NPN12A100_LP_gummel.png",
          "format": "png",
          "size": "92.2 KB",
          "hash": "21b1ca6c",
          "displayUrl": "translator/plots/NPN12A100_LP_gummel_21b1ca6c.png",
          "scope": "hlmc55lp_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Gummel Plot",
            "what": "Collector and base current vs base-emitter voltage for BJT devices.",
            "why": "Validates current gain (beta) and junction characteristics after translation.",
            "device": "NPN12A100",
            "plotType": "gummel"
          }
        },
        {
          "name": "NPN12A25_LP_gummel.png",
          "relPath": "NPN12A25_LP_gummel.png",
          "format": "png",
          "size": "92.2 KB",
          "hash": "0b4524d9",
          "displayUrl": "translator/plots/NPN12A25_LP_gummel_0b4524d9.png",
          "scope": "hlmc55lp_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Gummel Plot",
            "what": "Collector and base current vs base-emitter voltage for BJT devices.",
            "why": "Validates current gain (beta) and junction characteristics after translation.",
            "device": "NPN12A25",
            "plotType": "gummel"
          }
        },
        {
          "name": "NPN12A4_LP_gummel.png",
          "relPath": "NPN12A4_LP_gummel.png",
          "format": "png",
          "size": "90.5 KB",
          "hash": "574b2725",
          "displayUrl": "translator/plots/NPN12A4_LP_gummel_574b2725.png",
          "scope": "hlmc55lp_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Gummel Plot",
            "what": "Collector and base current vs base-emitter voltage for BJT devices.",
            "why": "Validates current gain (beta) and junction characteristics after translation.",
            "device": "NPN12A4",
            "plotType": "gummel"
          }
        },
        {
          "name": "P12_LP_idvds.png",
          "relPath": "P12_LP_idvds.png",
          "format": "png",
          "size": "139.7 KB",
          "hash": "c369d201",
          "displayUrl": "translator/plots/P12_LP_idvds_c369d201.png",
          "scope": "hlmc55lp_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "P12",
            "plotType": "idvds"
          }
        },
        {
          "name": "P12_LP_idvgs.png",
          "relPath": "P12_LP_idvgs.png",
          "format": "png",
          "size": "57.8 KB",
          "hash": "b5831318",
          "displayUrl": "translator/plots/P12_LP_idvgs_b5831318.png",
          "scope": "hlmc55lp_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "P12",
            "plotType": "idvgs"
          }
        },
        {
          "name": "PNP12A100_LP_gummel.png",
          "relPath": "PNP12A100_LP_gummel.png",
          "format": "png",
          "size": "91.1 KB",
          "hash": "8ec8c53e",
          "displayUrl": "translator/plots/PNP12A100_LP_gummel_8ec8c53e.png",
          "scope": "hlmc55lp_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Gummel Plot",
            "what": "Collector and base current vs base-emitter voltage for BJT devices.",
            "why": "Validates current gain (beta) and junction characteristics after translation.",
            "device": "PNP12A100",
            "plotType": "gummel"
          }
        },
        {
          "name": "PNP12A25_LP_gummel.png",
          "relPath": "PNP12A25_LP_gummel.png",
          "format": "png",
          "size": "91.6 KB",
          "hash": "a7d8108f",
          "displayUrl": "translator/plots/PNP12A25_LP_gummel_a7d8108f.png",
          "scope": "hlmc55lp_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Gummel Plot",
            "what": "Collector and base current vs base-emitter voltage for BJT devices.",
            "why": "Validates current gain (beta) and junction characteristics after translation.",
            "device": "PNP12A25",
            "plotType": "gummel"
          }
        },
        {
          "name": "PNP12A4_LP_gummel.png",
          "relPath": "PNP12A4_LP_gummel.png",
          "format": "png",
          "size": "90.9 KB",
          "hash": "e403f3e2",
          "displayUrl": "translator/plots/PNP12A4_LP_gummel_e403f3e2.png",
          "scope": "hlmc55lp_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Gummel Plot",
            "what": "Collector and base current vs base-emitter voltage for BJT devices.",
            "why": "Validates current gain (beta) and junction characteristics after translation.",
            "device": "PNP12A4",
            "plotType": "gummel"
          }
        }
      ],
      "dataArtifacts": [
        {
          "name": "pdk_translation_summary.csv",
          "relPath": "reports/pdk_translation_summary.csv",
          "format": "csv",
          "size": "6.7 KB",
          "hash": "131aa723",
          "columns": [
            "pdk",
            "source_format",
            "target",
            "successful",
            "failed",
            "models_out",
            "total_files",
            "success_rate_percent",
            "effective_model_deck_success_percent",
            "excluded_non_model_files",
            "model_deck_files",
            "model_deck_successful",
            "model_deck_failed",
            "dominant_exclusion_class",
            "total_duration_ms",
            "failure_reason",
            "failed_sections",
            "notes"
          ],
          "rowCount": 1
        }
      ],
      "otherArtifacts": [],
      "summary": {
        "totalReports": 0,
        "totalPlots": 16,
        "totalData": 1,
        "stats": {
          "files": "9",
          "successful": "1",
          "failed": "8",
          "rawSuccess": "11.1",
          "effectiveSuccess": "11.1",
          "modelsOut": "48",
          "duration": "211.3",
          "failureReason": "Invalid models provided",
          "notes": "Partial model-deck failures require parser/semantic support expansion"
        }
      }
    },
    {
      "resultId": "pdk-hlmc55lp-hspice-spectre",
      "title": "hlmc55lp: hspice → spectre",
      "description": "9 files, 1 successful, 11.1% success, 48 models.",
      "kind": "pdk_target",
      "level": 1,
      "pdk": "hlmc55lp",
      "sourceFormat": "hspice",
      "targetFormat": "spectre",
      "generatedAt": "2026-04-19",
      "status": "partial",
      "reports": [],
      "plots": [],
      "dataArtifacts": [
        {
          "name": "pdk_translation_summary.csv",
          "relPath": "reports/pdk_translation_summary.csv",
          "format": "csv",
          "size": "6.7 KB",
          "hash": "131aa723",
          "columns": [
            "pdk",
            "source_format",
            "target",
            "successful",
            "failed",
            "models_out",
            "total_files",
            "success_rate_percent",
            "effective_model_deck_success_percent",
            "excluded_non_model_files",
            "model_deck_files",
            "model_deck_successful",
            "model_deck_failed",
            "dominant_exclusion_class",
            "total_duration_ms",
            "failure_reason",
            "failed_sections",
            "notes"
          ],
          "rowCount": 1
        }
      ],
      "otherArtifacts": [],
      "summary": {
        "totalReports": 0,
        "totalPlots": 0,
        "totalData": 1,
        "stats": {
          "files": "9",
          "successful": "1",
          "failed": "8",
          "rawSuccess": "11.1",
          "effectiveSuccess": "11.1",
          "modelsOut": "48",
          "duration": "200.9",
          "failureReason": "Invalid models provided",
          "notes": "Partial model-deck failures require parser/semantic support expansion"
        }
      }
    },
    {
      "resultId": "pdk-sky130-ngspice-hspice",
      "title": "sky130: ngspice → hspice",
      "description": "147 files, 13 successful, 8.8% success, 80 models.",
      "kind": "pdk_target",
      "level": 1,
      "pdk": "sky130",
      "sourceFormat": "ngspice",
      "targetFormat": "hspice",
      "generatedAt": "2026-04-19",
      "status": "partial",
      "reports": [],
      "plots": [],
      "dataArtifacts": [
        {
          "name": "pdk_translation_summary.csv",
          "relPath": "reports/pdk_translation_summary.csv",
          "format": "csv",
          "size": "6.7 KB",
          "hash": "131aa723",
          "columns": [
            "pdk",
            "source_format",
            "target",
            "successful",
            "failed",
            "models_out",
            "total_files",
            "success_rate_percent",
            "effective_model_deck_success_percent",
            "excluded_non_model_files",
            "model_deck_files",
            "model_deck_successful",
            "model_deck_failed",
            "dominant_exclusion_class",
            "total_duration_ms",
            "failure_reason",
            "failed_sections",
            "notes"
          ],
          "rowCount": 1
        }
      ],
      "otherArtifacts": [],
      "summary": {
        "totalReports": 0,
        "totalPlots": 0,
        "totalData": 1,
        "stats": {
          "files": "147",
          "successful": "13",
          "failed": "134",
          "rawSuccess": "8.8",
          "effectiveSuccess": "8.9",
          "modelsOut": "80",
          "duration": "5191.9",
          "failureReason": "Invalid models provided",
          "notes": "\"Low raw success is mainly corpus composition (wrappers/testbenches/helpers)"
        }
      }
    },
    {
      "resultId": "pdk-sky130-ngspice-spectre",
      "title": "sky130: ngspice → spectre",
      "description": "147 files, 13 successful, 8.8% success, 80 models.",
      "kind": "pdk_target",
      "level": 1,
      "pdk": "sky130",
      "sourceFormat": "ngspice",
      "targetFormat": "spectre",
      "generatedAt": "2026-04-19",
      "status": "partial",
      "reports": [],
      "plots": [],
      "dataArtifacts": [
        {
          "name": "pdk_translation_summary.csv",
          "relPath": "reports/pdk_translation_summary.csv",
          "format": "csv",
          "size": "6.7 KB",
          "hash": "131aa723",
          "columns": [
            "pdk",
            "source_format",
            "target",
            "successful",
            "failed",
            "models_out",
            "total_files",
            "success_rate_percent",
            "effective_model_deck_success_percent",
            "excluded_non_model_files",
            "model_deck_files",
            "model_deck_successful",
            "model_deck_failed",
            "dominant_exclusion_class",
            "total_duration_ms",
            "failure_reason",
            "failed_sections",
            "notes"
          ],
          "rowCount": 1
        }
      ],
      "otherArtifacts": [],
      "summary": {
        "totalReports": 0,
        "totalPlots": 0,
        "totalData": 1,
        "stats": {
          "files": "147",
          "successful": "13",
          "failed": "134",
          "rawSuccess": "8.8",
          "effectiveSuccess": "8.9",
          "modelsOut": "80",
          "duration": "3618.8",
          "failureReason": "Invalid models provided",
          "notes": "\"Low raw success is mainly corpus composition (wrappers/testbenches/helpers)"
        }
      }
    },
    {
      "resultId": "pdk-smic180-hspice-ngspice",
      "title": "smic180: hspice → ngspice",
      "description": "22 files, 22 successful, 100.0% success, 216 models.",
      "kind": "pdk_target",
      "level": 1,
      "pdk": "smic180",
      "sourceFormat": "hspice",
      "targetFormat": "ngspice",
      "generatedAt": "2026-04-19",
      "status": "completed",
      "reports": [],
      "plots": [
        {
          "name": "dsdnw_iv.png",
          "relPath": "dsdnw_iv.png",
          "format": "png",
          "size": "54.9 KB",
          "hash": "6f88e546",
          "displayUrl": "translator/plots/dsdnw_iv_6f88e546.png",
          "scope": "smic180_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "dsdnw iv.png",
            "what": "Original verification output generated by the tool.",
            "why": "Part of the automated translation verification pipeline.",
            "device": "—",
            "plotType": "other"
          }
        },
        {
          "name": "dsdpw_iv.png",
          "relPath": "dsdpw_iv.png",
          "format": "png",
          "size": "54.9 KB",
          "hash": "d57c9552",
          "displayUrl": "translator/plots/dsdpw_iv_d57c9552.png",
          "scope": "smic180_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "dsdpw iv.png",
            "what": "Original verification output generated by the tool.",
            "why": "Part of the automated translation verification pipeline.",
            "device": "—",
            "plotType": "other"
          }
        },
        {
          "name": "dz1_iv.png",
          "relPath": "dz1_iv.png",
          "format": "png",
          "size": "55.2 KB",
          "hash": "3fc98a53",
          "displayUrl": "translator/plots/dz1_iv_3fc98a53.png",
          "scope": "smic180_hspice-ngspice",
          "width": 1621,
          "height": 721,
          "aspectRatio": 2.248,
          "caption": {
            "title": "dz1 iv.png",
            "what": "Original verification output generated by the tool.",
            "why": "Part of the automated translation verification pipeline.",
            "device": "—",
            "plotType": "other"
          }
        },
        {
          "name": "dz3_iv.png",
          "relPath": "dz3_iv.png",
          "format": "png",
          "size": "61.8 KB",
          "hash": "fd33894d",
          "displayUrl": "translator/plots/dz3_iv_fd33894d.png",
          "scope": "smic180_hspice-ngspice",
          "width": 1621,
          "height": 721,
          "aspectRatio": 2.248,
          "caption": {
            "title": "dz3 iv.png",
            "what": "Original verification output generated by the tool.",
            "why": "Part of the automated translation verification pipeline.",
            "device": "—",
            "plotType": "other"
          }
        },
        {
          "name": "n18_idvds.png",
          "relPath": "n18_idvds.png",
          "format": "png",
          "size": "129.4 KB",
          "hash": "f2173e03",
          "displayUrl": "translator/plots/n18_idvds_f2173e03.png",
          "scope": "smic180_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "n18",
            "plotType": "idvds"
          }
        },
        {
          "name": "n18_idvgs.png",
          "relPath": "n18_idvgs.png",
          "format": "png",
          "size": "72.3 KB",
          "hash": "f64f2f06",
          "displayUrl": "translator/plots/n18_idvgs_f64f2f06.png",
          "scope": "smic180_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "n18",
            "plotType": "idvgs"
          }
        },
        {
          "name": "n18_lvt_idvds.png",
          "relPath": "n18_lvt_idvds.png",
          "format": "png",
          "size": "147.9 KB",
          "hash": "393dc014",
          "displayUrl": "translator/plots/n18_lvt_idvds_393dc014.png",
          "scope": "smic180_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "n18",
            "plotType": "idvds"
          }
        },
        {
          "name": "n18_lvt_idvgs.png",
          "relPath": "n18_lvt_idvgs.png",
          "format": "png",
          "size": "73.2 KB",
          "hash": "e0bc8cda",
          "displayUrl": "translator/plots/n18_lvt_idvgs_e0bc8cda.png",
          "scope": "smic180_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "n18",
            "plotType": "idvgs"
          }
        },
        {
          "name": "n1d8_esd_idvds.png",
          "relPath": "n1d8_esd_idvds.png",
          "format": "png",
          "size": "122.1 KB",
          "hash": "5829b95d",
          "displayUrl": "translator/plots/n1d8_esd_idvds_5829b95d.png",
          "scope": "smic180_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "n1d8",
            "plotType": "idvds"
          }
        },
        {
          "name": "n1d8_esd_idvgs.png",
          "relPath": "n1d8_esd_idvgs.png",
          "format": "png",
          "size": "63.5 KB",
          "hash": "790ca305",
          "displayUrl": "translator/plots/n1d8_esd_idvgs_790ca305.png",
          "scope": "smic180_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "n1d8",
            "plotType": "idvgs"
          }
        },
        {
          "name": "n25_idvds.png",
          "relPath": "n25_idvds.png",
          "format": "png",
          "size": "137.2 KB",
          "hash": "b3ee4fde",
          "displayUrl": "translator/plots/n25_idvds_b3ee4fde.png",
          "scope": "smic180_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "n25",
            "plotType": "idvds"
          }
        },
        {
          "name": "n25_idvgs.png",
          "relPath": "n25_idvgs.png",
          "format": "png",
          "size": "75.8 KB",
          "hash": "1a7575a8",
          "displayUrl": "translator/plots/n25_idvgs_1a7575a8.png",
          "scope": "smic180_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "n25",
            "plotType": "idvgs"
          }
        },
        {
          "name": "ndio18_iv.png",
          "relPath": "ndio18_iv.png",
          "format": "png",
          "size": "51.3 KB",
          "hash": "3e6d3515",
          "displayUrl": "translator/plots/ndio18_iv_3e6d3515.png",
          "scope": "smic180_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "ndio18 iv.png",
            "what": "Original verification output generated by the tool.",
            "why": "Part of the automated translation verification pipeline.",
            "device": "—",
            "plotType": "other"
          }
        },
        {
          "name": "nld12g5_gs_idvds.png",
          "relPath": "nld12g5_gs_idvds.png",
          "format": "png",
          "size": "113.6 KB",
          "hash": "2383f899",
          "displayUrl": "translator/plots/nld12g5_gs_idvds_2383f899.png",
          "scope": "smic180_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "nld12g5",
            "plotType": "idvds"
          }
        },
        {
          "name": "nld12g5_gs_idvgs.png",
          "relPath": "nld12g5_gs_idvgs.png",
          "format": "png",
          "size": "79.5 KB",
          "hash": "9478dd4e",
          "displayUrl": "translator/plots/nld12g5_gs_idvgs_9478dd4e.png",
          "scope": "smic180_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "nld12g5",
            "plotType": "idvgs"
          }
        },
        {
          "name": "nld6g5_sa_idvds.png",
          "relPath": "nld6g5_sa_idvds.png",
          "format": "png",
          "size": "122.0 KB",
          "hash": "3257e68f",
          "displayUrl": "translator/plots/nld6g5_sa_idvds_3257e68f.png",
          "scope": "smic180_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "nld6g5",
            "plotType": "idvds"
          }
        },
        {
          "name": "nld6g5_sa_idvgs.png",
          "relPath": "nld6g5_sa_idvgs.png",
          "format": "png",
          "size": "75.6 KB",
          "hash": "206c64f0",
          "displayUrl": "translator/plots/nld6g5_sa_idvgs_206c64f0.png",
          "scope": "smic180_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "nld6g5",
            "plotType": "idvgs"
          }
        },
        {
          "name": "nnt18_idvds.png",
          "relPath": "nnt18_idvds.png",
          "format": "png",
          "size": "141.5 KB",
          "hash": "bc2cea1c",
          "displayUrl": "translator/plots/nnt18_idvds_bc2cea1c.png",
          "scope": "smic180_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "nnt18",
            "plotType": "idvds"
          }
        },
        {
          "name": "nnt18_idvgs.png",
          "relPath": "nnt18_idvgs.png",
          "format": "png",
          "size": "78.6 KB",
          "hash": "d7a19bce",
          "displayUrl": "translator/plots/nnt18_idvgs_d7a19bce.png",
          "scope": "smic180_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "nnt18",
            "plotType": "idvgs"
          }
        },
        {
          "name": "npn50a100_gummel.png",
          "relPath": "npn50a100_gummel.png",
          "format": "png",
          "size": "92.1 KB",
          "hash": "2cf8efb4",
          "displayUrl": "translator/plots/npn50a100_gummel_2cf8efb4.png",
          "scope": "smic180_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Gummel Plot",
            "what": "Collector and base current vs base-emitter voltage for BJT devices.",
            "why": "Validates current gain (beta) and junction characteristics after translation.",
            "device": "npn50a100",
            "plotType": "gummel"
          }
        },
        {
          "name": "npn50a25_gummel.png",
          "relPath": "npn50a25_gummel.png",
          "format": "png",
          "size": "92.1 KB",
          "hash": "2241610e",
          "displayUrl": "translator/plots/npn50a25_gummel_2241610e.png",
          "scope": "smic180_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Gummel Plot",
            "what": "Collector and base current vs base-emitter voltage for BJT devices.",
            "why": "Validates current gain (beta) and junction characteristics after translation.",
            "device": "npn50a25",
            "plotType": "gummel"
          }
        },
        {
          "name": "npnhva100_gummel.png",
          "relPath": "npnhva100_gummel.png",
          "format": "png",
          "size": "91.6 KB",
          "hash": "8fb8ee0f",
          "displayUrl": "translator/plots/npnhva100_gummel_8fb8ee0f.png",
          "scope": "smic180_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Gummel Plot",
            "what": "Collector and base current vs base-emitter voltage for BJT devices.",
            "why": "Validates current gain (beta) and junction characteristics after translation.",
            "device": "npnhva100",
            "plotType": "gummel"
          }
        },
        {
          "name": "npnhva25_gummel.png",
          "relPath": "npnhva25_gummel.png",
          "format": "png",
          "size": "91.8 KB",
          "hash": "dd4907a6",
          "displayUrl": "translator/plots/npnhva25_gummel_dd4907a6.png",
          "scope": "smic180_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Gummel Plot",
            "what": "Collector and base current vs base-emitter voltage for BJT devices.",
            "why": "Validates current gain (beta) and junction characteristics after translation.",
            "device": "npnhva25",
            "plotType": "gummel"
          }
        },
        {
          "name": "nwdio18_iv.png",
          "relPath": "nwdio18_iv.png",
          "format": "png",
          "size": "54.9 KB",
          "hash": "bdca30e2",
          "displayUrl": "translator/plots/nwdio18_iv_bdca30e2.png",
          "scope": "smic180_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "nwdio18 iv.png",
            "what": "Original verification output generated by the tool.",
            "why": "Part of the automated translation verification pipeline.",
            "device": "—",
            "plotType": "other"
          }
        },
        {
          "name": "p18_idvds.png",
          "relPath": "p18_idvds.png",
          "format": "png",
          "size": "141.2 KB",
          "hash": "7a262be4",
          "displayUrl": "translator/plots/p18_idvds_7a262be4.png",
          "scope": "smic180_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "p18",
            "plotType": "idvds"
          }
        },
        {
          "name": "p18_idvgs.png",
          "relPath": "p18_idvgs.png",
          "format": "png",
          "size": "61.5 KB",
          "hash": "653a31be",
          "displayUrl": "translator/plots/p18_idvgs_653a31be.png",
          "scope": "smic180_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "p18",
            "plotType": "idvgs"
          }
        },
        {
          "name": "pdio18_iv.png",
          "relPath": "pdio18_iv.png",
          "format": "png",
          "size": "51.4 KB",
          "hash": "c2b6c448",
          "displayUrl": "translator/plots/pdio18_iv_c2b6c448.png",
          "scope": "smic180_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "pdio18 iv.png",
            "what": "Original verification output generated by the tool.",
            "why": "Part of the automated translation verification pipeline.",
            "device": "—",
            "plotType": "other"
          }
        },
        {
          "name": "pnp18a100_gummel.png",
          "relPath": "pnp18a100_gummel.png",
          "format": "png",
          "size": "90.9 KB",
          "hash": "b9514ca9",
          "displayUrl": "translator/plots/pnp18a100_gummel_b9514ca9.png",
          "scope": "smic180_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Gummel Plot",
            "what": "Collector and base current vs base-emitter voltage for BJT devices.",
            "why": "Validates current gain (beta) and junction characteristics after translation.",
            "device": "pnp18a100",
            "plotType": "gummel"
          }
        },
        {
          "name": "pnp18a25_gummel.png",
          "relPath": "pnp18a25_gummel.png",
          "format": "png",
          "size": "91.4 KB",
          "hash": "6ae2f9d3",
          "displayUrl": "translator/plots/pnp18a25_gummel_6ae2f9d3.png",
          "scope": "smic180_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Gummel Plot",
            "what": "Collector and base current vs base-emitter voltage for BJT devices.",
            "why": "Validates current gain (beta) and junction characteristics after translation.",
            "device": "pnp18a25",
            "plotType": "gummel"
          }
        },
        {
          "name": "pnp18a4_gummel.png",
          "relPath": "pnp18a4_gummel.png",
          "format": "png",
          "size": "89.6 KB",
          "hash": "8c998147",
          "displayUrl": "translator/plots/pnp18a4_gummel_8c998147.png",
          "scope": "smic180_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Gummel Plot",
            "what": "Collector and base current vs base-emitter voltage for BJT devices.",
            "why": "Validates current gain (beta) and junction characteristics after translation.",
            "device": "pnp18a4",
            "plotType": "gummel"
          }
        },
        {
          "name": "pnp50a100_gummel.png",
          "relPath": "pnp50a100_gummel.png",
          "format": "png",
          "size": "90.9 KB",
          "hash": "c2f78757",
          "displayUrl": "translator/plots/pnp50a100_gummel_c2f78757.png",
          "scope": "smic180_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Gummel Plot",
            "what": "Collector and base current vs base-emitter voltage for BJT devices.",
            "why": "Validates current gain (beta) and junction characteristics after translation.",
            "device": "pnp50a100",
            "plotType": "gummel"
          }
        },
        {
          "name": "pnp50a25_gummel.png",
          "relPath": "pnp50a25_gummel.png",
          "format": "png",
          "size": "91.7 KB",
          "hash": "46653122",
          "displayUrl": "translator/plots/pnp50a25_gummel_46653122.png",
          "scope": "smic180_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Gummel Plot",
            "what": "Collector and base current vs base-emitter voltage for BJT devices.",
            "why": "Validates current gain (beta) and junction characteristics after translation.",
            "device": "pnp50a25",
            "plotType": "gummel"
          }
        },
        {
          "name": "pnphva100_gummel.png",
          "relPath": "pnphva100_gummel.png",
          "format": "png",
          "size": "91.4 KB",
          "hash": "ddf7ea75",
          "displayUrl": "translator/plots/pnphva100_gummel_ddf7ea75.png",
          "scope": "smic180_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Gummel Plot",
            "what": "Collector and base current vs base-emitter voltage for BJT devices.",
            "why": "Validates current gain (beta) and junction characteristics after translation.",
            "device": "pnphva100",
            "plotType": "gummel"
          }
        },
        {
          "name": "pnphva25_gummel.png",
          "relPath": "pnphva25_gummel.png",
          "format": "png",
          "size": "91.0 KB",
          "hash": "5a9fdbe2",
          "displayUrl": "translator/plots/pnphva25_gummel_5a9fdbe2.png",
          "scope": "smic180_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Gummel Plot",
            "what": "Collector and base current vs base-emitter voltage for BJT devices.",
            "why": "Validates current gain (beta) and junction characteristics after translation.",
            "device": "pnphva25",
            "plotType": "gummel"
          }
        },
        {
          "name": "verification_summary.png",
          "relPath": "verification_summary.png",
          "format": "png",
          "size": "88.8 KB",
          "hash": "d6a8a7a3",
          "displayUrl": "translator/plots/verification_summary_d6a8a7a3.png",
          "scope": "smic180_hspice-ngspice",
          "width": 1471,
          "height": 507,
          "aspectRatio": 2.901,
          "caption": {
            "title": "Verification Summary",
            "what": "Overview of all verification checks for this result.",
            "why": "Confirms translation correctness across DC, AC, transient, and noise domains.",
            "device": "—",
            "plotType": "verification_summary"
          }
        }
      ],
      "dataArtifacts": [
        {
          "name": "pdk_translation_summary.csv",
          "relPath": "reports/pdk_translation_summary.csv",
          "format": "csv",
          "size": "6.7 KB",
          "hash": "131aa723",
          "columns": [
            "pdk",
            "source_format",
            "target",
            "successful",
            "failed",
            "models_out",
            "total_files",
            "success_rate_percent",
            "effective_model_deck_success_percent",
            "excluded_non_model_files",
            "model_deck_files",
            "model_deck_successful",
            "model_deck_failed",
            "dominant_exclusion_class",
            "total_duration_ms",
            "failure_reason",
            "failed_sections",
            "notes"
          ],
          "rowCount": 1
        }
      ],
      "otherArtifacts": [],
      "summary": {
        "totalReports": 0,
        "totalPlots": 35,
        "totalData": 1,
        "stats": {
          "files": "22",
          "successful": "22",
          "failed": "0",
          "rawSuccess": "100.0",
          "effectiveSuccess": "100.0",
          "modelsOut": "216",
          "duration": "930.7",
          "failureReason": "-",
          "notes": "No blocking translation issues"
        }
      }
    },
    {
      "resultId": "pdk-smic180-hspice-spectre",
      "title": "smic180: hspice → spectre",
      "description": "22 files, 22 successful, 100.0% success, 216 models.",
      "kind": "pdk_target",
      "level": 1,
      "pdk": "smic180",
      "sourceFormat": "hspice",
      "targetFormat": "spectre",
      "generatedAt": "2026-04-19",
      "status": "completed",
      "reports": [],
      "plots": [],
      "dataArtifacts": [
        {
          "name": "pdk_translation_summary.csv",
          "relPath": "reports/pdk_translation_summary.csv",
          "format": "csv",
          "size": "6.7 KB",
          "hash": "131aa723",
          "columns": [
            "pdk",
            "source_format",
            "target",
            "successful",
            "failed",
            "models_out",
            "total_files",
            "success_rate_percent",
            "effective_model_deck_success_percent",
            "excluded_non_model_files",
            "model_deck_files",
            "model_deck_successful",
            "model_deck_failed",
            "dominant_exclusion_class",
            "total_duration_ms",
            "failure_reason",
            "failed_sections",
            "notes"
          ],
          "rowCount": 1
        }
      ],
      "otherArtifacts": [],
      "summary": {
        "totalReports": 0,
        "totalPlots": 0,
        "totalData": 1,
        "stats": {
          "files": "22",
          "successful": "22",
          "failed": "0",
          "rawSuccess": "100.0",
          "effectiveSuccess": "100.0",
          "modelsOut": "216",
          "duration": "807.8",
          "failureReason": "-",
          "notes": "No blocking translation issues"
        }
      }
    },
    {
      "resultId": "pdk-smic180hv-hspice-ngspice",
      "title": "smic180HV: hspice → ngspice",
      "description": "16 files, 15 successful, 93.8% success, 1174 models.",
      "kind": "pdk_target",
      "level": 1,
      "pdk": "smic180HV",
      "sourceFormat": "hspice",
      "targetFormat": "ngspice",
      "generatedAt": "2026-04-19",
      "status": "partial",
      "reports": [],
      "plots": [
        {
          "name": "dioddpnbl_iv.png",
          "relPath": "dioddpnbl_iv.png",
          "format": "png",
          "size": "51.5 KB",
          "hash": "f8bd9ffb",
          "displayUrl": "translator/plots/dioddpnbl_iv_f8bd9ffb.png",
          "scope": "smic180HV_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "dioddpnbl iv.png",
            "what": "Original verification output generated by the tool.",
            "why": "Part of the automated translation verification pipeline.",
            "device": "—",
            "plotType": "other"
          }
        },
        {
          "name": "dionbl_iv.png",
          "relPath": "dionbl_iv.png",
          "format": "png",
          "size": "52.3 KB",
          "hash": "47129c11",
          "displayUrl": "translator/plots/dionbl_iv_47129c11.png",
          "scope": "smic180HV_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "dionbl iv.png",
            "what": "Original verification output generated by the tool.",
            "why": "Part of the automated translation verification pipeline.",
            "device": "—",
            "plotType": "other"
          }
        },
        {
          "name": "diondfddp_1_iv.png",
          "relPath": "diondfddp_1_iv.png",
          "format": "png",
          "size": "54.9 KB",
          "hash": "8c17668c",
          "displayUrl": "translator/plots/diondfddp_1_iv_8c17668c.png",
          "scope": "smic180HV_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "diondfddp 1 iv.png",
            "what": "Original verification output generated by the tool.",
            "why": "Part of the automated translation verification pipeline.",
            "device": "—",
            "plotType": "other"
          }
        },
        {
          "name": "diondfddp_iv.png",
          "relPath": "diondfddp_iv.png",
          "format": "png",
          "size": "54.8 KB",
          "hash": "543c6081",
          "displayUrl": "translator/plots/diondfddp_iv_543c6081.png",
          "scope": "smic180HV_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "diondfddp iv.png",
            "what": "Original verification output generated by the tool.",
            "why": "Part of the automated translation verification pipeline.",
            "device": "—",
            "plotType": "other"
          }
        },
        {
          "name": "n18_ckt_idvds.png",
          "relPath": "n18_ckt_idvds.png",
          "format": "png",
          "size": "131.7 KB",
          "hash": "411b932b",
          "displayUrl": "translator/plots/n18_ckt_idvds_411b932b.png",
          "scope": "smic180HV_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "n18",
            "plotType": "idvds"
          }
        },
        {
          "name": "n18_ckt_idvgs.png",
          "relPath": "n18_ckt_idvgs.png",
          "format": "png",
          "size": "75.0 KB",
          "hash": "611e9c5b",
          "displayUrl": "translator/plots/n18_ckt_idvgs_611e9c5b.png",
          "scope": "smic180HV_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "n18",
            "plotType": "idvgs"
          }
        },
        {
          "name": "n18_gg_iso_iv.png",
          "relPath": "n18_gg_iso_iv.png",
          "format": "png",
          "size": "59.5 KB",
          "hash": "318f6fc2",
          "displayUrl": "translator/plots/n18_gg_iso_iv_318f6fc2.png",
          "scope": "smic180HV_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "n18 gg iso iv.png",
            "what": "Original verification output generated by the tool.",
            "why": "Part of the automated translation verification pipeline.",
            "device": "—",
            "plotType": "other"
          }
        },
        {
          "name": "n18_gg_iv.png",
          "relPath": "n18_gg_iv.png",
          "format": "png",
          "size": "58.6 KB",
          "hash": "19c00968",
          "displayUrl": "translator/plots/n18_gg_iv_19c00968.png",
          "scope": "smic180HV_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "n18 gg iv.png",
            "what": "Original verification output generated by the tool.",
            "why": "Part of the automated translation verification pipeline.",
            "device": "—",
            "plotType": "other"
          }
        },
        {
          "name": "n18_idvds.png",
          "relPath": "n18_idvds.png",
          "format": "png",
          "size": "131.4 KB",
          "hash": "819af494",
          "displayUrl": "translator/plots/n18_idvds_819af494.png",
          "scope": "smic180HV_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "n18",
            "plotType": "idvds"
          }
        },
        {
          "name": "n18_idvgs.png",
          "relPath": "n18_idvgs.png",
          "format": "png",
          "size": "73.7 KB",
          "hash": "5b951408",
          "displayUrl": "translator/plots/n18_idvgs_5b951408.png",
          "scope": "smic180HV_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "n18",
            "plotType": "idvgs"
          }
        },
        {
          "name": "n18_iso_ckt_idvds.png",
          "relPath": "n18_iso_ckt_idvds.png",
          "format": "png",
          "size": "132.3 KB",
          "hash": "0b6274ee",
          "displayUrl": "translator/plots/n18_iso_ckt_idvds_0b6274ee.png",
          "scope": "smic180HV_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "n18",
            "plotType": "idvds"
          }
        },
        {
          "name": "n18_iso_ckt_idvgs.png",
          "relPath": "n18_iso_ckt_idvgs.png",
          "format": "png",
          "size": "76.7 KB",
          "hash": "f4a2fc84",
          "displayUrl": "translator/plots/n18_iso_ckt_idvgs_f4a2fc84.png",
          "scope": "smic180HV_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "n18",
            "plotType": "idvgs"
          }
        },
        {
          "name": "n50_gg_iv.png",
          "relPath": "n50_gg_iv.png",
          "format": "png",
          "size": "59.1 KB",
          "hash": "25157473",
          "displayUrl": "translator/plots/n50_gg_iv_25157473.png",
          "scope": "smic180HV_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "n50 gg iv.png",
            "what": "Original verification output generated by the tool.",
            "why": "Part of the automated translation verification pipeline.",
            "device": "—",
            "plotType": "other"
          }
        },
        {
          "name": "nde40_semi_iso_ckt_idvds.png",
          "relPath": "nde40_semi_iso_ckt_idvds.png",
          "format": "png",
          "size": "125.5 KB",
          "hash": "cd0c12a9",
          "displayUrl": "translator/plots/nde40_semi_iso_ckt_idvds_cd0c12a9.png",
          "scope": "smic180HV_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "nde40",
            "plotType": "idvds"
          }
        },
        {
          "name": "nde40_semi_iso_ckt_idvgs.png",
          "relPath": "nde40_semi_iso_ckt_idvgs.png",
          "format": "png",
          "size": "84.8 KB",
          "hash": "a8566008",
          "displayUrl": "translator/plots/nde40_semi_iso_ckt_idvgs_a8566008.png",
          "scope": "smic180HV_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "nde40",
            "plotType": "idvgs"
          }
        },
        {
          "name": "nde40udvt_ckt_idvds.png",
          "relPath": "nde40udvt_ckt_idvds.png",
          "format": "png",
          "size": "163.7 KB",
          "hash": "72673482",
          "displayUrl": "translator/plots/nde40udvt_ckt_idvds_72673482.png",
          "scope": "smic180HV_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "nde40udvt",
            "plotType": "idvds"
          }
        },
        {
          "name": "nde40udvt_ckt_idvgs.png",
          "relPath": "nde40udvt_ckt_idvgs.png",
          "format": "png",
          "size": "73.7 KB",
          "hash": "d701a051",
          "displayUrl": "translator/plots/nde40udvt_ckt_idvgs_d701a051.png",
          "scope": "smic180HV_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "nde40udvt",
            "plotType": "idvgs"
          }
        },
        {
          "name": "ndio18_iv.png",
          "relPath": "ndio18_iv.png",
          "format": "png",
          "size": "52.3 KB",
          "hash": "b875ed6c",
          "displayUrl": "translator/plots/ndio18_iv_b875ed6c.png",
          "scope": "smic180HV_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "ndio18 iv.png",
            "what": "Original verification output generated by the tool.",
            "why": "Part of the automated translation verification pipeline.",
            "device": "—",
            "plotType": "other"
          }
        },
        {
          "name": "nld200_idvds.png",
          "relPath": "nld200_idvds.png",
          "format": "png",
          "size": "121.0 KB",
          "hash": "fbc5425d",
          "displayUrl": "translator/plots/nld200_idvds_fbc5425d.png",
          "scope": "smic180HV_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "nld200",
            "plotType": "idvds"
          }
        },
        {
          "name": "nld200_idvgs.png",
          "relPath": "nld200_idvgs.png",
          "format": "png",
          "size": "62.4 KB",
          "hash": "c89c2ffe",
          "displayUrl": "translator/plots/nld200_idvgs_c89c2ffe.png",
          "scope": "smic180HV_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "nld200",
            "plotType": "idvgs"
          }
        },
        {
          "name": "nld90_idvds.png",
          "relPath": "nld90_idvds.png",
          "format": "png",
          "size": "115.7 KB",
          "hash": "c2ab92d9",
          "displayUrl": "translator/plots/nld90_idvds_c2ab92d9.png",
          "scope": "smic180HV_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "nld90",
            "plotType": "idvds"
          }
        },
        {
          "name": "nld90_idvgs.png",
          "relPath": "nld90_idvgs.png",
          "format": "png",
          "size": "74.2 KB",
          "hash": "e4baff69",
          "displayUrl": "translator/plots/nld90_idvgs_e4baff69.png",
          "scope": "smic180HV_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "nld90",
            "plotType": "idvgs"
          }
        },
        {
          "name": "nnt18_idvds.png",
          "relPath": "nnt18_idvds.png",
          "format": "png",
          "size": "151.1 KB",
          "hash": "75fc7071",
          "displayUrl": "translator/plots/nnt18_idvds_75fc7071.png",
          "scope": "smic180HV_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "nnt18",
            "plotType": "idvds"
          }
        },
        {
          "name": "nnt18_idvgs.png",
          "relPath": "nnt18_idvgs.png",
          "format": "png",
          "size": "77.0 KB",
          "hash": "efaceb29",
          "displayUrl": "translator/plots/nnt18_idvgs_efaceb29.png",
          "scope": "smic180HV_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "nnt18",
            "plotType": "idvgs"
          }
        },
        {
          "name": "npn18a100_gummel.png",
          "relPath": "npn18a100_gummel.png",
          "format": "png",
          "size": "91.9 KB",
          "hash": "85aecf25",
          "displayUrl": "translator/plots/npn18a100_gummel_85aecf25.png",
          "scope": "smic180HV_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Gummel Plot",
            "what": "Collector and base current vs base-emitter voltage for BJT devices.",
            "why": "Validates current gain (beta) and junction characteristics after translation.",
            "device": "npn18a100",
            "plotType": "gummel"
          }
        },
        {
          "name": "npn18a25_gummel.png",
          "relPath": "npn18a25_gummel.png",
          "format": "png",
          "size": "91.1 KB",
          "hash": "80542f56",
          "displayUrl": "translator/plots/npn18a25_gummel_80542f56.png",
          "scope": "smic180HV_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Gummel Plot",
            "what": "Collector and base current vs base-emitter voltage for BJT devices.",
            "why": "Validates current gain (beta) and junction characteristics after translation.",
            "device": "npn18a25",
            "plotType": "gummel"
          }
        },
        {
          "name": "npn18a4_gummel.png",
          "relPath": "npn18a4_gummel.png",
          "format": "png",
          "size": "91.6 KB",
          "hash": "354ed34f",
          "displayUrl": "translator/plots/npn18a4_gummel_354ed34f.png",
          "scope": "smic180HV_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Gummel Plot",
            "what": "Collector and base current vs base-emitter voltage for BJT devices.",
            "why": "Validates current gain (beta) and junction characteristics after translation.",
            "device": "npn18a4",
            "plotType": "gummel"
          }
        },
        {
          "name": "npn_nde16_24mod_gummel.png",
          "relPath": "npn_nde16_24mod_gummel.png",
          "format": "png",
          "size": "73.7 KB",
          "hash": "c38fdfed",
          "displayUrl": "translator/plots/npn_nde16_24mod_gummel_c38fdfed.png",
          "scope": "smic180HV_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Gummel Plot",
            "what": "Collector and base current vs base-emitter voltage for BJT devices.",
            "why": "Validates current gain (beta) and junction characteristics after translation.",
            "device": "npn",
            "plotType": "gummel"
          }
        },
        {
          "name": "npn_nde28mod_gummel.png",
          "relPath": "npn_nde28mod_gummel.png",
          "format": "png",
          "size": "73.7 KB",
          "hash": "a754d4e2",
          "displayUrl": "translator/plots/npn_nde28mod_gummel_a754d4e2.png",
          "scope": "smic180HV_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Gummel Plot",
            "what": "Collector and base current vs base-emitter voltage for BJT devices.",
            "why": "Validates current gain (beta) and junction characteristics after translation.",
            "device": "npn",
            "plotType": "gummel"
          }
        },
        {
          "name": "npn_nde32mod_gummel.png",
          "relPath": "npn_nde32mod_gummel.png",
          "format": "png",
          "size": "73.8 KB",
          "hash": "eb6d7308",
          "displayUrl": "translator/plots/npn_nde32mod_gummel_eb6d7308.png",
          "scope": "smic180HV_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Gummel Plot",
            "what": "Collector and base current vs base-emitter voltage for BJT devices.",
            "why": "Validates current gain (beta) and junction characteristics after translation.",
            "device": "npn",
            "plotType": "gummel"
          }
        },
        {
          "name": "npn_nld36_40mos_gummel.png",
          "relPath": "npn_nld36_40mos_gummel.png",
          "format": "png",
          "size": "93.5 KB",
          "hash": "5ef238df",
          "displayUrl": "translator/plots/npn_nld36_40mos_gummel_5ef238df.png",
          "scope": "smic180HV_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Gummel Plot",
            "what": "Collector and base current vs base-emitter voltage for BJT devices.",
            "why": "Validates current gain (beta) and junction characteristics after translation.",
            "device": "npn",
            "plotType": "gummel"
          }
        },
        {
          "name": "npn_nld9_32mos_gummel.png",
          "relPath": "npn_nld9_32mos_gummel.png",
          "format": "png",
          "size": "92.5 KB",
          "hash": "8207c5fb",
          "displayUrl": "translator/plots/npn_nld9_32mos_gummel_8207c5fb.png",
          "scope": "smic180HV_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Gummel Plot",
            "what": "Collector and base current vs base-emitter voltage for BJT devices.",
            "why": "Validates current gain (beta) and junction characteristics after translation.",
            "device": "npn",
            "plotType": "gummel"
          }
        },
        {
          "name": "p18_ckt_idvds.png",
          "relPath": "p18_ckt_idvds.png",
          "format": "png",
          "size": "136.8 KB",
          "hash": "4164d4a8",
          "displayUrl": "translator/plots/p18_ckt_idvds_4164d4a8.png",
          "scope": "smic180HV_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "p18",
            "plotType": "idvds"
          }
        },
        {
          "name": "p18_ckt_idvgs.png",
          "relPath": "p18_ckt_idvgs.png",
          "format": "png",
          "size": "59.1 KB",
          "hash": "40608dea",
          "displayUrl": "translator/plots/p18_ckt_idvgs_40608dea.png",
          "scope": "smic180HV_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "p18",
            "plotType": "idvgs"
          }
        },
        {
          "name": "p18_idvds.png",
          "relPath": "p18_idvds.png",
          "format": "png",
          "size": "136.0 KB",
          "hash": "e140f784",
          "displayUrl": "translator/plots/p18_idvds_e140f784.png",
          "scope": "smic180HV_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "p18",
            "plotType": "idvds"
          }
        },
        {
          "name": "p18_idvgs.png",
          "relPath": "p18_idvgs.png",
          "format": "png",
          "size": "57.4 KB",
          "hash": "1ba46adf",
          "displayUrl": "translator/plots/p18_idvgs_1ba46adf.png",
          "scope": "smic180HV_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "p18",
            "plotType": "idvgs"
          }
        },
        {
          "name": "pdio18_iv.png",
          "relPath": "pdio18_iv.png",
          "format": "png",
          "size": "53.8 KB",
          "hash": "4a133057",
          "displayUrl": "translator/plots/pdio18_iv_4a133057.png",
          "scope": "smic180HV_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "pdio18 iv.png",
            "what": "Original verification output generated by the tool.",
            "why": "Part of the automated translation verification pipeline.",
            "device": "—",
            "plotType": "other"
          }
        },
        {
          "name": "pdio18m_iv.png",
          "relPath": "pdio18m_iv.png",
          "format": "png",
          "size": "54.1 KB",
          "hash": "816fe06c",
          "displayUrl": "translator/plots/pdio18m_iv_816fe06c.png",
          "scope": "smic180HV_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "pdio18m iv.png",
            "what": "Original verification output generated by the tool.",
            "why": "Part of the automated translation verification pipeline.",
            "device": "—",
            "plotType": "other"
          }
        },
        {
          "name": "pdrfdio_iv.png",
          "relPath": "pdrfdio_iv.png",
          "format": "png",
          "size": "53.2 KB",
          "hash": "827fe45a",
          "displayUrl": "translator/plots/pdrfdio_iv_827fe45a.png",
          "scope": "smic180HV_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "pdrfdio iv.png",
            "what": "Original verification output generated by the tool.",
            "why": "Part of the automated translation verification pipeline.",
            "device": "—",
            "plotType": "other"
          }
        },
        {
          "name": "pnp18a100_gummel.png",
          "relPath": "pnp18a100_gummel.png",
          "format": "png",
          "size": "90.8 KB",
          "hash": "23f25f2e",
          "displayUrl": "translator/plots/pnp18a100_gummel_23f25f2e.png",
          "scope": "smic180HV_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Gummel Plot",
            "what": "Collector and base current vs base-emitter voltage for BJT devices.",
            "why": "Validates current gain (beta) and junction characteristics after translation.",
            "device": "pnp18a100",
            "plotType": "gummel"
          }
        },
        {
          "name": "pnp18a25_gummel.png",
          "relPath": "pnp18a25_gummel.png",
          "format": "png",
          "size": "92.0 KB",
          "hash": "cabb58ad",
          "displayUrl": "translator/plots/pnp18a25_gummel_cabb58ad.png",
          "scope": "smic180HV_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Gummel Plot",
            "what": "Collector and base current vs base-emitter voltage for BJT devices.",
            "why": "Validates current gain (beta) and junction characteristics after translation.",
            "device": "pnp18a25",
            "plotType": "gummel"
          }
        },
        {
          "name": "pnp18a4_gummel.png",
          "relPath": "pnp18a4_gummel.png",
          "format": "png",
          "size": "90.8 KB",
          "hash": "9eb7b553",
          "displayUrl": "translator/plots/pnp18a4_gummel_9eb7b553.png",
          "scope": "smic180HV_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Gummel Plot",
            "what": "Collector and base current vs base-emitter voltage for BJT devices.",
            "why": "Validates current gain (beta) and junction characteristics after translation.",
            "device": "pnp18a4",
            "plotType": "gummel"
          }
        },
        {
          "name": "pnp_nd9_80mos_gummel.png",
          "relPath": "pnp_nd9_80mos_gummel.png",
          "format": "png",
          "size": "92.0 KB",
          "hash": "b5e21703",
          "displayUrl": "translator/plots/pnp_nd9_80mos_gummel_b5e21703.png",
          "scope": "smic180HV_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Gummel Plot",
            "what": "Collector and base current vs base-emitter voltage for BJT devices.",
            "why": "Validates current gain (beta) and junction characteristics after translation.",
            "device": "pnp",
            "plotType": "gummel"
          }
        }
      ],
      "dataArtifacts": [
        {
          "name": "pdk_translation_summary.csv",
          "relPath": "reports/pdk_translation_summary.csv",
          "format": "csv",
          "size": "6.7 KB",
          "hash": "131aa723",
          "columns": [
            "pdk",
            "source_format",
            "target",
            "successful",
            "failed",
            "models_out",
            "total_files",
            "success_rate_percent",
            "effective_model_deck_success_percent",
            "excluded_non_model_files",
            "model_deck_files",
            "model_deck_successful",
            "model_deck_failed",
            "dominant_exclusion_class",
            "total_duration_ms",
            "failure_reason",
            "failed_sections",
            "notes"
          ],
          "rowCount": 1
        }
      ],
      "otherArtifacts": [],
      "summary": {
        "totalReports": 0,
        "totalPlots": 43,
        "totalData": 1,
        "stats": {
          "files": "16",
          "successful": "15",
          "failed": "1",
          "rawSuccess": "93.8",
          "effectiveSuccess": "100.0",
          "modelsOut": "1174",
          "duration": "3216.0",
          "failureReason": "Invalid models provided",
          "notes": "All model-deck files translated; failures concentrated in excluded wrapper/helper files"
        }
      }
    },
    {
      "resultId": "pdk-smic180hv-hspice-spectre",
      "title": "smic180HV: hspice → spectre",
      "description": "16 files, 15 successful, 93.8% success, 1174 models.",
      "kind": "pdk_target",
      "level": 1,
      "pdk": "smic180HV",
      "sourceFormat": "hspice",
      "targetFormat": "spectre",
      "generatedAt": "2026-04-19",
      "status": "partial",
      "reports": [],
      "plots": [],
      "dataArtifacts": [
        {
          "name": "pdk_translation_summary.csv",
          "relPath": "reports/pdk_translation_summary.csv",
          "format": "csv",
          "size": "6.7 KB",
          "hash": "131aa723",
          "columns": [
            "pdk",
            "source_format",
            "target",
            "successful",
            "failed",
            "models_out",
            "total_files",
            "success_rate_percent",
            "effective_model_deck_success_percent",
            "excluded_non_model_files",
            "model_deck_files",
            "model_deck_successful",
            "model_deck_failed",
            "dominant_exclusion_class",
            "total_duration_ms",
            "failure_reason",
            "failed_sections",
            "notes"
          ],
          "rowCount": 1
        }
      ],
      "otherArtifacts": [],
      "summary": {
        "totalReports": 0,
        "totalPlots": 0,
        "totalData": 1,
        "stats": {
          "files": "16",
          "successful": "15",
          "failed": "1",
          "rawSuccess": "93.8",
          "effectiveSuccess": "100.0",
          "modelsOut": "1174",
          "duration": "3391.3",
          "failureReason": "Invalid models provided",
          "notes": "All model-deck files translated; failures concentrated in excluded wrapper/helper files"
        }
      }
    },
    {
      "resultId": "pdk-synopsys14-hspice-ngspice",
      "title": "synopsys14: hspice → ngspice",
      "description": "1 files, 1 successful, 100.0% success, 18 models.",
      "kind": "pdk_target",
      "level": 1,
      "pdk": "synopsys14",
      "sourceFormat": "hspice",
      "targetFormat": "ngspice",
      "generatedAt": "2026-04-19",
      "status": "completed",
      "reports": [],
      "plots": [
        {
          "name": "ndiode_m_iv.png",
          "relPath": "ndiode_m_iv.png",
          "format": "png",
          "size": "47.1 KB",
          "hash": "4f5ce813",
          "displayUrl": "translator/plots/ndiode_m_iv_4f5ce813.png",
          "scope": "synopsys14_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "ndiode m iv.png",
            "what": "Original verification output generated by the tool.",
            "why": "Part of the automated translation verification pipeline.",
            "device": "—",
            "plotType": "other"
          }
        },
        {
          "name": "nvpnp.1_idvds.png",
          "relPath": "nvpnp.1_idvds.png",
          "format": "png",
          "size": "138.6 KB",
          "hash": "47a81862",
          "displayUrl": "translator/plots/nvpnp.1_idvds_47a81862.png",
          "scope": "synopsys14_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "nvpnp1",
            "plotType": "idvds"
          }
        },
        {
          "name": "nvpnp.1_idvgs.png",
          "relPath": "nvpnp.1_idvgs.png",
          "format": "png",
          "size": "73.3 KB",
          "hash": "6852a510",
          "displayUrl": "translator/plots/nvpnp.1_idvgs_6852a510.png",
          "scope": "synopsys14_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "nvpnp1",
            "plotType": "idvgs"
          }
        },
        {
          "name": "pdiode_m_iv.png",
          "relPath": "pdiode_m_iv.png",
          "format": "png",
          "size": "46.6 KB",
          "hash": "69b9f800",
          "displayUrl": "translator/plots/pdiode_m_iv_69b9f800.png",
          "scope": "synopsys14_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "pdiode m iv.png",
            "what": "Original verification output generated by the tool.",
            "why": "Part of the automated translation verification pipeline.",
            "device": "—",
            "plotType": "other"
          }
        },
        {
          "name": "qvpnp_gummel.png",
          "relPath": "qvpnp_gummel.png",
          "format": "png",
          "size": "87.8 KB",
          "hash": "1481eedb",
          "displayUrl": "translator/plots/qvpnp_gummel_1481eedb.png",
          "scope": "synopsys14_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Gummel Plot",
            "what": "Collector and base current vs base-emitter voltage for BJT devices.",
            "why": "Validates current gain (beta) and junction characteristics after translation.",
            "device": "qvpnp",
            "plotType": "gummel"
          }
        },
        {
          "name": "tondiode_m_iv.png",
          "relPath": "tondiode_m_iv.png",
          "format": "png",
          "size": "47.0 KB",
          "hash": "45b4a209",
          "displayUrl": "translator/plots/tondiode_m_iv_45b4a209.png",
          "scope": "synopsys14_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "tondiode m iv.png",
            "what": "Original verification output generated by the tool.",
            "why": "Part of the automated translation verification pipeline.",
            "device": "—",
            "plotType": "other"
          }
        }
      ],
      "dataArtifacts": [
        {
          "name": "pdk_translation_summary.csv",
          "relPath": "reports/pdk_translation_summary.csv",
          "format": "csv",
          "size": "6.7 KB",
          "hash": "131aa723",
          "columns": [
            "pdk",
            "source_format",
            "target",
            "successful",
            "failed",
            "models_out",
            "total_files",
            "success_rate_percent",
            "effective_model_deck_success_percent",
            "excluded_non_model_files",
            "model_deck_files",
            "model_deck_successful",
            "model_deck_failed",
            "dominant_exclusion_class",
            "total_duration_ms",
            "failure_reason",
            "failed_sections",
            "notes"
          ],
          "rowCount": 1
        }
      ],
      "otherArtifacts": [],
      "summary": {
        "totalReports": 0,
        "totalPlots": 6,
        "totalData": 1,
        "stats": {
          "files": "1",
          "successful": "1",
          "failed": "0",
          "rawSuccess": "100.0",
          "effectiveSuccess": "100.0",
          "modelsOut": "18",
          "duration": "146.4",
          "failureReason": "-",
          "notes": "No blocking translation issues"
        }
      }
    },
    {
      "resultId": "pdk-synopsys14-hspice-spectre",
      "title": "synopsys14: hspice → spectre",
      "description": "1 files, 1 successful, 100.0% success, 18 models.",
      "kind": "pdk_target",
      "level": 1,
      "pdk": "synopsys14",
      "sourceFormat": "hspice",
      "targetFormat": "spectre",
      "generatedAt": "2026-04-19",
      "status": "completed",
      "reports": [],
      "plots": [],
      "dataArtifacts": [
        {
          "name": "pdk_translation_summary.csv",
          "relPath": "reports/pdk_translation_summary.csv",
          "format": "csv",
          "size": "6.7 KB",
          "hash": "131aa723",
          "columns": [
            "pdk",
            "source_format",
            "target",
            "successful",
            "failed",
            "models_out",
            "total_files",
            "success_rate_percent",
            "effective_model_deck_success_percent",
            "excluded_non_model_files",
            "model_deck_files",
            "model_deck_successful",
            "model_deck_failed",
            "dominant_exclusion_class",
            "total_duration_ms",
            "failure_reason",
            "failed_sections",
            "notes"
          ],
          "rowCount": 1
        }
      ],
      "otherArtifacts": [],
      "summary": {
        "totalReports": 0,
        "totalPlots": 0,
        "totalData": 1,
        "stats": {
          "files": "1",
          "successful": "1",
          "failed": "0",
          "rawSuccess": "100.0",
          "effectiveSuccess": "100.0",
          "modelsOut": "18",
          "duration": "125.9",
          "failureReason": "-",
          "notes": "No blocking translation issues"
        }
      }
    },
    {
      "resultId": "pdk-synopsys28-hspice-ngspice",
      "title": "synopsys28: hspice → ngspice",
      "description": "1 files, 1 successful, 100.0% success, 17 models.",
      "kind": "pdk_target",
      "level": 1,
      "pdk": "synopsys28",
      "sourceFormat": "hspice",
      "targetFormat": "ngspice",
      "generatedAt": "2026-04-19",
      "status": "completed",
      "reports": [],
      "plots": [
        {
          "name": "n105_hvt_idvds.png",
          "relPath": "n105_hvt_idvds.png",
          "format": "png",
          "size": "117.1 KB",
          "hash": "057addde",
          "displayUrl": "translator/plots/n105_hvt_idvds_057addde.png",
          "scope": "synopsys28_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "n105",
            "plotType": "idvds"
          }
        },
        {
          "name": "n105_hvt_idvgs.png",
          "relPath": "n105_hvt_idvgs.png",
          "format": "png",
          "size": "74.1 KB",
          "hash": "f9c931a6",
          "displayUrl": "translator/plots/n105_hvt_idvgs_f9c931a6.png",
          "scope": "synopsys28_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "n105",
            "plotType": "idvgs"
          }
        },
        {
          "name": "n105_idvds.png",
          "relPath": "n105_idvds.png",
          "format": "png",
          "size": "116.5 KB",
          "hash": "05eb0702",
          "displayUrl": "translator/plots/n105_idvds_05eb0702.png",
          "scope": "synopsys28_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "n105",
            "plotType": "idvds"
          }
        },
        {
          "name": "n105_idvgs.png",
          "relPath": "n105_idvgs.png",
          "format": "png",
          "size": "72.8 KB",
          "hash": "358ffe51",
          "displayUrl": "translator/plots/n105_idvgs_358ffe51.png",
          "scope": "synopsys28_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "n105",
            "plotType": "idvgs"
          }
        },
        {
          "name": "n105_lvt_idvds.png",
          "relPath": "n105_lvt_idvds.png",
          "format": "png",
          "size": "117.2 KB",
          "hash": "666b72fa",
          "displayUrl": "translator/plots/n105_lvt_idvds_666b72fa.png",
          "scope": "synopsys28_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "n105",
            "plotType": "idvds"
          }
        },
        {
          "name": "n105_lvt_idvgs.png",
          "relPath": "n105_lvt_idvgs.png",
          "format": "png",
          "size": "74.0 KB",
          "hash": "4cbf1e1d",
          "displayUrl": "translator/plots/n105_lvt_idvgs_4cbf1e1d.png",
          "scope": "synopsys28_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "n105",
            "plotType": "idvgs"
          }
        },
        {
          "name": "n18_idvds.png",
          "relPath": "n18_idvds.png",
          "format": "png",
          "size": "112.8 KB",
          "hash": "059d4219",
          "displayUrl": "translator/plots/n18_idvds_059d4219.png",
          "scope": "synopsys28_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "n18",
            "plotType": "idvds"
          }
        },
        {
          "name": "n18_idvgs.png",
          "relPath": "n18_idvgs.png",
          "format": "png",
          "size": "71.8 KB",
          "hash": "d73d5405",
          "displayUrl": "translator/plots/n18_idvgs_d73d5405.png",
          "scope": "synopsys28_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "n18",
            "plotType": "idvgs"
          }
        },
        {
          "name": "p18_idvds.png",
          "relPath": "p18_idvds.png",
          "format": "png",
          "size": "109.9 KB",
          "hash": "2aa7e257",
          "displayUrl": "translator/plots/p18_idvds_2aa7e257.png",
          "scope": "synopsys28_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "p18",
            "plotType": "idvds"
          }
        },
        {
          "name": "p18_idvgs.png",
          "relPath": "p18_idvgs.png",
          "format": "png",
          "size": "59.6 KB",
          "hash": "5252546e",
          "displayUrl": "translator/plots/p18_idvgs_5252546e.png",
          "scope": "synopsys28_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "p18",
            "plotType": "idvgs"
          }
        }
      ],
      "dataArtifacts": [
        {
          "name": "pdk_translation_summary.csv",
          "relPath": "reports/pdk_translation_summary.csv",
          "format": "csv",
          "size": "6.7 KB",
          "hash": "131aa723",
          "columns": [
            "pdk",
            "source_format",
            "target",
            "successful",
            "failed",
            "models_out",
            "total_files",
            "success_rate_percent",
            "effective_model_deck_success_percent",
            "excluded_non_model_files",
            "model_deck_files",
            "model_deck_successful",
            "model_deck_failed",
            "dominant_exclusion_class",
            "total_duration_ms",
            "failure_reason",
            "failed_sections",
            "notes"
          ],
          "rowCount": 1
        }
      ],
      "otherArtifacts": [],
      "summary": {
        "totalReports": 0,
        "totalPlots": 10,
        "totalData": 1,
        "stats": {
          "files": "1",
          "successful": "1",
          "failed": "0",
          "rawSuccess": "100.0",
          "effectiveSuccess": "100.0",
          "modelsOut": "17",
          "duration": "53.0",
          "failureReason": "-",
          "notes": "No blocking translation issues"
        }
      }
    },
    {
      "resultId": "pdk-synopsys28-hspice-spectre",
      "title": "synopsys28: hspice → spectre",
      "description": "1 files, 1 successful, 100.0% success, 17 models.",
      "kind": "pdk_target",
      "level": 1,
      "pdk": "synopsys28",
      "sourceFormat": "hspice",
      "targetFormat": "spectre",
      "generatedAt": "2026-04-19",
      "status": "completed",
      "reports": [],
      "plots": [],
      "dataArtifacts": [
        {
          "name": "pdk_translation_summary.csv",
          "relPath": "reports/pdk_translation_summary.csv",
          "format": "csv",
          "size": "6.7 KB",
          "hash": "131aa723",
          "columns": [
            "pdk",
            "source_format",
            "target",
            "successful",
            "failed",
            "models_out",
            "total_files",
            "success_rate_percent",
            "effective_model_deck_success_percent",
            "excluded_non_model_files",
            "model_deck_files",
            "model_deck_successful",
            "model_deck_failed",
            "dominant_exclusion_class",
            "total_duration_ms",
            "failure_reason",
            "failed_sections",
            "notes"
          ],
          "rowCount": 1
        }
      ],
      "otherArtifacts": [],
      "summary": {
        "totalReports": 0,
        "totalPlots": 0,
        "totalData": 1,
        "stats": {
          "files": "1",
          "successful": "1",
          "failed": "0",
          "rawSuccess": "100.0",
          "effectiveSuccess": "100.0",
          "modelsOut": "17",
          "duration": "51.5",
          "failureReason": "-",
          "notes": "No blocking translation issues"
        }
      }
    },
    {
      "resultId": "pdk-tsmc65lp-hspice-ngspice",
      "title": "tsmc65lp: hspice → ngspice",
      "description": "3 files, 1 successful, 33.3% success, 1222 models.",
      "kind": "pdk_target",
      "level": 1,
      "pdk": "tsmc65lp",
      "sourceFormat": "hspice",
      "targetFormat": "ngspice",
      "generatedAt": "2026-04-19",
      "status": "partial",
      "reports": [],
      "plots": [
        {
          "name": "dio_dnwpsub_iv.png",
          "relPath": "dio_dnwpsub_iv.png",
          "format": "png",
          "size": "58.4 KB",
          "hash": "386902de",
          "displayUrl": "translator/plots/dio_dnwpsub_iv_386902de.png",
          "scope": "tsmc65lp_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "dio dnwpsub iv.png",
            "what": "Original verification output generated by the tool.",
            "why": "Part of the automated translation verification pipeline.",
            "device": "—",
            "plotType": "other"
          }
        },
        {
          "name": "dio_nwpsub_iv.png",
          "relPath": "dio_nwpsub_iv.png",
          "format": "png",
          "size": "58.5 KB",
          "hash": "279424fe",
          "displayUrl": "translator/plots/dio_nwpsub_iv_279424fe.png",
          "scope": "tsmc65lp_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "dio nwpsub iv.png",
            "what": "Original verification output generated by the tool.",
            "why": "Part of the automated translation verification pipeline.",
            "device": "—",
            "plotType": "other"
          }
        },
        {
          "name": "nch.10_idvds.png",
          "relPath": "nch.10_idvds.png",
          "format": "png",
          "size": "137.5 KB",
          "hash": "978e4a67",
          "displayUrl": "translator/plots/nch.10_idvds_978e4a67.png",
          "scope": "tsmc65lp_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "nch10",
            "plotType": "idvds"
          }
        },
        {
          "name": "nch.10_idvgs.png",
          "relPath": "nch.10_idvgs.png",
          "format": "png",
          "size": "74.5 KB",
          "hash": "3ecbfab4",
          "displayUrl": "translator/plots/nch.10_idvgs_3ecbfab4.png",
          "scope": "tsmc65lp_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "nch10",
            "plotType": "idvgs"
          }
        },
        {
          "name": "nch.11_idvds.png",
          "relPath": "nch.11_idvds.png",
          "format": "png",
          "size": "133.5 KB",
          "hash": "8b6a2e75",
          "displayUrl": "translator/plots/nch.11_idvds_8b6a2e75.png",
          "scope": "tsmc65lp_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "nch11",
            "plotType": "idvds"
          }
        },
        {
          "name": "nch.11_idvgs.png",
          "relPath": "nch.11_idvgs.png",
          "format": "png",
          "size": "74.8 KB",
          "hash": "09d3930e",
          "displayUrl": "translator/plots/nch.11_idvgs_09d3930e.png",
          "scope": "tsmc65lp_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "nch11",
            "plotType": "idvgs"
          }
        },
        {
          "name": "nch.1_idvds.png",
          "relPath": "nch.1_idvds.png",
          "format": "png",
          "size": "133.6 KB",
          "hash": "d8ae4632",
          "displayUrl": "translator/plots/nch.1_idvds_d8ae4632.png",
          "scope": "tsmc65lp_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "nch1",
            "plotType": "idvds"
          }
        },
        {
          "name": "nch.1_idvgs.png",
          "relPath": "nch.1_idvgs.png",
          "format": "png",
          "size": "74.8 KB",
          "hash": "69ba286c",
          "displayUrl": "translator/plots/nch.1_idvgs_69ba286c.png",
          "scope": "tsmc65lp_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "nch1",
            "plotType": "idvgs"
          }
        },
        {
          "name": "nch_rf.1_idvds.png",
          "relPath": "nch_rf.1_idvds.png",
          "format": "png",
          "size": "123.7 KB",
          "hash": "9eff64bc",
          "displayUrl": "translator/plots/nch_rf.1_idvds_9eff64bc.png",
          "scope": "tsmc65lp_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "nch",
            "plotType": "idvds"
          }
        },
        {
          "name": "nch_rf.1_idvgs.png",
          "relPath": "nch_rf.1_idvgs.png",
          "format": "png",
          "size": "76.7 KB",
          "hash": "27780848",
          "displayUrl": "translator/plots/nch_rf.1_idvgs_27780848.png",
          "scope": "tsmc65lp_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "nch",
            "plotType": "idvgs"
          }
        },
        {
          "name": "nch_rf.2_idvds.png",
          "relPath": "nch_rf.2_idvds.png",
          "format": "png",
          "size": "129.5 KB",
          "hash": "294d8646",
          "displayUrl": "translator/plots/nch_rf.2_idvds_294d8646.png",
          "scope": "tsmc65lp_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "nch",
            "plotType": "idvds"
          }
        },
        {
          "name": "nch_rf.2_idvgs.png",
          "relPath": "nch_rf.2_idvgs.png",
          "format": "png",
          "size": "77.2 KB",
          "hash": "7948a96e",
          "displayUrl": "translator/plots/nch_rf.2_idvgs_7948a96e.png",
          "scope": "tsmc65lp_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "nch",
            "plotType": "idvgs"
          }
        },
        {
          "name": "nch_rf.3_idvds.png",
          "relPath": "nch_rf.3_idvds.png",
          "format": "png",
          "size": "124.1 KB",
          "hash": "ede6a007",
          "displayUrl": "translator/plots/nch_rf.3_idvds_ede6a007.png",
          "scope": "tsmc65lp_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vds Output Characteristic",
            "what": "Drain voltage vs drain current at multiple gate bias points.",
            "why": "Verifies output conductance and saturation region accuracy.",
            "device": "nch",
            "plotType": "idvds"
          }
        },
        {
          "name": "nch_rf.3_idvgs.png",
          "relPath": "nch_rf.3_idvgs.png",
          "format": "png",
          "size": "77.4 KB",
          "hash": "f2577e6e",
          "displayUrl": "translator/plots/nch_rf.3_idvgs_f2577e6e.png",
          "scope": "tsmc65lp_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "Id–Vgs Transfer Characteristic",
            "what": "Gate voltage vs drain current transfer curve.",
            "why": "Validates threshold voltage and transconductance matching after translation.",
            "device": "nch",
            "plotType": "idvgs"
          }
        },
        {
          "name": "ndio_rf_f_iv.png",
          "relPath": "ndio_rf_f_iv.png",
          "format": "png",
          "size": "51.5 KB",
          "hash": "3bcdb02a",
          "displayUrl": "translator/plots/ndio_rf_f_iv_3bcdb02a.png",
          "scope": "tsmc65lp_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "ndio rf f iv.png",
            "what": "Original verification output generated by the tool.",
            "why": "Part of the automated translation verification pipeline.",
            "device": "—",
            "plotType": "other"
          }
        },
        {
          "name": "ndio_rf_g_iv.png",
          "relPath": "ndio_rf_g_iv.png",
          "format": "png",
          "size": "51.7 KB",
          "hash": "6d12f4b9",
          "displayUrl": "translator/plots/ndio_rf_g_iv_6d12f4b9.png",
          "scope": "tsmc65lp_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "ndio rf g iv.png",
            "what": "Original verification output generated by the tool.",
            "why": "Part of the automated translation verification pipeline.",
            "device": "—",
            "plotType": "other"
          }
        },
        {
          "name": "pdio_rf_f_iv.png",
          "relPath": "pdio_rf_f_iv.png",
          "format": "png",
          "size": "51.6 KB",
          "hash": "9e4dcb38",
          "displayUrl": "translator/plots/pdio_rf_f_iv_9e4dcb38.png",
          "scope": "tsmc65lp_hspice-ngspice",
          "width": 1180,
          "height": 880,
          "aspectRatio": 1.341,
          "caption": {
            "title": "pdio rf f iv.png",
            "what": "Original verification output generated by the tool.",
            "why": "Part of the automated translation verification pipeline.",
            "device": "—",
            "plotType": "other"
          }
        }
      ],
      "dataArtifacts": [
        {
          "name": "pdk_translation_summary.csv",
          "relPath": "reports/pdk_translation_summary.csv",
          "format": "csv",
          "size": "6.7 KB",
          "hash": "131aa723",
          "columns": [
            "pdk",
            "source_format",
            "target",
            "successful",
            "failed",
            "models_out",
            "total_files",
            "success_rate_percent",
            "effective_model_deck_success_percent",
            "excluded_non_model_files",
            "model_deck_files",
            "model_deck_successful",
            "model_deck_failed",
            "dominant_exclusion_class",
            "total_duration_ms",
            "failure_reason",
            "failed_sections",
            "notes"
          ],
          "rowCount": 1
        }
      ],
      "otherArtifacts": [],
      "summary": {
        "totalReports": 0,
        "totalPlots": 17,
        "totalData": 1,
        "stats": {
          "files": "3",
          "successful": "1",
          "failed": "2",
          "rawSuccess": "33.3",
          "effectiveSuccess": "100.0",
          "modelsOut": "1222",
          "duration": "5017.7",
          "failureReason": "Invalid models provided",
          "notes": "All model-deck files translated; failures concentrated in excluded wrapper/helper files"
        }
      }
    },
    {
      "resultId": "pdk-tsmc65lp-hspice-spectre",
      "title": "tsmc65lp: hspice → spectre",
      "description": "3 files, 1 successful, 33.3% success, 1222 models.",
      "kind": "pdk_target",
      "level": 1,
      "pdk": "tsmc65lp",
      "sourceFormat": "hspice",
      "targetFormat": "spectre",
      "generatedAt": "2026-04-19",
      "status": "partial",
      "reports": [],
      "plots": [],
      "dataArtifacts": [
        {
          "name": "pdk_translation_summary.csv",
          "relPath": "reports/pdk_translation_summary.csv",
          "format": "csv",
          "size": "6.7 KB",
          "hash": "131aa723",
          "columns": [
            "pdk",
            "source_format",
            "target",
            "successful",
            "failed",
            "models_out",
            "total_files",
            "success_rate_percent",
            "effective_model_deck_success_percent",
            "excluded_non_model_files",
            "model_deck_files",
            "model_deck_successful",
            "model_deck_failed",
            "dominant_exclusion_class",
            "total_duration_ms",
            "failure_reason",
            "failed_sections",
            "notes"
          ],
          "rowCount": 1
        }
      ],
      "otherArtifacts": [],
      "summary": {
        "totalReports": 0,
        "totalPlots": 0,
        "totalData": 1,
        "stats": {
          "files": "3",
          "successful": "1",
          "failed": "2",
          "rawSuccess": "33.3",
          "effectiveSuccess": "100.0",
          "modelsOut": "1222",
          "duration": "4502.0",
          "failureReason": "Invalid models provided",
          "notes": "All model-deck files translated; failures concentrated in excluded wrapper/helper files"
        }
      }
    }
  ]
};
