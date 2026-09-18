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
};

export function RemoteImage({
  uri,
  style,
  contentFit = "cover",
  accessibilityLabel,
  recyclingKey,
  priority = "normal",
  transition = 200,
}: RemoteImageProps) {
  const sourceUri = uri?.trim();
  if (!sourceUri) return null;

  return (
    <Image
      source={{ uri: sourceUri }}
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
