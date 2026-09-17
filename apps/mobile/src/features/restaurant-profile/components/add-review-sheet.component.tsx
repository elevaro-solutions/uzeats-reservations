import { Modal, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import { REVIEW_MAX_PHOTOS } from "@reservations/shared";

import { ImageIcon, XIcon } from "@/assets";
import {
  Button,
  Flex,
  Input,
  RemoteImage,
  StarRatingInput,
  Typography,
} from "@/components";

import { useCreateReview } from "../hooks/use-create-review.hook";

export type AddReviewSheetProps = {
  visible: boolean;
  restaurantName: string;
  restaurantPhoto?: string | null;
  reservationId: string | null;
  onClose: () => void;
  onSubmitted: () => void;
};

const QUALITY_ROWS = [
  { key: "overall" as const, label: "Overall", size: 40 },
  { key: "food" as const, label: "Food", size: 28 },
  { key: "service" as const, label: "Service", size: 28 },
  { key: "atmosphere" as const, label: "Atmosphere", size: 28 },
];

export function AddReviewSheet({
  visible,
  restaurantName,
  restaurantPhoto,
  reservationId,
  onClose,
  onSubmitted,
}: AddReviewSheetProps) {
  const insets = useSafeAreaInsets();
  const { theme } = useUnistyles();
  const {
    ratings,
    setQuality,
    comment,
    setComment,
    photos,
    pickPhotos,
    removePhoto,
    uploadingPhotos,
    hasAllRatings,
    loading,
    handleSubmit,
  } = useCreateReview({ visible, reservationId, onClose, onSubmitted });

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <Flex flex={1} style={styles.sheet}>
        <Flex direction="row" justifyContent="flex-end" style={styles.topBar}>
          <Pressable
            onPress={onClose}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Close review form"
          >
            <XIcon size={24} />
          </Pressable>
        </Flex>

        <ScrollView
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Flex alignItems="center" gap={1.5} style={styles.hero}>
            {restaurantPhoto?.trim() ? (
              <RemoteImage
                uri={restaurantPhoto}
                style={styles.photo}
                accessibilityLabel={restaurantName}
              />
            ) : (
              <View style={styles.photoPlaceholder} />
            )}

            <Flex alignItems="center" gap={0.25}>
              <Typography size="text-xl" weight="bold" align="center">
                {restaurantName}
              </Typography>
              <Typography size="text-sm" color="secondary" align="center">
                Rate overall, food, service, and atmosphere
              </Typography>
            </Flex>
          </Flex>

          <Flex gap={2} style={styles.qualities}>
            {QUALITY_ROWS.map(({ key, label, size }) => (
              <Flex key={key} gap={0.75}>
                <Typography size="text-sm" weight="semibold">
                  {label}
                </Typography>
                <StarRatingInput
                  value={ratings[key]}
                  onChange={(value) => setQuality(key, value)}
                  size={size}
                  disabled={loading}
                />
              </Flex>
            ))}
          </Flex>

          {hasAllRatings ? (
            <Input
              label="Tell us more (optional)"
              placeholder="Why this rating?"
              value={comment}
              onChangeText={setComment}
              multiline
              numberOfLines={3}
              editable={!loading}
              style={styles.commentInput}
            />
          ) : null}

          <Flex gap={1}>
            <Typography size="text-sm" weight="semibold">
              Photos (optional)
            </Typography>
            <Typography size="text-xs" color="muted">
              Up to {REVIEW_MAX_PHOTOS} images
            </Typography>
            {photos.length > 0 ? (
              <Flex direction="row" gap={1} style={styles.photoRow}>
                {photos.map((url) => (
                  <View key={url} style={styles.thumbWrap}>
                    <RemoteImage
                      uri={url}
                      style={styles.thumb}
                      accessibilityLabel="Review photo"
                    />
                    <Pressable
                      onPress={() => removePhoto(url)}
                      style={styles.removeThumb}
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel="Remove photo"
                      disabled={loading}
                    >
                      <XIcon size={14} color={theme.colors.textPrimary} />
                    </Pressable>
                  </View>
                ))}
              </Flex>
            ) : null}
            {photos.length < REVIEW_MAX_PHOTOS ? (
              <Button
                color="secondary"
                fullWidth
                loading={uploadingPhotos}
                disabled={loading}
                onPress={pickPhotos}
                startIcon={<ImageIcon size={18} />}
              >
                Add photos
              </Button>
            ) : null}
          </Flex>
        </ScrollView>

        <Flex
          style={[
            styles.footer,
            { paddingBottom: Math.max(insets.bottom, styles.footerPad.padding) },
          ]}
        >
          <Button
            fullWidth
            size="lg"
            disabled={!hasAllRatings || loading || !reservationId}
            loading={loading}
            onPress={handleSubmit}
          >
            Submit
          </Button>
        </Flex>
      </Flex>
    </Modal>
  );
}

const styles = StyleSheet.create(({ space, colors, radius }) => ({
  sheet: {
    backgroundColor: colors.background,
  },
  topBar: {
    paddingHorizontal: space(2),
    paddingTop: space(2),
    paddingBottom: space(0.5),
  },
  body: {
    paddingHorizontal: space(2),
    paddingBottom: space(2),
    gap: space(2.5),
  },
  hero: {
    paddingTop: space(0.5),
  },
  photo: {
    width: space(9),
    height: space(9),
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  photoPlaceholder: {
    width: space(9),
    height: space(9),
    borderRadius: radius.lg,
    backgroundColor: colors.slate3,
  },
  qualities: {
    width: "100%",
  },
  commentInput: {
    minHeight: space(10),
  },
  photoRow: {
    flexWrap: "wrap",
  },
  thumbWrap: {
    position: "relative",
  },
  thumb: {
    width: space(9),
    height: space(9),
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  removeThumb: {
    position: "absolute",
    top: space(0.5),
    right: space(0.5),
    width: space(3),
    height: space(3),
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  footer: {
    paddingHorizontal: space(2),
    paddingTop: space(1.5),
    borderTopWidth: 1,
    borderTopColor: colors.slate3,
  },
  footerPad: {
    padding: space(2),
  },
}));
