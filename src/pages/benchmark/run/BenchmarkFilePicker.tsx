import { useRef } from "react";
import type { InputRoleDefinitionV1 } from "../../../../shared/contracts/v1";
import type { BenchmarkWorkflowMode, BrowserInputFile } from "../../../api/benchmark";

const MODEL_EXTENSIONS = new Set(["lib", "model", "sp", "cir", "scs"]);

function relativePath(file: File): string {
  const folderPath = (file as File & { webkitRelativePath?: string }).webkitRelativePath;
  return (folderPath || file.name).replaceAll("\\", "/");
}

function recognize(path: string, mode: BenchmarkWorkflowMode): { type: string; role: string | null } {
  if (mode === "import") return { type: "completed Benchmark artifact", role: "completed-result" };
  const extension = path.split(".").pop()?.toLowerCase() ?? "";
  if (MODEL_EXTENSIONS.has(extension)) return { type: "SPICE model/library", role: "primary-model" };
  if (extension === "csv") return { type: "measured DC IV CSV", role: "measured-csv" };
  if (extension === "json" && /sigma/i.test(path)) return { type: "sigma JSON", role: "sigma-json" };
  return { type: "unrecognized input", role: null };
}

async function sha256(file: File): Promise<string> {
  if (file.size > 64 * 1024 * 1024) return "Computed by server during upload";
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, "0")).join("");
}

interface BenchmarkFilePickerProps {
  mode: BenchmarkWorkflowMode;
  files: BrowserInputFile[];
  roles: InputRoleDefinitionV1[];
  disabled?: boolean;
  onChange(files: BrowserInputFile[]): void;
}

export function BenchmarkFilePicker({ mode, files, roles, disabled, onChange }: BenchmarkFilePickerProps) {
  const singleRef = useRef<HTMLInputElement | null>(null);
  const filesRef = useRef<HTMLInputElement | null>(null);
  const folderRef = useRef<HTMLInputElement | null>(null);

  const acceptFiles = async (selection: FileList | null) => {
    if (!selection) return;
    const selected = [...selection];
    const seen = new Set<string>();
    const next: BrowserInputFile[] = [];
    for (const file of selected) {
      const path = relativePath(file);
      if (!path || path.startsWith("/") || path.split("/").some((segment) => !segment || segment === "." || segment === "..")) continue;
      if (seen.has(path)) continue;
      seen.add(path);
      const recognized = recognize(path, mode);
      next.push({ file, relativePath: path, sizeBytes: file.size, sha256: await sha256(file), recognizedType: recognized.type, role: recognized.role });
    }
    onChange(next);
  };

  const updateRole = (path: string, role: string) => {
    onChange(files.map((file) => file.relativePath === path ? { ...file, role: role || null } : file));
  };

  return (
    <section className="benchmark-run-section" aria-labelledby="benchmark-input-heading">
      <div className="benchmark-run-section__heading">
        <div>
          <span className="benchmark-run-eyebrow">Input</span>
          <h3 id="benchmark-input-heading">Choose source files</h3>
        </div>
        <span>{files.length} file{files.length === 1 ? "" : "s"}</span>
      </div>
      <p className="benchmark-run-help">
        Models: .lib, .model, .sp, .cir or .scs. Fitting: measured DC IV CSV. Expansion: optional sigma JSON.
        Folder upload preserves include paths; unresolved includes stop preflight.
      </p>
      <div className="benchmark-file-actions">
        <button type="button" disabled={disabled} onClick={() => singleRef.current?.click()}>Choose single file</button>
        <button type="button" disabled={disabled} onClick={() => filesRef.current?.click()}>Choose files</button>
        <button type="button" disabled={disabled} onClick={() => folderRef.current?.click()}>Choose folder</button>
        <input ref={singleRef} hidden type="file" onChange={(event) => void acceptFiles(event.target.files)} />
        <input ref={filesRef} hidden type="file" multiple onChange={(event) => void acceptFiles(event.target.files)} />
        <input ref={(node) => {
          folderRef.current = node;
          node?.setAttribute("webkitdirectory", "");
          node?.setAttribute("directory", "");
        }} hidden type="file" multiple onChange={(event) => void acceptFiles(event.target.files)} />
      </div>
      {files.length ? (
        <div className="benchmark-file-table-wrap">
          <table className="benchmark-file-table">
            <thead><tr><th>Relative path</th><th>Size</th><th>SHA-256</th><th>Recognized</th><th>Used as</th></tr></thead>
            <tbody>{files.map((file) => (
              <tr key={file.relativePath}>
                <td>{file.relativePath}</td>
                <td>{file.sizeBytes.toLocaleString()} B</td>
                <td className="benchmark-hash">{file.sha256}</td>
                <td>{file.recognizedType}</td>
                <td>
                  <select value={file.role ?? ""} onChange={(event) => updateRole(file.relativePath, event.target.value)}>
                    <option value="">Unmapped</option>
                    {roles.map((role) => <option key={role.id} value={role.id}>{role.label}{role.required ? " · required" : ""}</option>)}
                  </select>
                </td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      ) : <div className="benchmark-run-empty">No input selected. Selecting files does not execute a tool.</div>}
    </section>
  );
}
