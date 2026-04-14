import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';

interface User { username: string; token: string; role: string; exp: number; }

interface AuthCtx {
  user:         User | null;
  login:        (u: string, p: string) => Promise<void>;
  logout:       () => void;
  refreshToken: () => Promise<void>;
  secondsLeft:  number;
}

/** Décode un JWT sans librairie (base64 standard) */
function decodeJWT(token: string): { sub: string; role: string; exp: number; iat: number } | null {
  try {
    const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(b64));
  } catch {
    return null;
  }
}

const AuthContext = createContext<AuthCtx>({
  user: null,
  login: async () => {},
  logout: () => {},
  refreshToken: async () => {},
  secondsLeft: 0,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user,        setUser]        = useState<User | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);

  const refreshTimerRef = useRef<ReturnType<typeof setTimeout>  | null>(null);
  const countdownRef    = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimers = useCallback(() => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    if (countdownRef.current)    clearInterval(countdownRef.current);
  }, []);

  /** Lance le compte à rebours + renouvellement automatique 10 min avant expiry */
  const setupTimers = useCallback((token: string, exp: number, userData: User) => {
    clearTimers();

    const remaining = () => Math.floor(exp - Date.now() / 1000);
    if (remaining() <= 0) return;

    setSecondsLeft(remaining());

    // ── Compte à rebours secondes ────────────────────────────────────
    countdownRef.current = setInterval(() => {
      const r = remaining();
      if (r <= 0) {
        clearTimers();
        localStorage.removeItem('token');
        setUser(null);
        setSecondsLeft(0);
      } else {
        setSecondsLeft(r);
      }
    }, 1000);

    // ── Renouvellement automatique 10 min avant expiry ───────────────
    const msBeforeRefresh = Math.max(0, (remaining() - 10 * 60) * 1000);
    if (msBeforeRefresh > 0) {
      refreshTimerRef.current = setTimeout(async () => {
        try {
          const res = await axios.post('/api/auth/refresh', {},
            { headers: { Authorization: `Bearer ${token}` } }
          );
          const newToken = res.data.token;
          const decoded  = decodeJWT(newToken);
          if (!decoded) return;
          const newUser: User = { ...userData, token: newToken, exp: decoded.exp };
          localStorage.setItem('token', newToken);
          setUser(newUser);
          setupTimers(newToken, decoded.exp, newUser);
        } catch { /* le token expirera naturellement */ }
      }, msBeforeRefresh);
    }
  }, [clearTimers]); // eslint-disable-line

  // ── Restauration de session au démarrage ──────────────────────────
  useEffect(() => {
    const saved = localStorage.getItem('token');
    if (!saved) return;

    const decoded = decodeJWT(saved);
    if (!decoded) { localStorage.removeItem('token'); return; }

    if (decoded.exp <= Math.floor(Date.now() / 1000)) {
      localStorage.removeItem('token');   // token expiré
      return;
    }

    const restored: User = {
      username: decoded.sub,
      token:    saved,
      role:     decoded.role,
      exp:      decoded.exp,
    };
    setUser(restored);
    setupTimers(saved, decoded.exp, restored);
  }, []); // eslint-disable-line

  useEffect(() => () => clearTimers(), [clearTimers]);

  // ── Login ─────────────────────────────────────────────────────────
  const login = async (username: string, password: string) => {
    const res     = await axios.post('/api/auth/login', { username, password });
    const decoded = decodeJWT(res.data.token);
    if (!decoded) throw new Error('Token invalide');

    const u: User = {
      username: res.data.username,
      token:    res.data.token,
      role:     res.data.role,
      exp:      decoded.exp,
    };
    localStorage.setItem('token', u.token);
    setUser(u);
    setupTimers(u.token, u.exp, u);
  };

  // ── Logout ────────────────────────────────────────────────────────
  const logout = () => {
    if (user) {
      axios.post('/api/auth/logout', {},
        { headers: { Authorization: `Bearer ${user.token}` } }
      ).catch(() => {});
    }
    clearTimers();
    localStorage.removeItem('token');
    setUser(null);
    setSecondsLeft(0);
  };

  // ── Renouvellement manuel ─────────────────────────────────────────
  const refreshToken = async () => {
    if (!user) return;
    const res     = await axios.post('/api/auth/refresh', {},
      { headers: { Authorization: `Bearer ${user.token}` } }
    );
    const decoded = decodeJWT(res.data.token);
    if (!decoded) return;
    const newUser: User = { ...user, token: res.data.token, exp: decoded.exp };
    localStorage.setItem('token', newUser.token);
    setUser(newUser);
    setupTimers(newUser.token, newUser.exp, newUser);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, refreshToken, secondsLeft }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
