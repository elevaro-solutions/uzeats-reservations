import { Image, type ImageContentFit, type ImageStyle } from "expo-image";
import type { StyleProp } from "react-native";

export type RemoteImageProps = {
  uri?: string | null;
  style?: StyleProp<ImageStyle>;
  contentFit?: ImageContentFit;
  accessibilityLabel?: string;
  recyclingKey?: string;
  priority?: "low" | "normal" | "high";
  transition?: number;
  /** Hint for decoder downsampling (expo-image). */
  width?: number;
  height?: number;
};

export function RemoteImage({
  uri,
  style,
  contentFit = "cover",
  accessibilityLabel,
  recyclingKey,
  priority = "normal",
  transition = 200,
  width,
  height,
}: RemoteImageProps) {
  const sourceUri = uri?.trim();
  if (!sourceUri) return null;

  return (
    <Image
      source={{
        uri: sourceUri,
        ...(width != null ? { width } : {}),
        ...(height != null ? { height } : {}),
      }}
      style={style}
      contentFit={contentFit}
      cachePolicy="memory-disk"
      transition={transition}
      priority={priority}
      recyclingKey={recyclingKey ?? sourceUri}
      accessibilityLabel={accessibilityLabel}
      accessibilityIgnoresInvertColors
    />
  );
}
