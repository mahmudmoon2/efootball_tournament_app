import { createContext, useContext, useEffect, useState } from 'react';
import { api } from './api.js';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(
    () =>
      api.onAuth((u) => {
        setUser(u);
        setReady(true);
      }),
    []
  );

  const value = {
    user,
    ready,
    isAdmin: !!user?.isAdmin,
    login: (username, password) => api.login(username, password),
    logout: () => api.logout(),
  };
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);
