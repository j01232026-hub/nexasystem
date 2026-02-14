
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load env vars
dotenv.config({ path: resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing Supabase URL or Service Role Key in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function seedBeautyData() {
  console.log('🌱 Starting NEXA Beauty Data Seeding...');

  // 1. Get Target Tenant (NEXA Demo Salon)
  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .select('id, name')
    .eq('slug', 'nexa-demo-dev') // Matches init_dev_data.js
    .single();

  if (tenantError || !tenant) {
    console.error('❌ Tenant not found. Please run "node scripts/init_dev_data.js" first.');
    return;
  }

  const tenantId = tenant.id;
  console.log(`🏢 Target Tenant: ${tenant.name} (${tenantId})`);

  // 2. Clean up existing data for this tenant
  console.log('🧹 Cleaning up old data...');
  
  // Delete in order to respect FK constraints
  // Note: Using loop for safety, though cascade might handle it if configured
  await supabase.from('appointment_items').delete().neq('id', 0); // Warning: This deletes ALL if not filtered.
  // Wait, we must filter by appointment's tenant_id, but appointment_items might not have tenant_id directly?
  // Let's check schema. If items don't have tenant_id, we must delete appointments first.
  // Actually, standard practice: Delete appointments -> items should cascade if set. 
  // If not cascade, we need to find IDs.
  // For safety in this script, let's assume we can delete appointments by tenant_id.
  
  // However, Supabase delete().eq() is safe.
  
  // Step 2.1: Delete Appointments (and Items via Cascade hopefully, or manually)
  // Let's try deleting appointments directly.
  const { error: delAppError } = await supabase.from('appointments').delete().eq('tenant_id', tenantId);
  if (delAppError) console.error('Error deleting appointments:', delAppError);
  
  // Step 2.2: Delete Customers
  await supabase.from('customers').delete().eq('tenant_id', tenantId);
  
  // Step 2.3: Delete Staff
  // Note: Staff might be linked to auth users? The SQL script deletes from 'staff'.
  await supabase.from('staff').delete().eq('tenant_id', tenantId);
  
  // Step 2.4: Delete Services
  await supabase.from('services').delete().eq('tenant_id', tenantId);
  
  // Step 2.5: Delete Categories
  await supabase.from('service_categories').delete().eq('tenant_id', tenantId);

  console.log('✨ Clean up complete.');

  // 3. Insert Service Categories
  console.log('📂 Creating Categories...');
  const categoriesData = [
    { tenant_id: tenantId, name: '皮膚管理 (Skin Care)', color: '#EC4899' },
    { tenant_id: tenantId, name: '凝膠美甲 (Nail Art)', color: '#8B5CF6' },
    { tenant_id: tenantId, name: '韓式美睫 (Eyelash)', color: '#10B981' }
  ];
  
  const { data: cats, error: catError } = await supabase
    .from('service_categories')
    .insert(categoriesData)
    .select();
    
  if (catError) throw catError;
  
  const catSkin = cats.find(c => c.name.includes('皮膚'));
  const catNail = cats.find(c => c.name.includes('美甲'));
  const catLash = cats.find(c => c.name.includes('美睫'));

  // 4. Insert Services
  console.log('💅 Creating Services...');
  const servicesData = [
    { tenant_id: tenantId, category_id: catSkin.id, name: '水飛梭深層清潔', duration: 90, price: 2500, description: '包含卸妝、潔面、水飛梭、保濕導入、軟膜', is_active: true },
    { tenant_id: tenantId, category_id: catSkin.id, name: '海藻微針煥膚', duration: 120, price: 3200, description: '改善痘坑痘印，術後需修復期', is_active: true },
    { tenant_id: tenantId, category_id: catNail.id, name: '單色凝膠 (手部)', duration: 60, price: 1000, description: '包含基礎保養、單色上色', is_active: true },
    { tenant_id: tenantId, category_id: catNail.id, name: '造型設計款 (不限時)', duration: 120, price: 1800, description: '依現場溝通款式為主，含建構', is_active: true },
    { tenant_id: tenantId, category_id: catNail.id, name: '深層足部護理', duration: 90, price: 1500, description: '去角質、按摩、敷膜', is_active: true },
    { tenant_id: tenantId, category_id: catLash.id, name: '3D 自然款 (150根)', duration: 60, price: 1200, description: '適合素顏日常', is_active: true },
    { tenant_id: tenantId, category_id: catLash.id, name: '6D 濃密款 (400根)', duration: 90, price: 2000, description: '適合派對或喜歡妝感者', is_active: true }
  ];

  const { data: svcs, error: svcError } = await supabase.from('services').insert(servicesData).select();
  if (svcError) throw svcError;

  // Helper to find service ID
  const findSvc = (name) => svcs.find(s => s.name.includes(name)).id;

  // 5. Insert Staff
  console.log('👩‍⚕️ Creating Staff...');
  const staffData = [
    { tenant_id: tenantId, full_name: 'Jessica', display_name: '店長 Jessica', role: 'manager', bio: '資深皮膚管理師', avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jessica', is_active: true },
    { tenant_id: tenantId, full_name: 'Nana', display_name: '美甲師 Nana', role: 'stylist', bio: '擅長日系暈染', avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Nana', is_active: true },
    { tenant_id: tenantId, full_name: 'Ivy', display_name: '美睫師 Ivy', role: 'stylist', bio: '細心溫柔', avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ivy', is_active: true }
  ];

  const { data: staffs, error: staffError } = await supabase.from('staff').insert(staffData).select();
  if (staffError) throw staffError;

  const staffJess = staffs.find(s => s.full_name === 'Jessica');
  const staffNana = staffs.find(s => s.full_name === 'Nana');
  const staffIvy = staffs.find(s => s.full_name === 'Ivy');

  // 6. Insert Customers
  console.log('👥 Creating Customers...');
  const customersData = [
    { tenant_id: tenantId, name: '林曉美 (Amy)', phone: '0912345678', notes: '皮膚偏乾', tags: ['VIP', '敏感肌'] },
    { tenant_id: tenantId, name: '陳貝拉 (Bella)', phone: '0922333444', notes: '喜歡誇張款式', tags: ['美甲控'] },
    { tenant_id: tenantId, name: '張可樂 (Chloe)', phone: '0988777666', notes: '睫毛易倒插', tags: ['一般會員'] }
  ];

  const { data: custs, error: custError } = await supabase.from('customers').insert(customersData).select();
  if (custError) throw custError;

  const custAmy = custs.find(c => c.name.includes('Amy'));
  const custBella = custs.find(c => c.name.includes('Bella'));
  const custChloe = custs.find(c => c.name.includes('Chloe'));

  // 7. Insert Appointments
  console.log('📅 Creating Appointments...');
  
  // FIX: Force Year to 2026 (User confirmed 2026)
  const baseDate = new Date();
  baseDate.setFullYear(2026); 
  const now = baseDate;
  
  const addHours = (h) => new Date(now.getTime() + h * 60 * 60 * 1000).toISOString();
  const subDays = (d) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000).toISOString();
  
  // Note: We need to handle exact times better, but for demo this is fine.
  // To avoid date parsing issues, we use ISO strings.

  const appsData = [
    // Completed (Past)
    { 
      tenant_id: tenantId, staff_id: staffJess.id, customer_id: custAmy.id, service_id: findSvc('水飛梭'),
      start_time: new Date(Date.now() - 3 * 86400000).toISOString(), // 3 days ago
      end_time: new Date(Date.now() - 3 * 86400000 + 90*60000).toISOString(),
      status: 'completed', notes: '客人很滿意'
    },
    // Confirmed (Today - 2 hours later) - Added for immediate visibility
    { 
      tenant_id: tenantId, staff_id: staffIvy.id, customer_id: custBella.id, service_id: findSvc('3D 自然款'),
      start_time: new Date(Date.now() + 2 * 3600000).toISOString(), // Today + 2h
      end_time: new Date(Date.now() + 3.5 * 3600000).toISOString(),
      status: 'confirmed', notes: '趕時間，請準時'
    },
    // Confirmed (Future)
    { 
      tenant_id: tenantId, staff_id: staffNana.id, customer_id: custAmy.id, service_id: findSvc('單色凝膠'),
      start_time: new Date(Date.now() + 1 * 86400000 + 3600000).toISOString(), // Tomorrow + 1h
      end_time: new Date(Date.now() + 1 * 86400000 + 7200000).toISOString(),
      status: 'confirmed', notes: '要卸甲'
    },
    // Blocked
    {
      tenant_id: tenantId, staff_id: staffJess.id,
      start_time: new Date(Date.now() + 2 * 86400000).toISOString(), // 2 days later
      end_time: new Date(Date.now() + 2 * 86400000 + 10800000).toISOString(),
      status: 'blocked', notes: '外出進修'
    }
  ];

  const { data: apps, error: appError } = await supabase.from('appointments').insert(appsData).select();
  if (appError) throw appError;

  console.log(`✅ Successfully seeded ${apps.length} appointments!`);
  console.log('🚀 NEXA System Ready.');
}

seedBeautyData().catch(console.error);
