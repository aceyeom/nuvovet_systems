import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { setAuthToken } from '../lib/api';

const AuthContext = createContext(null);

const GUEST_USER = {
  username: 'Guest',
  plan: 'free',
  plan_status: 'trial_not_started',
  account_valid_until: null,
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(GUEST_USER);
  const [loading] = useState(false);
  const token = null;

  useEffect(() => {
    // Keep API calls in public mode by default.
    setAuthToken(null);
  }, []);

  const login = useCallback(async (email) => {
    const normalized = (email || '').trim();
    if (normalized) {
      setUser((prev) => ({
        ...(prev || GUEST_USER),
        username: normalized,
      }));
    }
    return { ok: true };
  }, []);

  const signup = useCallback(async (email) => {
    const normalized = (email || '').trim();
    if (normalized) {
      setUser((prev) => ({
        ...(prev || GUEST_USER),
        username: normalized,
      }));
    }
    return { ok: true };
  }, []);

  const logout = useCallback(() => {
    setUser(GUEST_USER);
    setAuthToken(null);
  }, []);

  const startTrial = useCallback(async () => {
    setUser((prev) => ({
      ...(prev || GUEST_USER),
      plan: 'free',
      plan_status: 'active',
    }));
    return { ok: true };
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, signup, startTrial, isAuthenticated: true }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
