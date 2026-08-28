import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { FONT_FAMILY } from "@/lib/fonts";
import { Flex, SuggestionRowSkeleton, Typography } from "@/components";

import { splitHighlightParts } from "../helpers/split-highlight-parts.helpers";
import type { SearchSuggestion } from "../types";

export type SearchSuggestionsProps = {
  query: string;
  loading: boolean;
  items: SearchSuggestion[];
  onSelect: (item: SearchSuggestion) => void;
};

function SuggestionRow({
  item,
  query,
  onSelect,
}: {
  item: SearchSuggestion;
  query: string;
  onSelect: (item: SearchSuggestion) => void;
}) {
  const parts = splitHighlightParts(item.name, query);

  return (
    <Pressable onPress={() => onSelect(item)} style={styles.row}>
      {item.photoUrl ? (
        <Image source={{ uri: item.photoUrl }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.avatarFallback]} />
      )}
      <Flex flex={1} gap={0.25} style={styles.copy}>
        <Text numberOfLines={1} style={styles.name}>
          {parts.map((part, index) => (
            <Text
              key={`${part.text}-${index}`}
              style={part.matched ? styles.nameMatch : undefined}
            >
              {part.text}
            </Text>
          ))}
        </Text>
        <Typography size="text-sm" color="secondary" numberOfLines={1}>
          {item.addressLine}
        </Typography>
      </Flex>
    </Pressable>
  );
}

export function SearchSuggestions({
  query,
  loading,
  items,
  onSelect,
}: SearchSuggestionsProps) {
  if (loading && items.length === 0) {
    return (
      <Flex gap={0} style={styles.list}>
        {[1, 2, 3, 4].map((i) => (
          <SuggestionRowSkeleton key={i} />
        ))}
      </Flex>
    );
  }

  if (!loading && items.length === 0) {
    return (
      <Flex style={styles.padX}>
        <Typography color="secondary">No matching restaurants</Typography>
      </Flex>
    );
  }

  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.list}
    >
      {items.map((item, index) => (
        <View key={item.id}>
          <SuggestionRow item={item} query={query} onSelect={onSelect} />
          {index < items.length - 1 ? <View style={styles.separator} /> : null}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create(({ space, colors, radius }) => ({
  padX: {
    paddingHorizontal: space(2),
    paddingTop: space(0.5),
  },
  list: {
    paddingTop: space(0.5),
    paddingBottom: space(4),
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space(1.5),
    paddingHorizontal: space(2),
    paddingVertical: space(1.25),
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
  },
  avatarFallback: {
    backgroundColor: colors.slate3,
  },
  copy: {
    minWidth: 0,
  },
  name: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 16,
    lineHeight: 22,
    color: colors.textPrimary,
  },
  nameMatch: {
    fontFamily: FONT_FAMILY.bold,
  },
  separator: {
    height: 1,
    backgroundColor: colors.slate3,
  },
}));
