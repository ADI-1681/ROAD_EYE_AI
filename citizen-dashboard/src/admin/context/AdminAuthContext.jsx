import { createContext, useContext, useMemo, useState } from 'react';
import { ADMIN_TOKEN_KEY, ADMIN_USER_KEY } from '../../shared/constants';

const AdminAuthContext = createContext(null);

export function AdminAuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem(ADMIN_USER_KEY);
    return storedUser ? JSON.parse(storedUser) : null;
  });

  const [token, setToken] = useState(() => localStorage.getItem(ADMIN_TOKEN_KEY) || '');

  const login = (userData, authToken) => {
    if (!userData || userData.role !== 'admin') {
      throw new Error('Not authorized');
    }

    setUser(userData);
    setToken(authToken);
    localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(userData));
    localStorage.setItem(ADMIN_TOKEN_KEY, authToken);
  };

  const logout = () => {
    setUser(null);
    setToken('');
    localStorage.removeItem(ADMIN_USER_KEY);
    localStorage.removeItem(ADMIN_TOKEN_KEY);
  };

  const value = useMemo(
    () => ({
      user,
      token,
      login,
      logout,
      isAuthenticated: Boolean(user && token),
      isAdmin: user?.role === 'admin',
    }),
    [user, token],
  );

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);

  if (!context) {
    throw new Error('useAdminAuth must be used within AdminAuthProvider');
  }

  return context;
}
