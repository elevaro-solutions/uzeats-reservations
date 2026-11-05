'use client';

import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type KeyboardEvent,
  type MouseEvent,
  type MutableRefObject,
  type ReactNode,
  type SetStateAction,
} from 'react';
import { useMutation, useQuery } from '@/lib/apollo-hooks';
import { useRouter } from 'next/navigation';
import {
  Button,
  Card,
  Collapse,
  Dropdown,
  Form,
  Input,
  InputNumber,
  Menu,
  Modal,
  Popconfirm,
  Progress,
  Segmented,
  Select,
  Space,
  Spin,
  Switch,
  Tag,
  Tooltip,
  Typography,
  Upload,
  message,
} from 'antd';
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  DeleteOutlined,
  LinkOutlined,
  LoadingOutlined,
  MoreOutlined,
  NodeCollapseOutlined,
  NodeExpandOutlined,
  PictureOutlined,
  PlusOutlined,
  SearchOutlined,
  ShoppingCartOutlined,
  StarFilled,
  StarOutlined,
} from '@ant-design/icons';
import type { FormInstance } from 'antd';
import type { RcFile } from 'antd/es/upload';
import type { FormListFieldData } from 'antd/es/form/FormList';
import {
  FALLBACK_PUBLIC_MENU_ITEMS,
  MAX_POPULAR_MENU_ITEMS,
  canManageOnlineOrdering,
  countPopularMenuItems,
  normalizeOnlineOrderUrl,
  restaurantUpload,
} from '@reservations/shared';
import { useAuth } from '@/lib/auth';
import { usePartnerRestaurant } from '@/lib/usePartnerRestaurant';
import {
  MY_RESTAURANTS_SHELL,
  RESTAURANT_MENU_EDITOR,
  UPSERT_MENU,
  UPDATE_RESTAURANT,
} from '@/lib/graphql';
import { buildRestaurantInput } from '@/lib/restaurantInput';
import { uploadFile } from '@/lib/upload';
import { OnlineOrderFields } from '@/components/OnlineOrderFields';
import { RichTextArea } from '@/components/RichTextArea';
const { Title, Text } = Typography;

const DIETARY_OPTIONS = [
  { value: 'vegan', label: 'Vegan' },
  { value: 'vegetarian', label: 'Vegetarian' },
  { value: 'gluten-free', label: 'Gluten-free' },
  { value: 'dairy-free', label: 'Dairy-free' },
  { value: 'nut-free', label: 'Nut-free' },
  { value: 'halal', label: 'Halal' },
  { value: 'kosher', label: 'Kosher' },
];

const DIETARY_LABELS: Record<string, string> = Object.fromEntries(
  DIETARY_OPTIONS.map((o) => [o.value, o.label]),
);

type MenuItemForm = {
  name: string;
  description?: string;
  price: number;
  dietary: string[];
  available: boolean;
  popular: boolean;
  photoUrl?: string;
};

type MenuSectionForm = {
  name: string;
  items: MenuItemForm[];
};

type MenuEditorValues = {
  sections: MenuSectionForm[];
  onlineOrderUrl?: string;
  onlineOrderEnabled?: boolean;
};

type MenuForm = ReturnType<typeof Form.useForm<MenuEditorValues>>[0];

type ItemFilter = 'all' | 'popular' | 'unavailable';

const EMPTY_ITEM: MenuItemForm = {
  name: '',
  description: '',
  price: 0,
  dietary: [],
  available: true,
  popular: false,
  photoUrl: undefined,
};

const EMPTY_SECTION: MenuSectionForm = {
  name: 'New category',
  items: [{ ...EMPTY_ITEM }],
};

/** Active accordion panel keys, keyed by Form.List section field name. */
type OpenKeysBySection = Record<string, string[]>;

function sectionsFromRestaurant(restaurant: {
  menu?: {
    sections?: Array<{
      name: string;
      items: Array<{
        name: string;
        description?: string;
        priceCents?: number;
        dietary?: string[];
        available?: boolean;
        popular?: boolean;
        photoUrl?: string;
      }>;
    }>;
  } | null;
}): MenuSectionForm[] {
  if (!restaurant.menu?.sections?.length) {
    return [
      {
        name: 'Starters',
        items: [{ ...EMPTY_ITEM, name: 'Soup', price: 12 }],
      },
    ];
  }
  return restaurant.menu.sections.map((s) => ({
    name: s.name,
    items: s.items.map((i) => ({
      name: i.name,
      description: i.description ?? '',
      price: (i.priceCents ?? 0) / 100,
      dietary: i.dietary ?? [],
      available: i.available ?? true,
      popular: i.popular ?? false,
      photoUrl: i.photoUrl ?? undefined,
    })),
  }));
}

/** Descriptions may be rich-text HTML; list rows show a one-line plain preview. */
function plainText(value?: string) {
  if (!value) return '';
  return value
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/(p|li|h\d|blockquote)>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function formatPrice(price: unknown) {
  return typeof price === 'number' ? `$${price.toFixed(2)}` : '';
}

function itemMatches(item: MenuItemForm | undefined, query: string, filter: ItemFilter) {
  if (!item) return false;
  if (filter === 'popular' && !item.popular) return false;
  if (filter === 'unavailable' && item.available !== false) return false;
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    (item.name ?? '').toLowerCase().includes(q) ||
    plainText(item.description).toLowerCase().includes(q) ||
    (item.dietary ?? []).some((tag) => (DIETARY_LABELS[tag] ?? tag).toLowerCase().includes(q))
  );
}

