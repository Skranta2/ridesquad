import { supabase } from './supabase';

async function testConnection() {
  try {
    console.log('Testing Supabase connection...');
    
    // Test basic database connection
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .limit(1);

    if (error) {
      console.log('Connection test failed. This might be expected if the table does not exist yet.');
      console.log('Error details:', error);
    } else {
      console.log('Successfully connected to Supabase!');
      console.log('Sample data:', data);
    }
    
    // Test auth configuration
    const { data: authData, error: authError } = await supabase.auth.getSession();
    if (authError) {
      console.log('Auth test failed:', authError.message);
    } else {
      console.log('Auth is properly configured!');
      console.log('Current session:', authData.session ? 'User is signed in' : 'No active session');
    }
    
  } catch (error) {
    console.error('Unexpected error during Supabase connection test:', error);
  }
}

testConnection();
