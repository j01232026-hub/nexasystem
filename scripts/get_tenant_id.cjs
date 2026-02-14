
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'e:/salon/.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function getTenantId() {
  const slug = 'nexa-demo-dev';
  console.log(`Fetching ID for slug: ${slug}`);

  const { data, error } = await supabase
    .from('tenants')
    .select('id, name')
    .eq('slug', slug)
    .single();

  if (error) {
    console.error('Error fetching tenant:', error);
  } else {
    console.log('Tenant ID:', data.id);
  }
}

getTenantId();
