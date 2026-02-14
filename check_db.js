
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
    // 1. Get the first tenant (assuming demo/dev environment has one or we pick the first)
    const { data: tenants, error } = await supabase
        .from('tenants')
        .select('id, name, deposit_config')
        .limit(1);

    if (error) {
        console.error('Error fetching tenants:', error);
        return;
    }

    console.log('Current Tenants Data:');
    console.log(JSON.stringify(tenants, null, 2));
}

checkData();
