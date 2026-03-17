import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { setAuthToken } from '../lib/api';

const AuthContext = createContext(null);

const TOKEN_KEY = 'nuvovet_token';
const USER_KEY  = 'nuvovet_user';
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'admin';
const LOCAL_TOKEN = 'nuvovet-admin-session';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem(USER_KEY)); } catch { return null; }
  });
  const [token, setToken] = useState(() => {
    try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
  });
  const [loading, setLoading] = useState(true);

  const _setAuth = useCallback((data) => {
    setToken(data.access_token);
    setUser({ username: data.username });
    setAuthToken(data.access_token);
    try {
      localStorage.setItem(TOKEN_KEY, data.access_token);
      localStorage.setItem(USER_KEY, JSON.stringify({ username: data.username }));
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

  // Validate stored token on mount
  useEffect(() => {
    const storedToken = (() => { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } })();
    const storedUser = (() => {
      try { return JSON.parse(localStorage.getItem(USER_KEY)); } catch { return null; }
    })();

    if (storedToken === LOCAL_TOKEN && storedUser?.username === ADMIN_USERNAME) {
      setAuthToken(storedToken);
      setToken(storedToken);
      setUser({ username: ADMIN_USERNAME });
    } else if (storedToken || storedUser) {
      _clearAuth();
    }

    setLoading(false);
  }, [_clearAuth]);

  const login = useCallback(async (username, password) => {
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      _setAuth({ access_token: LOCAL_TOKEN, username: ADMIN_USERNAME });
      return { ok: true };
    }

    return { ok: false, error: 'Invalid username or password' };
  }, [_setAuth]);

  const signup = useCallback(async () => {
    return { ok: false, error: 'Sign up is available from the pricing page' };
  }, []);

  const logout = useCallback(() => {
    _clearAuth();
  }, [_clearAuth]);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, signup, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
