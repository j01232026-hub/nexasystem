
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rtezspttgierlfhviyiy.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ0ZXpzcHR0Z2llcmxmaHZpeWl5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDgzNzc0MSwiZXhwIjoyMDg2NDEzNzQxfQ.cMrQ8KaXOZsu39NSzhCNFk4XLipcwuZgpKGmRALPruA';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ0ZXpzcHR0Z2llcmxmaHZpeWl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4Mzc3NDEsImV4cCI6MjA4NjQxMzc0MX0.4jtVFVPhsx7wHe2Ylw9jB21gwhAzo8rt8m_kkNuJF90';

const admin = createClient(supabaseUrl, serviceKey);
const anon = createClient(supabaseUrl, anonKey);

async function run() {
    console.log('--- 1. Checking Customers Schema (via Admin) ---');
    const { data: customers, error } = await admin.from('customers').select('*').limit(1);
    if (error) {
        console.error('Error reading customers:', error);
    } else if (customers.length > 0) {
        console.log('Customer Columns:', Object.keys(customers[0]));
    } else {
        console.log('No customers found. Attempting to insert dummy to check schema...');
        // Try insert with avatar_url to see if it fails
        const { error: insertError } = await admin.from('customers').insert({
            name: 'Schema Test',
            phone: '0000000000',
            avatar_url: 'http://test.com' // Testing this column
        });
        if (insertError) {
            console.log('Insert failed (likely schema mismatch):', insertError.message);
        } else {
            console.log('Insert success! avatar_url exists.');
            // cleanup
            await admin.from('customers').delete().eq('phone', '0000000000');
        }
    }

    console.log('\n--- 2. Checking Tenants Access (via Anon) ---');
    // Need a valid tenant ID. Let's get one from admin first.
    const { data: tenant } = await admin.from('tenants').select('id').limit(1).single();
    if (tenant) {
        console.log('Testing access for Tenant ID:', tenant.id);
        const { data: tData, error: tError } = await anon.from('tenants').select('name').eq('id', tenant.id).single();
        if (tError) {
            console.error('Anon read tenants failed:', tError.message);
        } else {
            console.log('Anon read tenants success:', tData);
        }
    } else {
        console.log('No tenant found to test.');
    }
}

run();
