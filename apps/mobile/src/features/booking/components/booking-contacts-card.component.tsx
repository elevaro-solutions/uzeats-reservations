import { View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { Typography } from "@/components";

import { BookingSectionCard } from "./booking-section-card.component";

export type BookingContactsCardProps = {
  userName: string;
  userEmail: string;
  isSignedIn: boolean;
};

export function BookingContactsCard({
  userName,
  userEmail,
  isSignedIn,
}: BookingContactsCardProps) {
  return (
    <BookingSectionCard title="Contacts">
      {isSignedIn ? (
        <>
          <ContactRow label="Name" value={userName} />
          <View style={styles.divider} />
          <ContactRow label="Email" value={userEmail} />
        </>
      ) : (
        <Typography size="text-sm" color="secondary">
          Sign in to continue with your contact details.
        </Typography>
      )}
    </BookingSectionCard>
  );
}

function ContactRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Typography size="text-xs" color="secondary">
        {label}
      </Typography>
      <Typography weight="medium" size="text-sm">
        {value}
      </Typography>
    </View>
  );
}

const styles = StyleSheet.create(({ space, colors }) => ({
  row: {
    gap: space(0.25),
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
}));
