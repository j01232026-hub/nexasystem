
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { useLiffAuth } from '../../context/LiffAuthContext';
import { supabase } from '../../lib/supabaseClient';
import { format, parseISO, differenceInDays } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { Sparkle, CalendarPlus, Clock, ArrowRight, User, Heart } from '@phosphor-icons/react';

const LiffHomePage = () => {
  const { themeColor } = useTheme();
  const { tenantId } = useParams();
  const navigate = useNavigate();
  const { liffUser, loading, error } = useLiffAuth();
  const [galleryPosts, setGalleryPosts] = useState([]);
  const [likedPosts, setLikedPosts] = useState(new Set());
  const [isHeaderSticky, setIsHeaderSticky] = useState(false);
  const heroRef = useRef(null);
  const [heroHeight, setHeroHeight] = useState(0);

  useEffect(() => {
    if (heroRef.current && !isHeaderSticky) {
        setHeroHeight(heroRef.current.offsetHeight);
    }
  }, [liffUser, isHeaderSticky]);

  useEffect(() => {
    fetchGallery();
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [liffUser]);

  const handleScroll = () => {
    if (window.scrollY > 50) {
      setIsHeaderSticky(true);
    } else {
      setIsHeaderSticky(false);
    }
  };

  const fetchGallery = async () => {
    try {
      const { data } = await supabase
        .from('gallery_posts')
        .select(`
          *,
          service_categories(name),
          services(name)
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      
      setGalleryPosts(data || []);

      if (liffUser?.userId) {
        const { data: likes } = await supabase
          .from('gallery_likes')
          .select('post_id')
          .eq('user_id', liffUser.userId);
        
        if (likes) {
          setLikedPosts(new Set(likes.map(l => l.post_id)));
        }
      }
    } catch (err) {
      console.error('Fetch gallery error:', err);
    }
  };

  const toggleLike = async (postId) => {
    if (!liffUser?.userId) return; // Should prompt login in real app

    const isLiked = likedPosts.has(postId);
    const newLiked = new Set(likedPosts);
    
    try {
      if (isLiked) {
        newLiked.delete(postId);
        await supabase.from('gallery_likes').delete().eq('user_id', liffUser.userId).eq('post_id', postId);
      } else {
        newLiked.add(postId);
        await supabase.from('gallery_likes').insert({ user_id: liffUser.userId, post_id: postId });
      }
      setLikedPosts(newLiked);
    } catch (err) {
      console.error('Toggle like error:', err);
    }
  };

  // Redirect to registration if not registered
  useEffect(() => {
    if (!loading && liffUser && !liffUser.isRegistered) {
        navigate(`/liff/${tenantId}/register`, { replace: true });
    }
  }, [loading, liffUser, navigate, tenantId]);

  // Get current hour for greeting
  const currentHour = new Date().getHours();
  let greeting = '早安';
  if (currentHour >= 11 && currentHour < 17) {
    greeting = '午安';
  } else if (currentHour >= 17) {
    greeting = '晚安';
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  // Prevent rendering if not registered (while redirecting)
  if (liffUser && !liffUser.isRegistered) {
      return null; 
  }

  if (error) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6">
            <div className="bg-white p-6 rounded-xl shadow-md max-w-sm w-full text-center">
                <h3 className="text-red-500 font-bold text-lg mb-2">Initialization Error</h3>
                <p className="text-gray-600 mb-4 text-sm">{error}</p>
                <p className="text-xs text-gray-400">LIFF ID: {import.meta.env.VITE_LIFF_ID || 'Not Set'}</p>
                <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm">Retry</button>
            </div>
        </div>
    );
  }

  const displayName = liffUser?.displayName || '訪客';
  const avatarUrl = liffUser?.pictureUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Guest';

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Hero Section Wrapper */}
      <div style={{ height: isHeaderSticky ? heroHeight : 'auto' }} ref={heroRef}>
        <div className={`relative bg-white shadow-sm overflow-hidden transition-all duration-300 z-50 ${isHeaderSticky ? 'fixed top-0 left-0 right-0 rounded-b-xl shadow-md bg-white/90 backdrop-blur-md' : 'rounded-b-[40px]'}`}>
            {/* Decorative Background - Organic Shapes - Hide when sticky */}
            <div className={`absolute top-[-50%] right-[-20%] w-[80%] h-[150%] rounded-[40%] bg-gradient-to-b from-transparent to-white opacity-20 transform rotate-12 z-0 pointer-events-none transition-opacity ${isHeaderSticky ? 'opacity-0' : 'opacity-20'}`} style={{ backgroundColor: themeColor }}></div>
            <div className={`absolute top-[-10%] right-[-10%] w-[60%] h-[80%] rounded-[100%] blur-3xl opacity-15 pointer-events-none transition-opacity ${isHeaderSticky ? 'opacity-0' : 'opacity-15'}`} style={{ backgroundColor: themeColor }}></div>
            <div className={`absolute top-[20%] left-[-10%] w-[40%] h-[40%] rounded-full blur-2xl opacity-5 pointer-events-none transition-opacity ${isHeaderSticky ? 'opacity-0' : 'opacity-5'}`} style={{ backgroundColor: themeColor }}></div>
            
            <div className={`relative z-10 transition-all ${isHeaderSticky ? 'px-4 py-3 flex items-center justify-between' : 'p-6 pt-10 pb-12'}`}>
            <div className={`flex items-center transition-all ${isHeaderSticky ? 'gap-3' : 'justify-between w-full mb-8'}`}>
                
                {/* Sticky Avatar */}
                {isHeaderSticky && (
                    <div className="w-9 h-9 rounded-full p-0.5 shadow-sm bg-white relative shrink-0">
                    <img src={avatarUrl} alt="User" className="w-full h-full rounded-full object-cover" />
                    </div>
                )}

                <div>
                <h1 className={`font-extrabold text-gray-900 tracking-tight transition-all ${isHeaderSticky ? 'text-lg mb-0' : 'text-3xl mb-2'}`}>{greeting}，{displayName}</h1>
                {!isHeaderSticky && (
                    liffUser && !liffUser.isRegistered ? (
                        <div className="inline-block px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-bold animate-pulse">
                            尚未綁定會員
                        </div>
                    ) : (
                        <p className="text-gray-500 text-base font-medium">今天想做點什麼改變呢？</p>
                    )
                )}
                </div>

                {/* Normal Avatar */}
                {!isHeaderSticky && (
                <div className="w-12 h-12 rounded-full p-0.5 shadow-md bg-white relative">
                    <img src={avatarUrl} alt="User" className="w-full h-full rounded-full object-cover" />
                    {liffUser && liffUser.isRegistered && (
                        <div className="absolute -bottom-1 -right-1 bg-green-500 border-2 border-white w-4 h-4 rounded-full"></div>
                    )}
                </div>
                )}
            </div>
            
            {/* Sticky Action Button */}
            {isHeaderSticky && (
                <button
                    onClick={() => navigate(`/liff/${tenantId}/booking/new`)}
                    className="px-4 py-2 rounded-full text-white font-bold text-sm shadow-md flex items-center gap-1 shrink-0 transition-transform active:scale-95"
                    style={{ background: themeColor }}
                >
                    <CalendarPlus weight="fill" />
                    預約
                </button>
            )}

            {/* Normal Large Button */}
            {!isHeaderSticky && (
                liffUser && !liffUser.isRegistered ? (
                <button
                    onClick={() => alert('這裡將跳轉至會員註冊/綁定頁面')}
                    className="w-full py-4 rounded-xl text-white font-bold text-lg shadow-lg flex items-center justify-center space-x-2"
                    style={{ background: themeColor }}
                >
                    <span>✨ 立即成為會員</span>
                </button>
                ) : (
                <button
                onClick={() => navigate(`/liff/${tenantId}/booking/new`)}
                className="w-full py-5 rounded-2xl text-white font-bold text-lg shadow-[0_20px_40px_-15px_rgba(0,0,0,0.2)] flex items-center justify-between px-8 transform active:scale-[0.98] transition-all relative overflow-hidden group border border-white/20"
                style={{ 
                    background: `linear-gradient(135deg, ${themeColor} 0%, ${themeColor}dd 100%)`,
                    boxShadow: `0 15px 30px -10px ${themeColor}60` 
                }}
                >
                {/* Dynamic Shine Effect */}
                <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer pointer-events-none"></div>
                
                {/* Icon Circle */}
                <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-inner">
                    <CalendarPlus size={20} weight="fill" className="text-white" />
                </div>
                
                <span className="tracking-widest text-xl font-medium text-shadow-sm flex-1 text-center pl-2">立即預約</span>
                
                <div className="flex items-center space-x-1 opacity-80 group-hover:translate-x-1 transition-transform">
                    <span className="text-xs font-light tracking-wider uppercase">Book Now</span>
                    <ArrowRight size={18} />
                </div>
                </button>
                )
            )}
            </div>
        </div>
      </div>
      
      {/* Gallery Waterfall */}
      <div className="p-5 pt-2">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-bold text-gray-900 text-lg flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-pink-100 text-pink-600">
                <Sparkle weight="fill" size={16} />
            </div>
            <span>美麗藝廊</span>
          </h2>
          <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-1 rounded-full">最新靈感</span>
        </div>

        <div className="columns-2 gap-4 space-y-4">
          {galleryPosts.map((post) => (
            <div key={post.id} className="break-inside-avoid bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 group">
              <div className="relative">
                <img src={post.image_url} alt={post.title} className="w-full h-auto object-cover" />
                <div className="absolute top-2 right-2">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleLike(post.id);
                    }}
                    className={`p-1.5 rounded-full backdrop-blur-md transition-all ${likedPosts.has(post.id) ? 'bg-white text-red-500' : 'bg-black/20 text-white'}`}
                  >
                    <Heart weight={likedPosts.has(post.id) ? "fill" : "regular"} size={16} />
                  </button>
                </div>
              </div>
              <div className="p-3">
                <h3 className="font-bold text-sm text-gray-800 mb-1 line-clamp-1">{post.title || '未命名'}</h3>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                    {post.service_categories?.name}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LiffHomePage;
