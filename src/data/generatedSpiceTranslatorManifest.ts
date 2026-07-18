// Auto-generated: 2026-07-18T09:27:21.819Z
import type { SpiceTranslatorManifest } from "./SpiceTranslatorTypes";
export const TRANSLATOR_MANIFEST: SpiceTranslatorManifest = {
  "generatedAt": "2026-07-18T09:27:21.817Z",
  "results": [
    {
      "resultId": "full-batch",
      "title": "Full Batch Translation Result",
      "description": "17 PDKs, full translation pipeline with verification. FINALBATCHRUN2 complete report.",
      "kind": "batch",
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
          "fetchUrl": "translator/reports/FINALBATCHRUN2_2d05eb4e.md"
        }
      ],
      "plots": [
        {
          "name": "verification_summary.png",
          "relPath": "plots/verification_summary.png",
          "format": "png",
          "size": "241.9 KB",
          "hash": "c82c558f",
          "displayUrl": "translator/plots/verification_summary_c82c558f.png",
          "width": 2209,
          "height": 1183,
          "aspectRatio": 1.867
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
        }
      ],
      "summary": {
        "totalReports": 1,
        "totalPlots": 1,
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
      "description": "6 files, 6 successful, 100.0% success rate, 48 models out.",
      "kind": "pdk_target",
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
          "rowCount": 0,
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
        }
      ],
      "otherArtifacts": [],
      "summary": {
        "totalReports": 0,
        "totalPlots": 0,
        "totalData": 1
      }
    },
    {
      "resultId": "pdk-asap7-hspice-spectre",
      "title": "asap7: hspice → spectre",
      "description": "6 files, 6 successful, 100.0% success rate, 48 models out.",
      "kind": "pdk_target",
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
          "rowCount": 0,
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
        }
      ],
      "otherArtifacts": [],
      "summary": {
        "totalReports": 0,
        "totalPlots": 0,
        "totalData": 1
      }
    },
    {
      "resultId": "pdk-cadence14-spectre-hspice",
      "title": "cadence14: spectre → hspice",
      "description": "6 files, 5 successful, 83.3% success rate, 24 models out.",
      "kind": "pdk_target",
      "pdk": "cadence14",
      "sourceFormat": "spectre",
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
          "rowCount": 0,
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
        }
      ],
      "otherArtifacts": [],
      "summary": {
        "totalReports": 0,
        "totalPlots": 0,
        "totalData": 1
      }
    },
    {
      "resultId": "pdk-cadence14-spectre-ngspice",
      "title": "cadence14: spectre → ngspice",
      "description": "6 files, 5 successful, 83.3% success rate, 24 models out.",
      "kind": "pdk_target",
      "pdk": "cadence14",
      "sourceFormat": "spectre",
      "targetFormat": "ngspice",
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
          "rowCount": 0,
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
        }
      ],
      "otherArtifacts": [],
      "summary": {
        "totalReports": 0,
        "totalPlots": 0,
        "totalData": 1
      }
    },
    {
      "resultId": "pdk-cadence180-spectre-hspice",
      "title": "cadence180: spectre → hspice",
      "description": "14 files, 11 successful, 78.6% success rate, 29 models out.",
      "kind": "pdk_target",
      "pdk": "cadence180",
      "sourceFormat": "spectre",
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
          "rowCount": 0,
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
        }
      ],
      "otherArtifacts": [],
      "summary": {
        "totalReports": 0,
        "totalPlots": 0,
        "totalData": 1
      }
    },
    {
      "resultId": "pdk-cadence180-spectre-ngspice",
      "title": "cadence180: spectre → ngspice",
      "description": "14 files, 11 successful, 78.6% success rate, 29 models out.",
      "kind": "pdk_target",
      "pdk": "cadence180",
      "sourceFormat": "spectre",
      "targetFormat": "ngspice",
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
          "rowCount": 0,
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
        }
      ],
      "otherArtifacts": [],
      "summary": {
        "totalReports": 0,
        "totalPlots": 0,
        "totalData": 1
      }
    },
    {
      "resultId": "pdk-cadence45-spectre-hspice",
      "title": "cadence45: spectre → hspice",
      "description": "9 files, 7 successful, 77.8% success rate, 49 models out.",
      "kind": "pdk_target",
      "pdk": "cadence45",
      "sourceFormat": "spectre",
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
          "rowCount": 0,
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
        }
      ],
      "otherArtifacts": [],
      "summary": {
        "totalReports": 0,
        "totalPlots": 0,
        "totalData": 1
      }
    },
    {
      "resultId": "pdk-cadence45-spectre-ngspice",
      "title": "cadence45: spectre → ngspice",
      "description": "9 files, 7 successful, 77.8% success rate, 49 models out.",
      "kind": "pdk_target",
      "pdk": "cadence45",
      "sourceFormat": "spectre",
      "targetFormat": "ngspice",
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
          "rowCount": 0,
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
        }
      ],
      "otherArtifacts": [],
      "summary": {
        "totalReports": 0,
        "totalPlots": 0,
        "totalData": 1
      }
    },
    {
      "resultId": "pdk-cadence90-spectre-hspice",
      "title": "cadence90: spectre → hspice",
      "description": "9 files, 8 successful, 88.9% success rate, 57 models out.",
      "kind": "pdk_target",
      "pdk": "cadence90",
      "sourceFormat": "spectre",
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
          "rowCount": 0,
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
        }
      ],
      "otherArtifacts": [],
      "summary": {
        "totalReports": 0,
        "totalPlots": 0,
        "totalData": 1
      }
    },
    {
      "resultId": "pdk-cadence90-spectre-ngspice",
      "title": "cadence90: spectre → ngspice",
      "description": "9 files, 8 successful, 88.9% success rate, 57 models out.",
      "kind": "pdk_target",
      "pdk": "cadence90",
      "sourceFormat": "spectre",
      "targetFormat": "ngspice",
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
          "rowCount": 0,
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
        }
      ],
      "otherArtifacts": [],
      "summary": {
        "totalReports": 0,
        "totalPlots": 0,
        "totalData": 1
      }
    },
    {
      "resultId": "pdk-freepdk15-hspice-ngspice",
      "title": "freepdk15: hspice → ngspice",
      "description": "6 files, 6 successful, 100.0% success rate, 12 models out.",
      "kind": "pdk_target",
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
          "rowCount": 0,
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
        }
      ],
      "otherArtifacts": [],
      "summary": {
        "totalReports": 0,
        "totalPlots": 0,
        "totalData": 1
      }
    },
    {
      "resultId": "pdk-freepdk15-hspice-spectre",
      "title": "freepdk15: hspice → spectre",
      "description": "6 files, 6 successful, 100.0% success rate, 12 models out.",
      "kind": "pdk_target",
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
          "rowCount": 0,
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
        }
      ],
      "otherArtifacts": [],
      "summary": {
        "totalReports": 0,
        "totalPlots": 0,
        "totalData": 1
      }
    },
    {
      "resultId": "pdk-freepdk3-hspice-ngspice",
      "title": "freepdk3: hspice → ngspice",
      "description": "1 files, 1 successful, 100.0% success rate, 2 models out.",
      "kind": "pdk_target",
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
          "rowCount": 0,
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
        }
      ],
      "otherArtifacts": [],
      "summary": {
        "totalReports": 0,
        "totalPlots": 0,
        "totalData": 1
      }
    },
    {
      "resultId": "pdk-freepdk3-hspice-spectre",
      "title": "freepdk3: hspice → spectre",
      "description": "1 files, 1 successful, 100.0% success rate, 2 models out.",
      "kind": "pdk_target",
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
          "rowCount": 0,
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
        }
      ],
      "otherArtifacts": [],
      "summary": {
        "totalReports": 0,
        "totalPlots": 0,
        "totalData": 1
      }
    },
    {
      "resultId": "pdk-freepdk45-hspice-ngspice",
      "title": "freepdk45: hspice → ngspice",
      "description": "12 files, 12 successful, 100.0% success rate, 96 models out.",
      "kind": "pdk_target",
      "pdk": "freepdk45",
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
          "rowCount": 0,
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
        }
      ],
      "otherArtifacts": [],
      "summary": {
        "totalReports": 0,
        "totalPlots": 0,
        "totalData": 1
      }
    },
    {
      "resultId": "pdk-freepdk45-hspice-spectre",
      "title": "freepdk45: hspice → spectre",
      "description": "12 files, 12 successful, 100.0% success rate, 96 models out.",
      "kind": "pdk_target",
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
          "rowCount": 0,
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
        }
      ],
      "otherArtifacts": [],
      "summary": {
        "totalReports": 0,
        "totalPlots": 0,
        "totalData": 1
      }
    },
    {
      "resultId": "pdk-gf180-ngspice-hspice",
      "title": "gf180: ngspice → hspice",
      "description": "56 files, 0 successful, 0.0% success rate, 0 models out.",
      "kind": "pdk_target",
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
          "rowCount": 0,
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
        }
      ],
      "otherArtifacts": [],
      "summary": {
        "totalReports": 0,
        "totalPlots": 0,
        "totalData": 1
      }
    },
    {
      "resultId": "pdk-gf180-ngspice-spectre",
      "title": "gf180: ngspice → spectre",
      "description": "56 files, 0 successful, 0.0% success rate, 0 models out.",
      "kind": "pdk_target",
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
          "rowCount": 0,
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
        }
      ],
      "otherArtifacts": [],
      "summary": {
        "totalReports": 0,
        "totalPlots": 0,
        "totalData": 1
      }
    },
    {
      "resultId": "pdk-hlmc40lp-hspice-ngspice",
      "title": "hlmc40lp: hspice → ngspice",
      "description": "4 files, 2 successful, 50.0% success rate, 227 models out.",
      "kind": "pdk_target",
      "pdk": "hlmc40lp",
      "sourceFormat": "hspice",
      "targetFormat": "ngspice",
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
          "rowCount": 0,
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
        }
      ],
      "otherArtifacts": [],
      "summary": {
        "totalReports": 0,
        "totalPlots": 0,
        "totalData": 1
      }
    },
    {
      "resultId": "pdk-hlmc40lp-hspice-spectre",
      "title": "hlmc40lp: hspice → spectre",
      "description": "4 files, 2 successful, 50.0% success rate, 227 models out.",
      "kind": "pdk_target",
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
          "rowCount": 0,
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
        }
      ],
      "otherArtifacts": [],
      "summary": {
        "totalReports": 0,
        "totalPlots": 0,
        "totalData": 1
      }
    },
    {
      "resultId": "pdk-hlmc55lp-hspice-ngspice",
      "title": "hlmc55lp: hspice → ngspice",
      "description": "9 files, 1 successful, 11.1% success rate, 48 models out.",
      "kind": "pdk_target",
      "pdk": "hlmc55lp",
      "sourceFormat": "hspice",
      "targetFormat": "ngspice",
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
          "rowCount": 0,
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
        }
      ],
      "otherArtifacts": [],
      "summary": {
        "totalReports": 0,
        "totalPlots": 0,
        "totalData": 1
      }
    },
    {
      "resultId": "pdk-hlmc55lp-hspice-spectre",
      "title": "hlmc55lp: hspice → spectre",
      "description": "9 files, 1 successful, 11.1% success rate, 48 models out.",
      "kind": "pdk_target",
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
          "rowCount": 0,
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
        }
      ],
      "otherArtifacts": [],
      "summary": {
        "totalReports": 0,
        "totalPlots": 0,
        "totalData": 1
      }
    },
    {
      "resultId": "pdk-sky130-ngspice-hspice",
      "title": "sky130: ngspice → hspice",
      "description": "147 files, 13 successful, 8.8% success rate, 80 models out.",
      "kind": "pdk_target",
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
          "rowCount": 0,
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
        }
      ],
      "otherArtifacts": [],
      "summary": {
        "totalReports": 0,
        "totalPlots": 0,
        "totalData": 1
      }
    },
    {
      "resultId": "pdk-sky130-ngspice-spectre",
      "title": "sky130: ngspice → spectre",
      "description": "147 files, 13 successful, 8.8% success rate, 80 models out.",
      "kind": "pdk_target",
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
          "rowCount": 0,
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
        }
      ],
      "otherArtifacts": [],
      "summary": {
        "totalReports": 0,
        "totalPlots": 0,
        "totalData": 1
      }
    },
    {
      "resultId": "pdk-smic180-hspice-ngspice",
      "title": "smic180: hspice → ngspice",
      "description": "22 files, 22 successful, 100.0% success rate, 216 models out.",
      "kind": "pdk_target",
      "pdk": "smic180",
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
          "rowCount": 0,
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
        }
      ],
      "otherArtifacts": [],
      "summary": {
        "totalReports": 0,
        "totalPlots": 0,
        "totalData": 1
      }
    },
    {
      "resultId": "pdk-smic180-hspice-spectre",
      "title": "smic180: hspice → spectre",
      "description": "22 files, 22 successful, 100.0% success rate, 216 models out.",
      "kind": "pdk_target",
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
          "rowCount": 0,
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
        }
      ],
      "otherArtifacts": [],
      "summary": {
        "totalReports": 0,
        "totalPlots": 0,
        "totalData": 1
      }
    },
    {
      "resultId": "pdk-smic180hv-hspice-ngspice",
      "title": "smic180HV: hspice → ngspice",
      "description": "16 files, 15 successful, 93.8% success rate, 1174 models out.",
      "kind": "pdk_target",
      "pdk": "smic180HV",
      "sourceFormat": "hspice",
      "targetFormat": "ngspice",
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
          "rowCount": 0,
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
        }
      ],
      "otherArtifacts": [],
      "summary": {
        "totalReports": 0,
        "totalPlots": 0,
        "totalData": 1
      }
    },
    {
      "resultId": "pdk-smic180hv-hspice-spectre",
      "title": "smic180HV: hspice → spectre",
      "description": "16 files, 15 successful, 93.8% success rate, 1174 models out.",
      "kind": "pdk_target",
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
          "rowCount": 0,
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
        }
      ],
      "otherArtifacts": [],
      "summary": {
        "totalReports": 0,
        "totalPlots": 0,
        "totalData": 1
      }
    },
    {
      "resultId": "pdk-synopsys14-hspice-ngspice",
      "title": "synopsys14: hspice → ngspice",
      "description": "1 files, 1 successful, 100.0% success rate, 18 models out.",
      "kind": "pdk_target",
      "pdk": "synopsys14",
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
          "rowCount": 0,
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
        }
      ],
      "otherArtifacts": [],
      "summary": {
        "totalReports": 0,
        "totalPlots": 0,
        "totalData": 1
      }
    },
    {
      "resultId": "pdk-synopsys14-hspice-spectre",
      "title": "synopsys14: hspice → spectre",
      "description": "1 files, 1 successful, 100.0% success rate, 18 models out.",
      "kind": "pdk_target",
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
          "rowCount": 0,
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
        }
      ],
      "otherArtifacts": [],
      "summary": {
        "totalReports": 0,
        "totalPlots": 0,
        "totalData": 1
      }
    },
    {
      "resultId": "pdk-synopsys28-hspice-ngspice",
      "title": "synopsys28: hspice → ngspice",
      "description": "1 files, 1 successful, 100.0% success rate, 17 models out.",
      "kind": "pdk_target",
      "pdk": "synopsys28",
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
          "rowCount": 0,
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
        }
      ],
      "otherArtifacts": [],
      "summary": {
        "totalReports": 0,
        "totalPlots": 0,
        "totalData": 1
      }
    },
    {
      "resultId": "pdk-synopsys28-hspice-spectre",
      "title": "synopsys28: hspice → spectre",
      "description": "1 files, 1 successful, 100.0% success rate, 17 models out.",
      "kind": "pdk_target",
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
          "rowCount": 0,
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
        }
      ],
      "otherArtifacts": [],
      "summary": {
        "totalReports": 0,
        "totalPlots": 0,
        "totalData": 1
      }
    },
    {
      "resultId": "pdk-tsmc65lp-hspice-ngspice",
      "title": "tsmc65lp: hspice → ngspice",
      "description": "3 files, 1 successful, 33.3% success rate, 1222 models out.",
      "kind": "pdk_target",
      "pdk": "tsmc65lp",
      "sourceFormat": "hspice",
      "targetFormat": "ngspice",
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
          "rowCount": 0,
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
        }
      ],
      "otherArtifacts": [],
      "summary": {
        "totalReports": 0,
        "totalPlots": 0,
        "totalData": 1
      }
    },
    {
      "resultId": "pdk-tsmc65lp-hspice-spectre",
      "title": "tsmc65lp: hspice → spectre",
      "description": "3 files, 1 successful, 33.3% success rate, 1222 models out.",
      "kind": "pdk_target",
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
          "rowCount": 0,
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
        }
      ],
      "otherArtifacts": [],
      "summary": {
        "totalReports": 0,
        "totalPlots": 0,
        "totalData": 1
      }
    }
  ],
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
  ]
};
