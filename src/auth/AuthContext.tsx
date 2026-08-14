import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import type { AuthMeV1, UserRecordV1 } from "../../shared/contracts/v1";
import {
  apiJsonBody,
  apiRequest,
  READ_ONLY_DEMO,
  setApiCsrfToken,
} from "../api/client";

interface AuthContextValue {
  user: UserRecordV1 | null;
  loading: boolean;
  readOnlyDemo: boolean;
  login(username: string, password: string): Promise<void>;
  logout(): Promise<void>;
  refresh(): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren): JSX.Element {
  const [user, setUser] = useState<UserRecordV1 | null>(null);
  const [loading, setLoading] = useState(!READ_ONLY_DEMO);

  const acceptAuth = useCallback((auth: AuthMeV1 | null): void => {
    setUser(auth?.user ?? null);
    setApiCsrfToken(auth?.csrfToken ?? null);
  }, []);

  const refresh = useCallback(async (): Promise<void> => {
    if (READ_ONLY_DEMO) {
      acceptAuth(null);
      setLoading(false);
      return;
    }
    try {
      const response = await apiRequest<AuthMeV1>("/auth/me");
      acceptAuth(response.data);
    } catch {
      acceptAuth(null);
    } finally {
      setLoading(false);
    }
  }, [acceptAuth]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(async (username: string, password: string): Promise<void> => {
    if (READ_ONLY_DEMO) throw new Error("Login is unavailable in the read-only demo.");
    const response = await apiRequest<AuthMeV1>("/auth/login", {
      method: "POST",
      body: apiJsonBody({ username, password }),
    });
    acceptAuth(response.data);
  }, [acceptAuth]);

  const logout = useCallback(async (): Promise<void> => {
    if (!READ_ONLY_DEMO) {
      await apiRequest<null>("/auth/logout", { method: "POST" });
    }
    acceptAuth(null);
  }, [acceptAuth]);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    loading,
    readOnlyDemo: READ_ONLY_DEMO,
    login,
    logout,
    refresh,
  }), [loading, login, logout, refresh, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
