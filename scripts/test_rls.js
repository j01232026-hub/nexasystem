
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rtezspttgierlfhviyiy.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ0ZXpzcHR0Z2llcmxmaHZpeWl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4Mzc3NDEsImV4cCI6MjA4NjQxMzc0MX0.4jtVFVPhsx7wHe2Ylw9jB21gwhAzo8rt8m_kkNuJF90';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testRLS() {
  console.log('Testing RLS...');
  const email = 'demo@nexa.com';
  const password = 'password123';

  // 1. Login
  const { data: { user }, error: loginError } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (loginError) {
    console.error('Login failed:', loginError);
    return;
  }
  console.log('Logged in as:', user.id);

  // 2. Try to fetch own profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profileError) {
    console.error('Profile fetch failed (RLS likely blocking):', profileError);
  } else {
    console.log('Profile fetched successfully:', profile);
  }
}

testRLS();
