import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

const LiffAuthContext = createContext();

export function LiffAuthProvider({ children }) {
  const [liffUser, setLiffUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const [error, setError] = useState(null);

  useEffect(() => {
    // Initialize LIFF SDK
    const initLiff = async () => {
       try {
          if (import.meta.env.VITE_LIFF_ID) {
              if (!window.liff) {
                  throw new Error('LIFF SDK not loaded');
              }
              await liff.init({ liffId: import.meta.env.VITE_LIFF_ID });
              console.log('LIFF Initialized');
              
              if (liff.isLoggedIn()) {
                  const profile = await liff.getProfile();
                  const user = {
                    lineUserId: profile.userId,
                    displayName: profile.displayName,
                    pictureUrl: profile.pictureUrl,
                    isFriend: true,
                    dbId: null
                  };
                  setLiffUser(user);
                  setIsAuthenticated(true);
              } else {
                 if (liff.isInClient()) {
                    // Auto login if in LINE app but not logged in (rare)
                    liff.login();
                    return;
                 }
              }
          } else {
             console.warn('VITE_LIFF_ID is missing');
          }
       } catch (err) {
          console.error('LIFF Init Failed:', err);
          setError(err.message || 'LIFF Initialization Failed');
       }
       setLoading(false);
    };

    // Check local storage first for speed, then init LIFF
    const storedUser = localStorage.getItem('liff_user_session');
    if (storedUser) {
      setLiffUser(JSON.parse(storedUser));
      setIsAuthenticated(true);
    }
    
    initLiff();
  }, []);

  const login = async (mockData) => {
    setLoading(true);

    try {
      // 1. Check if LIFF SDK is available and initialized
      if (typeof liff !== 'undefined' && import.meta.env.VITE_LIFF_ID) {
        if (!liff.isInClient() && !liff.isLoggedIn()) {
           // If in browser (not LINE app) and not logged in, trigger LINE Login
           liff.login();
           return; // Login redirects, so we stop here
        }
        
        // If already logged in or in client
        const profile = await liff.getProfile();
        const user = {
            lineUserId: profile.userId,
            displayName: profile.displayName,
            pictureUrl: profile.pictureUrl,
            isFriend: true, // We assume true or check via API in future
            dbId: null
        };
        
        localStorage.setItem('liff_user_session', JSON.stringify(user));
        setLiffUser(user);
        setIsAuthenticated(true);
        setLoading(false);
        return;
      }
    } catch (error) {
       console.error('LIFF Login Error:', error);
       // Fallback to mock login if LIFF fails or not present
    }

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
    <LiffAuthContext.Provider value={{ liffUser, isAuthenticated, loading, login, logout, error }}>
      {children}
    </LiffAuthContext.Provider>
  );
}

export function useLiffAuth() {
  return useContext(LiffAuthContext);
}
