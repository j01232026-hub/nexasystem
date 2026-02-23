
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rtezspttgierlfhviyiy.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ0ZXpzcHR0Z2llcmxmaHZpeWl5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDgzNzc0MSwiZXhwIjoyMDg2NDEzNzQxfQ.cMrQ8KaXOZsu39NSzhCNFk4XLipcwuZgpKGmRALPruA';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function initData() {
  console.log('Start initializing dev data...');

  // 1. Check/Create Tenant
  let tenantId;
  const { data: tenants, error: tenantQueryError } = await supabase.from('tenants').select('*').limit(1);
  
  if (tenantQueryError) {
    console.error('Error querying tenants:', tenantQueryError);
    return;
  }

  if (tenants && tenants.length > 0) {
    console.log('Tenant already exists:', tenants[0].name);
    tenantId = tenants[0].id;

    // Auto-fix name if it's the old one
    if (tenants[0].name === 'Glow Demo Salon' || tenants[0].slug === 'glow-demo-dev') {
        console.log('Migrating tenant name to NEXA...');
        const { error: updateError } = await supabase
            .from('tenants')
            .update({ 
                name: 'NEXA Demo Salon', 
                slug: 'nexa-demo-dev' 
            })
            .eq('id', tenantId);
            
        if (updateError) console.error('Error updating tenant:', updateError);
        else console.log('Tenant updated to NEXA Demo Salon');
    }
  } else {
    console.log('Creating new tenant...');
    const { data: newTenant, error: createError } = await supabase
      .from('tenants')
      .insert({
        name: 'NEXA Demo Salon',
        slug: 'nexa-demo-dev',
        plan_type: 'pro'
      })
      .select()
      .single();
    
    if (createError) {
      console.error('Error creating tenant:', createError);
      return;
    }
    console.log('Tenant created:', newTenant.name);
    tenantId = newTenant.id;
  }

  // 2. Check/Create User
  const email = 'demo@nexa.com';
  const password = 'password123';
  let userId;

  console.log('Checking for existing user:', email);
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
  
  if (listError) {
      console.error('Error listing users:', listError);
      return;
  }

  const existingUser = users.find(u => u.email === email);
  
  if (existingUser) {
      console.log('User already exists:', existingUser.id);
      userId = existingUser.id;

      // Ensure email is confirmed (Force update)
      console.log('Force confirming email for existing user...');
      const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
        email_confirm: true,
        user_metadata: { email_verified: true } // Also update metadata just in case
      });
      if (updateError) {
          console.error('Error confirming email:', updateError);
      } else {
          console.log('User email confirmed.');
      }
  } else {
      console.log('Creating new user...');
      const { data: userData, error: createError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true
      });
      
      if (createError) {
          console.error('Error creating user:', createError);
          return;
      }
      console.log('User created:', userData.user.id);
      userId = userData.user.id;
  }

  // 3. Check/Create Profile
  if (userId && tenantId) {
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).single();
    
    if (!profile) {
      console.log('Creating profile...');
      const { error: profileError } = await supabase.from('profiles').insert({
        id: userId,
        tenant_id: tenantId,
        role: 'owner',
        full_name: 'Demo Admin'
      });
      
      if (profileError) {
        console.error('Error creating profile:', profileError);
      } else {
        console.log('Profile created successfully.');
      }
    } else {
      console.log('Profile already exists.');
    }
  }

  console.log('Initialization complete! You can now login with demo@nexa.com / password123');
}

initData();
