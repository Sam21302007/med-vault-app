import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { apiClient, checkBackendStatus } from '../api/apiClient';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dbConnected, setDbConnected] = useState(false);

  const checkConnection = useCallback(async () => {
    const isOnline = await checkBackendStatus();
    setDbConnected(isOnline);
    if (isOnline) {
      const currentUser = await apiClient.getProfile();
      if (currentUser) {
        setUser(currentUser);
        setProfile(currentUser);
      }
    }
    return isOnline;
  }, []);

  useEffect(() => {
    const initializeAuth = async () => {
      await checkConnection();
      setLoading(false);
    };

    initializeAuth();
  }, [checkConnection]);

  // Polling mechanism: if db is disconnected, auto-retry every 3 seconds
  useEffect(() => {
    let intervalId;
    if (!dbConnected) {
      intervalId = setInterval(async () => {
        const isOnline = await checkConnection();
        if (isOnline) {
          clearInterval(intervalId);
        }
      }, 3000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [dbConnected, checkConnection]);

  const retryConnection = async () => {
    return await checkConnection();
  };

  const signUp = async (email, password, profileData) => {
    try {
      const data = await apiClient.register(email, password, profileData);
      setUser(data.user);
      setProfile(data.user);
      await checkConnection();
      return data;
    } catch (err) {
      throw err;
    }
  };

  const signIn = async (email, password) => {
    try {
      const data = await apiClient.login(email, password);
      setUser(data.user);
      setProfile(data.user);
      await checkConnection();
      return data;
    } catch (err) {
      throw err;
    }
  };

  const signOut = async () => {
    apiClient.logout();
    setUser(null);
    setProfile(null);
  };

  // Keep compatibility with old code that expects isConfigured
  const isConfigured = dbConnected;

  return (
    <AuthContext.Provider value={{ user, profile, loading, signUp, signIn, signOut, isConfigured, retryConnection }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
