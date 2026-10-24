import { useState, type FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import "../jobs.css";

function safeDestination(search: string): string {
  const target = new URLSearchParams(search).get("next");
  return target?.startsWith("/") && !target.startsWith("//") ? target : "/jobs";
}

export function LoginPage(): JSX.Element {
  const { user, loading, login, readOnlyDemo } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!loading && user) return <Navigate to={safeDestination(location.search)} replace />;

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await login(username.trim(), password);
      navigate(safeDestination(location.search), { replace: true });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : String(requestError));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-layout">
      <section className="login-card" aria-labelledby="login-title">
        <div className="login-card__mark" aria-hidden="true">EDA</div>
        <h1 id="login-title">Sign in for a private workspace</h1>
        <p>Benchmark, Digital, and PPA run without login. Sign in only for a private job workspace or administration.</p>
        {readOnlyDemo ? <div className="jobs-notice jobs-notice--warning">This deployment is a read-only published-results demo. Computation and sign-in are disabled.</div> : null}
        <form onSubmit={(event) => { void submit(event); }}>
          <label>Username<input autoComplete="username" required value={username} onChange={(event) => setUsername(event.target.value)} disabled={submitting || readOnlyDemo} /></label>
          <label>Password<input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} disabled={submitting || readOnlyDemo} /></label>
          {error ? <p className="jobs-error" role="alert">{error}</p> : null}
          <button className="jobs-primary-button login-submit" type="submit" disabled={submitting || readOnlyDemo || !username.trim() || !password}>
            <span>{submitting ? "Signing in…" : "Sign in"}</span>
            <svg className="login-submit__icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
          </button>
        </form>
        <p className="login-card__footnote">Accounts are created by an administrator. There is no public registration.</p>
      </section>
    </div>
  );
}
