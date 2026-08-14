import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import type { ModuleId, UserRecordV1, UserRole } from "../../shared/contracts/v1";
import { Link } from "react-router-dom";
import { createAdminUser, listAdminUsers, updateAdminUser, type CreateUserInput } from "../api/admin";
import { formatBytes, formatDate, shortId } from "../jobs";
import { AdminNotice } from "./AdminNotice";

const MODULES: ModuleId[] = ["benchmark", "digital", "ppa"];
const DEFAULT_USER: CreateUserInput = { username: "", password: "", role: "user", allowedModules: [...MODULES], maxConcurrentJobs: 2, storageQuotaBytes: 20 * 1024 ** 3 };

export function UsersPanel(): JSX.Element {
  const [users, setUsers] = useState<UserRecordV1[]>([]);
  const [draft, setDraft] = useState<CreateUserInput>(DEFAULT_USER);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const load = useCallback(async () => { try { setUsers(await listAdminUsers()); setError(null); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : String(requestError)); } }, []);
  useEffect(() => { void load(); }, [load]);
  const visible = useMemo(() => users.filter((user) => user.username.toLowerCase().includes(search.toLowerCase()) || user.id.includes(search)), [search, users]);

  async function create(event: FormEvent): Promise<void> {
    event.preventDefault(); setBusy("create"); setError(null); setMessage(null);
    try { await createAdminUser(draft); setDraft(DEFAULT_USER); setMessage(`Created ${draft.username}.`); await load(); }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : String(requestError)); }
    finally { setBusy(null); }
  }

  async function patch(user: UserRecordV1, values: Parameters<typeof updateAdminUser>[1], note: string): Promise<void> {
    setBusy(user.id); setError(null); setMessage(null);
    try { await updateAdminUser(user.id, values); setMessage(note); await load(); }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : String(requestError)); }
    finally { setBusy(null); }
  }

  return <section className="admin-section"><header><div><h2>Users</h2><p>Create accounts, restrict modules, and enforce per-user compute and storage limits.</p></div><input aria-label="Search users" placeholder="Search username or ID" value={search} onChange={(event) => setSearch(event.target.value)} /></header>
    <AdminNotice error={error} message={message} />
    <details className="admin-editor" open><summary>Create user</summary><form className="admin-form admin-form--grid" onSubmit={(event) => { void create(event); }}>
      <label>Username<input required minLength={3} value={draft.username} onChange={(event) => setDraft({ ...draft, username: event.target.value })} /></label>
      <label>Initial password<input type="password" autoComplete="new-password" required minLength={12} value={draft.password} onChange={(event) => setDraft({ ...draft, password: event.target.value })} /></label>
      <label>Role<select value={draft.role} onChange={(event) => setDraft({ ...draft, role: event.target.value as UserRole })}><option value="user">user</option><option value="admin">admin</option></select></label>
      <label>Concurrent jobs<input type="number" min={1} step={1} value={draft.maxConcurrentJobs} onChange={(event) => setDraft({ ...draft, maxConcurrentJobs: Number(event.target.value) })} /></label>
      <label>Storage quota (GiB)<input type="number" min={0.1} step={0.1} value={draft.storageQuotaBytes / 1024 ** 3} onChange={(event) => setDraft({ ...draft, storageQuotaBytes: Math.round(Number(event.target.value) * 1024 ** 3) })} /></label>
      <fieldset><legend>Allowed modules</legend>{MODULES.map((moduleId) => <label className="admin-check" key={moduleId}><input type="checkbox" checked={draft.allowedModules.includes(moduleId)} onChange={(event) => setDraft({ ...draft, allowedModules: event.target.checked ? [...draft.allowedModules, moduleId] : draft.allowedModules.filter((value) => value !== moduleId) })} />{moduleId}</label>)}</fieldset>
      <button className="admin-primary" type="submit" disabled={busy === "create"}>{busy === "create" ? "Creating…" : "Create user"}</button>
    </form></details>
    <div className="admin-table-scroll"><table className="admin-table"><thead><tr><th>User</th><th>Role</th><th>Access</th><th>Limits</th><th>State</th><th>Created</th><th>Actions</th></tr></thead><tbody>{visible.map((user) => <UserRow user={user} busy={busy === user.id} patch={patch} key={user.id} />)}</tbody></table></div>
  </section>;
}

function UserRow({ user, busy, patch }: { user: UserRecordV1; busy: boolean; patch: (user: UserRecordV1, values: Parameters<typeof updateAdminUser>[1], note: string) => Promise<void> }): JSX.Element {
  const [password, setPassword] = useState("");
  const [role, setRole] = useState(user.role);
  const [modules, setModules] = useState(user.allowedModules);
  const [concurrency, setConcurrency] = useState(user.maxConcurrentJobs);
  const [quotaGiB, setQuotaGiB] = useState(user.storageQuotaBytes / 1024 ** 3);
  return <tr><td><strong>{user.username}</strong><code title={user.id}>{shortId(user.id)}</code>{user.deletedAt ? <small>Soft-deleted {formatDate(user.deletedAt)}</small> : null}</td>
    <td><select aria-label={`Role for ${user.username}`} value={role} onChange={(event) => setRole(event.target.value as UserRole)}><option value="user">user</option><option value="admin">admin</option></select></td>
    <td><div className="admin-check-stack">{MODULES.map((moduleId) => <label className="admin-check" key={moduleId}><input type="checkbox" checked={modules.includes(moduleId)} onChange={(event) => setModules(event.target.checked ? [...modules, moduleId] : modules.filter((value) => value !== moduleId))} />{moduleId}</label>)}</div></td>
    <td><label className="admin-inline-field">Jobs<input aria-label={`Concurrent jobs for ${user.username}`} type="number" min={1} value={concurrency} onChange={(event) => setConcurrency(Number(event.target.value))} /></label><label className="admin-inline-field">GiB<input aria-label={`Quota for ${user.username}`} type="number" min={0.1} step={0.1} value={quotaGiB} onChange={(event) => setQuotaGiB(Number(event.target.value))} /></label><small>{formatBytes(user.storageQuotaBytes)}</small></td>
    <td><button type="button" className={user.enabled && !user.deletedAt ? "admin-state admin-state--on" : "admin-state"} disabled={busy || Boolean(user.deletedAt)} onClick={() => { void patch(user, { enabled: !user.enabled }, `${user.username} ${user.enabled ? "disabled" : "enabled"}.`); }}>{user.enabled ? "Enabled" : "Disabled"}</button></td>
    <td>{formatDate(user.createdAt)}</td>
    <td><div className="admin-row-actions"><Link to={`/admin/jobs?ownerId=${encodeURIComponent(user.id)}`}>Jobs</Link><Link to={`/admin/results?ownerId=${encodeURIComponent(user.id)}`}>Results</Link><button type="button" disabled={busy || !modules.length} onClick={() => { void patch(user, { role, allowedModules: modules, maxConcurrentJobs: concurrency, storageQuotaBytes: Math.round(quotaGiB * 1024 ** 3) }, `Updated ${user.username}.`); }}>Save</button><label className="admin-reset">Reset password<input type="password" minLength={12} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} /><button type="button" disabled={busy || password.length < 12} onClick={() => { void patch(user, { password }, `Password reset for ${user.username}.`); setPassword(""); }}>Reset</button></label><button className="admin-danger" type="button" disabled={busy || Boolean(user.deletedAt)} onClick={() => { if (window.confirm(`Soft-delete ${user.username}? Their audit history is retained.`)) void patch(user, { enabled: false, delete: true }, `Soft-deleted ${user.username}.`); }}>Delete</button></div></td>
  </tr>;
}
