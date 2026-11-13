/* ==================================================================
 *  ModelInputCard (goal.md §6.2)
 *
 *  Three mutually exclusive input modes:
 *  1. Bundled model (dropdown)
 *  2. Upload local file (FileReader)
 *  3. Paste model text (textarea)
 * ================================================================== */

import { useState, useCallback, useRef, type ChangeEvent } from "react";
import { BUNDLED_MODELS } from "../../data/benchmarkWorkspace";
import type { BundledModelEntry } from "../../data/benchmarkWorkspace";
import type { SpiceDialect } from "../../compat/spiceWorkflow/contracts";

export type InputMode = "bundled" | "upload" | "paste";

export interface LocalModelData {
  filename: string;
  content: string;
  dialect: SpiceDialect;
  modelNames: string[];
  deviceType: "nmos" | "pmos" | "unknown";
  byteSize: number;
}

interface ModelInputCardProps {
  mode: InputMode;
  onModeChange: (mode: InputMode) => void;
  bundledModelId: string | null;
  onBundledModelChange: (id: string) => void;
  localModel: LocalModelData | null;
  onLocalModelChange: (model: LocalModelData | null) => void;
}

export function ModelInputCard({
  mode, onModeChange, bundledModelId, onBundledModelChange,
  localModel, onLocalModelChange,
}: ModelInputCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const content = reader.result as string;
      const modelNames = extractModelNames(content);
      const dialect = guessDialect(content, file.name);
      onLocalModelChange({
        filename: file.name,
        content,
        dialect,
        modelNames,
        deviceType: guessDeviceType(content),
        byteSize: file.size,
      });
    };
    reader.readAsText(file);
  }, [onLocalModelChange]);

  const [pasteText, setPasteText] = useState("");
  const handlePasteChange = useCallback((text: string) => {
    setPasteText(text);
    if (text.trim()) {
      onLocalModelChange({
        filename: "pasted-model.txt",
        content: text,
        dialect: guessDialect(text, ""),
        modelNames: extractModelNames(text),
        deviceType: guessDeviceType(text),
        byteSize: new Blob([text]).size,
      });
    } else {
      onLocalModelChange(null);
    }
  }, [onLocalModelChange]);

  const selectedBundled = BUNDLED_MODELS.find((m) => m.modelId === bundledModelId);

  return (
    <div>
      <h3 className="flow-subsection-title">Input Model</h3>

      {/* Mode tabs */}
      <div style={{ display: "flex", gap: "0.35rem", marginBottom: "0.65rem" }}>
        {(["bundled", "upload", "paste"] as const).map((m) => (
          <button
            key={m}
            onClick={() => onModeChange(m)}
            style={{
              padding: "0.3rem 0.75rem", fontSize: "0.78rem",
              borderRadius: "1rem", border: "1px solid var(--border-light, #e5e5e5)",
              background: mode === m ? "var(--accent, #0071e3)" : "transparent",
              color: mode === m ? "#fff" : "var(--muted, #666)",
              cursor: "pointer",
            }}
          >
            {m === "bundled" ? "Bundled Model" : m === "upload" ? "Upload File" : "Paste Text"}
          </button>
        ))}
      </div>

      {/* Bundled */}
      {mode === "bundled" && (
        <div>
          <select
            value={bundledModelId ?? ""}
            onChange={(e) => onBundledModelChange(e.target.value)}
            style={{ width: "100%", maxWidth: "480px" }}
          >
            <option value="" disabled>Select a bundled model...</option>
            {BUNDLED_MODELS.map((m) => (
              <option key={m.modelId} value={m.modelId}>
                {m.displayName} ({m.dialect}, {m.parameterCount} params)
              </option>
            ))}
          </select>

          {selectedBundled && (
            <ModelPreview entry={selectedBundled} />
          )}
        </div>
      )}

      {/* Upload */}
      {mode === "upload" && (
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".lib,.sp,.scs,.model,.cir"
            onChange={handleFileUpload}
          />
          <p className="hint" style={{ marginTop: "0.35rem" }}>
            Supported: .lib, .sp, .scs, .model, .cir. File stays in browser memory only.
          </p>
          {localModel && (
            <div className="chart-card" style={{ marginTop: "0.5rem", padding: "0.5rem 0.65rem" }}>
              <p style={{ fontSize: "0.78rem", margin: 0 }}>
                <strong>{localModel.filename}</strong> · {localModel.dialect} · {localModel.byteSize} B
                {localModel.modelNames.length > 0 && <> · Models: {localModel.modelNames.join(", ")}</>}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Paste */}
      {mode === "paste" && (
        <div>
          <textarea
            value={pasteText}
            onChange={(e) => handlePasteChange(e.target.value)}
            placeholder="Paste SPICE model text here..."
            rows={10}
            style={{ width: "100%", maxWidth: "640px", fontFamily: "monospace", fontSize: "0.78rem" }}
          />
          <p className="hint" style={{ marginTop: "0.35rem" }}>
            Characters: {pasteText.length}. Content stays in browser memory only — never uploaded.
          </p>
          {localModel && pasteText.trim() && (
            <div className="chart-card" style={{ marginTop: "0.5rem", padding: "0.5rem 0.65rem" }}>
              <p style={{ fontSize: "0.78rem", margin: 0 }}>
                <strong>Pasted model</strong> · dialect: {localModel.dialect} · {localModel.byteSize} B
                {localModel.modelNames.length > 0 && <> · Models: {localModel.modelNames.join(", ")}</>}
              </p>
            </div>
          )}
          <button
            className="benchmark-btn"
            style={{ marginTop: "0.35rem" }}
            onClick={() => handlePasteChange("* BSIM4.5 NMOS sample\n.model nmos1 nmos level=54\n+ vth0=0.4 k1=0.35 u0=280\n")}
          >
            Fill sample
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── Bundled model preview ─── */
function ModelPreview({ entry }: { entry: BundledModelEntry }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="chart-card" style={{ marginTop: "0.5rem", padding: "0.5rem 0.65rem" }}>
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
        <span className="tr-badge tr-badge--completed">{entry.dialect}</span>
        <span className="tr-badge tr-badge--completed">{entry.deviceType}</span>
        <span className="tr-badge tr-badge--completed">{entry.modelFamily ?? "BSIM"}</span>
        <span className="tr-badge tr-badge--partial">{entry.parameterCount} params</span>
        <span className="tr-badge tr-badge--partial">{entry.byteSize} B</span>
      </div>
      <p className="hint" style={{ marginTop: "0.35rem" }}>
        Model: {entry.modelName} · Origin: {entry.origin}
      </p>
      <button className="benchmark-btn" onClick={() => setExpanded(!expanded)} style={{ marginTop: "0.25rem", fontSize: "0.72rem" }}>
        {expanded ? "Hide preview" : "Show code preview"}
      </button>
      {expanded && (
        <pre style={{
          marginTop: "0.35rem", fontSize: "0.68rem", background: "var(--surface-inset, #f5f5f7)",
          padding: "0.5rem", borderRadius: "6px", overflow: "auto", maxHeight: "200px",
        }}>
          {entry.content.slice(0, 2000)}
        </pre>
      )}
    </div>
  );
}

/* ─── Helpers ─── */

function extractModelNames(content: string): string[] {
  const re = /\.model\s+(\w+)\s+/gi;
  const names: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    names.push(m[1]);
  }
  return names;
}

function guessDialect(content: string, filename: string): SpiceDialect {
  const fn = filename.toLowerCase();
  if (fn.endsWith(".scs")) return "spectre";
  if (content.includes("simulator lang=spectre")) return "spectre";
  if (content.includes("simulator lang=hspice")) return "hspice";
  if (content.includes(".OPTION")) return "hspice";
  return "ngspice";
}

function guessDeviceType(_content: string): "nmos" | "pmos" | "unknown" {
  return "unknown";
}