/** First dish or category that would fail save, including panels never opened. */
function firstIncompleteField(sections: MenuSectionForm[]) {
  for (let si = 0; si < sections.length; si += 1) {
    const section = sections[si]!;
    const sectionName = section.name?.trim();
    if (!sectionName) {
      return { path: ['sections', si, 'name'], sectionIndex: si, error: `Category ${si + 1} needs a name` };
    }
    const items = section.items ?? [];
    for (let ii = 0; ii < items.length; ii += 1) {
      const item = items[ii]!;
      if (!item.name?.trim()) {
        return {
          path: ['sections', si, 'items', ii, 'name'],
          sectionIndex: si,
          itemIndex: ii,
          error: `Dish ${ii + 1} in “${sectionName}” needs a name`,
        };
      }
      if (typeof item.price !== 'number') {
        return {
          path: ['sections', si, 'items', ii, 'price'],
          sectionIndex: si,
          itemIndex: ii,
          error: `“${item.name.trim()}” needs a price`,
        };
      }
    }
  }
  return null;
}

const stopHeaderToggle = {
  onClick: (e: MouseEvent) => e.stopPropagation(),
  onKeyDown: (e: KeyboardEvent) => e.stopPropagation(),
};

export default function MenuPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [form] = Form.useForm<MenuEditorValues>();
  const { data: shellData, loading: shellLoading } = useQuery(MY_RESTAURANTS_SHELL, {
    skip: !user,
  });
  const restaurants = shellData?.myRestaurants ?? [];
  const { activeRestaurantId, restaurantSelectProps } = usePartnerRestaurant(restaurants);
  const {
    data: menuData,
    loading: menuLoading,
    refetch,
  } = useQuery(RESTAURANT_MENU_EDITOR, {
    skip: !user || !activeRestaurantId,
    variables: { id: activeRestaurantId },
  });
  const restaurant =
    activeRestaurantId && menuData?.restaurant?.id === activeRestaurantId
      ? menuData.restaurant
      : null;
  const [upsertMenu, { loading }] = useMutation(UPSERT_MENU);
  const [updateRestaurant, { loading: savingMenuUrl }] = useMutation(UPDATE_RESTAURANT);
  const saving = loading || savingMenuUrl;
  const [menuUrl, setMenuUrl] = useState('');
  const [uploadingPath, setUploadingPath] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<ItemFilter>('all');
  /** Empty = all item accordions collapsed (default). */
  const [openKeys, setOpenKeys] = useState<OpenKeysBySection>({});
  /** Latest item keys per section, updated each render for expand-all. */
  const itemKeysRef = useRef<Record<string, string[]>>({});
  /** Form.List field name of the category shown in the side panel. */
  const [activeSectionName, setActiveSectionName] = useState<number>(0);
  /** `preserve` keeps dishes whose rows are filtered out or never expanded in the counts. */
  const watchedSections = Form.useWatch('sections', { form, preserve: true }) as
    | MenuSectionForm[]
    | undefined;
  const popularCount = countPopularMenuItems(watchedSections);
  const categoryCount = watchedSections?.length ?? 0;
  const totalItems = (watchedSections ?? []).reduce((n, s) => n + (s?.items?.length ?? 0), 0);
  const unavailableCount = (watchedSections ?? []).reduce(
    (n, s) => n + (s?.items ?? []).filter((i) => i?.available === false).length,
    0,
  );
  const searching = Boolean(query.trim()) || filter !== 'all';
  /** Item counts from nested Form.List (authoritative; useWatch can lag on nested lists). */
  const [itemCounts, setItemCounts] = useState<Record<number, number>>({});
  /** Restaurant id whose menu is currently in the form — skip re-hydrate on cache polls. */
  const hydratedIdRef = useRef<string | null>(null);
  /** When true, next hydrate resets accordion / category selection (restaurant switch). */
  const resetEditorUiRef = useRef(true);
  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [authLoading, user, router]);

  // Switching locations: allow a fresh hydrate and collapse UI.
  useEffect(() => {
    hydratedIdRef.current = null;
    resetEditorUiRef.current = true;
  }, [activeRestaurantId]);

  function applyMenu(source: NonNullable<typeof restaurant>) {
    const nextSections = sectionsFromRestaurant(source);
    setMenuUrl(source.menuUrl ?? '');
    form.setFieldsValue({
      sections: nextSections,
      onlineOrderUrl: source.onlineOrderUrl ?? '',
      onlineOrderEnabled: source.onlineOrderEnabled ?? true,
    });
    setItemCounts(
      Object.fromEntries(nextSections.map((s, i) => [i, s.items.length])) as Record<
        number,
        number
      >,
    );
    setDirty(false);
  }

  useEffect(() => {
    if (!activeRestaurantId || !restaurant || restaurant.id !== activeRestaurantId) return;
    // Keep editor stable while a photo upload is in flight (Form.List remount would abort it).
    if (uploadingPath) return;
    if (hydratedIdRef.current === activeRestaurantId) return;

    applyMenu(restaurant);
    if (resetEditorUiRef.current) {
      setOpenKeys({});
      itemKeysRef.current = {};
      setActiveSectionName(0);
      setQuery('');
      setFilter('all');
      resetEditorUiRef.current = false;
    }
    hydratedIdRef.current = activeRestaurantId;
    // applyMenu only touches stable setters and the form instance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRestaurantId, restaurant, form, uploadingPath]);

  // Keep the side-tab selection in range after removals.
  useEffect(() => {
    const len = watchedSections?.length ?? 0;
    if (len === 0) return;
    if (activeSectionName >= len) {
      setActiveSectionName(len - 1);
    }
  }, [watchedSections?.length, activeSectionName]);

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  async function uploadPhoto(file: RcFile, sectionIndex: number, itemIndex: number) {
    if (file.size > 5 * 1024 * 1024) {
      message.error('File exceeds 5MB limit');
      return;
    }

    const path = `${sectionIndex}-${itemIndex}`;
    setUploadingPath(path);
    try {
      const { publicUrl } = await uploadFile(file, file.name, {
        target: restaurantUpload(activeRestaurantId ?? '', 'menu'),
      });
      form.setFieldValue(['sections', sectionIndex, 'items', itemIndex, 'photoUrl'], publicUrl);
      setDirty(true);
      message.success('Photo uploaded');
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploadingPath(null);
    }
  }

  function revealField(path: (string | number)[], sectionIndex: number, itemIndex?: number) {
    setActiveSectionName(sectionIndex);
    setQuery('');
    setFilter('all');
    if (itemIndex != null) {
      const key = itemKeysRef.current[String(sectionIndex)]?.[itemIndex];
      if (key) {
        setOpenKeys((prev) => {
          const current = prev[String(sectionIndex)] ?? [];
          return current.includes(key)
            ? prev
            : { ...prev, [String(sectionIndex)]: [...current, key] };
        });
      }
    }
    // Wait for the panel to mount its fields, then surface the inline error.
    const looseForm = form as FormInstance;
    window.setTimeout(() => {
      looseForm.validateFields([path]).catch(() => undefined);
      looseForm.scrollToField(path, { block: 'center', behavior: 'smooth' });
    }, 50);
  }

  function discardChanges() {
    if (!restaurant) return;
    applyMenu(restaurant);
    setOpenKeys({});
    setActiveSectionName(0);
    message.info('Changes discarded');
  }

  const selectProps = {
    ...restaurantSelectProps,
    onChange: (id: string) => {
      if (!dirty) {
        restaurantSelectProps.onChange(id);
        return;
      }
      Modal.confirm({
        title: 'Discard unsaved menu changes?',
        content: 'Switching restaurants drops the edits you have not saved yet.',
        okText: 'Discard and switch',
        okButtonProps: { danger: true },
        cancelText: 'Keep editing',
        onOk: () => {
          setDirty(false);
          restaurantSelectProps.onChange(id);
        },
      });
    },
  };

  if (authLoading || (user && shellLoading && !shellData)) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: 320 }}>
        <Spin size="large" />
      </div>
    );
  }

  const menuBusy = Boolean(activeRestaurantId) && menuLoading && !restaurant;

  return (
    <div component="MenuPage" style={{ display: 'contents' }}><Space orientation="vertical" size={16} style={{ width: '100%' }}>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <div>
          <Title level={2} style={{ margin: 0 }}>
            Menu editor
          </Title>
          <Text type="secondary">
            Organize categories and dishes, and pick which ones diners see on your restaurant page.
          </Text>
        </div>
        <Space wrap>
          <Select style={{ width: 240 }} {...selectProps} />
          {dirty ? <Tag color="gold">Unsaved changes</Tag> : null}
          <Button
            type="primary"
            htmlType="submit"
            form="menu-editor-form"
            loading={saving}
            disabled={menuBusy || !restaurant}
          >
            Save menu
          </Button>
        </Space>
      </div>

      {menuBusy ? (
        <div style={{ display: 'grid', placeItems: 'center', minHeight: 280 }}>
          <Spin size="large" />
        </div>
      ) : (
      <Form
        id="menu-editor-form"
        form={form}
        layout="vertical"
        requiredMark={false}
        onValuesChange={() => setDirty(true)}
        onFinishFailed={({ errorFields }) => {
          const first = errorFields[0];
          if (!first) return;
          const [, sectionIndex, , itemIndex] = first.name;
          if (typeof sectionIndex === 'number') {
            revealField(
              first.name as (string | number)[],
              sectionIndex,
              typeof itemIndex === 'number' ? itemIndex : undefined,
            );
          }
          message.error(first.errors[0] ?? 'Fix the highlighted fields before saving');
        }}
        onFinish={async (values) => {
          if (!activeRestaurantId || !restaurant) return;
          const incomplete = firstIncompleteField(values.sections ?? []);
          if (incomplete) {
            revealField(incomplete.path, incomplete.sectionIndex, incomplete.itemIndex);
            message.error(incomplete.error);
            return;
          }
          try {
            const sections = (values.sections ?? []).map((s) => ({
              name: s.name.trim(),
              items: (s.items ?? []).map((i) => ({
                name: i.name.trim(),
                description: i.description?.trim() || '',
                priceCents: Math.round((i.price ?? 0) * 100),
                dietary: i.dietary ?? [],
                available: i.available ?? true,
                popular: i.popular ?? false,
                photoUrl: i.photoUrl || undefined,
              })),
            }));
            if (countPopularMenuItems(sections) > MAX_POPULAR_MENU_ITEMS) {
              message.error(
                `Select up to ${MAX_POPULAR_MENU_ITEMS} popular dishes for the restaurant page`,
              );
              return;
            }
            await Promise.all([
              updateRestaurant({
                variables: {
                  id: activeRestaurantId,
                  input: {
                    ...buildRestaurantInput(restaurant),
                    menuUrl: menuUrl.trim() || null,
                    onlineOrderUrl: normalizeOnlineOrderUrl(values.onlineOrderUrl),
                    onlineOrderEnabled: values.onlineOrderEnabled !== false,
                  },
                },
              }),
              upsertMenu({ variables: { restaurantId: activeRestaurantId, input: { sections } } }),
            ]);
            setDirty(false);
            message.success('Menu saved');
            // Refresh Apollo cache only — re-applying form values remounts Form.List keys and collapses items.
            void refetch();
          } catch (err: unknown) {
            message.error(err instanceof Error ? err.message : 'Failed to save menu');
          }
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 16,
            marginBottom: 16,
          }}
        >
          <Card size="small" title="Full menu link">
            <Input
              prefix={<LinkOutlined style={{ color: 'var(--color-text-tertiary)' }} />}
              placeholder="https://yourrestaurant.com/menu"
              value={menuUrl}
              allowClear
              onChange={(e) => {
                setMenuUrl(e.target.value);
                setDirty(true);
              }}
            />
            <Text type="secondary" style={{ display: 'block', marginTop: 8, fontSize: 13 }}>
              Optional. Powers the “View full menu” button on your public page — a PDF, your
              website menu, or a third-party menu host.
            </Text>
          </Card>
          <Card
            size="small"
            title={
              <Space size={6}>
                <ShoppingCartOutlined />
                Online ordering
              </Space>
            }
          >
            <OnlineOrderFields
              label={null}
              slug={restaurant?.slug}
              restaurantId={restaurant?.id}
              canToggle={canManageOnlineOrdering(user?.role ?? '')}
            />
          </Card>
          <Card
            size="small"
            title={
              <Space size={6}>
                <StarFilled style={{ color: 'var(--color-accent)' }} />
                Featured dishes
              </Space>
            }
            extra={
              <Text strong>
                {popularCount} / {MAX_POPULAR_MENU_ITEMS}
              </Text>
            }
          >
            <Progress
              percent={Math.round((popularCount / MAX_POPULAR_MENU_ITEMS) * 100)}
              steps={MAX_POPULAR_MENU_ITEMS}
              showInfo={false}
              strokeColor="var(--color-accent)"
              style={{ marginBottom: 8 }}
            />
            <Text type="secondary" style={{ display: 'block', fontSize: 13 }}>
              {popularCount === 0
                ? `Star up to ${MAX_POPULAR_MENU_ITEMS} dishes to feature them on your restaurant page. Until you do, diners see your first ${FALLBACK_PUBLIC_MENU_ITEMS} dishes.`
                : popularCount >= MAX_POPULAR_MENU_ITEMS
                  ? 'Limit reached — unstar a dish to feature a different one.'
                  : 'Only starred dishes appear on your restaurant page.'}
            </Text>
            <Text type="secondary" style={{ display: 'block', fontSize: 12, marginTop: 4 }}>
              {categoryCount} {categoryCount === 1 ? 'category' : 'categories'} · {totalItems}{' '}
              {totalItems === 1 ? 'dish' : 'dishes'}
              {unavailableCount ? ` · ${unavailableCount} unavailable` : ''}
            </Text>
          </Card>
        </div>

        <Form.List name="sections">
          {(sections, { add: addSection, remove: removeSection, move: moveSection }) => {
            const activeSection =
              sections.find((s) => s.name === activeSectionName) ?? sections[0] ?? null;
            const activeKey = activeSection ? String(activeSection.name) : '';

            const matchCounts = sections.map((section) => {
              const items = watchedSections?.[section.name]?.items ?? [];
              return items.filter((item) => itemMatches(item, query, filter)).length;
            });

            const categoryMenuItems = sections.map((section, index) => {
              const sectionData = watchedSections?.[section.name];
              const label = sectionData?.name?.trim() || `Category ${index + 1}`;
              const itemCount =
                itemCounts[section.name] ??
                sectionData?.items?.length ??
                form.getFieldValue(['sections', section.name, 'items'])?.length ??
                0;
              const matches = matchCounts[index] ?? 0;
              return {
                key: String(section.name),
                label: (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 8,
                      width: '100%',
                      opacity: searching && matches === 0 ? 0.45 : 1,
                    }}
                  >
                    <span
                      style={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {label}
                    </span>
                    <Tag style={{ marginInlineEnd: 0, flexShrink: 0 }}>
                      {searching ? `${matches}/${itemCount}` : itemCount}
                    </Tag>
                  </div>
                ),
              };
            });

            function moveCategory(from: number, to: number) {
              if (to < 0 || to >= sections.length) return;
              moveSection(from, to);
              setOpenKeys((prev) => ({
                ...prev,
                [String(from)]: prev[String(to)] ?? [],
                [String(to)]: prev[String(from)] ?? [],
              }));
              setItemCounts((prev) => ({
                ...prev,
                [from]: prev[to] ?? 0,
                [to]: prev[from] ?? 0,
              }));
              setActiveSectionName(to);
            }

            function deleteCategory(removing: number) {
              const remaining = sections.filter((s) => s.name !== removing);
              const prevSibling = [...remaining].reverse().find((s) => s.name < removing);
              removeSection(removing);
              setOpenKeys({});
              setActiveSectionName(
                remaining.length === 0 ? 0 : (prevSibling ?? remaining[0]!).name,
              );
            }

            const otherMatches = sections
              .map((section, index) => ({ section, index, count: matchCounts[index] ?? 0 }))
              .filter(({ section, count }) => section.name !== activeSection?.name && count > 0);

            const emptySearch = (
              <div
                style={{
                  padding: '28px 16px',
                  textAlign: 'center',
                  border: '1px dashed var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
                  No dishes in this category match your filters.
                </Text>
                {otherMatches.length ? (
                  <Space wrap size={6} style={{ justifyContent: 'center' }}>
                    <Text type="secondary">Found in</Text>
                    {otherMatches.map(({ section, index, count }) => (
                      <Button
                        key={section.key}
                        size="small"
                        onClick={() => setActiveSectionName(section.name)}
                      >
                        {watchedSections?.[section.name]?.name?.trim() || `Category ${index + 1}`} (
                        {count})
                      </Button>
                    ))}
                  </Space>
                ) : (
                  <Button
                    size="small"
                    onClick={() => {
                      setQuery('');
                      setFilter('all');
                    }}
                  >
                    Clear filters
                  </Button>
                )}
              </div>
            );

            return (
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 16,
                  alignItems: 'flex-start',
                }}
              >
                <Card
                  size="small"
                  title="Categories"
                  styles={{ body: { padding: '8px 0' } }}
                  style={{
                    flex: '1 1 240px',
                    maxWidth: 280,
                    minWidth: 220,
                    position: 'sticky',
                    top: 16,
                  }}
                  extra={
                    <Button
                      type="text"
                      size="small"
                      icon={<PlusOutlined />}
                      onClick={() => {
                        const nextIndex = sections.length;
                        addSection({ ...EMPTY_SECTION, items: [{ ...EMPTY_ITEM }] });
                        setItemCounts((prev) => ({
                          ...prev,
                          [nextIndex]: EMPTY_SECTION.items.length,
                        }));
                        setActiveSectionName(nextIndex);
                        setQuery('');
                        setFilter('all');
                      }}
                    >
                      Add
                    </Button>
                  }
                >
                  <Menu
                    mode="inline"
                    selectedKeys={activeKey ? [activeKey] : []}
                    items={categoryMenuItems}
                    onClick={({ key }) => setActiveSectionName(Number(key))}
                    style={{ border: 'none' }}
                  />
                  {sections.length === 0 ? (
                    <Text type="secondary" style={{ display: 'block', padding: '8px 16px' }}>
                      No categories yet
                    </Text>
                  ) : null}
                </Card>

                <div style={{ flex: '999 1 420px', minWidth: 0 }}>
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 8,
                      alignItems: 'center',
                      marginBottom: 12,
                    }}
                  >
                    <Input
                      allowClear
                      prefix={<SearchOutlined style={{ color: 'var(--color-text-tertiary)' }} />}
                      placeholder="Search dishes, descriptions, tags"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      style={{ flex: '1 1 240px', maxWidth: 360 }}
                    />
                    <Segmented<ItemFilter>
                      value={filter}
                      onChange={setFilter}
                      options={[
                        { value: 'all', label: 'All' },
                        { value: 'popular', label: `Popular (${popularCount})` },
                        { value: 'unavailable', label: `Unavailable (${unavailableCount})` },
                      ]}
                    />
                  </div>

                  {sections.map((section, sectionIndex) => {
                    const isActive = activeSection?.name === section.name;
                    const sectionLabel =
                      watchedSections?.[section.name]?.name?.trim() || `Category ${sectionIndex + 1}`;
                    const sectionItemCount = itemCounts[section.name] ?? 0;
                    return (
                      <div
                        key={section.key}
                        style={{ display: isActive ? 'block' : 'none' }}
                        aria-hidden={!isActive}
                      >
                        <Card
                          styles={{ header: { paddingBlock: 12 } }}
                          title={
                            <Form.Item
                              name={[section.name, 'name']}
                              rules={[
                                { required: true, whitespace: true, message: 'Category name is required' },
                              ]}
                              style={{ marginBottom: 0, maxWidth: 360 }}
                            >
                              <Input
                                placeholder="Category name (e.g. Mains)"
                                aria-label="Category name"
                                style={{ fontWeight: 600, fontSize: 16 }}
                              />
                            </Form.Item>
                          }
                          extra={
                            <Dropdown
                              trigger={['click']}
                              menu={{
                                items: [
                                  {
                                    key: 'up',
                                    icon: <ArrowUpOutlined />,
                                    label: 'Move category up',
                                    disabled: sectionIndex === 0 || Boolean(uploadingPath),
                                  },
                                  {
                                    key: 'down',
                                    icon: <ArrowDownOutlined />,
                                    label: 'Move category down',
                                    disabled:
                                      sectionIndex === sections.length - 1 || Boolean(uploadingPath),
                                  },
                                  { type: 'divider' },
                                  {
                                    key: 'delete',
                                    icon: <DeleteOutlined />,
                                    label: 'Delete category',
                                    danger: true,
                                    disabled: sections.length <= 1 || Boolean(uploadingPath),
                                  },
                                ],
                                onClick: ({ key }) => {
                                  if (key === 'up') moveCategory(section.name, section.name - 1);
                                  if (key === 'down') moveCategory(section.name, section.name + 1);
                                  if (key === 'delete') {
                                    Modal.confirm({
                                      title: `Delete “${sectionLabel}”?`,
                                      content: `This removes the category and its ${sectionItemCount} ${
                                        sectionItemCount === 1 ? 'dish' : 'dishes'
                                      } when you save.`,
                                      okText: 'Delete category',
                                      okButtonProps: { danger: true },
                                      onOk: () => deleteCategory(section.name),
                                    });
                                  }
                                },
                              }}
                            >
                              <Button icon={<MoreOutlined />} aria-label="Category actions" />
                            </Dropdown>
                          }
                        >
                          <Form.List name={[section.name, 'items']}>
                            {(items, { add: addItem, remove: removeItem, move: moveItem }) => (
                              <SectionItemsPanel
                                section={section}
                                items={items}
                                addItem={addItem}
                                removeItem={removeItem}
                                moveItem={moveItem}
                                form={form}
                                openKeys={openKeys}
                                setOpenKeys={setOpenKeys}
                                itemKeysRef={itemKeysRef}
                                uploadingPath={uploadingPath}
                                uploadPhoto={uploadPhoto}
                                setItemCounts={setItemCounts}
                                popularCount={popularCount}
                                query={query}
                                filter={filter}
                                onClearFilters={() => {
                                  setQuery('');
                                  setFilter('all');
                                }}
                                emptySearch={emptySearch}
                                markDirty={() => setDirty(true)}
                              />
                            )}
                          </Form.List>
                        </Card>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          }}
        </Form.List>

        {dirty ? (
          <div
            style={{
              position: 'sticky',
              bottom: 16,
              zIndex: 10,
              display: 'flex',
              justifyContent: 'center',
              marginTop: 16,
              pointerEvents: 'none',
            }}
          >
            <div
              role="status"
              style={{
                pointerEvents: 'auto',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '8px 8px 8px 16px',
                borderRadius: 999,
                background: 'var(--color-brand-700)',
                color: '#fff',
                boxShadow: 'var(--shadow-lg)',
              }}
            >
              <span style={{ fontSize: 14 }}>You have unsaved changes</span>
              <Button
                size="small"
                type="text"
                style={{ color: '#fff' }}
                onClick={() =>
                  Modal.confirm({
                    title: 'Discard unsaved changes?',
                    content: 'Your menu goes back to the last saved version.',
                    okText: 'Discard',
                    okButtonProps: { danger: true },
                    cancelText: 'Keep editing',
                    onOk: discardChanges,
                  })
                }
                disabled={saving || Boolean(uploadingPath)}
              >
                Discard
              </Button>
              <Button
                size="small"
                htmlType="submit"
                loading={saving}
                style={{ background: '#fff', color: 'var(--color-brand-700)', borderColor: '#fff' }}
              >
                Save menu
              </Button>
            </div>
          </div>
        ) : null}
      </Form>
      )}
    </Space></div>
  );
}

function SectionItemsPanel({
  section,
  items,
  addItem,
  removeItem,
  moveItem,
  form,
  openKeys,
  setOpenKeys,
  itemKeysRef,
  uploadingPath,
  uploadPhoto,
  setItemCounts,
  popularCount,
  query,
  filter,
  onClearFilters,
  emptySearch,
  markDirty,
}: {
  section: FormListFieldData;
  items: FormListFieldData[];
  addItem: (defaultValue?: MenuItemForm) => void;
  removeItem: (index: number | number[]) => void;
  moveItem: (from: number, to: number) => void;
  form: MenuForm;
  openKeys: OpenKeysBySection;
  setOpenKeys: Dispatch<SetStateAction<OpenKeysBySection>>;
  itemKeysRef: MutableRefObject<Record<string, string[]>>;
  uploadingPath: string | null;
  uploadPhoto: (file: RcFile, sectionIndex: number, itemIndex: number) => Promise<void>;
  setItemCounts: Dispatch<SetStateAction<Record<number, number>>>;
  popularCount: number;
  query: string;
  filter: ItemFilter;
  onClearFilters: () => void;
  emptySearch: ReactNode;
  markDirty: () => void;
}) {
  const sectionKey = String(section.name);
  const panelKeys = items.map((item) => String(item.key));
  itemKeysRef.current[sectionKey] = panelKeys;
  const openForSection = openKeys[sectionKey] ?? [];
  const allOpen = panelKeys.length > 0 && panelKeys.every((k) => openForSection.includes(k));
  const filtering = Boolean(query.trim()) || filter !== 'all';
  const visibleItems = items
    .map((item, itemIndex) => ({ item, itemIndex }))
    .filter(({ item }) =>
      itemMatches(
        form.getFieldValue(['sections', section.name, 'items', item.name]) as MenuItemForm | undefined,
        query,
        filter,
      ),
    );
  /** Set when "Add dish" is clicked so the new panel opens with its name focused. */
  const openNewRef = useRef(false);
  const prevLengthRef = useRef(items.length);
  const [focusKey, setFocusKey] = useState<string | null>(null);
  const lastKey = items.length ? String(items[items.length - 1]!.key) : null;

  useEffect(() => {
    setItemCounts((prev) =>
      prev[section.name] === items.length ? prev : { ...prev, [section.name]: items.length },
    );
  }, [items.length, section.name, setItemCounts]);

  useEffect(() => {
    if (openNewRef.current && lastKey && items.length > prevLengthRef.current) {
      setOpenKeys((prev) => ({
        ...prev,
        [sectionKey]: [...(prev[sectionKey] ?? []), lastKey],
      }));
      setFocusKey(lastKey);
    }
    openNewRef.current = false;
    prevLengthRef.current = items.length;
  }, [items.length, lastKey, sectionKey, setOpenKeys]);

  return (
    <Space orientation="vertical" size={12} style={{ width: '100%' }}>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        <Text type="secondary" style={{ fontSize: 13 }}>
          {filtering
            ? `${visibleItems.length} of ${items.length} ${items.length === 1 ? 'dish' : 'dishes'} shown`
            : `${items.length} ${items.length === 1 ? 'dish' : 'dishes'} · click a dish to edit it`}
        </Text>
        <Button
          type="text"
          size="small"
          icon={allOpen ? <NodeCollapseOutlined /> : <NodeExpandOutlined />}
          onClick={() =>
            setOpenKeys((prev) => ({ ...prev, [sectionKey]: allOpen ? [] : [...panelKeys] }))
          }
          disabled={!items.length}
        >
          {allOpen ? 'Collapse all' : 'Expand all'}
        </Button>
      </div>
      {visibleItems.length ? (
        <div className="rt-menu-dishes">
          <Collapse
            activeKey={openForSection}
            onChange={(keys) =>
              setOpenKeys((prev) => ({
                ...prev,
                [sectionKey]: keys as string[],
              }))
            }
            styles={{ title: { minWidth: 0 } }}
            items={visibleItems.map(({ item, itemIndex }) =>
              buildItemPanel({
                item,
                itemIndex,
                section,
                form,
                removeItem,
                moveItem,
                itemsLength: items.length,
                canReorder: !filtering && !uploadingPath,
                uploadingPath,
                uploadPhoto,
                popularCount,
                autoFocusName: focusKey === String(item.key),
                markDirty,
              }),
            )}
          />
        </div>
      ) : (
        emptySearch
      )}
      <Button
        type="dashed"
        icon={<PlusOutlined />}
        onClick={() => {
          onClearFilters();
          openNewRef.current = true;
          addItem({ ...EMPTY_ITEM });
        }}
        block
      >
        Add dish
      </Button>
    </Space>
  );
}

function PopularToggle({
  checked,
  onChange,
  atLimit,
}: {
  checked?: boolean;
  onChange?: (value: boolean) => void;
  atLimit: boolean;
}) {
  const blocked = !checked && atLimit;
  return (
    <Tooltip
      title={
        checked
          ? 'Featured on your restaurant page. Click to unfeature.'
          : blocked
            ? `You can feature up to ${MAX_POPULAR_MENU_ITEMS} dishes`
            : 'Feature on your restaurant page'
      }
    >
      <Button
        type="text"
        size="small"
        aria-pressed={Boolean(checked)}
        disabled={blocked}
        icon={
          checked ? <StarFilled style={{ color: 'var(--color-accent)' }} /> : <StarOutlined />
        }
        onClick={() => onChange?.(!checked)}
        aria-label="Popular"
        style={checked ? { color: 'var(--color-text)' } : undefined}
      >
        <span className="rt-menu-dish__popular-label">Popular</span>
      </Button>
    </Tooltip>
  );
}

function ItemThumb({ url }: { url?: string }) {
  return (
    <div
      style={{
        width: 44,
        height: 44,
        flexShrink: 0,
        borderRadius: 'var(--radius-sm)',
        overflow: 'hidden',
        background: 'var(--color-brand-50)',
        display: 'grid',
        placeItems: 'center',
        color: 'var(--color-brand-500)',
      }}
    >
      {url ? (
        <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <PictureOutlined />
      )}
    </div>
  );
}

function buildItemPanel({
  item,
  itemIndex,
  section,
  form,
  removeItem,
  moveItem,
  itemsLength,
  canReorder,
  uploadingPath,
  uploadPhoto,
  popularCount,
  autoFocusName,
  markDirty,
}: {
  item: FormListFieldData;
  itemIndex: number;
  section: FormListFieldData;
  form: MenuForm;
  removeItem: (index: number | number[]) => void;
  moveItem: (from: number, to: number) => void;
  itemsLength: number;
  canReorder: boolean;
  uploadingPath: string | null;
  uploadPhoto: (file: RcFile, sectionIndex: number, itemIndex: number) => Promise<void>;
  popularCount: number;
  autoFocusName: boolean;
  markDirty: () => void;
}) {
  const itemPath: ['sections', number, 'items', number] = [
    'sections',
    section.name,
    'items',
    item.name,
  ];
  const photoPath: ['sections', number, 'items', number, 'photoUrl'] = [...itemPath, 'photoUrl'];
  return {
    key: String(item.key),
    label: (
      <Form.Item shouldUpdate noStyle>
        {() => {
          const value = form.getFieldValue(itemPath) as MenuItemForm | undefined;
          const name = value?.name?.trim();
          const description = plainText(value?.description);
          const unavailable = value?.available === false;
          const dietary = value?.dietary ?? [];
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
              <div style={{ opacity: unavailable ? 0.5 : 1 }}>
                <ItemThumb url={value?.photoUrl} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    flexWrap: 'wrap',
                    minWidth: 0,
                  }}
                >
                  <Text
                    strong={Boolean(name)}
                    type={name ? undefined : 'secondary'}
                    italic={!name}
                    delete={unavailable}
                  >
                    {name || `Untitled dish ${itemIndex + 1}`}
                  </Text>
                  {unavailable ? <Tag style={{ marginInlineEnd: 0 }}>Unavailable</Tag> : null}
                  {dietary.slice(0, 3).map((tag) => (
                    <Tag key={tag} color="green" style={{ marginInlineEnd: 0, fontSize: 11 }}>
                      {DIETARY_LABELS[tag] ?? tag}
                    </Tag>
                  ))}
                  {dietary.length > 3 ? (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      +{dietary.length - 3}
                    </Text>
                  ) : null}
                </div>
                {description ? (
                  <Text
                    type="secondary"
                    ellipsis
                    style={{ display: 'block', fontSize: 13, maxWidth: '100%' }}
                  >
                    {description}
                  </Text>
                ) : null}
              </div>
              <Text strong style={{ flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
                {formatPrice(value?.price)}
              </Text>
            </div>
          );
        }}
      </Form.Item>
    ),
    extra: (
      <Space size={0} {...stopHeaderToggle}>
        <Form.Item name={[item.name, 'popular']} valuePropName="checked" noStyle>
          <PopularToggle atLimit={popularCount >= MAX_POPULAR_MENU_ITEMS} />
        </Form.Item>
        <Tooltip title={canReorder ? 'Move up' : 'Clear search and filters to reorder'}>
          <Button
            type="text"
            size="small"
            icon={<ArrowUpOutlined />}
            aria-label="Move dish up"
            disabled={!canReorder || itemIndex === 0}
            onClick={() => moveItem(item.name, item.name - 1)}
          />
        </Tooltip>
        <Tooltip title={canReorder ? 'Move down' : 'Clear search and filters to reorder'}>
          <Button
            type="text"
            size="small"
            icon={<ArrowDownOutlined />}
            aria-label="Move dish down"
            disabled={!canReorder || itemIndex === itemsLength - 1}
            onClick={() => moveItem(item.name, item.name + 1)}
          />
        </Tooltip>
        <Popconfirm
          title="Delete this dish?"
          description="It's removed from your menu when you save."
          okText="Delete"
          okButtonProps={{ danger: true }}
          onConfirm={() => removeItem(item.name)}
          disabled={itemsLength <= 1}
        >
          <Tooltip title={itemsLength <= 1 ? 'A category needs at least one dish' : 'Delete dish'}>
            <Button
              type="text"
              danger
              size="small"
              icon={<DeleteOutlined />}
              aria-label="Delete dish"
              disabled={itemsLength <= 1}
            />
          </Tooltip>
        </Popconfirm>
      </Space>
    ),
    children: (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'flex-start' }}>
        <Form.Item name={[item.name, 'photoUrl']} hidden>
          <Input />
        </Form.Item>
        <Form.Item shouldUpdate noStyle>
          {() => {
            const photoUrl = form.getFieldValue(photoPath) as string | undefined;
            const uploading = uploadingPath === `${section.name}-${item.name}`;
            return (
              <div style={{ width: 140, flexShrink: 0 }}>
                <Text style={{ display: 'block', marginBottom: 8 }}>Photo</Text>
                <Upload
                  accept="image/*"
                  showUploadList={false}
                  disabled={Boolean(uploadingPath)}
                  beforeUpload={(file: RcFile) => {
                    void uploadPhoto(file, section.name, item.name);
                    return false;
                  }}
                >
                  <button
                    type="button"
                    aria-label={photoUrl ? 'Replace photo' : 'Upload photo'}
                    style={{
                      width: 140,
                      height: 140,
                      padding: 0,
                      borderRadius: 'var(--radius-md)',
                      border: photoUrl ? '1px solid var(--color-border)' : '1px dashed var(--color-border)',
                      background: photoUrl
                        ? `center / cover no-repeat url("${photoUrl}")`
                        : 'var(--color-border-subtle)',
                      cursor: uploadingPath ? 'progress' : 'pointer',
                      display: 'grid',
                      placeItems: 'center',
                      color: 'var(--color-text-secondary)',
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                  >
                    {uploading ? (
                      <LoadingOutlined style={{ fontSize: 22 }} />
                    ) : photoUrl ? (
                      <span
                        style={{
                          position: 'absolute',
                          insetInline: 0,
                          bottom: 0,
                          padding: '4px 0',
                          background: 'rgba(0, 0, 0, 0.55)',
                          color: '#fff',
                          fontSize: 12,
                        }}
                      >
                        Replace
                      </span>
                    ) : (
                      <span style={{ display: 'grid', gap: 4, justifyItems: 'center', fontSize: 13 }}>
                        <PictureOutlined style={{ fontSize: 22 }} />
                        Add photo
                      </span>
                    )}
                  </button>
                </Upload>
                {photoUrl ? (
                  <Button
                    type="link"
                    danger
                    size="small"
                    style={{ paddingInline: 0, marginTop: 4 }}
                    onClick={() => {
                      form.setFieldValue(photoPath, undefined);
                      markDirty();
                    }}
                  >
                    Remove photo
                  </Button>
                ) : (
                  <Text type="secondary" style={{ display: 'block', fontSize: 12, marginTop: 4 }}>
                    JPG or PNG, up to 5MB
                  </Text>
                )}
              </div>
            );
          }}
        </Form.Item>

        <div style={{ flex: '1 1 320px', minWidth: 0 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', columnGap: 16 }}>
            <Form.Item
              name={[item.name, 'name']}
              label="Dish name"
              rules={[{ required: true, whitespace: true, message: 'Dish name is required' }]}
              style={{ flex: '1 1 220px' }}
            >
              <Input placeholder="e.g. Lamb plov" autoFocus={autoFocusName} />
            </Form.Item>
            <Form.Item
              name={[item.name, 'price']}
              label="Price"
              rules={[{ required: true, message: 'Price is required' }]}
              style={{ width: 150 }}
            >
              <InputNumber min={0} step={0.5} precision={2} prefix="$" style={{ width: '100%' }} />
            </Form.Item>
          </div>
          <Form.Item name={[item.name, 'description']} label="Description">
            <RichTextArea rows={2} placeholder="Ingredients, portion size, or what makes it special" />
          </Form.Item>
          <Form.Item name={[item.name, 'dietary']} label="Dietary tags">
            <Select
              mode="tags"
              placeholder="Select or type tags"
              options={DIETARY_OPTIONS}
              style={{ width: '100%' }}
            />
          </Form.Item>
          <Space size={8} align="center">
            <Form.Item name={[item.name, 'available']} valuePropName="checked" noStyle>
              <Switch size="small" />
            </Form.Item>
            <Text>Available</Text>
            <Text type="secondary" style={{ fontSize: 13 }}>
              Turn off while a dish is temporarily off the menu.
            </Text>
          </Space>
        </div>
      </div>
    ),
  };
}
