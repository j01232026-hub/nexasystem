import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, Trash, PencilSimple, ArrowLeft, X, 
  Tag, Sparkle, Clock, CurrencyDollar, 
  CaretRight, Folder, FolderOpen
} from '@phosphor-icons/react';
import GlassPanel from '../components/ui/GlassPanel';
import BackgroundDecoration from '../components/ui/BackgroundDecoration';
import { supabase } from '../lib/supabaseClient';

const CATEGORY_COLORS = {
  rose: { label: '玫瑰粉', bg: 'bg-rose-100', text: 'text-rose-600', border: 'border-rose-200', hover: 'hover:border-rose-300', lightBg: 'bg-rose-50/50', icon: 'text-rose-500', button: 'bg-rose-500 hover:bg-rose-600', ring: 'focus:ring-rose-500/20 focus:border-rose-500' },
  orange: { label: '活力橘', bg: 'bg-orange-100', text: 'text-orange-600', border: 'border-orange-200', hover: 'hover:border-orange-300', lightBg: 'bg-orange-50/50', icon: 'text-orange-500', button: 'bg-orange-500 hover:bg-orange-600', ring: 'focus:ring-orange-500/20 focus:border-orange-500' },
  amber: { label: '溫暖黃', bg: 'bg-amber-100', text: 'text-amber-600', border: 'border-amber-200', hover: 'hover:border-amber-300', lightBg: 'bg-amber-50/50', icon: 'text-amber-500', button: 'bg-amber-500 hover:bg-amber-600', ring: 'focus:ring-amber-500/20 focus:border-amber-500' },
  emerald: { label: '自然綠', bg: 'bg-emerald-100', text: 'text-emerald-600', border: 'border-emerald-200', hover: 'hover:border-emerald-300', lightBg: 'bg-emerald-50/50', icon: 'text-emerald-500', button: 'bg-emerald-500 hover:bg-emerald-600', ring: 'focus:ring-emerald-500/20 focus:border-emerald-500' },
  blue: { label: '天空藍', bg: 'bg-blue-100', text: 'text-blue-600', border: 'border-blue-200', hover: 'hover:border-blue-300', lightBg: 'bg-blue-50/50', icon: 'text-blue-500', button: 'bg-blue-500 hover:bg-blue-600', ring: 'focus:ring-blue-500/20 focus:border-blue-500' },
  cyan: { label: '清爽青', bg: 'bg-cyan-100', text: 'text-cyan-600', border: 'border-cyan-200', hover: 'hover:border-cyan-300', lightBg: 'bg-cyan-50/50', icon: 'text-cyan-500', button: 'bg-cyan-500 hover:bg-cyan-600', ring: 'focus:ring-cyan-500/20 focus:border-cyan-500' },
  purple: { label: '時尚紫', bg: 'bg-purple-100', text: 'text-purple-600', border: 'border-purple-200', hover: 'hover:border-purple-300', lightBg: 'bg-purple-50/50', icon: 'text-purple-500', button: 'bg-purple-500 hover:bg-purple-600', ring: 'focus:ring-purple-500/20 focus:border-purple-500' },
  slate: { label: '簡約灰', bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200', hover: 'hover:border-slate-300', lightBg: 'bg-slate-50/50', icon: 'text-slate-500', button: 'bg-slate-500 hover:bg-slate-600', ring: 'focus:ring-slate-500/20 focus:border-slate-500' },
};

const ServiceManagementPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  
  // Data State
  const [categories, setCategories] = useState([]);
  const [services, setServices] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);

  // Modals State
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState({ 
    isOpen: false, 
    type: null, // 'category' or 'service'
    id: null,
    name: ''
  });
  
  // Form State
  const [categoryForm, setCategoryForm] = useState({ id: null, name: '', color: 'rose' });
  const [serviceForm, setServiceForm] = useState({ 
    id: null, 
    name: '', 
    duration: 60, 
    price: 1000, 
    description: '' 
  });
  
  const [submitLoading, setSubmitLoading] = useState(false);

  // Initial Fetch
  useEffect(() => {
    checkAuthAndFetch();
  }, []);

  const checkAuthAndFetch = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/');
        return;
      }
      
      await fetchData(user);
    } catch (error) {
      console.error('Auth/Fetch Error:', error);
      setLoading(false);
    }
  };

  const fetchData = async (currentUser) => {
    try {
      let user = currentUser;
      if (!user) {
        const { data } = await supabase.auth.getUser();
        user = data.user;
      }
      
      if (!user) return;

      // User is passed in to avoid async race conditions or null checks
      const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single();
      
      if (!profile) return;

      const [catRes, servRes] = await Promise.all([
        supabase.from('service_categories').select('*').eq('tenant_id', profile.tenant_id).order('name'),
        supabase.from('services').select('*').eq('tenant_id', profile.tenant_id).order('name')
      ]);

      const fetchedCategories = catRes.data || [];
      setCategories(fetchedCategories);
      setServices(servRes.data || []);

      // Auto-select first category if none selected and categories exist
      if (!selectedCategoryId && fetchedCategories.length > 0) {
        setSelectedCategoryId(fetchedCategories[0].id);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // --- Category Operations ---

  const handleOpenCategoryModal = (category = null) => {
    if (category) {
      setCategoryForm({ id: category.id, name: category.name, color: category.color || 'rose' });
    } else {
      setCategoryForm({ id: null, name: '', color: 'rose' });
    }
    setIsCategoryModalOpen(true);
  };

  const handleSubmitCategory = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single();

      if (categoryForm.id) {
        // Update
        const { error } = await supabase
          .from('service_categories')
          .update({ name: categoryForm.name, color: categoryForm.color })
          .eq('id', categoryForm.id);
        if (error) throw error;
      } else {
        // Create
        const { data, error } = await supabase
          .from('service_categories')
          .insert({ 
            tenant_id: profile.tenant_id, 
            name: categoryForm.name,
            color: categoryForm.color
          })
          .select()
          .single();
        if (error) throw error;
        // Select new category
        setSelectedCategoryId(data.id);
      }

      setIsCategoryModalOpen(false);
      fetchData(user);
    } catch (error) {
      alert('操作失敗: ' + error.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDeleteCategory = (category) => {
    setDeleteConfirmation({
      isOpen: true,
      type: 'category',
      id: category.id,
      name: category.name
    });
  };

  const confirmDeleteCategory = async () => {
    const id = deleteConfirmation.id;
    try {
      const { error } = await supabase.from('service_categories').delete().eq('id', id);
      if (error) throw error;
      
      // If deleted category was selected, clear selection
      if (selectedCategoryId === id) setSelectedCategoryId(null);
      fetchData();
    } catch (error) {
      alert('刪除失敗: ' + error.message);
    } finally {
      setDeleteConfirmation({ isOpen: false, type: null, id: null, name: '' });
    }
  };

  // --- Service Operations ---

  const handleOpenServiceModal = (service = null) => {
    if (service) {
      setServiceForm({ 
        id: service.id, 
        name: service.name, 
        duration: service.duration, 
        price: service.price,
        description: service.description || ''
      });
    } else {
      setServiceForm({ 
        id: null, 
        name: '', 
        duration: 60, 
        price: 1000,
        description: ''
      });
    }
    setIsServiceModalOpen(true);
  };

  const handleSubmitService = async (e) => {
    e.preventDefault();
    if (!selectedCategoryId) {
      alert('請先選擇一個主項目');
      return;
    }
    setSubmitLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single();

      const payload = {
        tenant_id: profile.tenant_id,
        category_id: selectedCategoryId,
        name: serviceForm.name,
        duration: parseInt(serviceForm.duration),
        price: parseFloat(serviceForm.price),
        description: serviceForm.description,
        // Backward compatibility
        category: categories.find(c => c.id === selectedCategoryId)?.name 
      };

      if (serviceForm.id) {
        // Update
        const { error } = await supabase
          .from('services')
          .update(payload)
          .eq('id', serviceForm.id);
        if (error) throw error;
      } else {
        // Create
        const { error } = await supabase
          .from('services')
          .insert(payload);
        if (error) throw error;
      }

      setIsServiceModalOpen(false);
      fetchData(user);
    } catch (error) {
      alert('操作失敗: ' + error.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDeleteService = (service) => {
    setDeleteConfirmation({
      isOpen: true,
      type: 'service',
      id: service.id,
      name: service.name
    });
  };

  const confirmDeleteService = async () => {
    const id = deleteConfirmation.id;
    try {
      const { error } = await supabase.from('services').delete().eq('id', id);
      if (error) throw error;
      fetchData();
    } catch (error) {
      alert('刪除失敗: ' + error.message);
    } finally {
      setDeleteConfirmation({ isOpen: false, type: null, id: null, name: '' });
    }
  };

  // Filter services for current category
  const currentServices = services.filter(s => 
    s.category_id === selectedCategoryId || 
    (!s.category_id && s.category === categories.find(c => c.id === selectedCategoryId)?.name)
  );

  return (
    <div className="bg-rose-50 min-h-screen p-6 relative overflow-hidden font-sans pb-24">
      <BackgroundDecoration />

      <div className="relative z-10 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center space-x-4 mb-6">
          <button 
            onClick={() => navigate('/admin')}
            className="p-2 bg-white/50 hover:bg-white rounded-full text-slate-600 transition-colors shadow-sm"
          >
            <ArrowLeft weight="bold" className="w-6 h-6" />
          </button>
          <h1 className="text-2xl font-bold text-slate-800">服務項目管理</h1>
        </div>

        {/* Main Content: Split View */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:h-[calc(100vh-180px)] h-auto">
            {/* Skeleton Left */}
            <GlassPanel className="md:col-span-4 flex flex-col md:h-full h-auto border-rose-100/30">
              <div className="p-4 border-b border-slate-100/50 flex justify-between items-center">
                <div className="h-6 w-32 bg-slate-200/60 rounded-lg animate-pulse" />
                <div className="h-8 w-8 bg-slate-200/60 rounded-lg animate-pulse" />
              </div>
              <div className="p-3 space-y-3">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="h-16 w-full bg-slate-200/50 rounded-xl animate-pulse" />
                ))}
              </div>
            </GlassPanel>

            {/* Skeleton Right */}
            <div className="md:col-span-8 h-full">
              <GlassPanel className="h-full border-rose-100/30">
                <div className="p-4 border-b border-slate-100/50 flex justify-between items-center">
                  <div className="h-8 w-48 bg-slate-200/60 rounded-lg animate-pulse" />
                  <div className="h-10 w-32 bg-slate-200/60 rounded-xl animate-pulse" />
                </div>
                <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="h-36 bg-slate-200/50 rounded-2xl animate-pulse" />
                  ))}
                </div>
              </GlassPanel>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:h-[calc(100vh-180px)] h-auto">
          
          {/* Left Panel: Categories */}
          <GlassPanel className="md:col-span-4 flex flex-col md:h-full h-auto overflow-hidden border-rose-100/50">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white/50">
              <h2 className="font-bold text-slate-700 flex items-center gap-2">
                <Tag className="text-rose-500" />
                主項目 (類別)
              </h2>
              <button 
                onClick={() => handleOpenCategoryModal()}
                className="p-2 rounded-lg hover:bg-rose-50 text-rose-500 transition-colors"
              >
                <Plus weight="bold" />
              </button>
            </div>
            
            <div className="flex-1 md:overflow-y-auto p-3 space-y-2">
              {categories.length === 0 && (
                <div className="text-center py-8 text-slate-400 text-sm">
                  尚未建立任何類別<br/>點擊上方 + 新增
                </div>
              )}
              
              {categories.map(category => {
                const colorTheme = CATEGORY_COLORS[category.color || 'rose'] || CATEGORY_COLORS.rose;
                const isSelected = selectedCategoryId === category.id;

                return (
                  <div 
                    key={category.id}
                    onClick={() => setSelectedCategoryId(category.id)}
                    className={`
                      group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all border
                      ${isSelected 
                        ? `${colorTheme.bg} ${colorTheme.border} shadow-sm` 
                        : 'bg-white border-transparent hover:bg-white hover:shadow-sm hover:border-slate-100'}
                    `}
                  >
                    <div className="flex items-center gap-3">
                      {isSelected 
                        ? <FolderOpen weight="fill" className={colorTheme.icon} size={20} />
                        : <Folder weight="regular" className={`text-slate-400 group-hover:${colorTheme.icon}`} size={20} />
                      }
                      <span className={`font-medium ${isSelected ? colorTheme.text : 'text-slate-600'}`}>
                        {category.name}
                      </span>
                    </div>
                    
                    {/* Actions (visible on hover or active) */}
                    <div className={`flex gap-1 ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleOpenCategoryModal(category); }}
                        className="p-1.5 rounded-lg hover:bg-white/80 text-slate-400 hover:text-blue-500"
                      >
                        <PencilSimple weight="bold" size={14} />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDeleteCategory(category); }}
                        className="p-1.5 rounded-lg hover:bg-white/80 text-slate-400 hover:text-red-500"
                      >
                        <Trash weight="bold" size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </GlassPanel>

          {/* Right Panel: Services */}
          <div className="md:col-span-8 flex flex-col h-full">
            {selectedCategoryId ? (() => {
               const selectedCategory = categories.find(c => c.id === selectedCategoryId);
               const colorTheme = CATEGORY_COLORS[selectedCategory?.color || 'rose'] || CATEGORY_COLORS.rose;
               
               return (
              <GlassPanel className="flex-1 flex flex-col h-full overflow-hidden border-rose-100/50">
                <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/50">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-slate-400 text-sm whitespace-nowrap">當前類別：</span>
                    <h2 className={`font-bold text-lg ${colorTheme.text}`}>
                      {selectedCategory?.name}
                    </h2>
                    <span className={`bg-slate-100 text-slate-500 text-xs px-2 py-0.5 rounded-full ml-2 whitespace-nowrap`}>
                      {currentServices.length} 項服務
                    </span>
                  </div>
                  <button 
                    onClick={() => handleOpenServiceModal()}
                    className={`w-full sm:w-auto flex justify-center items-center gap-2 px-4 py-2 text-white rounded-xl shadow-lg transition-all text-sm font-bold ${colorTheme.button}`}
                  >
                    <Plus weight="bold" />
                    新增服務
                  </button>
                </div>

                <div className="flex-1 md:overflow-y-auto overflow-visible p-4 grid grid-cols-1 md:grid-cols-2 gap-4 content-start">
                  {currentServices.length === 0 && (
                    <div className="col-span-full flex flex-col items-center justify-center py-20 text-slate-400">
                      <Sparkle size={48} className="mb-4 opacity-20" />
                      <p>此類別尚無服務項目</p>
                      <button 
                        onClick={() => handleOpenServiceModal()}
                        className={`mt-4 hover:underline text-sm ${colorTheme.text}`}
                      >
                        立即新增第一個服務
                      </button>
                    </div>
                  )}

                  {currentServices.map(service => (
                    <div 
                      key={service.id} 
                      className={`
                        p-4 rounded-2xl shadow-sm border transition-all group relative
                        ${colorTheme.lightBg} ${colorTheme.border} hover:shadow-md
                      `}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-slate-800 text-lg">{service.name}</h3>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => handleOpenServiceModal(service)}
                            className="p-1.5 rounded-lg hover:bg-white/50 text-slate-400 hover:text-blue-500"
                          >
                            <PencilSimple weight="bold" size={16} />
                          </button>
                          <button 
                            onClick={() => handleDeleteService(service)}
                            className="p-1.5 rounded-lg hover:bg-white/50 text-slate-400 hover:text-red-500"
                          >
                            <Trash weight="bold" size={16} />
                          </button>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-slate-600 mb-3">
                        <div className="flex items-center gap-1.5 bg-white/60 px-2 py-1 rounded-lg">
                          <Clock className={colorTheme.icon} />
                          {service.duration} 分鐘
                        </div>
                        <div className="flex items-center gap-1.5 bg-white/60 px-2 py-1 rounded-lg">
                          <CurrencyDollar className={colorTheme.icon} />
                          ${service.price}
                        </div>
                      </div>

                      {service.description && (
                        <p className="text-xs text-slate-500 line-clamp-2">{service.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </GlassPanel>
            );
            })() : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-white/30 rounded-3xl border-2 border-dashed border-slate-200">
                <Folder size={64} className="mb-4 opacity-30" />
                <p>請先從左側選擇一個主項目</p>
                <p className="text-sm mt-2">或是點擊 + 新增類別</p>
              </div>
            )}
          </div>
        </div>
      )}
      </div>

      {/* --- Category Modal --- */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-fadeIn">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-bold text-slate-800">
                {categoryForm.id ? '編輯主項目' : '新增主項目'}
              </h3>
              <button onClick={() => setIsCategoryModalOpen(false)}><X className="text-slate-400" /></button>
            </div>
            <form onSubmit={handleSubmitCategory} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">類別名稱</label>
                <input
                  type="text"
                  required
                  placeholder="例如：美甲、美睫..."
                  value={categoryForm.name}
                  onChange={e => setCategoryForm({...categoryForm, name: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                />
              </div>

              {/* Color Selection */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">主題顏色</label>
                <div className="grid grid-cols-4 gap-2">
                  {Object.entries(CATEGORY_COLORS).map(([key, theme]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setCategoryForm({...categoryForm, color: key})}
                      className={`
                        flex items-center justify-center p-2 rounded-lg border transition-all
                        ${categoryForm.color === key 
                          ? `${theme.bg} ${theme.border} ring-2 ring-offset-1 ring-slate-200` 
                          : 'bg-white border-slate-100 hover:bg-slate-50'}
                      `}
                    >
                      <div className={`w-4 h-4 rounded-full ${theme.bg.replace('100', '500')}`} />
                      <span className="text-xs ml-2 text-slate-600">{theme.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={submitLoading}
                  className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl shadow-lg shadow-rose-500/30 transition-all disabled:opacity-50"
                >
                  {submitLoading ? '儲存中...' : '儲存'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- Service Modal --- */}
      {isServiceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white w-full sm:w-full max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden animate-slideUp sm:animate-fadeIn max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
              <h3 className="font-bold text-slate-800 text-lg">
                {serviceForm.id ? '編輯服務細項' : '新增服務細項'}
              </h3>
              <button 
                onClick={() => setIsServiceModalOpen(false)}
                className="p-2 -mr-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X weight="bold" size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmitService} className="p-6 space-y-5 overflow-y-auto flex-1">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">服務名稱</label>
                <input
                  type="text"
                  required
                  placeholder="例如：單色凝膠、卸甲..."
                  value={serviceForm.name}
                  onChange={e => setServiceForm({...serviceForm, name: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">工時 (分鐘)</label>
                  <div className="relative">
                    <input
                      type="number"
                      required
                      min="5"
                      step="5"
                      value={serviceForm.duration}
                      onChange={e => setServiceForm({...serviceForm, duration: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                    />
                    <Clock className="absolute right-3 top-2.5 text-slate-400" size={16} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">價格</label>
                  <div className="relative">
                    <input
                      type="number"
                      required
                      min="0"
                      value={serviceForm.price}
                      onChange={e => setServiceForm({...serviceForm, price: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                    />
                    <CurrencyDollar className="absolute right-3 top-2.5 text-slate-400" size={16} />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">描述 (選填)</label>
                <textarea
                  rows="3"
                  value={serviceForm.description}
                  onChange={e => setServiceForm({...serviceForm, description: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                  placeholder="內部備註或服務說明..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-50 mt-auto">
                <button
                  type="button"
                  onClick={() => setIsServiceModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors font-medium"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={submitLoading}
                  className="flex-1 sm:flex-none px-6 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl shadow-lg shadow-rose-500/30 transition-all disabled:opacity-50 font-bold"
                >
                  {submitLoading ? '儲存中...' : '儲存'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- Delete Confirmation Modal --- */}
      {deleteConfirmation.isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-fadeIn p-6">
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <Trash className="text-red-500" size={24} weight="fill" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">確認刪除？</h3>
              <p className="text-slate-500 text-sm">
                您確定要刪除「<span className="font-bold text-slate-700">{deleteConfirmation.name}</span>」嗎？
                {deleteConfirmation.type === 'category' && (
                  <span className="block mt-2 text-red-500 text-xs bg-red-50 p-2 rounded-lg border border-red-100">
                    注意：此操作可能會影響該類別下的所有服務項目！
                  </span>
                )}
              </p>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirmation({ isOpen: false, type: null, id: null, name: '' })}
                className="flex-1 px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors font-medium"
              >
                取消
              </button>
              <button
                onClick={() => {
                  if (deleteConfirmation.type === 'category') confirmDeleteCategory();
                  else confirmDeleteService();
                }}
                className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl shadow-lg shadow-red-500/30 transition-all font-bold"
              >
                確認刪除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceManagementPage;
