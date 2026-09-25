import { useMutation } from "@apollo/client";
import { useCallback, useEffect, useRef, useState } from "react";

import { useAuth } from "@/graphql";

import { REGISTER_PUSH_TOKEN } from "../api/notifications.operations";
import {
  getExpoPushTokenIfGranted,
  registerForPushNotificationsAsync,
} from "../helpers/push-token.helpers";

type RegisterPushResult = {
  registered: boolean;
  registering: boolean;
  error: string | null;
  /**
   * Fetch Expo token and register with the API.
   * When `requestPermission` is true (default for manual Enable), may show the OS dialog.
   * Auto/bootstrap paths pass false so they never prompt.
   */
  register: (options?: { requestPermission?: boolean }) => Promise<boolean>;
};

/**
 * When the user is signed in, silently re-registers an Expo push token if
 * permission is already granted. Failures are logged and never block auth.
 * OS permission is only requested via explicit `register({ requestPermission: true })`.
 */
export function useRegisterPush(options?: {
  /** When false, skip the automatic register-on-auth effect. Default true. */
  auto?: boolean;
}): RegisterPushResult {
  const { user } = useAuth();
  const [registerMutation] = useMutation(REGISTER_PUSH_TOKEN);
  const [registered, setRegistered] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastTokenRef = useRef<string | null>(null);
  const auto = options?.auto ?? true;

  const register = useCallback(
    async (opts?: { requestPermission?: boolean }) => {
      if (!user) {
        setRegistered(false);
        return false;
      }

      const requestPermission = opts?.requestPermission ?? true;

      setRegistering(true);
      setError(null);

      try {
        const result = requestPermission
          ? await registerForPushNotificationsAsync()
          : await getExpoPushTokenIfGranted();
        if (!result) {
          setRegistered(false);
          if (requestPermission) {
            setError("Permission denied or push unavailable on this device");
          }
          return false;
        }

        if (lastTokenRef.current === result.token) {
          setRegistered(true);
          return true;
        }

        await registerMutation({
          variables: {
            token: result.token,
            platform: result.platform,
          },
        });

        lastTokenRef.current = result.token;
        setRegistered(true);
        return true;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Could not register push token";
        console.warn("[push] register failed", err);
        setError(message);
        setRegistered(false);
        return false;
      } finally {
        setRegistering(false);
      }
    },
    [registerMutation, user],
  );

  useEffect(() => {
    if (!auto || !user) {
      if (!user) {
        lastTokenRef.current = null;
        setRegistered(false);
      }
      return;
    }

    void register({ requestPermission: false });
  }, [auto, register, user]);

  return { registered, registering, error, register };
}
