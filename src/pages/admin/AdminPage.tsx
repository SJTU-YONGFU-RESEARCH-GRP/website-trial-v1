import { Navigate, useLocation } from "react-router-dom";
import { AdminShell } from "../../admin/AdminShell";
import { AuditPanel } from "../../admin/AuditPanel";
import { JobsPanel } from "../../admin/JobsPanel";
import { OverviewPanel } from "../../admin/OverviewPanel";
import { ResultsPanel } from "../../admin/ResultsPanel";
import { TechnologyPanel } from "../../admin/TechnologyPanel";
import { ToolsPanel } from "../../admin/ToolsPanel";
import { UsersPanel } from "../../admin/UsersPanel";
import { useAuth } from "../../auth/AuthContext";
import "../../admin.css";

const PANELS: Record<string, () => JSX.Element> = {
  "": OverviewPanel, users: UsersPanel, jobs: JobsPanel, results: ResultsPanel,
  tools: ToolsPanel, technology: TechnologyPanel, audit: AuditPanel,
};

export function AdminPage(): JSX.Element {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="admin-page"><p>Checking administrator session…</p></div>;
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  if (user.role !== "admin") return <Navigate to="/jobs" replace />;
  const section = location.pathname.replace(/^\/admin\/?/, "").split("/")[0];
  const Panel = PANELS[section];
  if (!Panel) return <Navigate to="/admin" replace />;
  return <AdminShell><Panel /></AdminShell>;
}

