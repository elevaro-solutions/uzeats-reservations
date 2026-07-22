import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Alert, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { brand } from '../src/lib/brand';
import { useAuth } from '../src/lib/auth';

export default function LoginScreen() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('diner@tablevera.local');
  const [password, setPassword] = useState('Password123!');
  const [loading, setLoading] = useState(false);

  return (
    <View style={styles.container}>
      <Image source={require('../assets/icon.png')} style={styles.logo} accessibilityLabel="Tablevera" />
      <Text style={styles.brand}>
        <Text style={styles.brandTable}>Table</Text>
        <Text style={styles.brandVera}>vera</Text>
      </Text>
      <Text style={styles.title}>Sign in</Text>
      <TextInput
        style={styles.input}
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        placeholder="Email"
      />
      <TextInput
        style={styles.input}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        placeholder="Password"
      />
      <Pressable
        style={styles.button}
        disabled={loading}
        onPress={async () => {
          setLoading(true);
          try {
            await login(email, password);
            router.replace('/');
          } catch (err) {
            Alert.alert('Login failed', err instanceof Error ? err.message : 'Error');
          } finally {
            setLoading(false);
          }
        }}
      >
        <Text style={styles.buttonText}>{loading ? 'Signing in…' : 'Sign in'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#fff', justifyContent: 'center' },
  logo: { width: 72, height: 72, alignSelf: 'center', marginBottom: 12, mixBlendMode: 'lighten' },
  brand: { fontSize: 28, fontWeight: '700', textAlign: 'center', marginBottom: 24, letterSpacing: -0.5 },
  brandTable: { color: brand.primary },
  brandVera: { color: brand.accent },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 20 },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  button: {
    backgroundColor: brand.primary,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: '700' },
});
