import * as ImagePicker from "expo-image-picker";
import { Alert, Platform } from "react-native";

/**
 * Android 13+ uses the system photo picker (`PickVisualMedia`) and does not
 * need READ_MEDIA_IMAGES. Requesting media-library permission on Android would
 * reintroduce the Play Photo and Video Permissions policy violation.
 * iOS still needs the Photos prompt before `launchImageLibraryAsync`.
 */
export async function ensurePhotoLibraryAccess(
  deniedMessage: string,
): Promise<boolean> {
  if (Platform.OS === "android") {
    return true;
  }

  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    Alert.alert("Photos permission needed", deniedMessage);
    return false;
  }
  return true;
}
