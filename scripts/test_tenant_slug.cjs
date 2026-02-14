
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'e:/salon/.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testTenantResolution() {
  const tenantId = '074fe7e8-7881-447d-81eb-9faa638d2270';
  console.log(`Testing service fetch for tenantId: ${tenantId}`);

  const { data, error } = await supabase
    .from('services')
    .select('id, name')
    .eq('tenant_id', tenantId)
    .limit(5);

  if (error) {
    console.error('Error fetching services:', error);
  } else if (data && data.length > 0) {
    console.log('Services found:', data);
  } else {
    console.log('Services not found or empty');
  }
}

testTenantResolution();
