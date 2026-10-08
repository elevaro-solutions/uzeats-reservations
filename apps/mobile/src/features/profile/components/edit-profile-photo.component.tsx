import { View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { CameraIcon } from "@/assets";
import { Button, Flex, IconButton, UserAvatar } from "@/components";

export type EditProfilePhotoProps = {
  firstName: string;
  lastName: string;
  avatarUrl: string;
  uploading: boolean;
  onChangePhoto: () => void;
  onRemovePhoto: () => void;
};

export function EditProfilePhoto({
  firstName,
  lastName,
  avatarUrl,
  uploading,
  onChangePhoto,
  onRemovePhoto,
}: EditProfilePhotoProps) {
  const hasPhoto = Boolean(avatarUrl);

  return (
    <Flex alignItems="center" gap={1.5}>
      <View style={styles.photoWrap}>
        <UserAvatar
          size="xl"
          firstName={firstName}
          lastName={lastName}
          avatarUrl={avatarUrl || null}
        />
        <IconButton
          icon={<CameraIcon />}
          variant="surface"
          size="sm"
          disabled={uploading}
          onPress={onChangePhoto}
          accessibilityLabel={hasPhoto ? "Change photo" : "Add photo"}
          style={styles.photoBadge}
        />
      </View>
      <Flex direction="row" alignItems="center" justifyContent="center" gap={0.5}>
        <Button
          size="sm"
          variant="text"
          color="primary"
          loading={uploading}
          onPress={onChangePhoto}
        >
          {hasPhoto ? "Change photo" : "Add photo"}
        </Button>
        {hasPhoto ? (
          <Button
            size="sm"
            variant="text"
            color="secondary"
            disabled={uploading}
            onPress={onRemovePhoto}
          >
            Remove
          </Button>
        ) : null}
      </Flex>
    </Flex>
  );
}

const styles = StyleSheet.create(({ space, colors, radius }) => ({
  photoWrap: {
    width: space(10),
    height: space(10),
  },
  photoBadge: {
    position: "absolute",
    right: -space(0.5),
    bottom: -space(0.5),
    borderRadius: radius.full,
    borderWidth: 2,
    borderColor: colors.background,
  },
}));
