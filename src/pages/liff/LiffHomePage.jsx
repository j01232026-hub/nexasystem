
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { useLiffAuth } from '../../context/LiffAuthContext';
import { supabase } from '../../lib/supabaseClient';
import { format, parseISO, differenceInDays } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { Sparkle, CalendarPlus, Clock, ArrowRight, User, Heart, X } from '@phosphor-icons/react';

const LiffHomePage = () => {
  const { themeColor } = useTheme();
  const { tenantId } = useParams();
  const navigate = useNavigate();
  const { liffUser, loading, error } = useLiffAuth();
  const [galleryPosts, setGalleryPosts] = useState([]);
  const [likedPosts, setLikedPosts] = useState(new Set());
  const [isHeaderSticky, setIsHeaderSticky] = useState(false);
  const [lightboxPost, setLightboxPost] = useState(null);

  useEffect(() => {
    fetchGallery();
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [liffUser]);

  const handleScroll = () => {
    if (window.scrollY > 10) {
      setIsHeaderSticky(true);
    } else {
      setIsHeaderSticky(false);
    }
  };

  const fetchGallery = async () => {
    try {
      const { data, error } = await supabase
        .from('gallery_posts')
        .select(`
          *,
          service_categories(id, name),
          services(id, name)
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      
      setGalleryPosts(data || []);

      if (liffUser?.lineUserId) {
        const { data: likes } = await supabase
          .from('gallery_likes')
          .select('post_id')
          .eq('user_id', liffUser.lineUserId);
        
        if (likes) {
          setLikedPosts(new Set(likes.map(l => l.post_id)));
        }
      }
    } catch (err) {
      console.error('Fetch gallery error:', err);
    }
  };

  const toggleLike = async (postId) => {
    if (!liffUser?.lineUserId) {
      alert('請先登入會員');
      return;
    }

    const isLiked = likedPosts.has(postId);
    const newLiked = new Set(likedPosts);
    
    try {
      if (isLiked) {
        newLiked.delete(postId);
        const { error } = await supabase.from('gallery_likes').delete().eq('user_id', liffUser.lineUserId).eq('post_id', postId);
        if (error) console.error('Unlike error:', error);
      } else {
        newLiked.add(postId);
        const { error } = await supabase.from('gallery_likes').insert({ user_id: liffUser.lineUserId, post_id: postId });
        if (error) {
          console.error('Like error:', error);
          alert('收藏失敗: ' + error.message);
          return;
        }
      }
      setLikedPosts(newLiked);
    } catch (err) {
      console.error('Toggle like error:', err);
      alert('收藏失敗，請稍後再試');
    }
  };

  const handleBooking = (post) => {
    const categoryId = post.service_categories?.id;
    const serviceId = post.services?.id;
    
    const params = new URLSearchParams();
    if (categoryId) params.append('category', categoryId);
    if (serviceId) params.append('service', serviceId);
    if (liffUser?.displayName) params.append('name', liffUser.displayName);
    if (liffUser?.phone) params.append('phone', liffUser.phone);
    
    navigate(`/liff/${tenantId}/booking/new?${params.toString()}`);
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
      {/* Hero Section */}
      <div className={`relative bg-white shadow-sm overflow-hidden transition-all duration-300 z-50 ${isHeaderSticky ? 'fixed top-0 left-0 right-0 rounded-b-xl shadow-md bg-white/90 backdrop-blur-md' : 'rounded-b-[40px]'}`}>
        {/* Decorative Background - Organic Shapes - Hide when sticky */}
        <div className={`absolute top-[-50%] right-[-20%] w-[80%] h-[150%] rounded-[40%] bg-gradient-to-b from-transparent to-white opacity-20 transform rotate-12 z-0 pointer-events-none transition-opacity ${isHeaderSticky ? 'opacity-0' : 'opacity-20'}`} style={{ backgroundColor: themeColor }}></div>
        <div className={`absolute top-[-10%] right-[-10%] w-[60%] h-[80%] rounded-[100%] blur-3xl opacity-15 pointer-events-none transition-opacity ${isHeaderSticky ? 'opacity-0' : 'opacity-15'}`} style={{ backgroundColor: themeColor }}></div>
        <div className={`absolute top-[20%] left-[-10%] w-[40%] h-[40%] rounded-full blur-2xl opacity-5 pointer-events-none transition-opacity ${isHeaderSticky ? 'opacity-0' : 'opacity-5'}`} style={{ backgroundColor: themeColor }}></div>
        
        <div className={`p-6 relative z-10 transition-all ${isHeaderSticky ? 'py-4 flex items-center justify-between' : 'pt-10 pb-12'}`}>
          <div className={`flex justify-between items-center mb-0 transition-all ${isHeaderSticky ? 'w-full' : 'mb-8'}`}>
            <div className={`transition-all ${isHeaderSticky ? 'flex items-center gap-3' : ''}`}>
               {isHeaderSticky && (
                  <div className="w-8 h-8 rounded-full p-0.5 shadow-sm bg-white relative shrink-0">
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
            </div>
            
            {!isHeaderSticky && (
              <div className="w-12 h-12 rounded-full p-0.5 shadow-md bg-white relative">
                 <img src={avatarUrl} alt="User" className="w-full h-full rounded-full object-cover" />
                 {liffUser && liffUser.isRegistered && (
                    <div className="absolute -bottom-1 -right-1 bg-green-500 border-2 border-white w-4 h-4 rounded-full"></div>
                 )}
              </div>
            )}

            {isHeaderSticky && (
              <button
                onClick={() => navigate(`/liff/${tenantId}/booking/new`)}
                className="px-4 py-2 rounded-full text-white font-bold text-sm shadow-md flex items-center gap-1 shrink-0"
                style={{ background: themeColor }}
              >
                <CalendarPlus weight="fill" />
                預約
              </button>
            )}
          </div>
          
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
      
      {/* Spacer for sticky header */}
      {isHeaderSticky && <div className="h-[280px]"></div>}

      {/* Gallery Waterfall */}
      <div className="p-5">
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
                <img 
                  src={post.image_url} 
                  alt={post.title} 
                  className="w-full h-auto object-cover cursor-pointer"
                  onClick={() => setLightboxPost(post)}
                />
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
              <div className="p-3 flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-sm text-gray-800 mb-1 line-clamp-1">{post.title || '未命名'}</h3>
                  <span className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                    {post.service_categories?.name}
                  </span>
                </div>
                <button
                  onClick={() => handleBooking(post)}
                  className="ml-2 p-2 rounded-full bg-gray-900 text-white hover:bg-gray-800 transition-all flex-shrink-0"
                  title="預約此款"
                >
                  <CalendarPlus size={16} weight="fill" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Lightbox Modal */}
      {lightboxPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <button 
            onClick={() => setLightboxPost(null)}
            className="absolute top-4 right-4 p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors"
          >
            <X size={28} weight="bold" />
          </button>

          <div className="relative max-w-lg w-full bg-white rounded-2xl overflow-hidden shadow-2xl">
            <img 
              src={lightboxPost.image_url} 
              alt={lightboxPost.title} 
              className="w-full h-auto object-cover"
            />
            
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-bold text-lg text-gray-900">{lightboxPost.title || '未命名'}</h3>
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded mt-1 inline-block">
                    {lightboxPost.service_categories?.name}
                  </span>
                </div>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleLike(lightboxPost.id);
                  }}
                  className={`p-2 rounded-full transition-all ${likedPosts.has(lightboxPost.id) ? 'bg-red-50 text-red-500' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                >
                  <Heart weight={likedPosts.has(lightboxPost.id) ? "fill" : "regular"} size={24} />
                </button>
              </div>

              <button
                onClick={() => handleBooking(lightboxPost)}
                className="w-full py-3 rounded-xl text-white font-bold flex items-center justify-center gap-2 transition-all hover:opacity-90"
                style={{ backgroundColor: themeColor }}
              >
                <CalendarPlus size={20} weight="fill" />
                我要預約此款
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiffHomePage;
