import {
  formatWaitlistWaitingLabel,
  isActiveWaitlistWaitStatus,
  isWaitlistWaitOverdue,
  waitlistWaitingMinutes,
} from "@reservations/shared";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import { ClockIcon, MoreHorizontalIcon, PhoneIcon, UsersIcon } from "@/assets";
import { Button, Flex, IconButton, Typography } from "@/components";
import { formatPhoneDisplay } from "@/lib/helpers";

import { waitlistActionIcon } from "../helpers/waitlist-action-icon.helpers";
import {
  entryDisplayName,
  entryPhone,
  primaryWaitlistAction,
  secondaryWaitlistActions,
  waitlistMetric,
  waitlistStatusVisual,
  waitMinutesLabel,
  type WaitlistAction,
} from "../helpers/waitlist-status.helpers";
import { WaitlistActionsSheet } from "./waitlist-actions-sheet.component";

export type WaitlistListItem = {
  id: string;
  partySize: number;
  status: string;
  guestName?: string | null;
  guestPhone?: string | null;
  quotedWaitMinutes?: number | null;
  position?: number | null;
  estimatedWaitMinutes?: number | null;
  waitingMinutes?: number | null;
  promisedWaitMinutes?: number | null;
  isOverdue?: boolean | null;
  createdAt?: string | null;
  dinerId?: string | null;
  diner?: {
    firstName?: string | null;
    lastName?: string | null;
    phone?: string | null;
  } | null;
};

export type WaitlistCardProps = {
  entry: WaitlistListItem;
  onAction: (action: WaitlistAction) => void;
  actionLoading?: boolean;
};

