import { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useQuery, useMutation } from '@apollo/client';
import { useRouter } from 'expo-router';
import {
  MY_RESERVATIONS,
  UPDATE_RESERVATION_STATUS,
  CREATE_REVIEW,
} from '../../src/lib/graphql';
import { useAuth } from '../../src/lib/auth';

export default function ReservationsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { data, loading, refetch } = useQuery(MY_RESERVATIONS, { skip: !user });
  const [updateStatus] = useMutation(UPDATE_RESERVATION_STATUS);
  const [createReview] = useMutation(CREATE_REVIEW);

  const [reviewTarget, setReviewTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!user) {
    router.replace('/login');
    return null;
  }

  const handleCancel = (id: string, name: string) => {
    Alert.alert('Cancel reservation', `Cancel your reservation at ${name}?`, [
      { text: 'Keep it', style: 'cancel' },
      {
        text: 'Cancel reservation',
        style: 'destructive',
        onPress: async () => {
          try {
            await updateStatus({
              variables: { id, status: 'cancelled', reason: 'Cancelled by diner' },
            });
            refetch();
          } catch (err) {
            Alert.alert(
              'Error',
              err instanceof Error ? err.message : 'Failed to cancel',
            );
          }
        },
      },
    ]);
  };

  const handleSubmitReview = async () => {
    if (!reviewTarget) return;
    setSubmitting(true);
    try {
      await createReview({
        variables: {
          input: {
            reservationId: reviewTarget.id,
            rating,
            comment: comment || undefined,
          },
        },
      });
      setReviewTarget(null);
      setComment('');
      setRating(5);
      Alert.alert('Thanks!', 'Your review has been submitted.');
    } catch (err) {
      Alert.alert(
        'Error',
        err instanceof Error ? err.message : 'Failed to submit review',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const cancellable = (status: string) =>
    status === 'confirmed' || status === 'pending';
  const reviewable = (status: string) => status === 'completed';

  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator color="#0b3d2e" style={{ marginTop: 24 }} />
      ) : (
        <FlatList
          data={data?.myReservations ?? []}
          keyExtractor={(item: any) => item.id}
          contentContainerStyle={{ paddingBottom: 40 }}
          ListEmptyComponent={
            <Text style={styles.empty}>No reservations yet</Text>
          }
          renderItem={({ item }: { item: any }) => (
            <View style={styles.card}>
              <Text style={styles.name}>{item.restaurant?.name}</Text>
              <Text style={styles.meta}>
                {new Date(item.slotStart).toLocaleString()} · {item.partySize}{' '}
                guests
              </Text>
              <Text
                style={[
                  styles.status,
                  item.status === 'cancelled' && styles.statusCancelled,
                ]}
              >
                {item.status}
              </Text>
              <View style={styles.actions}>
                {cancellable(item.status) && (
                  <Pressable
                    style={styles.cancelBtn}
                    onPress={() =>
                      handleCancel(item.id, item.restaurant?.name)
                    }
                  >
                    <Text style={styles.cancelText}>Cancel</Text>
                  </Pressable>
                )}
                {reviewable(item.status) && (
                  <Pressable
                    style={styles.reviewBtn}
                    onPress={() =>
                      setReviewTarget({
                        id: item.id,
                        name: item.restaurant?.name,
                      })
                    }
                  >
                    <Text style={styles.reviewText}>Leave review</Text>
                  </Pressable>
                )}
              </View>
            </View>
          )}
        />
      )}

      <Modal visible={!!reviewTarget} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Review {reviewTarget?.name}</Text>

            <Text style={styles.fieldLabel}>Rating</Text>
            <View style={styles.stars}>
              {[1, 2, 3, 4, 5].map((n) => (
                <Pressable key={n} onPress={() => setRating(n)}>
                  <Text
                    style={[styles.star, n <= rating && styles.starActive]}
                  >
                    ★
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Comment (optional)</Text>
            <TextInput
              style={[styles.input, styles.commentInput]}
              multiline
              placeholder="How was your experience?"
              value={comment}
              onChangeText={setComment}
            />

            <Pressable
              style={styles.submitBtn}
              onPress={handleSubmitReview}
              disabled={submitting}
            >
              <Text style={styles.submitText}>
                {submitting ? 'Submitting…' : 'Submit review'}
              </Text>
            </Pressable>
            <Pressable
              style={styles.dismissBtn}
              onPress={() => {
                setReviewTarget(null);
                setComment('');
                setRating(5);
              }}
            >
              <Text style={styles.dismissText}>Cancel</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f7f7', padding: 16 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  name: { fontWeight: '700', fontSize: 16 },
  meta: { color: '#666', marginTop: 4 },
  empty: { color: '#666', marginTop: 24, textAlign: 'center' },
  status: {
    marginTop: 8,
    color: '#0b3d2e',
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  statusCancelled: { color: '#999' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 10 },
  cancelBtn: {
    borderWidth: 1,
    borderColor: '#0b3d2e',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  cancelText: { color: '#0b3d2e', fontWeight: '600', fontSize: 13 },
  reviewBtn: {
    backgroundColor: '#0b3d2e',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  reviewText: { color: '#fff', fontWeight: '600', fontSize: 13 },

  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: { fontSize: 20, fontWeight: '700', marginBottom: 16 },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  stars: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  star: { fontSize: 32, color: '#ddd' },
  starActive: { color: '#f5a623' },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  commentInput: { height: 80, textAlignVertical: 'top' },
  submitBtn: {
    backgroundColor: '#0b3d2e',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 4,
  },
  submitText: { color: '#fff', fontWeight: '700' },
  dismissBtn: { alignItems: 'center', marginTop: 12 },
  dismissText: { color: '#666', fontWeight: '600' },
});
