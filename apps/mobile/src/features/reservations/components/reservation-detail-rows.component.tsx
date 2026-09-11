import { type ReactElement } from "react";
import { Pressable, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import {
  ArmchairIcon,
  AwardIcon,
  BriefcaseIcon,
  CakeIcon,
  CalendarIcon,
  CheckIcon,
  ClockIcon,
  CircleDashedIcon,
  HandCoinsIcon,
  HeartIcon,
  InfoIcon,
  PartyPopperIcon,
  PencilIcon,
  SparklesIcon,
  UsersIcon,
  WineIcon,
} from "@/assets";
import { Flex, RemoteImage, Typography } from "@/components";
import { OCCASION_LABELS, type Occasion } from "@reservations/shared";
import { IconPropsType } from "@/types";

import {
  formatCentsAsDollars,
  formatDepositStatusLabel,
  formatReservationDate,
  formatReservationReference,
  formatReservationTime,
  isPlaceholderTablePhoto,
} from "../helpers/reservation-display.helpers";
import { ReservationStatusPill } from "./reservation-status-pill.component";

export type ReservationDetailRowsReservation = {
  id: string;
  status: string;
  slotStart: string;
  slotEnd?: string | null;
  partySize: number;
  occasion?: string | null;
  guestNotes?: string | null;
  packageTitle?: string | null;
  packagePriceCents?: number | null;
  depositAmountCents?: number | null;
  depositStatus?: string | null;
  loyaltyPointsEarned?: number | null;
  tables?:
    | {
        id: string;
        name: string;
        photoUrl?: string | null;
        floorArea?: string | null;
      }[]
    | null;
};

export type ReservationDetailRowsProps = {
  reservation: ReservationDetailRowsReservation;
  canEdit: boolean;
  ineligibleCaption?: string | null;
  onEdit?: () => void;
};

type DetailRowItem = {
  key: string;
  label: string;
  value: string;
  icon: ReactElement<IconPropsType>;
};

function occasionIcon(
  occasion: string,
  color: string,
): ReactElement<IconPropsType> {
  const props = { size: 18, color };
  switch (occasion) {
    case "date":
      return <HeartIcon {...props} />;
    case "birthday":
      return <CakeIcon {...props} />;
    case "anniversary":
      return <WineIcon {...props} />;
    case "business":
      return <BriefcaseIcon {...props} />;
    case "celebration":
      return <PartyPopperIcon {...props} />;
    default:
      return <SparklesIcon {...props} />;
  }
}

function DetailRow({
  label,
  value,
  icon,
  last = false,
  trailing,
}: {
  label: string;
  value?: string;
  icon: ReactElement<IconPropsType>;
  last?: boolean;
  trailing?: ReactElement;
}) {
  return (
    <Flex
      direction="row"
      alignItems="center"
      gap={1.5}
      style={[styles.row, !last && styles.rowBorder]}
    >
      <View style={styles.iconWell}>{icon}</View>
      <Flex gap={0.25} style={styles.flexGrow}>
        <Typography size="text-xs" color="muted">
          {label}
        </Typography>
        {trailing ?? (
          <Typography weight="medium" style={styles.rowValue}>
            {value}
          </Typography>
        )}
      </Flex>
    </Flex>
  );
}

export function ReservationDetailRows({
  reservation,
  canEdit,
  ineligibleCaption,
  onEdit,
}: ReservationDetailRowsProps) {
  const { theme } = useUnistyles();
  const iconColor = theme.colors.textSecondary;

  const occasionLabel =
    reservation.occasion && reservation.occasion !== "none"
      ? (OCCASION_LABELS[reservation.occasion as Occasion] ??
        reservation.occasion)
      : null;

  const packageValue = reservation.packageTitle
    ? [
        reservation.packageTitle,
        (reservation.packagePriceCents ?? 0) > 0
          ? formatCentsAsDollars(reservation.packagePriceCents ?? 0)
          : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : null;

  const table = reservation.tables?.[0];
  const tablePhoto =
    table?.photoUrl && !isPlaceholderTablePhoto(table.photoUrl)
      ? table.photoUrl
      : null;
  const tableLabel = table
    ? [table.name, table.floorArea].filter(Boolean).join(" · ")
    : null;

  const depositCents = reservation.depositAmountCents ?? 0;
  const loyalty = reservation.loyaltyPointsEarned ?? 0;
  const showSecondary = Boolean(tableLabel) || depositCents > 0 || loyalty > 0;

  const visitRows: DetailRowItem[] = [
    {
      key: "date",
      label: "Date",
      value: formatReservationDate(reservation.slotStart),
      icon: <CalendarIcon size={18} color={iconColor} />,
    },
    {
      key: "time",
      label: "Time",
      value: formatReservationTime(reservation.slotStart, reservation.slotEnd),
      icon: <ClockIcon size={18} color={iconColor} />,
    },
    {
      key: "party",
      label: "Party",
      value: `${reservation.partySize} guest${reservation.partySize === 1 ? "" : "s"}`,
      icon: <UsersIcon size={18} color={iconColor} />,
    },
  ];
  if (occasionLabel && reservation.occasion) {
    visitRows.push({
      key: "occasion",
      label: "Occasion",
      value: occasionLabel,
      icon: occasionIcon(reservation.occasion, iconColor),
    });
  }
  if (packageValue) {
    visitRows.push({
      key: "package",
      label: "Package",
      value: packageValue,
      icon: <SparklesIcon size={18} color={iconColor} />,
    });
  }
  visitRows.push({
    key: "confirmation",
    label: "Confirmation",
    value: formatReservationReference(reservation.id),
    icon: <CheckIcon size={18} color={iconColor} />,
  });
  if (reservation.guestNotes?.trim()) {
    visitRows.push({
      key: "notes",
      label: "Notes",
      value: reservation.guestNotes.trim(),
      icon: <InfoIcon size={18} color={iconColor} />,
    });
  }

  return (
    <Flex gap={2.5}>
      <Flex gap={1.5}>
        <Flex
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          style={styles.sectionHeader}
        >
          <Typography weight="semibold" size="text-md">
            Details
          </Typography>
          {canEdit && onEdit ? (
            <Pressable
              onPress={onEdit}
              style={({ pressed }) => [
                styles.editBtn,
                pressed && styles.editBtnPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Edit reservation"
            >
              <PencilIcon size={18} color={theme.colors.textSecondary} />
              <Typography size="text-md" weight="semibold" color="secondary">
                Edit
              </Typography>
            </Pressable>
          ) : null}
        </Flex>
        <View style={styles.cardShadow}>
          <View style={styles.card}>
            <DetailRow
              label="Status"
              icon={<CircleDashedIcon size={18} color={iconColor} />}
              trailing={
                <View style={styles.statusTrailing}>
                  <ReservationStatusPill
                    status={reservation.status}
                    slotStart={reservation.slotStart}
                    slotEnd={reservation.slotEnd}
                    depositStatus={reservation.depositStatus}
                    depositAmountCents={reservation.depositAmountCents}
                  />
                </View>
              }
            />
            {visitRows.map((row, index) => (
              <DetailRow
                key={row.key}
                label={row.label}
                value={row.value}
                icon={row.icon}
                last={index === visitRows.length - 1 && !ineligibleCaption}
              />
            ))}
            {ineligibleCaption ? (
              <Typography size="text-sm" color="muted" style={styles.caption}>
                {ineligibleCaption}
              </Typography>
            ) : null}
          </View>
        </View>
      </Flex>

      {showSecondary ? (
        <Flex gap={1.5}>
          <Typography
            weight="semibold"
            size="text-md"
            style={styles.sectionHeader}
          >
            Extras
          </Typography>
          <View style={styles.cardShadow}>
            <View style={styles.card}>
              {tableLabel ? (
                <Flex
                  direction="row"
                  alignItems="center"
                  gap={1.5}
                  style={[
                    styles.row,
                    (depositCents > 0 || loyalty > 0) && styles.rowBorder,
                  ]}
                >
                  {tablePhoto ? (
                    <RemoteImage
                      uri={tablePhoto}
                      style={styles.tableThumb}
                      recyclingKey={table?.id}
                    />
                  ) : (
                    <View style={styles.iconWell}>
                      <ArmchairIcon size={18} color={iconColor} />
                    </View>
                  )}
                  <Flex gap={0.25} style={styles.flexGrow}>
                    <Typography size="text-xs" color="muted">
                      Table
                    </Typography>
                    <Typography weight="semibold">{tableLabel}</Typography>
                  </Flex>
                </Flex>
              ) : null}
              {depositCents > 0 ? (
                <DetailRow
                  label="Deposit"
                  value={`${formatCentsAsDollars(depositCents)} · ${formatDepositStatusLabel(reservation.depositStatus ?? "none")}`}
                  icon={<HandCoinsIcon size={18} color={iconColor} />}
                  last={loyalty <= 0}
                />
              ) : null}
              {loyalty > 0 ? (
                <DetailRow
                  label="Loyalty"
                  value={`+${loyalty} points earned`}
                  icon={<AwardIcon size={18} color={theme.colors.success} />}
                  last
                />
              ) : null}
            </View>
          </View>
        </Flex>
      ) : null}
    </Flex>
  );
}

const styles = StyleSheet.create(({ space, colors, radius }) => ({
  cardShadow: {
    borderRadius: radius.lg,
    backgroundColor: colors.background,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  card: {
    borderRadius: radius.lg,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.slate3,
    overflow: "hidden",
  },
  sectionHeader: {
    paddingHorizontal: space(0.25),
  },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: space(0.75),
    paddingVertical: space(0.75),
    paddingHorizontal: space(1.5),
    borderRadius: radius.full,
    backgroundColor: colors.surface,
  },
  editBtnPressed: {
    opacity: 0.8,
  },
  row: {
    paddingHorizontal: space(2),
    paddingVertical: space(1.75),
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.slate3,
  },
  iconWell: {
    width: space(5),
    height: space(5),
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  rowValue: {
    flexShrink: 1,
  },
  statusTrailing: {
    alignSelf: "flex-start",
    marginTop: space(0.25),
  },
  caption: {
    paddingHorizontal: space(2),
    paddingBottom: space(1.5),
  },
  tableThumb: {
    width: space(5.5),
    height: space(5.5),
    borderRadius: radius.md,
    backgroundColor: colors.slate3,
  },
  flexGrow: {
    flex: 1,
    minWidth: 0,
  },
}));
