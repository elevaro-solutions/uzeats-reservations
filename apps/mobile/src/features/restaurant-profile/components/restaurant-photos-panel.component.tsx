import { useState } from "react";
import { Dimensions, Pressable } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import { Empty, Flex, RemoteImage, Typography } from "@/components";

import { DetailSectionHeader } from "./detail-section-header.component";
import { PhotoLightbox } from "./photo-lightbox.component";

const THUMB_RATIO = 5 / 4;

export type RestaurantPhotosPanelProps = {
  name: string;
  photos: string[];
};

function buildGallerySubtitle(name: string, count: number): string {
  const base = `Take a look inside ${name}`;
  if (count > 1) {
    return `${base} · ${count} photos`;
  }
  return base;
}

export function RestaurantPhotosPanel({
  name,
  photos,
}: RestaurantPhotosPanelProps) {
  const { theme } = useUnistyles();
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const width = Dimensions.get("window").width;
  const gap = theme.space(1.5);
  const colWidth = (width - theme.space(4) - gap) / 2;
  const thumbHeight = colWidth * THUMB_RATIO;

  function openViewer(index: number) {
    setViewerIndex(index);
  }

  if (photos.length === 0) {
    return (
      <Empty
        title="No photos yet"
        description="Photos of this restaurant will appear here."
      />
    );
  }

  return (
    <>
      <Flex gap={1.5}>
        <Flex gap={0.5}>
          <DetailSectionHeader title="Gallery" />
          <Typography size="text-sm" color="secondary">
            {buildGallerySubtitle(name, photos.length)}
          </Typography>
        </Flex>
        <Flex direction="row" flexWrap="wrap" gap={1.5}>
          {photos.map((uri, index) => (
            <Pressable
              key={`${uri}-${index}`}
              onPress={() => openViewer(index)}
              accessibilityRole="imagebutton"
              accessibilityLabel={`${name} photo ${index + 1}`}
              style={({ pressed }) => [pressed ? styles.thumbPressed : null]}
            >
              <RemoteImage
                uri={uri}
                style={[
                  styles.thumb,
                  { width: colWidth, height: thumbHeight },
                ]}
                recyclingKey={`${uri}-${index}`}
              />
            </Pressable>
          ))}
        </Flex>
      </Flex>

      {viewerIndex != null ? (
        <PhotoLightbox
          name={name}
          photos={photos}
          initialIndex={viewerIndex}
          visible
          onClose={() => setViewerIndex(null)}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create(({ space, radius, colors }) => ({
  thumb: {
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  thumbPressed: {
    opacity: 0.88,
  },
}));
