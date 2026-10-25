export function AdminNotice({ error, message }: { error?: string | null; message?: string | null }): JSX.Element | null {
  if (!error && !message) return null;
  return <div className={`admin-notice ${error ? "admin-notice--error" : "admin-notice--success"}`} role={error ? "alert" : "status"}>{error || message}</div>;
}

