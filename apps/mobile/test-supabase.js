// Simple test script to verify Supabase connection
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  try {
    console.log('🔄 Testing Supabase connection...');
    
    // Test basic connection
    const { data, error } = await supabase.from('profiles').select('*').limit(1);
    
    if (error) {
      console.log('❌ Could not connect to Supabase. This might be expected if the table does not exist yet.');
      console.log('Error details:', error.message);
    } else {
      console.log('✅ Successfully connected to Supabase!');
    }
    
    // Test auth
    const { data: { session } } = await supabase.auth.getSession();
    console.log('🔑 Auth test:', session ? '✅ Session exists' : 'ℹ️ No active session');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

testConnection();
