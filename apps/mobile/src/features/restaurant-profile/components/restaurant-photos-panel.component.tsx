import { useState } from "react";
import {
  Dimensions,
  FlatList,
  Image,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { XIcon } from "@/assets";
import { Empty, Flex, IconButton, Typography } from "@/components";

import { DetailSectionHeader } from "./detail-section-header.component";

const THUMB_RATIO = 5 / 4;

export type RestaurantPhotosPanelProps = {
  name: string;
  photos: string[];
};

type PhotoLightboxProps = {
  name: string;
  photos: string[];
  initialIndex: number;
  visible: boolean;
  onClose: () => void;
};

function buildGallerySubtitle(name: string, count: number): string {
  const base = `Take a look inside ${name}`;
  if (count > 1) {
    return `${base} · ${count} photos`;
  }
  return base;
}

function PhotoLightbox({
  name,
  photos,
  initialIndex,
  visible,
  onClose,
}: PhotoLightboxProps) {
  const { theme } = useUnistyles();
  const insets = useSafeAreaInsets();
  const width = Dimensions.get("window").width;
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  function onViewerScrollEnd(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const next = Math.round(e.nativeEvent.contentOffset.x / width);
    setCurrentIndex(next);
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      presentationStyle="overFullScreen"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.viewer} accessibilityViewIsModal>
        <StatusBar style="light" />
        <Flex
          direction="row"
          justifyContent="flex-end"
          style={[styles.viewerBar, { paddingTop: insets.top + theme.space(1) }]}
        >
          <IconButton
            icon={<XIcon />}
            variant="surface"
            color={theme.colors.textPrimary}
            accessibilityLabel="Close gallery"
            onPress={onClose}
            style={styles.closeBtn}
          />
        </Flex>
        <View style={styles.carousel}>
          <FlatList
            data={photos}
            horizontal
            pagingEnabled
            style={styles.carouselList}
            initialScrollIndex={initialIndex}
            getItemLayout={(_, i) => ({
              length: width,
              offset: width * i,
              index: i,
            })}
            onMomentumScrollEnd={onViewerScrollEnd}
            showsHorizontalScrollIndicator={false}
            keyExtractor={(uri, i) => `${uri}-viewer-${i}`}
            renderItem={({ item }) => (
              <View style={[styles.slide, { width }]}>
                <Image
                  source={{ uri: item }}
                  style={styles.fullImage}
                  resizeMode="contain"
                  accessibilityLabel={name}
                />
              </View>
            )}
          />
        </View>
        <View
          style={[
            styles.counterWrap,
            { paddingBottom: insets.bottom + theme.space(3) },
          ]}
        >
          <View style={styles.counterPill}>
            <Typography color="inverse" size="text-sm" weight="medium">
              {currentIndex + 1} / {photos.length}
            </Typography>
          </View>
        </View>
      </View>
    </Modal>
  );
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
              <Image
                source={{ uri }}
                style={[
                  styles.thumb,
                  { width: colWidth, height: thumbHeight },
                ]}
                resizeMode="cover"
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
  viewer: {
    flex: 1,
    backgroundColor: colors.black,
  },
  viewerBar: {
    paddingHorizontal: space(2),
    paddingBottom: space(1),
  },
  closeBtn: {
    backgroundColor: colors.white,
    opacity: 0.92,
    borderRadius: radius.full,
  },
  carousel: {
    flex: 1,
    minHeight: 0,
  },
  carouselList: {
    flex: 1,
  },
  slide: {
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  fullImage: {
    width: "100%",
    height: "100%",
  },
  counterWrap: {
    alignItems: "center",
    paddingTop: space(1),
  },
  counterPill: {
    paddingHorizontal: space(2),
    paddingVertical: space(0.75),
    borderRadius: radius.full,
    backgroundColor: "rgba(255, 255, 255, 0.18)",
  },
}));
