import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { setAuthToken } from '../lib/api';

const AuthContext = createContext(null);

const TOKEN_KEY = 'nuvovet_token';
const USER_KEY  = 'nuvovet_user';
const BASE_URL = import.meta.env.VITE_API_URL || 'https://nuvovet-systems.onrender.com';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem(USER_KEY)); } catch { return null; }
  });
  const [token, setToken] = useState(() => {
    try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
  });
  const [loading, setLoading] = useState(true);

  const _setAuth = useCallback((data) => {
    const userPayload = {
      username: data.username,
      plan: data.plan || 'free',
      plan_status: data.plan_status || 'trial_not_started',
      account_valid_until: data.account_valid_until || null,
    };
    setToken(data.access_token);
    setUser(userPayload);
    setAuthToken(data.access_token);
    try {
      localStorage.setItem(TOKEN_KEY, data.access_token);
      localStorage.setItem(USER_KEY, JSON.stringify(userPayload));
    } catch { /* quota exceeded */ }
  }, []);

  const _clearAuth = useCallback(() => {
    setToken(null);
    setUser(null);
    setAuthToken(null);
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    } catch { /* ignore */ }
  }, []);

  // Validate stored token on mount.
  // Immediately trust locally cached user so the UI loads without waiting for Render.
  // Background-validate with a 6s timeout — only clear auth on a definitive 401.
  useEffect(() => {
    const storedToken = (() => { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } })();
    if (!storedToken) { setLoading(false); return; }

    setAuthToken(storedToken);
    // Show cached user immediately — don't block on network
    setLoading(false);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);

    fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${storedToken}` },
      signal: controller.signal,
    })
      .then(r => (r.ok ? r.json() : r.status === 401 ? { _unauthorized: true } : null))
      .then(data => {
        clearTimeout(timer);
        if (data?._unauthorized) {
          // Definitive rejection — clear auth
          _clearAuth();
        } else if (data?.authenticated) {
          // Update with fresh server data
          setUser({
            username: data.username,
            plan: data.plan || 'free',
            plan_status: data.plan_status || 'trial_not_started',
            account_valid_until: data.account_valid_until || null,
          });
          setToken(storedToken);
        }
        // Timeout / network error: keep cached user, try again next page load
      })
      .catch(() => { clearTimeout(timer); });
  }, [_clearAuth]);

  const login = useCallback(async (email, password) => {
    try {
      const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: email, password }),
      });
      const data = await res.json();
      if (!res.ok) return { ok: false, error: data.detail || 'Login failed' };
      _setAuth(data);
      return { ok: true };
    } catch {
      return { ok: false, error: 'Network error — check your connection' };
    }
  }, [_setAuth]);

  const signup = useCallback(async (email, password) => {
    try {
      const res = await fetch(`${BASE_URL}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: email, password }),
      });
      const data = await res.json();
      if (!res.ok) return { ok: false, error: data.detail || 'Sign up failed' };
      _setAuth(data);
      return { ok: true };
    } catch {
      return { ok: false, error: 'Network error — check your connection' };
    }
  }, [_setAuth]);

  const logout = useCallback(() => {
    _clearAuth();
  }, [_clearAuth]);

  const startTrial = useCallback(async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/auth/start-trial`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (!res.ok) return { ok: false, error: data.detail || 'Could not start trial' };

      setUser((prev) => ({
        ...(prev || {}),
        plan: data.plan || prev?.plan || 'free',
        plan_status: data.plan_status || prev?.plan_status || 'active',
        account_valid_until: data.account_valid_until || prev?.account_valid_until || null,
      }));
      return { ok: true };
    } catch {
      return { ok: false, error: 'Network error — check your connection' };
    }
  }, [token]);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, signup, startTrial, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
