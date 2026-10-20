import { useMutation } from "@apollo/client";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useState } from "react";
import { Alert, Platform } from "react-native";
import { REVIEW_MAX_PHOTOS } from "@reservations/shared";

import { CREATE_REVIEW, MY_RESERVATIONS } from "@/graphql";
import { PhotoTooLargeError, uploadFile } from "@/graphql/upload";
import { ensurePhotoLibraryAccess } from "@/lib/helpers";

import type { MyReservationsQueryData } from "../types";

export type UseCreateReviewOptions = {
  visible: boolean;
  reservationId: string | null;
  onClose: () => void;
  onSubmitted: () => void;
};

const EMPTY_RATINGS = {
  overall: 0,
  food: 0,
  service: 0,
  atmosphere: 0,
};

const MAX_FILE_SIZE = 5 * 1024 * 1024;

export function useCreateReview({
  visible,
  reservationId,
  onClose,
  onSubmitted,
}: UseCreateReviewOptions) {
  const [ratings, setRatings] = useState(EMPTY_RATINGS);
  const [comment, setComment] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [createReview, { loading }] = useMutation(CREATE_REVIEW);
  const hasAllRatings =
    ratings.overall > 0 &&
    ratings.food > 0 &&
    ratings.service > 0 &&
    ratings.atmosphere > 0;

  useEffect(() => {
    if (!visible) return;
    setRatings(EMPTY_RATINGS);
    setComment("");
    setPhotos([]);
    setUploadingPhotos(false);
  }, [visible, reservationId]);

  function setQuality(key: keyof typeof EMPTY_RATINGS, value: number) {
    setRatings((prev) => ({ ...prev, [key]: value }));
  }

  function removePhoto(url: string) {
    setPhotos((prev) => prev.filter((photo) => photo !== url));
  }

  async function pickPhotos() {
    const remaining = REVIEW_MAX_PHOTOS - photos.length;
    if (remaining <= 0) {
      Alert.alert("Photo limit", `You can attach up to ${REVIEW_MAX_PHOTOS} photos.`);
      return;
    }

    const allowed = await ensurePhotoLibraryAccess(
      "Allow photo access to attach images to your review.",
    );
    if (!allowed) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.85,
      ...(Platform.OS === "ios"
        ? {
            preferredAssetRepresentationMode:
              ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
          }
        : {}),
    });

    if (result.canceled || !result.assets.length) return;

    setUploadingPhotos(true);
    try {
      const uploaded: string[] = [];
      for (const asset of result.assets.slice(0, remaining)) {
        const filename = asset.fileName?.trim() || `review-${Date.now()}.jpg`;
        try {
          const { publicUrl } = await uploadFile(asset.uri, filename, {
            maxBytes: MAX_FILE_SIZE,
          });
          uploaded.push(publicUrl);
        } catch (error) {
          if (error instanceof PhotoTooLargeError) {
            Alert.alert("File too large", "Each photo must be 5MB or smaller.");
            continue;
          }
          throw error;
        }
      }
      if (uploaded.length) {
        setPhotos((prev) => [...prev, ...uploaded].slice(0, REVIEW_MAX_PHOTOS));
      }
    } catch (error) {
      Alert.alert(
        "Couldn't upload photo",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setUploadingPhotos(false);
    }
  }

  async function handleSubmit() {
    if (!reservationId || !hasAllRatings || uploadingPhotos) return;

    try {
      await createReview({
        variables: {
          input: {
            reservationId,
            rating: ratings.overall,
            foodRating: ratings.food,
            serviceRating: ratings.service,
            atmosphereRating: ratings.atmosphere,
            comment: comment.trim() || undefined,
            ...(photos.length ? { photos } : {}),
          },
        },
        refetchQueries: [{ query: MY_RESERVATIONS }],
        update(cache) {
          const existing = cache.readQuery<MyReservationsQueryData>({
            query: MY_RESERVATIONS,
          });
          if (!existing?.myReservations) return;

          cache.writeQuery({
            query: MY_RESERVATIONS,
            data: {
              myReservations: existing.myReservations.map((reservation) =>
                reservation.id === reservationId
                  ? { ...reservation, hasReview: true }
                  : reservation,
              ),
            },
          });
        },
      });
      onClose();
      onSubmitted();
      Alert.alert("Thank you", "Your review has been submitted.");
    } catch (error) {
      Alert.alert(
        "Couldn't submit review",
        error instanceof Error ? error.message : "Please try again.",
      );
    }
  }

  return {
    ratings,
    setQuality,
    comment,
    setComment,
    photos,
    pickPhotos,
    removePhoto,
    uploadingPhotos,
    hasAllRatings,
    loading: loading || uploadingPhotos,
    handleSubmit,
  };
}
