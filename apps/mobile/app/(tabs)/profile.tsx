import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/lib/auth';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();

  if (!user) {
    return (
      <View style={styles.centered}>
        <Text style={styles.heading}>Not signed in</Text>
        <Pressable style={styles.primaryBtn} onPress={() => router.push('/login')}>
          <Text style={styles.primaryText}>Sign in</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.centered}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {user.firstName[0]}
          {user.lastName[0]}
        </Text>
      </View>
      <Text style={styles.name}>
        {user.firstName} {user.lastName}
      </Text>
      <Text style={styles.email}>{user.email}</Text>

      <View style={styles.statCard}>
        <Text style={styles.statValue}>{user.loyaltyPoints}</Text>
        <Text style={styles.statLabel}>Loyalty points</Text>
      </View>

      {(user.role === 'restaurant_owner' || user.role === 'staff') && (
        <Pressable
          style={[styles.primaryBtn, { marginTop: 16 }]}
          onPress={() => router.push('/owner/floor-plan')}
        >
          <Text style={styles.primaryText}>Floor plan</Text>
        </Pressable>
      )}

      <Pressable
        style={styles.logoutBtn}
        onPress={async () => {
          await logout();
          router.replace('/');
        }}
      >
        <Text style={styles.logoutText}>Log out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    backgroundColor: '#f7f7f7',
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#da3743',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  avatarText: { color: '#fff', fontSize: 28, fontWeight: '700' },
  name: { fontSize: 22, fontWeight: '700' },
  email: { color: '#666', marginTop: 4, fontSize: 15 },
  heading: { fontSize: 20, fontWeight: '700', marginBottom: 16 },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginTop: 24,
    width: '100%',
  },
  statValue: { fontSize: 32, fontWeight: '700', color: '#da3743' },
  statLabel: { color: '#666', marginTop: 4 },
  primaryBtn: {
    backgroundColor: '#da3743',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    width: '100%',
  },
  primaryText: { color: '#fff', fontWeight: '700' },
  logoutBtn: {
    marginTop: 24,
    borderWidth: 1,
    borderColor: '#da3743',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    width: '100%',
  },
  logoutText: { color: '#da3743', fontWeight: '700' },
});
