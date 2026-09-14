import { useNotificationObserver } from "../hooks/use-notification-observer.hook";
import { useRegisterPush } from "../hooks/use-register-push.hook";

/**
 * Mount once under Apollo/Auth providers to register the device token and
 * handle notification taps. Renders nothing.
 */
export function PushBootstrap() {
  useRegisterPush({ auto: true });
  useNotificationObserver();
  return null;
}
