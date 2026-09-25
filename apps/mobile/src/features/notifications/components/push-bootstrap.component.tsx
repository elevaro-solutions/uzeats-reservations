import { useNotificationObserver } from "../hooks/use-notification-observer.hook";
import { useRegisterPush } from "../hooks/use-register-push.hook";

/**
 * Mount once under Apollo/Auth providers. Silently re-registers the Expo push
 * token when permission is already granted (never shows the OS dialog) and
 * handles notification taps. Renders nothing.
 */
export function PushBootstrap() {
  useRegisterPush({ auto: true });
  useNotificationObserver();
  return null;
}
