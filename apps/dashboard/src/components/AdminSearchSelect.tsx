'use client';

import { useEffect, useMemo, useState } from 'react';
import { Select, Spin } from 'antd';
import type { SelectProps } from 'antd';
import { useQuery } from '@/lib/apollo-hooks';
import { ADMIN_RESTAURANT_NAMES, ADMIN_USERS } from '@/lib/graphql';

/** adminUsers / adminRestaurants cap `limit` at 100; keep pages small and let the server search. */
const SEARCH_LIMIT = 20;
const SEARCH_DEBOUNCE_MS = 300;

type Option = { value: string; label: string };

type BaseProps = Omit<
  SelectProps<string>,
  'options' | 'showSearch' | 'filterOption' | 'onSearch' | 'searchValue' | 'notFoundContent'
> & {
  /** Label for the current value when it may not be in the first page of results. */
  selectedOption?: Option | null;
  excludeIds?: string[];
};

function useDebouncedValue(value: string, ms: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);
  return debounced;
}

function SearchSelect({
  fetched,
  loading,
  search,
  onSearch,
  selectedOption,
  excludeIds,
  value,
  onChange,
  onOpenChange,
  ...rest
}: BaseProps & {
  fetched: Option[];
  loading: boolean;
  search: string;
  onSearch: (value: string) => void;
}) {
  const [picked, setPicked] = useState<Option | null>(null);

  const options = useMemo(() => {
    const excluded = new Set(excludeIds ?? []);
    const list = fetched.filter((option) => !excluded.has(option.value));
    if (value && !list.some((option) => option.value === value)) {
      const known = [selectedOption, picked].find((option) => option?.value === value);
      if (known) list.unshift(known);
    }
    return list;
  }, [fetched, excludeIds, value, selectedOption, picked]);

  return (
    <Select<string>
      {...rest}
      value={value}
      showSearch={{ filterOption: false, searchValue: search, onSearch }}
      options={options}
      notFoundContent={loading ? <Spin size="small" /> : 'No matches'}
      onChange={(next, option) => {
        const match = Array.isArray(option) ? undefined : option;
        setPicked(next && match ? { value: next, label: String(match.label ?? next) } : null);
        onChange?.(next, option);
      }}
      onOpenChange={(open) => {
        if (!open) onSearch('');
        onOpenChange?.(open);
      }}
    />
  );
}

type UserItem = {
  id: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  role: string;
};

export function adminUserLabel(user: UserItem, roleLabel?: (role: string) => string) {
  const name = `${user.firstName} ${user.lastName}`.trim();
  const base = `${name}${user.email ? ` (${user.email})` : ''}`;
  return roleLabel ? `${base} — ${roleLabel(user.role)}` : base;
}

/** Account picker backed by server-side `adminUsers(search, roles)`. */
export function AdminUserSelect({
  roles,
  roleLabel,
  ...props
}: BaseProps & { roles?: string[]; roleLabel?: (role: string) => string }) {
  const [search, setSearch] = useState('');
  const debounced = useDebouncedValue(search.trim(), SEARCH_DEBOUNCE_MS);
  const { data, previousData, loading } = useQuery(ADMIN_USERS, {
    variables: {
      search: debounced || undefined,
      roles: roles?.length ? roles : undefined,
      limit: SEARCH_LIMIT,
      offset: 0,
    },
  });
  const items = ((data ?? previousData)?.adminUsers?.items ?? []) as UserItem[];
  const fetched = items.map((user) => ({ value: user.id, label: adminUserLabel(user, roleLabel) }));

  return (
    <SearchSelect
      placeholder="Search by name, email, or phone"
      {...props}
      fetched={fetched}
      loading={loading}
      search={search}
      onSearch={setSearch}
    />
  );
}

/** Restaurant picker backed by server-side `adminRestaurants(search)`. */
export function AdminRestaurantSelect(props: BaseProps) {
  const [search, setSearch] = useState('');
  const debounced = useDebouncedValue(search.trim(), SEARCH_DEBOUNCE_MS);
  const { data, previousData, loading } = useQuery(ADMIN_RESTAURANT_NAMES, {
    variables: { search: debounced || undefined, limit: SEARCH_LIMIT },
  });
  const items = ((data ?? previousData)?.adminRestaurants?.items ?? []) as Array<{
    id: string;
    name: string;
  }>;
  const fetched = items.map((r) => ({ value: r.id, label: r.name }));

  return (
    <SearchSelect
      placeholder="Search restaurants"
      {...props}
      fetched={fetched}
      loading={loading}
      search={search}
      onSearch={setSearch}
    />
  );
}
