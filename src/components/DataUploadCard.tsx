import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  DataUploadError,
  loadUploadJob,
  uploadDatasetFiles,
  type UploadDataset,
  type UploadJob,
  type UploadResponse,
} from "../uploads/uploadClient";
import { UPLOAD_DATASET_CONFIG } from "../uploads/uploadConfig";
import "./data-upload.css";

interface DataUploadCardProps {
  dataset: UploadDataset;
  onPublished?: (result: UploadResponse) => void | Promise<void>;
}

function humanBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`;
}

export function DataUploadCard({ dataset, onPublished }: DataUploadCardProps): JSX.Element {
  const config = UPLOAD_DATASET_CONFIG[dataset];
  const storageKey = `eda-upload-last-job-${dataset}`;
  const [expanded, setExpanded] = useState(() => window.sessionStorage.getItem(storageKey) !== null);
  const [files, setFiles] = useState<File[]>([]);
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<UploadResponse | null>(null);
  const [job, setJob] = useState<UploadJob | null>(null);
  const totalBytes = useMemo(() => files.reduce((sum, file) => sum + file.size, 0), [files]);

  useEffect(() => {
    const jobId = window.sessionStorage.getItem(storageKey);
    if (!jobId) return;
    let cancelled = false;
    let timer: number | undefined;
    const restore = async (): Promise<void> => {
      try {
        const restored = await loadUploadJob(jobId);
        if (cancelled) return;
        setJob(restored);
        setProgress(restored.status === "published" ? 100 : 40 + Math.round(restored.progress * 0.6));
        if (restored.result) setSuccess(restored.result);
        if (restored.status === "queued" || restored.status === "processing") {
          timer = window.setTimeout(() => void restore(), 700);
        }
      } catch {
        window.sessionStorage.removeItem(storageKey);
      }
    };
    void restore();
    return () => {
      cancelled = true;
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [storageKey]);

  const chooseFiles = (selected: FileList | null): void => {
    setFiles(selected ? [...selected] : []);
    setError(null);
    setSuccess(null);
    setJob(null);
    window.sessionStorage.removeItem(storageKey);
    setProgress(0);
  };

  const submit = async (): Promise<void> => {
    if (files.length === 0 || busy) return;
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await uploadDatasetFiles(dataset, files, setProgress, (nextJob) => {
        setJob(nextJob);
        window.sessionStorage.setItem(storageKey, nextJob.jobId);
      });
      setSuccess(result);
      await onPublished?.(result);
    } catch (reason) {
      const message = reason instanceof DataUploadError
        ? `${reason.code ? `${reason.code}: ` : ""}${reason.message}`
        : reason instanceof Error ? reason.message : String(reason);
      setError(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="chart-card data-upload" aria-label={config.title}>
      <div className="data-upload__heading">
        <div>
          <span className="data-upload__eyebrow">{config.tool}</span>
          <h2>{config.title}</h2>
          <p className="data-upload__processing-summary">{config.processing}</p>
        </div>
        <button type="button" className="data-upload__toggle" onClick={() => setExpanded((value) => !value)}>
          {expanded ? "Close" : "Upload data"}
        </button>
      </div>
      {expanded ? (
        <div className="data-upload__body">
          <p className="hint">{config.guidance}</p>
          <div className="data-upload__pickers">
            <label className="data-upload__picker">
              Choose files
              <input
                type="file"
                accept={config.accepts}
                multiple
                disabled={busy}
                onChange={(event) => chooseFiles(event.target.files)}
              />
            </label>
            <label className="data-upload__picker">
              Choose folder
              <input
                ref={(element) => {
                  element?.setAttribute("webkitdirectory", "");
                  element?.setAttribute("directory", "");
                }}
                type="file"
                multiple
                disabled={busy}
                onChange={(event) => chooseFiles(event.target.files)}
              />
            </label>
          </div>
          <p className="data-upload__folder-hint">{config.folderGuidance} Limits: 16 MiB per file, 64 MiB per request, 512 files.</p>
          <div className="data-upload__selection" aria-live="polite">
            {files.length > 0
              ? <span>{files.length} file{files.length === 1 ? "" : "s"} · {humanBytes(totalBytes)}</span>
              : <span>No files selected.</span>}
            <button type="button" disabled={files.length === 0 || busy} onClick={() => void submit()}>
              {busy ? "Validating and publishing…" : "Validate and publish"}
            </button>
          </div>
          {busy || progress > 0 ? (
            <div className="data-upload__progress" aria-label={`Overall upload progress ${progress}%`}>
              <div className="data-upload__progress-copy">
                <span>{job ? `Backend · ${job.stage}` : progress < 15 ? "Reading selected files" : "Uploading to server"}</span>
                <strong>{progress}%</strong>
              </div>
              <progress max={100} value={progress} />
            </div>
          ) : null}
          {job ? (
            <div className="data-upload__job" aria-live="polite">
              <div>
                <span className={`data-upload__job-state data-upload__job-state--${job.status}`}>{job.status}</span>
                <strong>{job.tool}</strong>
                <span>{job.logs.at(-1)?.message ?? job.stage}</span>
              </div>
              <Link className="data-upload__job-link" to={`/upload-processing/${job.jobId}`}>
                View backend processing
              </Link>
            </div>
          ) : null}
          {success ? (
            <div className="data-upload__notice data-upload__notice--success" role="status">
              <strong>Recognized and published</strong>
              <dl className="data-upload__recognition">
                <div><dt>Tool</dt><dd>{success.recognition.tool}</dd></div>
                <div><dt>Format</dt><dd>{success.recognition.format}</dd></div>
                <div><dt>Content</dt><dd>{success.recognition.summary}</dd></div>
                {success.recognition.details.map((detail) => <div key={detail}><dt>Detected</dt><dd>{detail}</dd></div>)}
                <div><dt>Upload UID</dt><dd><code>{success.uploadId}</code></dd></div>
              </dl>
            </div>
          ) : null}
          {error ? <div className="data-upload__notice data-upload__notice--error" role="alert">{error}</div> : null}
        </div>
      ) : null}
    </section>
  );
}
