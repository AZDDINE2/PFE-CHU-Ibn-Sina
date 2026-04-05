import React, { createContext, useContext, useState } from 'react';
import axios from 'axios';

interface User { username: string; token: string; role: string; }
interface AuthCtx { user: User | null; login: (u: string, p: string) => Promise<void>; logout: () => void; }

const AuthContext = createContext<AuthCtx>({ user: null, login: async () => {}, logout: () => {} });

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // No localStorage persistence — login required on every fresh launch
  const [user, setUser] = useState<User | null>(null);

  const login = async (username: string, password: string) => {
    const res = await axios.post('/api/auth/login', { username, password });
    const u: User = { username: res.data.username, token: res.data.token, role: res.data.role };
    localStorage.setItem('token', u.token);
    setUser(u);
  };

  const logout = () => {
    if (user) axios.post('/api/auth/logout', {}, { headers: { Authorization: `Bearer ${user.token}` } }).catch(() => {});
    localStorage.removeItem('token');
    setUser(null);
  };

  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
