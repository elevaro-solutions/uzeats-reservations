import { View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { BottomSheet, Button, Typography } from "@/components";
import { openContactUrl } from "@/features/reservations/helpers/reservation-detail.helpers";

import {
  formatInboxRelativeTime,
  formatInquiryAbsoluteTime,
} from "../helpers/message-display.helpers";

export type InquiryDetail = {
  id: string;
  senderName: string;
  senderEmail?: string | null;
  message: string;
  createdAt: string;
};

export type InquiryDetailSheetProps = {
  inquiry: InquiryDetail | null;
  visible: boolean;
  onClose: () => void;
};

export function InquiryDetailSheet({
  inquiry,
  visible,
  onClose,
}: InquiryDetailSheetProps) {
  const relative = inquiry ? formatInboxRelativeTime(inquiry.createdAt) : "";
  const absolute = inquiry ? formatInquiryAbsoluteTime(inquiry.createdAt) : "";
  const description =
    relative && absolute ? `${relative} · ${absolute}` : absolute || relative;
  const email = inquiry?.senderEmail?.trim();

  async function onEmail() {
    if (!email) return;
    await openContactUrl(`mailto:${email}`, "email");
  }

  return (
    <BottomSheet
      visible={visible && Boolean(inquiry)}
      onClose={onClose}
      title={inquiry?.senderName ?? "Inquiry"}
      description={description || undefined}
      showHandle
      headerBorder
      scrollable
      accessibilityLabel="Close inquiry"
      contentContainerStyle={styles.body}
      footer={
        email ? (
          <Button
            fullWidth
            size="xl"
            onPress={() => {
              void onEmail();
            }}
          >
            Email guest
          </Button>
        ) : undefined
      }
    >
      {inquiry ? (
        <View style={styles.message}>
          <Typography size="text-md">{inquiry.message}</Typography>
          <Typography size="text-sm" color="muted">
            {email
              ? "Reply to this guest directly at their email address."
              : "This inquiry has no email address on file."}
          </Typography>
        </View>
      ) : null}
    </BottomSheet>
  );
}

const styles = StyleSheet.create(({ space, colors, radius }) => ({
  body: {
    paddingHorizontal: space(3),
    paddingTop: space(2),
    paddingBottom: space(2),
  },
  message: {
    gap: space(1.5),
    padding: space(2),
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
}));
