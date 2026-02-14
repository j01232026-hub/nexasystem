import { Outlet, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { House, CalendarCheck, Users, Gear } from '@phosphor-icons/react';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import BackgroundDecoration from '../components/ui/BackgroundDecoration';

const DashboardLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initial fetch
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setLoading(false);
    });

    // Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const navItems = [
    { path: '/home', icon: House, label: '首頁' },
    { path: '/calendar', icon: CalendarCheck, label: '行事曆' },
    { path: '/customers', icon: Users, label: '客戶' },
    { path: '/admin', icon: Gear, label: '管理' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-rose-50">
        <BackgroundDecoration />
        {/* Simple Loading Spinner */}
        <div className="w-8 h-8 border-4 border-rose-200 border-t-rose-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="bg-rose-50 min-h-screen font-sans pb-safe overflow-x-hidden relative">
      <BackgroundDecoration />
      
      {/* Content Area - Added padding for safe area and navigation */}
      <div className="min-h-screen pb-24 relative z-10">
        <Outlet context={{ user }} />
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-rose-100 z-50 pb-safe shadow-[0_-4px_20px_-5px_rgba(255,228,230,0.5)]">
        <div className="flex justify-around items-center h-16 max-w-md mx-auto md:max-w-full">
          {navItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-all active:scale-95 ${
                  isActive ? 'text-rose-500' : 'text-slate-400 hover:text-rose-400'
                }`}
              >
                <item.icon weight={isActive ? 'fill' : 'regular'} className={`w-6 h-6 transition-transform ${isActive ? 'scale-110 drop-shadow-sm' : ''}`} />
                <span className={`text-[10px] font-medium tracking-wide ${isActive ? 'font-bold' : ''}`}>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;
