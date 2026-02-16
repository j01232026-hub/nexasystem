import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  UploadSimple, 
  Trash, 
  Tag, 
  Image as ImageIcon,
  ImageSquare,
  CheckCircle,
  XCircle,
  Plus
} from '@phosphor-icons/react';
import GlassPanel from '../components/ui/GlassPanel';
import BackgroundDecoration from '../components/ui/BackgroundDecoration';

const GalleryManagementPage = () => {
  const navigate = useNavigate();
  const [images, setImages] = useState([]);
  const [categories, setCategories] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  
  // New Image Form State
  const [newImage, setNewImage] = useState({
    title: '',
    description: '',
    category_id: '',
    service_id: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Categories & Services
      const { data: cats } = await supabase.from('service_categories').select('*').order('sort_order');
      const { data: svcs } = await supabase.from('services').select('*').order('name');
      setCategories(cats || []);
      setServices(svcs || []);

      // 2. Fetch Existing Gallery Images
      const { data: imgs, error } = await supabase
        .from('gallery_posts')
        .select(`
          *,
          service_categories(name, color),
          services(name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setImages(imgs || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
      
      // Auto-detect dimensions (optional, but good for waterfall)
      const img = new Image();
      img.onload = () => {
        setNewImage(prev => ({ ...prev, width: img.width, height: img.height }));
      };
      img.src = objectUrl;
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !newImage.category_id) {
      alert('請選擇圖片並設定主分類');
      return;
    }

    setUploading(true);
    try {
      // 1. Upload to Storage
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `gallery/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('images') // Assuming 'images' bucket exists, or create 'gallery'
        .upload(filePath, selectedFile);

      if (uploadError) throw uploadError;

      // 2. Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('images')
        .getPublicUrl(filePath);

      // 3. Insert into DB
      const { error: dbError } = await supabase
        .from('gallery_posts')
        .insert({
          image_url: publicUrl,
          title: newImage.title,
          description: newImage.description,
          category_id: newImage.category_id,
          service_id: newImage.service_id || null,
          width: newImage.width,
          height: newImage.height
        });

      if (dbError) throw dbError;

      // Reset & Refresh
      setSelectedFile(null);
      setPreviewUrl(null);
      setNewImage({ title: '', description: '', category_id: '', service_id: '' });
      fetchData();
      alert('上傳成功！');

    } catch (error) {
      console.error('Upload failed:', error);
      alert('上傳失敗: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('確定要刪除這張圖片嗎？')) return;

    try {
      const { error } = await supabase
        .from('gallery_posts')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setImages(prev => prev.filter(img => img.id !== id));
    } catch (error) {
      console.error('Delete failed:', error);
      alert('刪除失敗');
    }
  };

  // Filter services based on selected category
  const availableServices = services.filter(s => s.category_id === newImage.category_id);

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
          <h1 className="text-2xl font-bold text-slate-800">美麗藝廊管理 (Beauty Gallery)</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Upload Panel */}
          <GlassPanel className="lg:col-span-1 p-6 h-fit border-rose-100/50">
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <UploadSimple className="text-rose-500" size={24} />
              新增作品
            </h2>

            {/* Image Preview / Dropzone */}
            <div className="mb-6">
              <label className="block w-full aspect-[3/4] rounded-xl border-2 border-dashed border-slate-300 hover:border-rose-400 bg-slate-50 hover:bg-rose-50/30 transition-all cursor-pointer flex flex-col items-center justify-center relative overflow-hidden group">
                {previewUrl ? (
                  <>
                    <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="text-white font-medium text-sm">更換圖片</p>
                    </div>
                  </>
                ) : (
                  <>
                    <ImageIcon className="w-12 h-12 text-slate-300 mb-2 group-hover:scale-110 transition-transform" />
                    <p className="text-sm text-slate-500 font-medium">點擊上傳圖片</p>
                    <p className="text-xs text-slate-400 mt-1">建議比例 3:4 (小紅書風格)</p>
                  </>
                )}
                <input type="file" className="hidden" accept="image/*" onChange={handleFileSelect} />
              </label>
            </div>

            {/* Form Fields */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">作品標題</label>
                <input 
                  type="text" 
                  value={newImage.title}
                  onChange={e => setNewImage({...newImage, title: e.target.value})}
                  className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 text-sm"
                  placeholder="例如：夏日清新美甲"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">主分類 <span className="text-rose-500">*</span></label>
                  <select 
                    value={newImage.category_id}
                    onChange={e => setNewImage({...newImage, category_id: e.target.value, service_id: ''})}
                    className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 text-sm"
                  >
                    <option value="">請選擇</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">關聯服務</label>
                  <select 
                    value={newImage.service_id}
                    onChange={e => setNewImage({...newImage, service_id: e.target.value})}
                    className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 text-sm"
                    disabled={!newImage.category_id}
                  >
                    <option value="">請選擇</option>
                    {availableServices.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">描述 (選填)</label>
                <textarea 
                  value={newImage.description}
                  onChange={e => setNewImage({...newImage, description: e.target.value})}
                  className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 text-sm h-20 resize-none"
                  placeholder="輸入作品描述或是使用的色號..."
                />
              </div>

              <button 
                onClick={handleUpload}
                disabled={uploading}
                className={`w-full py-3 rounded-xl font-bold text-white shadow-md transition-all flex items-center justify-center gap-2 ${
                  uploading ? 'bg-slate-400 cursor-not-allowed' : 'bg-rose-500 hover:bg-rose-600 hover:shadow-lg hover:-translate-y-0.5'
                }`}
              >
                {uploading ? '上傳中...' : '發布作品'}
              </button>
            </div>
          </GlassPanel>

          {/* Gallery Grid */}
          <div className="lg:col-span-2 space-y-4">
             {/* Filter Tabs (Optional - simplified for now) */}
             <div className="flex gap-2 overflow-x-auto pb-2">
               <button className="px-4 py-1.5 bg-rose-500 text-white rounded-full text-sm font-bold shadow-sm whitespace-nowrap">全部</button>
               {categories.map(c => (
                 <button key={c.id} className="px-4 py-1.5 bg-white text-slate-600 hover:bg-rose-50 hover:text-rose-500 rounded-full text-sm font-medium border border-slate-200 transition-colors whitespace-nowrap">
                   {c.name}
                 </button>
               ))}
             </div>

             {loading ? (
               <div className="text-center py-10 text-slate-400">載入中...</div>
             ) : images.length === 0 ? (
               <div className="bg-white/50 rounded-2xl p-10 text-center border border-dashed border-slate-300">
                 <ImageSquare className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                 <p className="text-slate-500">尚無作品，快去上傳第一張吧！</p>
               </div>
             ) : (
               <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                 {images.map(img => (
                   <div key={img.id} className="group relative bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all border border-slate-100">
                     <div className="aspect-[3/4] relative overflow-hidden bg-slate-100">
                       <img src={img.image_url} alt={img.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                       <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                         <button 
                           onClick={() => handleDelete(img.id)}
                           className="absolute top-2 right-2 p-1.5 bg-white/20 hover:bg-red-500 backdrop-blur-md rounded-full text-white transition-colors"
                         >
                           <Trash size={16} weight="bold" />
                         </button>
                         <p className="text-white text-sm font-bold truncate">{img.title || '未命名'}</p>
                         <p className="text-white/80 text-xs truncate">{img.service_categories?.name} • {img.services?.name}</p>
                       </div>
                     </div>
                   </div>
                 ))}
               </div>
             )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GalleryManagementPage;
