
import React, { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useLiffAuth } from '../../context/LiffAuthContext';
import { supabase } from '../../lib/supabaseClient';
import { 
  Gear, 
  QrCode, 
  Ticket, 
  CurrencyCircleDollar, 
  Crown, 
  Heart, 
  ClockCounterClockwise, 
  CaretRight,
  UserCircle,
  ShareNetwork,
  Trash
} from '@phosphor-icons/react';

const LiffProfilePage = () => {
  const { themeColor } = useTheme();
  const { liffUser } = useLiffAuth();
  const [activeTab, setActiveTab] = useState('appointments');
  const [collections, setCollections] = useState([]);
  const [loadingCollections, setLoadingCollections] = useState(false);

  // Fetch Collections when tab is active
  useEffect(() => {
    if (activeTab === 'collections' && liffUser?.lineUserId) {
      fetchCollections();
    }
  }, [activeTab, liffUser]);

  const fetchCollections = async () => {
    setLoadingCollections(true);
    try {
      const { data, error } = await supabase
        .from('gallery_likes')
        .select(`
          post_id,
          gallery_posts (
            id,
            image_url,
            title,
            service_categories(name)
          )
        `)
        .eq('user_id', liffUser.lineUserId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Flatten data structure
      const formatted = data.map(item => item.gallery_posts).filter(post => post !== null);
      setCollections(formatted);
    } catch (err) {
      console.error('Error fetching collections:', err);
    } finally {
      setLoadingCollections(false);
    }
  };

  const removeCollection = async (postId) => {
    if (!confirm('確定要取消收藏嗎？')) return;
    try {
        await supabase
            .from('gallery_likes')
            .delete()
            .eq('user_id', liffUser.lineUserId)
            .eq('post_id', postId);
        
        setCollections(prev => prev.filter(p => p.id !== postId));
    } catch (err) {
        console.error('Remove failed', err);
    }
  };

  // Mock Data (Keep user & appointments mock for now as requested only for gallery)
  const user = {
    name: liffUser?.displayName || '訪客',
    username: 'amy_beauty_lover',
    avatar: liffUser?.pictureUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Amy',
    level: 'Gold VIP',
    following: 12,
    followers: 48,
    likes: collections.length || 0,
    balance: 5200,
    coupons: 3,
    points: 1500,
  };

  const appointments = [
    { id: 1, title: '單色凝膠 (手部)', date: '2025-02-18', time: '14:00', status: 'upcoming', staff: 'Nana' },
    { id: 2, title: '水飛梭深層清潔', date: '2025-01-20', time: '10:30', status: 'completed', staff: 'Jessica' },
  ];


  return (
    <div className="min-h-screen bg-gray-50">
      
      {/* Dark Header Section (Xiaohongshu Style) */}
      <div className="bg-[#262626] text-white pt-12 pb-10 px-5 relative">
        
        {/* Top Actions */}
        <div className="absolute top-4 right-4 flex space-x-4">
            <button className="text-white opacity-80 hover:opacity-100">
                <ShareNetwork size={24} />
            </button>
            <button className="text-white opacity-80 hover:opacity-100">
                <Gear size={24} />
            </button>
        </div>

        <div className="flex items-start justify-between mb-6">
            {/* Avatar & User Info */}
            <div className="flex items-center space-x-4">
                 <div className="relative">
                    <div className="w-20 h-20 rounded-full border-2 border-[#262626] overflow-hidden bg-gray-700">
                        <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
                    </div>
                    <div className="absolute -bottom-1 -right-1 bg-yellow-400 text-yellow-900 text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 border-[#262626] flex items-center shadow-sm">
                        <Crown size={10} weight="fill" className="mr-0.5" />
                        VIP
                    </div>
                </div>
                <div>
                    <h1 className="text-xl font-bold text-white mb-1">{user.name}</h1>
                    <p className="text-xs text-gray-400">小紅書號：{user.username}</p>
                </div>
            </div>
        </div>

        {/* Bio */}
        <div className="mb-6">
            <p className="text-sm text-gray-200 leading-relaxed">
                熱愛生活，喜歡嘗試各種美甲風格 ✨ <br/>
                皮膚管理愛好者 🧖‍♀️
            </p>
        </div>

        {/* Tags / Location (Optional Mock) */}
        <div className="flex space-x-2 mb-6">
             <span className="px-2 py-1 bg-[#3a3a3a] rounded text-[10px] text-gray-300">32歲</span>
             <span className="px-2 py-1 bg-[#3a3a3a] rounded text-[10px] text-gray-300">台灣 台北</span>
             <span className="px-2 py-1 bg-[#3a3a3a] rounded text-[10px] text-gray-300">美妝博主</span>
        </div>

        {/* Stats Row */}
        <div className="flex items-center space-x-8 mb-4">
            <div className="text-center cursor-pointer">
                <span className="block text-lg font-bold text-white">{user.following}</span>
                <span className="text-xs text-gray-400">關注</span>
            </div>
            <div className="text-center cursor-pointer">
                <span className="block text-lg font-bold text-white">{user.followers}</span>
                <span className="text-xs text-gray-400">粉絲</span>
            </div>
            <div className="text-center cursor-pointer">
                <span className="block text-lg font-bold text-white">{user.likes}</span>
                <span className="text-xs text-gray-400">獲贊與收藏</span>
            </div>
            
            <div className="flex-grow"></div>
            
            <div className="flex space-x-2">
                 <button className="px-4 py-1.5 rounded-full border border-white/30 text-xs font-medium text-white bg-white/5 hover:bg-white/10 transition-colors">
                    編輯資料
                 </button>
                 <button className="px-4 py-1.5 rounded-full border border-white/30 text-xs font-medium text-white bg-white/5 hover:bg-white/10 transition-colors">
                    <Gear size={14} />
                 </button>
            </div>
        </div>
      </div>

      {/* Content Area (Rounded Sheet) */}
      <div className="bg-white rounded-t-3xl -mt-6 relative z-10 min-h-[500px] shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        
        {/* Sticky Tabs */}
        <div className="sticky top-0 bg-white z-20 rounded-t-3xl border-b border-gray-100">
          <div className="flex justify-around px-2 pt-2">
              <button 
                onClick={() => setActiveTab('appointments')}
                className={`flex-1 py-3 text-sm font-bold relative transition-colors ${activeTab === 'appointments' ? 'text-gray-900' : 'text-gray-400'}`}
              >
                預約記錄
                {activeTab === 'appointments' && (
                    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-4 h-0.5 rounded-full" style={{ backgroundColor: themeColor }} />
                )}
              </button>
              <button 
                onClick={() => setActiveTab('collections')}
                className={`flex-1 py-3 text-sm font-bold relative transition-colors ${activeTab === 'collections' ? 'text-gray-900' : 'text-gray-400'}`}
              >
                收藏靈感
                {activeTab === 'collections' && (
                    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-4 h-0.5 rounded-full" style={{ backgroundColor: themeColor }} />
                )}
              </button>
              <button 
                onClick={() => setActiveTab('membership')}
                className={`flex-1 py-3 text-sm font-bold relative transition-colors ${activeTab === 'membership' ? 'text-gray-900' : 'text-gray-400'}`}
              >
                會員卡
                {activeTab === 'membership' && (
                    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-4 h-0.5 rounded-full" style={{ backgroundColor: themeColor }} />
                )}
              </button>
          </div>
        </div>
        
        <div className="p-4 bg-gray-50 min-h-[400px]">
             {/* Tab: Appointments */}
            {activeTab === 'appointments' && (
                <div className="space-y-3">
                    {/* Membership Assets Summary Row */}
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 grid grid-cols-3 divide-x divide-gray-100 mb-4">
                        <div className="text-center">
                            <div className="text-lg font-bold text-gray-900" style={{ color: themeColor }}>${user.balance}</div>
                            <div className="text-xs text-gray-400 mt-1">儲值金</div>
                        </div>
                        <div className="text-center">
                            <div className="text-lg font-bold text-gray-900" style={{ color: themeColor }}>{user.coupons}</div>
                            <div className="text-xs text-gray-400 mt-1">優惠券</div>
                        </div>
                        <div className="text-center">
                            <div className="text-lg font-bold text-gray-900" style={{ color: themeColor }}>{user.points}</div>
                            <div className="text-xs text-gray-400 mt-1">積分</div>
                        </div>
                    </div>

                    <h3 className="text-sm font-bold text-gray-900 ml-1">最近預約</h3>
                    {appointments.map(app => (
                        <div key={app.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
                            <div className="flex items-start space-x-3">
                                <div className={`p-2 rounded-full ${app.status === 'upcoming' ? 'bg-blue-50 text-blue-500' : 'bg-gray-100 text-gray-400'}`}>
                                    <ClockCounterClockwise size={20} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-800">{app.title}</h3>
                                    <p className="text-xs text-gray-500 mt-0.5">{app.date} {app.time} • {app.staff}</p>
                                </div>
                            </div>
                            <button className="text-gray-400">
                                <CaretRight size={16} />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Tab: Collections (Masonry-ish Grid) */}
            {activeTab === 'collections' && (
                <>
                {loadingCollections ? (
                   <div className="flex justify-center py-10">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                   </div>
                ) : collections.length === 0 ? (
                   <div className="text-center py-10 text-gray-400">
                      <p>尚未收藏任何靈感</p>
                      <p className="text-xs mt-1">去首頁逛逛吧！</p>
                   </div>
                ) : (
                <div className="columns-2 gap-3 space-y-3">
                    {collections.map((post) => (
                        <div key={post.id} className="bg-white rounded-xl overflow-hidden shadow-sm break-inside-avoid relative group">
                            <img src={post.image_url} alt="Collection" className="w-full h-auto object-cover" />
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                    onClick={() => removeCollection(post.id)}
                                    className="p-1 bg-black/30 backdrop-blur-md rounded-full text-white hover:bg-red-500"
                                >
                                    <Trash size={14} />
                                </button>
                            </div>
                            <div className="p-2">
                                <div className="text-xs font-bold text-gray-800 mb-1 line-clamp-1">{post.title || '未命名'}</div>
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center space-x-1">
                                        <div className="w-4 h-4 rounded-full bg-gray-200"></div>
                                        <span className="text-[10px] text-gray-500">{post.service_categories?.name}</span>
                                    </div>
                                    <div className="flex items-center space-x-0.5 text-red-400">
                                        <Heart size={12} weight="fill" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                )}
                </>
            )}

            {/* Tab: Membership */}
            {activeTab === 'membership' && (
                <div className="space-y-4">
                     <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white rounded-2xl p-6 shadow-lg relative overflow-hidden">
                        <div className="absolute top-0 right-0 -mr-6 -mt-6 w-32 h-32 bg-white opacity-5 rounded-full blur-2xl"></div>
                        <div className="relative z-10">
                            <div className="flex justify-between items-start mb-8">
                                <div>
                                    <div className="text-sm text-gray-400 mb-1">當前等級</div>
                                    <div className="text-2xl font-bold flex items-center">
                                        <Crown weight="fill" className="text-yellow-400 mr-2" />
                                        Gold VIP
                                    </div>
                                </div>
                                <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center">
                                    <UserCircle size={24} className="text-white" />
                                </div>
                            </div>
                            <div className="flex justify-between items-end">
                                <div>
                                    <div className="text-xs text-gray-400 mb-1">卡號</div>
                                    <div className="font-mono text-lg tracking-wider">8801 2293 4811</div>
                                </div>
                                <button className="px-3 py-1 bg-white text-gray-900 text-xs font-bold rounded-full">
                                    會員權益
                                </button>
                            </div>
                        </div>
                     </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default LiffProfilePage;
