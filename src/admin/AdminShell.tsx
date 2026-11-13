import type { PropsWithChildren } from "react";
import { NavLink } from "react-router-dom";

const SECTIONS = [
  ["", "Overview"], ["users", "Users"], ["jobs", "Jobs"], ["results", "Results"],
  ["tools", "Tools"], ["technology", "Technology"], ["audit", "Audit"],
] as const;

export function AdminShell({ children }: PropsWithChildren): JSX.Element {
  return (
    <div className="admin-page">
      <header className="admin-page__header"><p>Operations</p><h1>Administration</h1><span>Persistent configuration, execution, and governance.</span></header>
      <div className="admin-layout">
        <nav className="admin-nav" aria-label="Administration sections">{SECTIONS.map(([path, label]) => <NavLink end={!path} to={`/admin${path ? `/${path}` : ""}`} key={label}>{label}</NavLink>)}</nav>
        <main className="admin-content">{children}</main>
      </div>
    </div>
  );
}

