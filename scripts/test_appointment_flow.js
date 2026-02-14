
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
// Use Anon Key to test RLS policies properly (simulating frontend)
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY; 

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase URL or Key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testFlow() {
  console.log('--- Starting Appointment Flow Test ---');

  // 1. Sign In
  const { data: { user }, error: authError } = await supabase.auth.signInWithPassword({
    email: 'demo@nexa.com',
    password: 'password123'
  });

  if (authError) {
    console.error('Login failed:', authError.message);
    process.exit(1);
  }
  console.log('Logged in as:', user.email);

  // Get Profile/Tenant
  const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single();
  const tenantId = profile.tenant_id;
  console.log('Tenant ID:', tenantId);

  // 2. Ensure Service Exists
  let serviceId;
  const { data: services } = await supabase.from('services').select('id').eq('name', 'Test Haircut').limit(1);
  
  if (services && services.length > 0) {
    serviceId = services[0].id;
    console.log('Found existing service:', serviceId);
  } else {
    const { data: newService, error: sError } = await supabase.from('services').insert({
      tenant_id: tenantId,
      name: 'Test Haircut',
      duration: 60,
      price: 500,
      category: 'General'
    }).select().single();
    
    if (sError) {
        // Maybe category validation fails? Try minimal
        console.error('Service creation failed (might need category setup):', sError.message);
        // Try to fetch ANY service
        const { data: anyService } = await supabase.from('services').select('id').limit(1).single();
        if (anyService) serviceId = anyService.id;
        else throw new Error('No services available and cannot create one.');
    } else {
        serviceId = newService.id;
        console.log('Created test service:', serviceId);
    }
  }

  // 3. Ensure Staff Exists
  let staffId;
  const { data: staffs } = await supabase.from('staff').select('id').eq('display_name', 'Test Alice').limit(1);
  
  if (staffs && staffs.length > 0) {
    staffId = staffs[0].id;
    console.log('Found existing staff:', staffId);
  } else {
    const { data: newStaff, error: stError } = await supabase.from('staff').insert({
      tenant_id: tenantId,
      full_name: 'Test Alice Full',
      display_name: 'Test Alice',
      role: 'stylist',
      is_active: true
    }).select().single();
    
    if (stError) throw stError;
    staffId = newStaff.id;
    console.log('Created test staff:', staffId);
  }

  // 4. Link Staff to Service (if not exists)
  // Check junction
  const { data: links } = await supabase.from('staff_services')
    .select('*')
    .eq('staff_id', staffId)
    .eq('service_id', serviceId);
    
  if (!links || links.length === 0) {
     const { error: linkError } = await supabase.from('staff_services').insert({
         staff_id: staffId,
         service_id: serviceId
     });
     if (linkError) console.error('Link staff-service failed:', linkError.message);
     else console.log('Linked Staff to Service');
  } else {
     console.log('Staff already linked to service');
  }

  // 5. Create Customer
  let customerId;
  const { data: custs } = await supabase.from('customers').select('id').eq('name', 'Test Bob').limit(1);
  if (custs && custs.length > 0) {
      customerId = custs[0].id;
  } else {
      const { data: newCust, error: cError } = await supabase.from('customers').insert({
          tenant_id: tenantId,
          name: 'Test Bob',
          phone: '0912345678'
      }).select().single();
      if (cError) throw cError;
      customerId = newCust.id;
      console.log('Created customer:', customerId);
  }

  // 6. Create Appointment (Booking)
  const startTime = new Date();
  startTime.setHours(10, 0, 0, 0); // Today 10:00
  const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // 11:00

  const { data: appt, error: apptError } = await supabase.from('appointments').insert({
      tenant_id: tenantId,
      customer_id: customerId,
      staff_id: staffId,
      service_id: serviceId,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      status: 'confirmed',
      notes: 'Test Booking'
  }).select().single();

  if (apptError) {
      console.error('Appointment creation failed:', apptError);
  } else {
      console.log('Created Appointment:', appt.id);
      
      // Add Item
      const { error: itemError } = await supabase.from('appointment_items').insert({
          appointment_id: appt.id,
          service_id: serviceId,
          price: 500,
          duration: 60
      });
      if (itemError) console.error('Item creation failed:', itemError);
      else console.log('Added Appointment Item');
  }

  // 7. Create Blocked Time
  const blockStart = new Date();
  blockStart.setHours(12, 0, 0, 0);
  const blockEnd = new Date(blockStart.getTime() + 60 * 60 * 1000);

  const { data: block, error: blockError } = await supabase.from('appointments').insert({
      tenant_id: tenantId,
      staff_id: staffId,
      start_time: blockStart.toISOString(),
      end_time: blockEnd.toISOString(),
      status: 'blocked',
      notes: 'Lunch Break'
  }).select().single();

  if (blockError) console.error('Block creation failed:', blockError);
  else console.log('Created Block:', block.id);

  // 8. Verify Query (Calendar Page logic)
  console.log('Verifying Calendar Query...');
  const { data: calendarData, error: qError } = await supabase
    .from('appointments')
    .select(`
      *,
      customers (name),
      services (name, duration),
      staff (display_name)
    `)
    .eq('tenant_id', tenantId)
    .gte('start_time', new Date(new Date().setHours(0,0,0,0)).toISOString())
    .lte('start_time', new Date(new Date().setHours(23,59,59,999)).toISOString());

  if (qError) console.error('Query failed:', qError);
  else {
      console.log(`Found ${calendarData.length} appointments/blocks for today.`);
      calendarData.forEach(a => {
          console.log(`- [${a.status}] ${a.start_time} - ${a.staff?.display_name}: ${a.customers?.name || 'No Customer'} (${a.services?.name || 'No Service'})`);
      });
  }
}

testFlow().catch(err => {
  console.error('Unhandled Error in testFlow:', err);
  process.exit(1);
});
