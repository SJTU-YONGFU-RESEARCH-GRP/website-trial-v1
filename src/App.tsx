import type { ReactElement } from "react";
import { lazy, Suspense } from "react";
import { Navigate, NavLink, Route, Routes } from "react-router-dom";
import { ThemeToggle } from "./components/ThemeToggle";
import { HomePage } from "./pages/HomePage";

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
const UploadProcessingPage = lazy(async () => ({
  default: (await import("./pages/UploadProcessingPage")).UploadProcessingPage,
}));

export default function App(): ReactElement {
  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header__titles">
          <h1>Design Analytics</h1>
        </div>
        <ThemeToggle />
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
      </nav>
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
            <Route path="/upload-processing/:jobId" element={<UploadProcessingPage />} />
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
