
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkIntegrity() {
  console.log('🔍 Starting Data Integrity Check...\n');

  // 1. Check Tenant
  const { data: tenants } = await supabase.from('tenants').select('*');
  console.log('🏢 Tenants found:', tenants.length);
  tenants.forEach(t => console.log(`   - [${t.id}] ${t.name} (${t.slug})`));

  // 2. Check User (demo@nexa.com)
  const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();
  const demoUser = users.find(u => u.email === 'demo@nexa.com');
  
  if (!demoUser) {
    console.error('❌ User demo@nexa.com NOT FOUND in Auth!');
  } else {
    console.log(`\n👤 User found: demo@nexa.com [${demoUser.id}]`);
    
    // 3. Check Profile
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', demoUser.id).single();
    
    if (!profile) {
      console.error('❌ Profile NOT FOUND for this user!');
    } else {
      console.log(`   - Linked Tenant ID in Profile: ${profile.tenant_id}`);
      
      const linkedTenant = tenants.find(t => t.id === profile.tenant_id);
      if (linkedTenant) {
        console.log(`   - ✅ Profile is linked to: ${linkedTenant.name}`);
      } else {
        console.error(`   - ❌ Profile is linked to a NON-EXISTENT Tenant ID!`);
      }

      // 4. Check Appointments for this Tenant
      const { count, error: countError } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', profile.tenant_id);
        
      console.log(`\n📅 Appointments count for Tenant [${profile.tenant_id}]: ${count}`);
      
      if (count === 0) {
        console.warn('   ⚠️  This user sees NO appointments because their tenant has 0 appointments.');
        
        // Check if appointments exist elsewhere
        const { data: allApps } = await supabase.from('appointments').select('tenant_id').limit(5);
        if (allApps.length > 0) {
            console.log('   💡 However, appointments EXIST for these Tenant IDs:');
            allApps.forEach(a => console.log(`      - ${a.tenant_id}`));
            
            if (allApps[0].tenant_id !== profile.tenant_id) {
                console.log('   🚨 MISMATCH DETECTED: Data is in a different tenant than the user!');
            }
        }
      } else {
          // Check dates of appointments
          const { data: apps } = await supabase
            .from('appointments')
            .select('start_time, status, staff(display_name)')
            .eq('tenant_id', profile.tenant_id)
            .order('start_time', { ascending: true });
            
          console.log('\n   📅 Appointment Details:');
          apps.forEach(a => {
              console.log(`      - ${new Date(a.start_time).toLocaleString()} | ${a.status} | ${a.staff?.display_name}`);
          });
      }
    }
  }
}

checkIntegrity().catch(console.error);
