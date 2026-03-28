"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { staffApiFetch } from "@/lib/api/auth/staff/api-fetch";
import {
  STAFF_PORTAL,
  type StaffSession,
  type StaffSessionResponse,
  type UseStaffSessionResult,
} from "@/features/auth/types";

const ACCESS_TOKEN_KEY = "staff_access_token";
const AUTH_USER_KEY = "staff_auth_user";

type UseStaffSessionOptions = {
  redirectToLogin?: boolean;
};

function isStoredStaffSession(value: unknown): value is StaffSession {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<StaffSession>;

  return (
    candidate.portal === STAFF_PORTAL &&
    typeof candidate.id === "string" &&
    typeof candidate.email === "string" &&
    typeof candidate.role === "string" &&
    typeof candidate.roleLabel === "string" &&
    Array.isArray(candidate.assignedRoles) &&
    Array.isArray(candidate.permissions) &&
    typeof candidate.status === "string"
  );
}

function readStoredSession(): StaffSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(AUTH_USER_KEY);

  if (!raw) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(raw);

    if (isStoredStaffSession(parsed)) {
      return parsed;
    }
  } catch {
    // Ignore malformed session cache and fall through to cleanup.
  }

  window.localStorage.removeItem(AUTH_USER_KEY);
  return null;
}

export function useStaffSession(
  options: UseStaffSessionOptions = {},
): UseStaffSessionResult {
  const { redirectToLogin = true } = options;
  const router = useRouter();
  const hasInitializedRef = useRef(false);
  const inFlightRefreshRef = useRef<Promise<StaffSession | null> | null>(null);
  const isMountedRef = useRef(true);
  const [session, setSession] = useState<StaffSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const clearSession = useCallback(() => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
    setSession(null);
  }, []);

  const refreshSession = useCallback(async (): Promise<StaffSession | null> => {
    if (inFlightRefreshRef.current) {
      return inFlightRefreshRef.current;
    }

    const refreshPromise = (async () => {
      const storedSession = readStoredSession();

      if (isMountedRef.current) {
        setError(null);
        setIsLoading(storedSession == null);

        if (storedSession) {
          setSession(storedSession);
        }
      }

      try {
        const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);

        if (!accessToken) {
          clearSession();
          if (redirectToLogin) {
            router.replace("/login/staff");
          }
          return null;
        }

        const res = await staffApiFetch("/api/staff/me", {
          method: "GET",
          auth: true,
        });

        const data: StaffSessionResponse = await res.json().catch(() => ({
          ok: false,
          message: "Erreur lors de la lecture de la reponse",
        }));

        if (!res.ok || !data.ok || !data.user) {
          const message = data.message ?? "Session staff introuvable";

          if (res.status === 401 || res.status === 403) {
            clearSession();
            if (redirectToLogin) {
              router.replace("/login/staff");
            }
            return null;
          }

          if (isMountedRef.current) {
            setError(message);
          }

          return storedSession;
        }

        if (data.user.portal !== STAFF_PORTAL) {
          clearSession();
          if (redirectToLogin) {
            router.replace("/login/staff");
          }
          return null;
        }

        setSession(data.user);
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(data.user));
        return data.user;
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Erreur inattendue";

        if (isMountedRef.current) {
          setError(message);
          if (storedSession) {
            setSession(storedSession);
          }
        }

        return storedSession;
      } finally {
        inFlightRefreshRef.current = null;
        if (isMountedRef.current) {
          setIsLoading(false);
        }
      }
    })();

    inFlightRefreshRef.current = refreshPromise;
    return refreshPromise;
  }, [clearSession, redirectToLogin, router]);

  useEffect(() => {
    if (hasInitializedRef.current) {
      return;
    }

    hasInitializedRef.current = true;
    const storedSession = readStoredSession();

    if (storedSession) {
      setSession(storedSession);
      setIsLoading(false);
    }

    void refreshSession();
  }, [refreshSession]);

  return {
    session,
    user: session,
    isLoading,
    isAuthenticated: !!session,
    error,
    setSession,
    clearSession,
    refreshSession,
  };
}
