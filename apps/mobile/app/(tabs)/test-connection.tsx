import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Button } from 'react-native';
import { supabase } from '@/lib/supabase';

export default function TestConnectionScreen() {
  const [loading, setLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState('Testing connection...');
  const [sessionStatus, setSessionStatus] = useState('Checking session...');

  useEffect(() => {
    testConnection();
  }, []);

  const testConnection = async () => {
    try {
      setLoading(true);
      
      // Test basic connection
      const { data, error } = await supabase.from('profiles').select('*').limit(1);
      
      if (error) {
        setConnectionStatus(`❌ Connection error: ${error.message}`);
      } else {
        setConnectionStatus('✅ Successfully connected to Supabase!');
      }
      
      // Test auth
      const { data: { session } } = await supabase.auth.getSession();
      setSessionStatus(session ? '✅ Active session found' : 'ℹ️ No active session');
      
    } catch (error: any) {
      setConnectionStatus(`❌ Error: ${error?.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Supabase Connection Test</Text>
      
      <View style={styles.statusContainer}>
        {loading ? (
          <ActivityIndicator size="large" color="#0000ff" />
        ) : (
          <>
            <Text style={styles.statusText}>{connectionStatus}</Text>
            <Text style={styles.statusText}>{sessionStatus}</Text>
            <Button title="Test Again" onPress={testConnection} />
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  statusContainer: {
    alignItems: 'center',
    padding: 20,
    borderRadius: 10,
    backgroundColor: '#f5f5f5',
  },
  statusText: {
    fontSize: 16,
    marginBottom: 10,
    textAlign: 'center',
  },
});
