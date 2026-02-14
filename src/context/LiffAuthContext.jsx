import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

const LiffAuthContext = createContext();

export function LiffAuthProvider({ children }) {
  const [liffUser, setLiffUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check local storage for existing session (Simulate persistent login)
    const storedUser = localStorage.getItem('liff_user_session');
    if (storedUser) {
      setLiffUser(JSON.parse(storedUser));
      setIsAuthenticated(true);
    }
    setLoading(false);
  }, []);

  const login = async (mockData) => {
    setLoading(true);
    // Simulate API call / LINE Login delay
    await new Promise(resolve => setTimeout(resolve, 800));

    // Mock User Data Structure (mimicking LINE Profile + DB ID)
    const user = {
      lineUserId: mockData?.userId || 'U1234567890abcdef1234567890abcdef',
      displayName: mockData?.displayName || 'Amy',
      pictureUrl: mockData?.pictureUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Amy',
      isFriend: true, // Simulate "Is Friend" status
      dbId: null // Will be populated after syncing with DB
    };

    // TODO: Sync with Supabase 'customers' table here
    // For now, we just set the state
    
    localStorage.setItem('liff_user_session', JSON.stringify(user));
    setLiffUser(user);
    setIsAuthenticated(true);
    setLoading(false);
  };

  const logout = () => {
    localStorage.removeItem('liff_user_session');
    setLiffUser(null);
    setIsAuthenticated(false);
  };

  return (
    <LiffAuthContext.Provider value={{ liffUser, isAuthenticated, loading, login, logout }}>
      {children}
    </LiffAuthContext.Provider>
  );
}

export function useLiffAuth() {
  return useContext(LiffAuthContext);
}
