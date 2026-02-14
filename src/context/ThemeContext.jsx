
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

const ThemeContext = createContext();

export const THEME_PRESETS = [
  { name: 'Purple', color: '#7C3AED' },
  { name: 'Pink', color: '#EC4899' },
  { name: 'Rose', color: '#E11D48' },
  { name: 'Orange', color: '#F97316' },
  { name: 'Green', color: '#10B981' },
  { name: 'Blue', color: '#3B82F6' },
  { name: 'Cyan', color: '#06B6D4' },
  { name: 'Slate', color: '#64748B' },
];

export function ThemeProvider({ children, tenantId }) {
  const [themeColor, setThemeColor] = useState(THEME_PRESETS[0].color);
  
  useEffect(() => {
    if (tenantId) {
      loadTenantTheme(tenantId);
    }
  }, [tenantId]);

  const loadTenantTheme = async (tid) => {
    try {
      const { data, error } = await supabase
        .from('tenants')
        .select('theme_color')
        .eq('id', tid)
        .single();
        
      if (data && data.theme_color) {
        setThemeColor(data.theme_color);
      }
    } catch (err) {
      console.error('Failed to load theme:', err);
    }
  };

  return (
    <ThemeContext.Provider value={{ themeColor, setThemeColor, tenantId }}>
      <div style={{ '--primary-color': themeColor }}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
