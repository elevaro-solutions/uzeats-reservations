import { useEffect, useState } from "react";
import { Platform, TextInput, TextInputProps, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import { ArrowUpIcon } from "@/assets";
import { Button } from "@/components";
import { FONT_FAMILY } from "@/lib/fonts";

const LINE_HEIGHT = 22;
const MIN_INPUT_HEIGHT = LINE_HEIGHT;
const DEFAULT_MAX_LINES = 5;
const SEND_BTN = 32;
const FIELD_MIN_HEIGHT = 44;

export type MessageInputProps = Omit<
  TextInputProps,
  "multiline" | "style" | "onContentSizeChange"
> & {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  sending?: boolean;
  maxNumberOfLines?: number;
};

export function MessageInput({
  value,
  onChangeText,
  onSend,
  sending = false,
  placeholder,
  editable = true,
  maxNumberOfLines = DEFAULT_MAX_LINES,
  onFocus,
  onBlur,
  ...props
}: MessageInputProps) {
  const { theme } = useUnistyles();
  const [focused, setFocused] = useState(false);
  const [androidHeight, setAndroidHeight] = useState(MIN_INPUT_HEIGHT);

  const maxInputHeight = LINE_HEIGHT * maxNumberOfLines;
  const androidInputHeight = Math.min(
    Math.max(androidHeight, MIN_INPUT_HEIGHT),
    maxInputHeight,
  );
  const atMaxHeight =
    Platform.OS === "android" && androidInputHeight >= maxInputHeight;
  const canSend = value.trim().length > 0 && !sending;

  useEffect(() => {
    if (value.length === 0) {
      setAndroidHeight(MIN_INPUT_HEIGHT);
    }
  }, [value]);

  return (
    <View style={[styles.field, focused ? styles.fieldFocused : null]}>
      <TextInput
        {...props}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        editable={editable}
        multiline
        // Do not pass numberOfLines — on Android it locks the field height.
        scrollEnabled={Platform.OS === "android" ? atMaxHeight : undefined}
        textAlignVertical="top"
        placeholderTextColor={theme.colors.textMuted}
        onContentSizeChange={
          Platform.OS === "android"
            ? (event) => {
                const next = Math.ceil(event.nativeEvent.contentSize.height);
                if (next > 0) {
                  setAndroidHeight(next);
                }
              }
            : undefined
        }
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        style={[
          styles.input,
          {
            minHeight: MIN_INPUT_HEIGHT,
            maxHeight: maxInputHeight,
            // iOS grows naturally with min/max only. Android needs controlled height.
            ...(Platform.OS === "android"
              ? { height: androidInputHeight }
              : null),
          },
        ]}
      />
      <View style={styles.send}>
        <Button
          size="sm"
          radius="circular"
          loading={sending}
          disabled={!canSend}
          onPress={onSend}
          startIcon={<ArrowUpIcon />}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create(({ space, radius, colors }) => ({
  field: {
    width: "100%",
    minHeight: FIELD_MIN_HEIGHT,
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: radius.lg,
    borderColor: colors.border,
    backgroundColor: colors.background,
    paddingLeft: space(2),
    paddingRight: space(0.75) + SEND_BTN + space(1),
    paddingVertical: space(0.75),
  },
  fieldFocused: {
    borderColor: colors.primary6,
  },
  input: {
    width: "100%",
    padding: 0,
    margin: 0,
    color: colors.textPrimary,
    fontFamily: FONT_FAMILY.regular,
    fontSize: 16,
    lineHeight: LINE_HEIGHT,
    includeFontPadding: false,
  },
  send: {
    position: "absolute",
    right: space(0.75),
    bottom: space(0.75),
  },
}));
