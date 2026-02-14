import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash, PencilSimple, ArrowLeft, X, User, Check } from '@phosphor-icons/react';
import GlassPanel from '../components/ui/GlassPanel';
import BackgroundDecoration from '../components/ui/BackgroundDecoration';
import { supabase } from '../lib/supabaseClient';

const StaffManagementPage = () => {
  const navigate = useNavigate();
  const [staffList, setStaffList] = useState([]);
  const [services, setServices] = useState([]); // For the picker
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    display_name: '',
    role: 'stylist',
    bio: '',
    selectedServices: [] // Array of service IDs
  });
  const [submitLoading, setSubmitLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // 1. Fetch Staff with their linked services
      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select(`
          *,
          staff_services (
            service_id,
            services ( name )
          )
        `)
        .order('created_at', { ascending: false });

      if (staffError) throw staffError;

      // 2. Fetch All Services for the picker
      const { data: servicesData, error: servicesError } = await supabase
        .from('services')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (servicesError) throw servicesError;

      setStaffList(staffData || []);
      setServices(servicesData || []);

    } catch (err) {
      console.error('Error fetching data:', err);
      // Don't show error to user if it's just empty or auth issue for now
      if (err.message !== 'JSON object requested, multiple (or no) rows returned') {
         setError('無法載入員工資料。');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const toggleServiceSelection = (serviceId) => {
    setFormData(prev => {
      const current = prev.selectedServices;
      if (current.includes(serviceId)) {
        return { ...prev, selectedServices: current.filter(id => id !== serviceId) };
      } else {
        return { ...prev, selectedServices: [...current, serviceId] };
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);
    try {
      // 1. Get current user & tenant
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single();
      
      if (!profile) throw new Error('Profile not found');

      // 2. Insert Staff
      const { data: newStaff, error: insertError } = await supabase
        .from('staff')
        .insert([{
          tenant_id: profile.tenant_id,
          full_name: formData.full_name,
          display_name: formData.display_name || formData.full_name, // Default to full name if empty
          role: formData.role,
          bio: formData.bio,
          is_active: true
        }])
        .select()
        .single();

      if (insertError) throw insertError;

      // 3. Insert Staff Services (Skills Binding)
      if (formData.selectedServices.length > 0) {
        const serviceLinks = formData.selectedServices.map(serviceId => ({
          staff_id: newStaff.id,
          service_id: serviceId
        }));

        const { error: linkError } = await supabase
          .from('staff_services')
          .insert(serviceLinks);

        if (linkError) throw linkError; // Note: If this fails, we have an orphan staff. Should handle better in real prod.
      }

      // 4. Reset and Refresh
      setIsModalOpen(false);
      setFormData({ full_name: '', display_name: '', role: 'stylist', bio: '', selectedServices: [] });
      fetchData();
      
    } catch (err) {
      console.error('Error creating staff:', err);
      alert('新增失敗: ' + err.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'manager': return <span className="px-2 py-1 bg-purple-100 text-purple-600 text-xs rounded-full">店長</span>;
      case 'stylist': return <span className="px-2 py-1 bg-rose-100 text-rose-600 text-xs rounded-full">設計師</span>;
      case 'assistant': return <span className="px-2 py-1 bg-blue-100 text-blue-600 text-xs rounded-full">助理</span>;
      default: return <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded-full">{role}</span>;
    }
  };

  return (
    <div className="bg-rose-50 min-h-screen p-6 relative overflow-hidden font-sans pb-24">
      <BackgroundDecoration />
      
      <div className="max-w-5xl mx-auto relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => navigate('/admin')} 
              className="p-2 bg-white/50 hover:bg-white rounded-full text-slate-600 transition-colors shadow-sm"
            >
              <ArrowLeft weight="bold" className="w-6 h-6" />
            </button>
            <h1 className="text-2xl font-bold text-slate-800">員工與排班</h1>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center space-x-2 bg-rose-500 hover:bg-rose-600 text-white px-4 py-2 rounded-lg transition-colors shadow-lg shadow-rose-200"
          >
            <Plus className="w-5 h-5" />
            <span>新增員工</span>
          </button>
        </div>

        {/* Content */}
        <GlassPanel className="w-full min-h-[400px]">
          {loading ? (
            <div className="flex justify-center items-center h-64 text-slate-400">
              載入中...
            </div>
          ) : error ? (
            <div className="flex justify-center items-center h-64 text-red-400">
              {error}
            </div>
          ) : staffList.length === 0 ? (
            <div className="flex flex-col justify-center items-center h-64 text-slate-400 space-y-4">
              <p>目前沒有員工資料</p>
              <button onClick={() => setIsModalOpen(true)} className="text-rose-500 hover:underline">立即新增第一位員工</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
              {staffList.map((staff) => (
                <div key={staff.id} className="bg-white/60 backdrop-blur-sm rounded-xl border border-slate-100 p-4 hover:shadow-md transition-all group">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center text-slate-400 overflow-hidden">
                        {staff.avatar_url ? (
                          <img src={staff.avatar_url} alt={staff.full_name} className="w-full h-full object-cover" />
                        ) : (
                          <User weight="fill" className="w-6 h-6" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800">{staff.display_name || staff.full_name}</h3>
                        <div className="flex items-center space-x-2 mt-1">
                          {getRoleBadge(staff.role)}
                          {staff.full_name !== staff.display_name && (
                            <span className="text-xs text-slate-400">({staff.full_name})</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <button className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-colors opacity-0 group-hover:opacity-100">
                      <PencilSimple className="w-5 h-5" />
                    </button>
                  </div>
                  
                  {/* Skills / Services */}
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <p className="text-xs text-slate-400 mb-2">可執行服務項目 ({staff.staff_services?.length || 0})</p>
                    <div className="flex flex-wrap gap-1">
                      {staff.staff_services?.slice(0, 3).map((item, idx) => (
                        <span key={idx} className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] rounded-full">
                          {item.services?.name}
                        </span>
                      ))}
                      {staff.staff_services?.length > 3 && (
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-400 text-[10px] rounded-full">
                          +{staff.staff_services.length - 3}
                        </span>
                      )}
                      {(!staff.staff_services || staff.staff_services.length === 0) && (
                        <span className="text-xs text-slate-400 italic">尚未綁定服務</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassPanel>
      </div>

      {/* Add Staff Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-fade-in-up max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-4 border-b border-slate-100 flex-shrink-0">
              <h3 className="text-lg font-bold text-slate-800">新增員工</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 hover:bg-slate-100 rounded-full text-slate-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">真實姓名</label>
                  <input
                    type="text"
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleInputChange}
                    required
                    placeholder="如：王小明"
                    className="w-full px-4 py-2 rounded-lg bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">C 端暱稱 (選填)</label>
                  <input
                    type="text"
                    name="display_name"
                    value={formData.display_name}
                    onChange={handleInputChange}
                    placeholder="如：Ken 老師"
                    className="w-full px-4 py-2 rounded-lg bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">職位角色</label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 rounded-lg bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                >
                  <option value="stylist">設計師 (可接單)</option>
                  <option value="assistant">助理 (輔助)</option>
                  <option value="manager">店長 (管理權限)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">個人簡介 (選填)</label>
                <textarea
                  name="bio"
                  value={formData.bio}
                  onChange={handleInputChange}
                  rows="3"
                  placeholder="擅長風格、經歷介紹..."
                  className="w-full px-4 py-2 rounded-lg bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 resize-none"
                />
              </div>

              {/* Service Binding Section */}
              <div className="pt-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  技能綁定 (勾選可執行的服務)
                  <span className="ml-2 text-xs text-rose-500 font-normal">必選</span>
                </label>
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 max-h-48 overflow-y-auto">
                  {services.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-2">尚未建立服務項目</p>
                  ) : (
                    <div className="space-y-2">
                      {services.map(service => (
                        <label key={service.id} className="flex items-center space-x-3 p-2 hover:bg-white rounded-lg cursor-pointer transition-colors">
                          <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                            formData.selectedServices.includes(service.id) 
                              ? 'bg-rose-500 border-rose-500 text-white' 
                              : 'border-slate-300 bg-white'
                          }`}>
                            {formData.selectedServices.includes(service.id) && <Check weight="bold" className="w-3.5 h-3.5" />}
                          </div>
                          <input
                            type="checkbox"
                            className="hidden"
                            checked={formData.selectedServices.includes(service.id)}
                            onChange={() => toggleServiceSelection(service.id)}
                          />
                          <span className="text-sm text-slate-700">{service.name}</span>
                          <span className="text-xs text-slate-400 ml-auto">${service.price}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4 flex space-x-3 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 rounded-lg border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={submitLoading}
                  className="flex-1 py-2.5 rounded-lg bg-rose-500 text-white font-bold shadow-lg shadow-rose-200 hover:bg-rose-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {submitLoading ? '儲存中...' : '確認新增'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffManagementPage;
