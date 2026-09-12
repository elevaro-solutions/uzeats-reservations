import { useRouter } from "expo-router";
import { type ReactElement, type ReactNode, useState } from "react";
import { ScrollView, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  BellIcon,
  CalendarIcon,
  CircleHelpIcon,
  GlobeIcon,
  HeartIcon,
  InfoIcon,
  LockIcon,
  LogOutIcon,
  UserIcon,
} from "@/assets";
import { Button, Empty, Flex, Typography, UserAvatar } from "@/components";
import { useAuth } from "@/graphql";
import { IconPropsType } from "@/types";

import { ProfileLoyaltyCard } from "./components/profile-loyalty-card.component";
import { ProfileMenuRow } from "./components/profile-menu-row.component";
import { ProfileSkeleton } from "./components/profile-skeleton.component";
import { SignOutConfirmationSheet } from "./components/sign-out-confirmation-sheet.component";

type MenuItem = {
  title: string;
  value?: string;
  icon: ReactElement<IconPropsType>;
  onPress?: () => void;
  showChevron?: boolean;
  tone?: "default" | "danger";
};

function ProfileMenuGroup({ items }: { items: MenuItem[] }) {
  return (
    <View style={styles.group}>
      {items.map((item, index) => (
        <View key={item.title}>
          {index > 0 ? <View style={styles.divider} /> : null}
          <ProfileMenuRow
            title={item.title}
            value={item.value}
            icon={item.icon}
            onPress={item.onPress}
            showChevron={item.showChevron ?? true}
            tone={item.tone}
          />
        </View>
      ))}
    </View>
  );
}

function ProfileSection({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <Flex gap={1}>
      <Typography
        size="text-xs"
        weight="medium"
        color="muted"
        style={styles.sectionLabel}
      >
        {label}
      </Typography>
      {children}
    </Flex>
  );
}

export function ProfileFeature() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useUnistyles();
  const iconColor = theme.colors.textPrimary;
  const [signOutOpen, setSignOutOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await logout();
    } finally {
      setSigningOut(false);
      setSignOutOpen(false);
    }
  }

  if (loading) {
    return (
      <Flex
        flex={1}
        gap={2}
        style={[
          styles.screen,
          styles.content,
          {
            paddingTop: insets.top + theme.space(2),
            paddingBottom: Math.max(insets.bottom, theme.space(3)),
          },
        ]}
      >
        <ProfileSkeleton />
      </Flex>
    );
  }

  if (!user) {
    return (
      <Flex
        flex={1}
        style={[
          styles.screen,
          styles.content,
          { paddingTop: insets.top + theme.space(2) },
        ]}
        justifyContent="center"
      >
        <Empty
          title="Sign in to your account"
          description="Manage reservations and see your loyalty progress."
          icon={<UserIcon size={48} color={theme.colors.textMuted} />}
        >
          <Flex gap={1} style={styles.guestActions}>
            <Button
              fullWidth
              onPress={() =>
                router.push({
                  pathname: "/sign-in",
                  params: { next: "/profile" },
                })
              }
            >
              Sign in
            </Button>
            <Button
              fullWidth
              color="secondary"
              variant="outlined"
              onPress={() =>
                router.push({
                  pathname: "/sign-up",
                  params: { next: "/profile" },
                })
              }
            >
              Create account
            </Button>
          </Flex>
        </Empty>
      </Flex>
    );
  }

  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ");

  return (
    <>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + theme.space(2),
            paddingBottom: Math.max(insets.bottom, theme.space(3)),
          },
        ]}
      >
        <Typography size="display-xs" weight="bold">
          Profile
        </Typography>

        <View style={styles.identityCard}>
          <Flex direction="row" alignItems="center" gap={1.5}>
            <UserAvatar
              size="lg"
              firstName={user.firstName}
              lastName={user.lastName}
            />
            <Flex gap={0.25} style={styles.flexGrow}>
              <Typography weight="semibold" size="text-lg" numberOfLines={1}>
                {fullName}
              </Typography>
              {user.email ? (
                <Typography size="text-sm" color="secondary" numberOfLines={1}>
                  {user.email}
                </Typography>
              ) : null}
            </Flex>
          </Flex>
        </View>

        <ProfileLoyaltyCard
          tierName={user.loyaltyTierName}
          points={user.loyaltyPoints}
          completedVisits={user.loyaltyCompletedVisits}
          referralCode={user.referralCode}
        />

        <ProfileSection label="Shortcuts">
          <ProfileMenuGroup
            items={[
              {
                title: "Reservations",
                icon: <CalendarIcon size={20} color={iconColor} />,
                onPress: () => router.push("/reservations"),
              },
              {
                title: "Favorites",
                icon: <HeartIcon size={20} color={iconColor} />,
              },
              {
                title: "Notifications",
                icon: <BellIcon size={20} color={iconColor} />,
              },
            ]}
          />
        </ProfileSection>

        <ProfileSection label="Account">
          <ProfileMenuGroup
            items={[
              {
                title: "Password & security",
                icon: <LockIcon size={20} color={iconColor} />,
              },
            ]}
          />
        </ProfileSection>

        <ProfileSection label="Preferences">
          <ProfileMenuGroup
            items={[
              {
                title: "Language",
                value: "English",
                icon: <GlobeIcon size={20} color={iconColor} />,
              },
              {
                title: "Help center",
                icon: <CircleHelpIcon size={20} color={iconColor} />,
              },
              {
                title: "About Tablevera",
                icon: <InfoIcon size={20} color={iconColor} />,
              },
            ]}
          />
        </ProfileSection>

        <ProfileMenuGroup
          items={[
            {
              title: "Sign out",
              icon: <LogOutIcon size={20} color={theme.colors.error} />,
              showChevron: false,
              tone: "danger",
              onPress: () => setSignOutOpen(true),
            },
          ]}
        />
      </ScrollView>

      <SignOutConfirmationSheet
        visible={signOutOpen}
        onClose={() => setSignOutOpen(false)}
        onConfirm={() => void handleSignOut()}
        loading={signingOut}
      />
    </>
  );
}

const styles = StyleSheet.create(({ space, colors, radius }) => ({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: space(2),
    gap: space(2),
  },
  identityCard: {
    padding: space(2),
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.slate3,
    backgroundColor: colors.background,
  },
  flexGrow: {
    flex: 1,
    minWidth: 0,
  },
  sectionLabel: {
    paddingHorizontal: space(0.5),
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  group: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.slate3,
    backgroundColor: colors.background,
    overflow: "hidden",
  },
  divider: {
    height: 1,
    width: "100%",
    backgroundColor: colors.slate3,
  },
  guestActions: {
    width: "100%",
  },
}));
