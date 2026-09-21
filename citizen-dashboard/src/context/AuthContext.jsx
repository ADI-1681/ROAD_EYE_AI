import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { AUTH_TOKEN_KEY, USER_STORAGE_KEY } from '../constants/app';

const AuthContext = createContext(null);

const normalizeCitizenUser = (userData) => {
  if (!userData || typeof userData !== 'object') {
    return null;
  }

  return {
    ...userData,
    name: userData.name || 'Citizen',
    phone: userData.phone || '',
    aadhaarLast4: userData.aadhaarLast4 || '',
    ward: userData.ward || 'Not provided',
  };
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem(USER_STORAGE_KEY);
    return storedUser ? normalizeCitizenUser(JSON.parse(storedUser)) : null;
  });

  const [token, setToken] = useState(() => localStorage.getItem(AUTH_TOKEN_KEY) || '');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem(USER_STORAGE_KEY);
    const storedToken = localStorage.getItem(AUTH_TOKEN_KEY);

    if (storedUser) {
      setUser(normalizeCitizenUser(JSON.parse(storedUser)));
    }

    if (storedToken) {
      setToken(storedToken);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    if (user) {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(USER_STORAGE_KEY);
    }
  }, [user]);

  useEffect(() => {
    if (token) {
      localStorage.setItem(AUTH_TOKEN_KEY, token);
    } else {
      localStorage.removeItem(AUTH_TOKEN_KEY);
    }
  }, [token]);

  const login = (userData, authToken) => {
    setUser(normalizeCitizenUser(userData));
    setToken(authToken);
  };

  const logout = () => {
    setUser(null);
    setToken('');
  };

  const value = useMemo(
    () => ({ user, token, loading, login, logout, isAuthenticated: Boolean(user && token) }),
    [user, token, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}
