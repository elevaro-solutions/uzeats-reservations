import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  StyleSheet,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Link } from 'expo-router';
import { useQuery } from '@apollo/client';
import { SEARCH } from '../../src/lib/graphql';

export default function HomeScreen() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [city, setCity] = useState('New York');
  const [query, setQuery] = useState('');
  const [date, setDate] = useState(tomorrow.toISOString().slice(0, 10));
  const [partySize, setPartySize] = useState(2);

  const { data, loading } = useQuery(SEARCH, {
    variables: {
      input: {
        city: city || undefined,
        query: query || undefined,
        partySize,
        date,
        page: 1,
        limit: 30,
      },
    },
  });

  return (
    <View style={styles.container}>
      <Text style={styles.brand}>Find a table</Text>

      <TextInput
        style={styles.input}
        placeholder="City"
        value={city}
        onChangeText={setCity}
      />
      <TextInput
        style={styles.input}
        placeholder="Search restaurants"
        value={query}
        onChangeText={setQuery}
      />

      <View style={styles.row}>
        <View style={styles.dateField}>
          <Text style={styles.label}>Date</Text>
          <TextInput
            style={styles.input}
            placeholder="YYYY-MM-DD"
            value={date}
            onChangeText={setDate}
          />
        </View>
        <View style={styles.partyField}>
          <Text style={styles.label}>Party size</Text>
          <View style={styles.stepper}>
            <Pressable
              style={styles.stepperBtn}
              onPress={() => setPartySize((s) => Math.max(1, s - 1))}
            >
              <Text style={styles.stepperText}>−</Text>
            </Pressable>
            <Text style={styles.stepperValue}>{partySize}</Text>
            <Pressable
              style={styles.stepperBtn}
              onPress={() => setPartySize((s) => Math.min(20, s + 1))}
            >
              <Text style={styles.stepperText}>+</Text>
            </Pressable>
          </View>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color="#da3743" style={{ marginTop: 24 }} />
      ) : (
        <FlatList
          data={data?.searchRestaurants?.items ?? []}
          keyExtractor={(item: any) => item.id}
          contentContainerStyle={{ paddingBottom: 40 }}
          renderItem={({ item }: { item: any }) => (
            <Link href={`/restaurant/${item.id}` as any} asChild>
              <Pressable style={styles.card}>
                {item.photos?.[0] ? (
                  <Image source={{ uri: item.photos[0] }} style={styles.image} />
                ) : (
                  <View style={[styles.image, styles.imagePlaceholder]} />
                )}
                <View style={styles.cardBody}>
                  <Text style={styles.name}>{item.name}</Text>
                  <Text style={styles.meta}>
                    {item.cuisine} · {'$'.repeat(item.priceRange)} · {item.address.city}
                  </Text>
                  <Text style={styles.meta}>★ {item.averageRating?.toFixed?.(1) ?? '—'}</Text>
                </View>
              </Pressable>
            </Link>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f7f7', padding: 16 },
  brand: { fontSize: 22, fontWeight: '700', color: '#da3743', marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 4 },
  input: {
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#eee',
  },
  row: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  dateField: { flex: 2 },
  partyField: { flex: 1 },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#eee',
    paddingVertical: 6,
    justifyContent: 'center',
    marginBottom: 8,
  },
  stepperBtn: { paddingHorizontal: 14, paddingVertical: 4 },
  stepperText: { fontSize: 20, color: '#da3743', fontWeight: '700' },
  stepperValue: { fontSize: 16, fontWeight: '700', minWidth: 24, textAlign: 'center' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 12,
  },
  image: { width: '100%', height: 140 },
  imagePlaceholder: { backgroundColor: '#e8e8e8' },
  cardBody: { padding: 12 },
  name: { fontSize: 17, fontWeight: '700' },
  meta: { color: '#666', marginTop: 4 },
});
