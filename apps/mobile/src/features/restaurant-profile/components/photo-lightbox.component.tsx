import { useState } from "react";
import {
  Dimensions,
  FlatList,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { XIcon } from "@/assets";
import { Flex, IconButton, RemoteImage, Typography } from "@/components";

export type PhotoLightboxProps = {
  name: string;
  photos: string[];
  initialIndex: number;
  visible: boolean;
  onClose: () => void;
};

export function PhotoLightbox({
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
            renderItem={({ item, index }) => (
              <View style={[styles.slide, { width }]}>
                <RemoteImage
                  uri={item}
                  style={styles.fullImage}
                  contentFit="contain"
                  priority="high"
                  recyclingKey={`${item}-${index}`}
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

const styles = StyleSheet.create(({ space, radius, colors }) => ({
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
    backgroundColor: colors.overlayLight,
  },
}));
