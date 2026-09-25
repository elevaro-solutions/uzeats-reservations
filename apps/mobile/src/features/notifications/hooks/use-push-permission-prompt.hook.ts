import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner-native";

import { useAuth } from "@/graphql";

import {
  isPushSoftPromptCompleted,
  markPushSoftPromptCompleted,
} from "../helpers/push-soft-prompt.helpers";
import { getPushPermissionStatus } from "../helpers/push-token.helpers";
import { useRegisterPush } from "./use-register-push.hook";

const SOFT_PROMPT_DELAY_MS = 700;

type UsePushPermissionPromptOptions = {
  /**
   * When true, schedules eligibility check after a short delay.
   * Use for confirmation screens that should auto-show once content is ready.
   */
  auto?: boolean;
};

type UsePushPermissionPromptResult = {
  visible: boolean;
  loading: boolean;
  onAllow: () => Promise<void>;
  onDismiss: () => void;
  /** Manually evaluate eligibility and show (e.g. after waitlist success dismiss). */
  maybeShow: () => Promise<boolean>;
};

/**
 * Soft in-app priming for push permission. Shows at most once (MMKV), only when
 * OS status is undetermined and the user is signed in. OS dialog fires only on Allow.
 */
export function usePushPermissionPrompt(
  options?: UsePushPermissionPromptOptions,
): UsePushPermissionPromptResult {
  const auto = options?.auto ?? false;
  const { user } = useAuth();
  const { register, registering } = useRegisterPush({ auto: false });
  const [visible, setVisible] = useState(false);
  const [allowing, setAllowing] = useState(false);
  const shownThisSessionRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const maybeShow = useCallback(async () => {
    if (!user || shownThisSessionRef.current || isPushSoftPromptCompleted()) {
      return false;
    }

    const status = await getPushPermissionStatus();
    if (status !== "undetermined") {
      markPushSoftPromptCompleted();
      return false;
    }

    shownThisSessionRef.current = true;
    setVisible(true);
    return true;
  }, [user]);

  useEffect(() => {
    if (!auto || !user) return;

    clearTimer();
    timerRef.current = setTimeout(() => {
      void maybeShow();
    }, SOFT_PROMPT_DELAY_MS);

    return clearTimer;
  }, [auto, user, maybeShow, clearTimer]);

  const onDismiss = useCallback(() => {
    markPushSoftPromptCompleted();
    setVisible(false);
  }, []);

  const onAllow = useCallback(async () => {
    setAllowing(true);
    try {
      markPushSoftPromptCompleted();
      const ok = await register({ requestPermission: true });
      setVisible(false);
      if (ok) {
        toast.success("Push notifications enabled");
      } else {
        toast.error("Could not enable push notifications");
      }
    } finally {
      setAllowing(false);
    }
  }, [register]);

  return {
    visible,
    loading: allowing || registering,
    onAllow,
    onDismiss,
    maybeShow,
  };
}
