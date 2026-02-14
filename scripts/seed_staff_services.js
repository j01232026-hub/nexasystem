
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey || anonKey);

async function seedStaffServices() {
  console.log('Seeding staff_services...');
  
  // 1. Get Tenant
  const { data: profiles } = await supabase.from('profiles').select('tenant_id').limit(1);
  if (!profiles || profiles.length === 0) {
      console.log('No profiles found.');
      return;
  }
  const tenantId = profiles[0].tenant_id;
  console.log('Tenant ID:', tenantId);

  // 2. Get All Staff and Services
  const { data: staff } = await supabase.from('staff').select('id, full_name').eq('tenant_id', tenantId);
  const { data: services } = await supabase.from('services').select('id, name').eq('tenant_id', tenantId);

  if (!staff || !services) {
      console.log('Missing staff or services.');
      return;
  }

  console.log(`Found ${staff.length} staff and ${services.length} services.`);

  // 3. Link everyone to everything (for dev simplicity)
  const inserts = [];
  for (const s of staff) {
      for (const serv of services) {
          inserts.push({
              staff_id: s.id,
              service_id: serv.id
          });
      }
  }

  if (inserts.length === 0) {
      console.log('Nothing to insert.');
      return;
  }

  console.log(`Attempting to insert ${inserts.length} links...`);
  
  // Upsert (ignore duplicates)
  const { error } = await supabase.from('staff_services').upsert(inserts, { onConflict: 'staff_id, service_id', ignoreDuplicates: true });
  
  if (error) {
      console.error('Error seeding:', error);
  } else {
      console.log('Seeding complete.');
  }
}

seedStaffServices();
