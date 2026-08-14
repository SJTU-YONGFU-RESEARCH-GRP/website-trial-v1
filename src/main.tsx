import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, HashRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./auth/AuthContext";
import { RootErrorBoundary } from "./components/RootErrorBoundary";
import { ThemeProvider } from "./theme/ThemeContext";
import "./index.css";

const rootEl = document.getElementById("root");
if (!rootEl) {
  throw new Error("Missing #root element");
}

const Router = import.meta.env.VITE_READ_ONLY_DEMO === "true"
  ? HashRouter
  : BrowserRouter;

createRoot(rootEl).render(
  <StrictMode>
    <RootErrorBoundary>
      <Router>
        <ThemeProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </ThemeProvider>
      </Router>
    </RootErrorBoundary>
  </StrictMode>,
);
