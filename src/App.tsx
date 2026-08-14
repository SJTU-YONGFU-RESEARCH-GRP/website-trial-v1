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
              <span className="app-header__user">{user.username}</span>
              <button type="button" onClick={() => { void logout(); }}>Log out</button>
            </>
          ) : <NavLink to="/login">Log in</NavLink>)}
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
          to="/plotly"
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
        <NavLink
          to="/analog"
          className={({ isActive }) => (isActive ? "active" : "")}
        >
          Analog
        </NavLink>
        {user ? <NavLink to="/jobs" className={({ isActive }) => (isActive ? "active" : "")}>My Jobs</NavLink> : null}
        {user?.role === "admin" ? <NavLink to="/admin" className={({ isActive }) => (isActive ? "active" : "")}>Admin</NavLink> : null}
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
            <Route path="/plotly" element={<PlotlyPage />} />
            <Route path="/ppa" element={<PpaPage />} />
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
