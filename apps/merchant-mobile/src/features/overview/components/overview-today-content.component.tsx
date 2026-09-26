import { RefreshControl, ScrollView, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import {
  ArmchairIcon,
  BellIcon,
  CalendarCheckIcon,
  ClipboardClockIcon,
  MailIcon,
  UsersIcon,
} from "@/assets";
import { Flex, Typography } from "@/components";

import { ShortcutButton } from "./shortcut-button.component";
import { SnapshotCard } from "./snapshot-card.component";

export type OverviewTodayContentProps = {
  covers: number;
  reservations: number;
  waitlist: number;
  unread: number;
  contentPaddingBottom: number;
  refreshing: boolean;
  onRefresh: () => void;
  onOpenReservations: () => void;
  onOpenWaitlist: () => void;
  onOpenFloor: () => void;
  onOpenMessages: () => void;
  onOpenNotifications: () => void;
};

export function OverviewTodayContent({
  covers,
  reservations,
  waitlist,
  unread,
  contentPaddingBottom,
  refreshing,
  onRefresh,
  onOpenReservations,
  onOpenWaitlist,
  onOpenFloor,
  onOpenMessages,
  onOpenNotifications,
}: OverviewTodayContentProps) {
  const { theme } = useUnistyles();

  return (
    <ScrollView
      contentContainerStyle={[
        styles.content,
        { paddingBottom: contentPaddingBottom },
      ]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={theme.colors.primary}
          colors={[theme.colors.primary]}
        />
      }
    >
      <Typography weight="bold" size="display-xs" style={styles.sectionTitle}>
        Today
      </Typography>

      <View style={styles.snapshotGrid}>
        <SnapshotCard
          label="Covers"
          value={covers}
          icon={<UsersIcon size={22} color={theme.colors.primary} />}
        />
        <SnapshotCard
          label="Reservations"
          value={reservations}
          icon={<CalendarCheckIcon size={22} color={theme.colors.primary} />}
          onPress={onOpenReservations}
        />
        <SnapshotCard
          label="Waitlist"
          value={waitlist}
          icon={
            <ClipboardClockIcon size={22} color={theme.colors.warningPress} />
          }
          onPress={onOpenWaitlist}
        />
        <SnapshotCard
          label="Unread"
          value={unread}
          icon={<BellIcon size={22} color={theme.colors.info} />}
          onPress={onOpenNotifications}
        />
      </View>

      <Typography
        weight="semibold"
        size="text-lg"
        style={styles.shortcutsTitle}
      >
        Shortcuts
      </Typography>

      <Flex gap={1.5}>
        <ShortcutButton
          label="Reservations"
          onPress={onOpenReservations}
          icon={
            <CalendarCheckIcon size={22} color={theme.colors.textPrimary} />
          }
        />
        <ShortcutButton
          label="Waitlist"
          onPress={onOpenWaitlist}
          icon={
            <ClipboardClockIcon size={22} color={theme.colors.textPrimary} />
          }
        />
        <ShortcutButton
          label="Floor"
          onPress={onOpenFloor}
          icon={<ArmchairIcon size={22} color={theme.colors.textPrimary} />}
        />
        <ShortcutButton
          label="Messages"
          onPress={onOpenMessages}
          icon={<MailIcon size={22} color={theme.colors.textPrimary} />}
        />
      </Flex>
    </ScrollView>
  );
}

const styles = StyleSheet.create(({ space }) => ({
  content: {
    paddingHorizontal: space(2),
    paddingTop: space(2.5),
    gap: space(1),
  },
  sectionTitle: {
    marginBottom: space(1),
  },
  snapshotGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space(1.5),
  },
  shortcutsTitle: {
    marginTop: space(2.5),
    marginBottom: space(1),
  },
}));
