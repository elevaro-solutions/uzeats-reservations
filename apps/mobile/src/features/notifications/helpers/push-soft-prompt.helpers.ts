import { mmkv } from "@/store";

export const PUSH_SOFT_PROMPT_COMPLETED_KEY = "pushSoftPromptCompleted";

export function isPushSoftPromptCompleted(): boolean {
  return mmkv.getBoolean(PUSH_SOFT_PROMPT_COMPLETED_KEY) === true;
}

export function markPushSoftPromptCompleted(): void {
  mmkv.set(PUSH_SOFT_PROMPT_COMPLETED_KEY, true);
}
