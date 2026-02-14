import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Storefront, Phone, MapPin, Image, CheckCircle, PencilSimple, Plus, UserCircle, Trash, Buildings, ArrowLeft, X } from '@phosphor-icons/react';
import GlassPanel from '../components/ui/GlassPanel';
import BackgroundDecoration from '../components/ui/BackgroundDecoration';
import { supabase } from '../lib/supabaseClient';

const StoreProfilePage = () => {
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [store, setStore] = useState(null);
  const [staffList, setStaffList] = useState([]);
  const [branches, setBranches] = useState([]);
  const [profile, setProfile] = useState(null);

  // Branch Modal State
  const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);
  const [branchForm, setBranchForm] = useState({ id: null, name: '', phone: '', address: '' });
  const [branchSubmitLoading, setBranchSubmitLoading] = useState(false);

  // Form states (initialized with store data when editing starts)
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: ''
  });

  useEffect(() => {
    fetchStoreData();
  }, []);

  const fetchStoreData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // If no user, maybe redirect to login, but for now just stop
        setLoading(false);
        return;
      }

      // Get profile to find tenant_id
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('tenant_id, role')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        // If profile not found, maybe new user? 
        setLoading(false);
        return;
      }
      setProfile(profileData);

      // Get tenant info
      const { data: tenantData, error: tenantError } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', profileData.tenant_id)
        .single();

      if (tenantError) console.error('Error fetching tenant:', tenantError);
      
      // Get staff list
      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select('*')
        .eq('tenant_id', profileData.tenant_id);

      if (staffError) console.error('Error fetching staff:', staffError);

      // Get branches
      const { data: branchData, error: branchError } = await supabase
        .from('branches')
        .select('*')
        .eq('tenant_id', profileData.tenant_id)
        .order('created_at', { ascending: true });

      if (branchError && branchError.code !== '42P01') { // Ignore if table doesn't exist yet (dev mode)
         console.error('Error fetching branches:', branchError);
      }

      setStore(tenantData);
      setStaffList(staffData || []);
      setBranches(branchData || []);
      
      if (tenantData) {
        setFormData({
            name: tenantData.name || '',
            phone: tenantData.phone || '', 
            address: tenantData.address || ''
        });
      }

    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditToggle = () => {
    if (!isEditing && store) {
        // Reset form data to current store data when entering edit mode
        setFormData({
            name: store.name || '',
            phone: store.phone || '',
            address: store.address || ''
        });
    }
    setIsEditing(!isEditing);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    // TODO: Implement save logic to update 'tenants' table
    // For now, just simulate a save by updating local state
    setStore(prev => ({ ...prev, ...formData }));
    setIsEditing(false);
  };

  // --- Branch Operations ---
  const handleOpenBranchModal = (branch = null) => {
    if (branch) {
      setBranchForm({
        id: branch.id,
        name: branch.name,
        phone: branch.phone || '',
        address: branch.address || ''
      });
    } else {
      setBranchForm({ id: null, name: '', phone: '', address: '' });
    }
    setIsBranchModalOpen(true);
  };

  const handleSubmitBranch = async (e) => {
    e.preventDefault();
    if (!profile?.tenant_id) return;
    
    setBranchSubmitLoading(true);
    try {
      const payload = {
        tenant_id: profile.tenant_id,
        name: branchForm.name,
        phone: branchForm.phone,
        address: branchForm.address
      };

      if (branchForm.id) {
        // Update
        const { error } = await supabase
          .from('branches')
          .update(payload)
          .eq('id', branchForm.id);
        if (error) throw error;
      } else {
        // Create
        const { error } = await supabase
          .from('branches')
          .insert(payload);
        if (error) throw error;
      }

      // Refresh data
      fetchStoreData();
      setIsBranchModalOpen(false);
    } catch (error) {
      alert('操作失敗: ' + error.message);
    } finally {
      setBranchSubmitLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-rose-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-500"></div>
      </div>
    );
  }

  return (
    <div className="bg-rose-50 min-h-screen p-6 relative overflow-hidden font-sans pb-24">
      <BackgroundDecoration />
      
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center space-x-4 mb-6">
          <button 
            onClick={() => navigate('/admin')} 
            className="p-2 bg-white/50 hover:bg-white rounded-full text-slate-600 transition-colors shadow-sm"
          >
            <ArrowLeft weight="bold" className="w-6 h-6" />
          </button>
          <h1 className="text-2xl font-bold text-slate-800">店家資訊設定</h1>
        </div>

        {isEditing ? (
             <GlassPanel className="w-full">
                {/* Edit Form Content */}
                <div className="mb-6 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-slate-800">編輯總店資料</h2>
                    <button onClick={handleEditToggle} className="text-slate-500 hover:text-slate-700 font-medium">取消</button>
                </div>
                
                <form className="space-y-6">
                     {/* Cover/Logo Upload */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 pl-1">店鋪封面 / Logo</label>
                        <div className="relative group cursor-pointer w-full h-40 rounded-2xl bg-rose-50 border-2 border-dashed border-rose-300 flex flex-col items-center justify-center overflow-hidden transition-all hover:border-rose-500 hover:bg-rose-100">
                        <Image className="w-10 h-10 text-rose-400 mb-2 group-hover:scale-110 transition-transform" weight="light" />
                        <span className="text-xs text-slate-400 font-medium group-hover:text-rose-500 transition-colors">點擊上傳店鋪照片</span>
                        <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" />
                        </div>
                    </div>

                    {/* Store Name */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 pl-1">總店名稱</label>
                        <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Storefront className="w-5 h-5 text-slate-400" />
                        </div>
                        <input 
                            type="text" 
                            name="name"
                            value={formData.name}
                            onChange={handleInputChange}
                            placeholder="例如：NEXA 美學台北旗艦店" 
                            className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/50 border border-slate-200 focus:border-rose-300 focus:ring-4 focus:ring-rose-100 outline-none transition-all placeholder:text-slate-300 text-slate-700 font-medium"
                        />
                        </div>
                    </div>

                    {/* Store Phone */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 pl-1">總店電話</label>
                        <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Phone className="w-5 h-5 text-slate-400" />
                        </div>
                        <input 
                            type="tel" 
                            name="phone"
                            value={formData.phone}
                            onChange={handleInputChange}
                            placeholder="02-1234-5678" 
                            className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/50 border border-slate-200 focus:border-rose-300 focus:ring-4 focus:ring-rose-100 outline-none transition-all placeholder:text-slate-300 text-slate-700 font-medium"
                        />
                        </div>
                    </div>

                    {/* Store Address */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 pl-1">總店地址</label>
                        <div className="relative">
                        <div className="absolute top-3.5 left-3 flex items-start pointer-events-none">
                            <MapPin className="w-5 h-5 text-slate-400" />
                        </div>
                        <input 
                            type="text" 
                            name="address"
                            value={formData.address}
                            onChange={handleInputChange}
                            placeholder="請輸入完整地址" 
                            className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/50 border border-slate-200 focus:border-rose-300 focus:ring-4 focus:ring-rose-100 outline-none transition-all placeholder:text-slate-300 text-slate-700 font-medium"
                        />
                        </div>
                    </div>

                    <div className="pt-4 flex space-x-3">
                        <button 
                            type="button" 
                            onClick={handleSave}
                            className="flex-1 py-3.5 px-4 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-medium shadow-lg shadow-slate-300 transform active:scale-[0.98] transition-all flex items-center justify-center group"
                        >
                            <CheckCircle className="w-5 h-5 mr-2 text-emerald-400" weight="fill" />
                            儲存變更
                        </button>
                    </div>
                </form>
             </GlassPanel>
        ) : (
            <>
            {/* View Mode - Store Card */}
            <div className="bg-white rounded-3xl shadow-[0_4px_20px_0_rgba(0,0,0,0.03)] overflow-hidden border border-slate-100 mb-6">
                {/* Cover Image */}
                <div className="h-32 bg-gradient-to-r from-rose-100 to-orange-100 relative">
                    {/* Edit Button */}
                    <button 
                        onClick={handleEditToggle}
                        className="absolute top-3 right-3 p-1.5 bg-white/30 hover:bg-white/50 backdrop-blur-sm rounded-full text-white transition-all"
                    >
                        <PencilSimple className="w-4 h-4 text-slate-600" />
                    </button>
                </div>

                <div className="px-6 pb-6">
                    {/* Store Basic Info */}
                    <div className="relative -mt-10 mb-6 flex items-end justify-between">
                        <div>
                            <div className="w-20 h-20 rounded-2xl bg-white p-1 shadow-md">
                                <div className="w-full h-full bg-rose-50 rounded-xl flex items-center justify-center text-rose-300">
                                    <Storefront className="w-8 h-8" weight="light" />
                                </div>
                            </div>
                            <div className="mt-3">
                                <h2 className="text-xl font-bold text-slate-800">{store?.name || '未設定店名'}</h2>
                                <p className="text-xs text-rose-500 font-medium tracking-wide uppercase mt-0.5">總店 HEAD OFFICE</p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3 mb-8">
                        <div className="flex items-center text-sm text-slate-600">
                            <Phone className="w-4 h-4 mr-3 text-slate-400" />
                            {store?.phone || '02-1234-5678 (範例)'}
                        </div>
                        <div className="flex items-center text-sm text-slate-600">
                            <MapPin className="w-4 h-4 mr-3 text-slate-400" />
                            {store?.address || '台北市大安區忠孝東路四段 123 號 (範例)'}
                        </div>
                    </div>

                    <div className="border-t border-slate-100 my-6"></div>

                    {/* Staff List */}
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-bold text-slate-800">總店員工列表</h3>
                            <button 
                                onClick={() => alert('新增員工功能開發中')}
                                className="text-sm font-semibold text-rose-500 hover:text-rose-600 flex items-center bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-lg transition-colors"
                            >
                                <Plus className="w-4 h-4 mr-1.5" />
                                新增員工
                            </button>
                        </div>

                        <div className="space-y-3">
                            {staffList.length > 0 ? (
                                staffList.map(staff => (
                                    <div key={staff.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 group hover:border-rose-200 transition-colors">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center overflow-hidden">
                                                {staff.avatar_url ? (
                                                    <img src={staff.avatar_url} alt={staff.full_name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <UserCircle className="w-6 h-6 text-rose-400" weight="fill" />
                                                )}
                                            </div>
                                            <div>
                                                <div className="flex items-center">
                                                    <p className="text-sm font-semibold text-slate-800">{staff.display_name || staff.full_name}</p>
                                                    <span className="ml-2 px-1.5 py-0.5 bg-slate-200 text-slate-600 text-[10px] font-bold rounded">{staff.role}</span>
                                                </div>
                                                <p className="text-xs text-slate-500">員工編號: {staff.id.slice(0, 8)}</p> 
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-1 opacity-60 group-hover:opacity-100 transition-opacity">
                                            <button className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors">
                                                <PencilSimple className="w-4 h-4" />
                                            </button>
                                            <button className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                                <Trash className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-4 text-slate-400 text-sm">暫無員工資料</div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Branch Management */}
            <div>
                <div className="flex items-center justify-between mb-4 px-1">
                    <h3 className="text-lg font-bold text-slate-800">分店管理</h3>
                </div>

                {/* Branch List */}
                <div className="space-y-4 mb-4">
                    {branches.length === 0 && (
                         <div className="text-center py-4 text-slate-400 text-sm bg-slate-50 rounded-xl border border-dashed border-slate-200">
                             尚未建立分店
                         </div>
                    )}
                    {branches.map(branch => (
                        <div key={branch.id} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm relative overflow-hidden group hover:border-rose-200 transition-all">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h4 className="text-lg font-bold text-slate-800">{branch.name}</h4>
                                    <div className="flex items-center text-sm text-slate-500 mt-1">
                                        <MapPin className="w-4 h-4 mr-1" />
                                        {branch.address || '尚未設定地址'}
                                    </div>
                                    <div className="flex items-center text-sm text-slate-500 mt-1">
                                        <Phone className="w-4 h-4 mr-1" />
                                        {branch.phone || '尚未設定電話'}
                                    </div>
                                </div>
                                <button 
                                    onClick={() => handleOpenBranchModal(branch)}
                                    className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600"
                                >
                                    <PencilSimple className="w-5 h-5" />
                                </button>
                            </div>
                            
                            <div className="border-t border-slate-100 pt-4 flex justify-between items-center">
                                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">分店員工</span>
                                <button 
                                    onClick={() => alert('新增分店員工功能開發中 (將導向員工管理頁面)')}
                                    className="text-sm font-semibold text-rose-500 hover:text-rose-600 flex items-center bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-lg transition-colors"
                                >
                                    <Plus className="w-4 h-4 mr-1.5" />
                                    新增員工
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
                
                <div className="w-full">
                    <button 
                        onClick={() => handleOpenBranchModal()}
                        className="w-full h-32 rounded-2xl border-2 border-dashed border-slate-300 hover:border-rose-400 hover:bg-rose-50/50 flex flex-col items-center justify-center text-slate-400 hover:text-rose-500 transition-all group"
                    >
                        <div className="w-10 h-10 rounded-full bg-slate-100 group-hover:bg-rose-100 flex items-center justify-center mb-2 transition-colors">
                            <Buildings className="w-6 h-6 text-slate-400 group-hover:text-rose-500" weight="light" />
                        </div>
                        <span className="text-sm font-semibold">新增分店</span>
                    </button>
                </div>
            </div>
            </>
        )}
      </div>

      {/* Branch Modal */}
      {isBranchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-fadeIn">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-bold text-slate-800">
                {branchForm.id ? '編輯分店' : '新增分店'}
              </h3>
              <button onClick={() => setIsBranchModalOpen(false)}><X className="text-slate-400" /></button>
            </div>
            <form onSubmit={handleSubmitBranch} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">分店名稱</label>
                <input
                  type="text"
                  required
                  placeholder="例如：台中逢甲店"
                  value={branchForm.name}
                  onChange={e => setBranchForm({...branchForm, name: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">分店電話</label>
                <input
                  type="tel"
                  placeholder="04-1234-5678"
                  value={branchForm.phone}
                  onChange={e => setBranchForm({...branchForm, phone: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">分店地址</label>
                <input
                  type="text"
                  placeholder="請輸入地址"
                  value={branchForm.address}
                  onChange={e => setBranchForm({...branchForm, address: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsBranchModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={branchSubmitLoading}
                  className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl shadow-lg shadow-rose-500/30 transition-all disabled:opacity-50"
                >
                  {branchSubmitLoading ? '儲存中...' : '儲存'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default StoreProfilePage;