export function WaitlistCard({
  entry,
  onAction,
  actionLoading,
}: WaitlistCardProps) {
  const { theme } = useUnistyles();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (!isActiveWaitlistWaitStatus(entry.status)) return;
    const id = setInterval(() => setNowMs(Date.now()), 30_000);
    return () => clearInterval(id);
  }, [entry.status]);

  const liveWaitingMinutes =
    entry.createdAt && isActiveWaitlistWaitStatus(entry.status)
      ? waitlistWaitingMinutes(entry.createdAt, new Date(nowMs))
      : (entry.waitingMinutes ?? null);
  const overdue =
    liveWaitingMinutes != null &&
    isWaitlistWaitOverdue({
      status: entry.status,
      waitingMinutes: liveWaitingMinutes,
      quotedWaitMinutes: entry.quotedWaitMinutes,
      estimatedWaitMinutes: entry.estimatedWaitMinutes,
    });

  const primary = primaryWaitlistAction(entry.status);
  const secondary = secondaryWaitlistActions(entry.status);
  const visual = overdue
    ? {
        label: "Overdue",
        chipBg: theme.colors.errorSubtle,
        chipText: theme.colors.error,
      }
    : waitlistStatusVisual(entry.status, theme.colors);
  const guestName = entryDisplayName(entry);
  const metric = waitlistMetric({
    ...entry,
    waitingMinutes: liveWaitingMinutes,
    isOverdue: overdue,
  });
  const phone = entryPhone(entry);
  const waitLabel =
    liveWaitingMinutes != null
      ? `Waiting ${formatWaitlistWaitingLabel(liveWaitingMinutes)}`
      : waitMinutesLabel(entry);
  const showWaitInMeta =
    waitLabel != null &&
    !(entry.status === "waiting" && entry.position != null && !overdue);

  return (
    <>
      <View
        style={styles.card}
        accessibilityLabel={`${guestName}, party of ${entry.partySize}, ${visual.label}${
          waitLabel ? `, ${waitLabel}` : ""
        }`}
      >
        <View style={[styles.statusPill, { backgroundColor: visual.chipBg }]}>
          <Typography
            weight="semibold"
            size="text-xs"
            style={{ color: visual.chipText }}
            numberOfLines={1}
          >
            {visual.label}
          </Typography>
        </View>

        <Flex direction="row" alignItems="center" gap={1.5}>
          <View style={styles.metricBlock}>
            <Typography
              weight="semibold"
              size="display-xs"
              numberOfLines={1}
              style={overdue ? { color: theme.colors.error } : undefined}
            >
              {metric.primary}
            </Typography>
            <Typography
              weight="medium"
              size="text-xs"
              color={overdue ? "error" : "muted"}
            >
              {metric.secondary}
            </Typography>
          </View>

          <Flex flex={1} direction="column" gap={0.5} style={styles.details}>
            <Typography weight="semibold" size="text-md" numberOfLines={1}>
              {guestName}
            </Typography>

            <Flex
              direction="row"
              alignItems="center"
              gap={1}
              style={styles.meta}
            >
              <Flex direction="row" alignItems="center" gap={0.5}>
                <UsersIcon size={14} color={theme.colors.textMuted} />
                <Typography size="text-sm" color="muted" numberOfLines={1}>
                  {entry.partySize} guests
                </Typography>
              </Flex>

              {showWaitInMeta ? (
                <>
                  <Typography size="text-sm" color="muted">
                    ·
                  </Typography>
                  <Flex
                    direction="row"
                    alignItems="center"
                    gap={0.5}
                    style={styles.meta}
                  >
                    <ClockIcon size={14} color={theme.colors.textMuted} />
                    <Typography size="text-sm" color="muted" numberOfLines={1}>
                      {waitLabel}
                    </Typography>
                  </Flex>
                </>
              ) : null}

              {phone ? (
                <>
                  <Typography size="text-sm" color="muted">
                    ·
                  </Typography>
                  <Flex
                    direction="row"
                    alignItems="center"
                    gap={0.5}
                    style={styles.meta}
                  >
                    <PhoneIcon size={14} color={theme.colors.textMuted} />
                    <Typography size="text-sm" color="muted" numberOfLines={1}>
                      {formatPhoneDisplay(phone)}
                    </Typography>
                  </Flex>
                </>
              ) : null}
            </Flex>
          </Flex>
        </Flex>

        {primary || secondary.length > 0 ? (
          <View style={styles.actions} onStartShouldSetResponder={() => true}>
            <Flex direction="row" alignItems="center" gap={1}>
              {primary ? (
                <View style={styles.primaryBtn}>
                  <Button
                    size="md"
                    color="secondary"
                    fullWidth
                    loading={actionLoading}
                    startIcon={waitlistActionIcon(
                      primary.action === "edit" ? "edit" : primary.status,
                    )}
                    onPress={() => onAction(primary)}
                  >
                    {primary.label}
                  </Button>
                </View>
              ) : null}
              {secondary.length > 0 ? (
                <IconButton
                  icon={<MoreHorizontalIcon />}
                  variant="surface"
                  size="md"
                  disabled={actionLoading}
                  onPress={() => setSheetOpen(true)}
                  accessibilityLabel="More actions"
                  style={styles.moreBtn}
                />
              ) : null}
            </Flex>
          </View>
        ) : null}
      </View>

      <WaitlistActionsSheet
        visible={sheetOpen}
        guestName={guestName}
        actions={secondary}
        loading={actionLoading}
        onClose={() => setSheetOpen(false)}
        onAction={(action) => {
          setSheetOpen(false);
          onAction(action);
        }}
      />
    </>
  );
}

const styles = StyleSheet.create(({ space, colors, radius }) => ({
  card: {
    position: "relative",
    padding: space(1.75),
    borderRadius: radius.lg,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.slate3,
    gap: space(1.5),
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  statusPill: {
    position: "absolute",
    top: space(1.25),
    right: space(1.25),
    borderRadius: radius.full,
    paddingHorizontal: space(1),
    paddingVertical: space(0.25),
    zIndex: 1,
  },
  metricBlock: {
    width: space(8),
    height: space(8),
    borderRadius: radius.md,
    backgroundColor: colors.slate1,
    borderWidth: 1,
    borderColor: colors.slate3,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  details: {
    minWidth: 0,
    paddingRight: space(7.5),
  },
  meta: {
    minWidth: 0,
    flexShrink: 1,
  },
  actions: {
    marginTop: space(0.25),
  },
  primaryBtn: {
    flex: 1,
  },
  moreBtn: {
    width: space(5),
    height: space(5),
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.slate5,
    backgroundColor: colors.white,
  },
}));
