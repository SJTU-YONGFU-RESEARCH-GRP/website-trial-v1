import type { ReactElement } from "react";
import { lazy, Suspense } from "react";
import { Navigate, NavLink, Route, Routes } from "react-router-dom";
import { ThemeToggle } from "./components/ThemeToggle";
import { HomePage } from "./pages/HomePage";
import { useAuth } from "./auth/AuthContext";

const PlotlyPage = lazy(async () => ({
  default: (await import("./pages/PlotlyPage")).PlotlyPage,
}));
const AnalogPage = lazy(async () => ({
  default: (await import("./pages/AnalogPage")).AnalogPage,
}));
const SpiceBenchmarkPage = lazy(async () => ({
  default: (await import("./pages/SpiceBenchmarkPage")).SpiceBenchmarkPage,
}));
const PpaPage = lazy(async () => ({
  default: (await import("./pages/PpaPage")).PpaPage,
}));
const AcgPage = lazy(async () => ({ default: (await import("./pages/acg/AcgPage")).AcgPage }));
const LoginPage = lazy(async () => ({ default: (await import("./pages/LoginPage")).LoginPage }));
const JobsPage = lazy(async () => ({ default: (await import("./pages/JobsPage")).JobsPage }));
const JobDetailPage = lazy(async () => ({ default: (await import("./pages/JobDetailPage")).JobDetailPage }));
const ResultDetailPage = lazy(async () => ({ default: (await import("./pages/ResultDetailPage")).ResultDetailPage }));
const AdminPage = lazy(async () => ({ default: (await import("./pages/admin/AdminPage")).AdminPage }));

export default function App(): ReactElement {
  const { user, loading, logout, readOnlyDemo } = useAuth();
  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header__titles">
          <h1>Design Analytics</h1>
        </div>
        <div className="app-header__actions">
          {!loading && !readOnlyDemo && (user ? (
            <>
              <NavLink
                className="app-header__user"
                to={user.role === "admin" ? "/admin" : "/jobs"}
                aria-label={`${user.username} account`}
              >
                {user.username}
              </NavLink>
              <button className="app-header__auth-control" type="button" onClick={() => { void logout(); }}>Log out</button>
            </>
          ) : <NavLink className="app-header__auth-control" to="/login">Log in</NavLink>)}
          <ThemeToggle />
        </div>
      </header>
      <nav>
        <NavLink
          to="/"
          end
          className={({ isActive }) => (isActive ? "active" : "")}
        >
          Home
        </NavLink>
        <NavLink
          to="/benchmark"
          className={({ isActive }) => (isActive ? "active" : "")}
        >
          Benchmark
        </NavLink>
        <NavLink
          to="/digital"
          className={({ isActive }) => (isActive ? "active" : "")}
        >
          Digital
        </NavLink>
        <NavLink
          to="/ppa"
          className={({ isActive }) => (isActive ? "active" : "")}
        >
          PPA
        </NavLink>
        <NavLink to="/acg" className={({ isActive }) => (isActive ? "active" : "")}>AutoCellGen</NavLink>
        <NavLink
          to="/analog"
          className={({ isActive }) => (isActive ? "active" : "")}
        >
          Analog
        </NavLink>
        <NavLink to="/jobs" className={({ isActive }) => `nav__jobs${isActive ? " active" : ""}`}>Jobs</NavLink>
      </nav>
      {readOnlyDemo ? <div className="read-only-banner">Read-only published-results demo — uploads and computation are disabled.</div> : null}
      <main>
        <Suspense
          fallback={
            <div className="chart-card">
              <p className="hint">Loading chart library…</p>
            </div>
          }
        >
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/flow" element={<Navigate to="/" replace />} />
            <Route path="/benchmark" element={<SpiceBenchmarkPage />} />
            <Route path="/digital" element={<PlotlyPage />} />
            <Route path="/plotly" element={<Navigate to="/digital" replace />} />
            <Route path="/ppa" element={<PpaPage />} />
            <Route path="/acg" element={<AcgPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/jobs" element={<JobsPage />} />
            <Route path="/jobs/:jobId" element={<JobDetailPage />} />
            <Route path="/results/:module/:resultId" element={<ResultDetailPage />} />
            <Route path="/admin/*" element={<AdminPage />} />
            <Route path="/upload-processing/:jobId" element={<Navigate to="/jobs" replace />} />
            <Route path="/analog" element={<AnalogPage />} />
            {/* Legacy redirects (goal.md §4.1) */}
            <Route path="/translator" element={<Navigate to="/benchmark?operation=translator" replace />} />
            <Route path="/reduction" element={<Navigate to="/benchmark?operation=reduction" replace />} />
            <Route path="/expansion" element={<Navigate to="/benchmark?operation=expansion" replace />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  );
}
