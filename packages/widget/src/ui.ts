import type { RestaurantInfo, AvailabilitySlot, WidgetConfig, WidgetTheme } from './api';
import { fetchRestaurant, fetchAvailability } from './api';

// ── Theme ────────────────────────────────────────────────────────────

export const DEFAULT_THEME: WidgetTheme = {
  primaryColor: '#c4472f',
  buttonText: 'Reserve a table',
  showReviews: true,
};

/** Embed options > server widgetTheme > defaults. */
function resolveTheme(config: WidgetConfig, restaurant: RestaurantInfo | null): WidgetTheme {
  const server = restaurant?.widgetTheme;
  return {
    primaryColor:
      config.themeOverrides.primaryColor ?? server?.primaryColor ?? DEFAULT_THEME.primaryColor,
    buttonText:
      config.themeOverrides.buttonText ?? server?.buttonText ?? DEFAULT_THEME.buttonText,
    showReviews:
      config.themeOverrides.showReviews ?? server?.showReviews ?? DEFAULT_THEME.showReviews,
  };
}

/** Sets the brand color on the shadow host so all --rt-brand-* derivations update. */
function applyPrimaryColor(root: HTMLElement, color: string): void {
  const rootNode = root.getRootNode();
  const target = rootNode instanceof ShadowRoot ? (rootNode.host as HTMLElement) : root;
  target.style.setProperty('--rt-brand', color);
}

// ── Helpers ──────────────────────────────────────────────────────────

function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs?: Record<string, string>,
  children?: (Node | string)[],
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'className') el.className = v;
      else el.setAttribute(k, v);
    }
  }
  if (children) {
    for (const c of children) {
      el.append(typeof c === 'string' ? document.createTextNode(c) : c);
    }
  }
  return el;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function brandIcon(): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '14');
  svg.setAttribute('height', '14');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.innerHTML =
    '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>';
  return svg;
}

function calendarIcon(): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '16');
  svg.setAttribute('height', '16');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.innerHTML =
    '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>';
  return svg;
}

// ── State ────────────────────────────────────────────────────────────

interface WidgetState {
  restaurant: RestaurantInfo | null;
  date: string;
  partySize: number;
  slots: AvailabilitySlot[];
  selectedSlot: string | null;
  loading: boolean;
  slotsLoading: boolean;
  error: string | null;
}

// ── Widget builder ───────────────────────────────────────────────────

export function createInlineWidget(root: HTMLElement, config: WidgetConfig): void {
  const state: WidgetState = {
    restaurant: null,
    date: todayISO(),
    partySize: 2,
    slots: [],
    selectedSlot: null,
    loading: true,
    slotsLoading: false,
    error: null,
  };

  if (config.themeOverrides.primaryColor) {
    applyPrimaryColor(root, config.themeOverrides.primaryColor);
  }

  render();
  init();

  async function init() {
    try {
      state.restaurant = await fetchRestaurant(config.apiUrl, config.restaurantId);
      state.loading = false;
      applyPrimaryColor(root, resolveTheme(config, state.restaurant).primaryColor);
      render();
      await loadSlots();
    } catch (e) {
      state.loading = false;
      state.error = e instanceof Error ? e.message : 'Failed to load restaurant';
      render();
    }
  }

  async function loadSlots() {
    state.slotsLoading = true;
    state.slots = [];
    state.selectedSlot = null;
    render();
    try {
      state.slots = await fetchAvailability(
        config.apiUrl,
        config.restaurantId,
        state.date,
        state.partySize,
      );
      state.slotsLoading = false;
      render();
    } catch {
      state.slotsLoading = false;
      state.slots = [];
      render();
    }
  }

  function buildBookingUrl(): string {
    const base = config.appUrl.replace(/\/$/, '');
    const params = new URLSearchParams({
      date: state.date,
      party: String(state.partySize),
    });
    if (state.selectedSlot) params.set('slot', state.selectedSlot);
    return `${base}/restaurants/${config.restaurantId}?${params}`;
  }

  function render() {
    root.innerHTML = '';

    if (state.loading) {
      root.append(renderLoading());
      return;
    }

    if (state.error) {
      root.append(renderError(state.error, init));
      return;
    }

    const theme = resolveTheme(config, state.restaurant);
    const widget = h('div', { className: 'rt-widget' });

    // Header
    const header = h('div', { className: 'rt-header' });
    const brandLink = h('a', {
      className: 'rt-brand',
      href: config.appUrl,
      target: '_blank',
      rel: 'noopener',
    }, [brandIcon(), 'Tablevera']);
    header.append(brandLink);

    if (state.restaurant) {
      let meta = `${state.restaurant.cuisine} · ${state.restaurant.address.city}, ${state.restaurant.address.state}`;
      if (theme.showReviews && state.restaurant.averageRating > 0) {
        meta += ` · ★ ${state.restaurant.averageRating.toFixed(1)}`;
        if (state.restaurant.reviewCount > 0) {
          meta += ` (${state.restaurant.reviewCount})`;
        }
      }
      header.append(
        h('h3', { className: 'rt-restaurant-name' }, [state.restaurant.name]),
        h('p', { className: 'rt-restaurant-meta' }, [meta]),
      );
    }
    widget.append(header);

    widget.append(h('div', { className: 'rt-divider' }));

    // Body
    const body = h('div', { className: 'rt-body' });
    body.style.paddingTop = '16px';

    // Date + party size row
    const row = h('div', { className: 'rt-row' });

    // Date field
    const dateField = h('div', { className: 'rt-field' });
    dateField.append(h('label', { className: 'rt-label' }, ['Date']));
    const dateInput = h('input', {
      className: 'rt-date-input',
      type: 'date',
    }) as HTMLInputElement;
    dateInput.value = state.date;
    dateInput.min = todayISO();
    dateInput.addEventListener('change', () => {
      state.date = dateInput.value;
      loadSlots();
    });
    dateField.append(dateInput);
    row.append(dateField);

    // Party size field
    const partyField = h('div', { className: 'rt-field' });
    partyField.append(h('label', { className: 'rt-label' }, ['Party size']));
    const stepper = h('div', { className: 'rt-stepper' });

    const minusBtn = h('button', { className: 'rt-stepper-btn', type: 'button' }, ['\u2212']);
    if (state.partySize <= 1) minusBtn.setAttribute('disabled', '');
    minusBtn.addEventListener('click', () => {
      if (state.partySize > 1) {
        state.partySize--;
        loadSlots();
      }
    });

    const sizeLabel = h('span', { className: 'rt-stepper-value' }, [
      `${state.partySize} ${state.partySize === 1 ? 'guest' : 'guests'}`,
    ]);

    const plusBtn = h('button', { className: 'rt-stepper-btn', type: 'button' }, ['+']);
    if (state.partySize >= 20) plusBtn.setAttribute('disabled', '');
    plusBtn.addEventListener('click', () => {
      if (state.partySize < 20) {
        state.partySize++;
        loadSlots();
      }
    });

    stepper.append(minusBtn, sizeLabel, plusBtn);
    partyField.append(stepper);
    row.append(partyField);

    body.append(row);

    // Available times
    const slotsField = h('div', { className: 'rt-field' });

    if (state.slotsLoading) {
      const slotsLoading = h('div', { className: 'rt-loading' });
      const spinner = h('div', { className: 'rt-spinner' });
      slotsLoading.append(spinner);
      slotsLoading.append(h('div', { className: 'rt-loading-text' }, ['Finding available times…']));
      slotsField.append(slotsLoading);
    } else if (state.slots.length === 0) {
      slotsField.append(h('div', { className: 'rt-label' }, ['Available times']));
      slotsField.append(
        h('div', { className: 'rt-empty-text' }, ['No tables available for this date and party size.']),
      );
    } else {
      slotsField.append(h('div', { className: 'rt-slots-label' }, ['Available times']));
      const grid = h('div', { className: 'rt-slots' });

      for (const slot of state.slots) {
        const isSelected = state.selectedSlot === slot.time;
        const btn = h(
          'button',
          {
            className: `rt-slot${isSelected ? ' rt-slot--selected' : ''}`,
            type: 'button',
          },
          [formatTime(slot.time)],
        );
        btn.addEventListener('click', () => {
          state.selectedSlot = isSelected ? null : slot.time;
          render();
        });
        grid.append(btn);
      }
      slotsField.append(grid);
    }

    body.append(slotsField);

    // CTA button
    const cta = h('a', {
      className: 'rt-cta',
      href: buildBookingUrl(),
      target: '_blank',
      rel: 'noopener',
    }, [state.selectedSlot ? 'Complete reservation' : theme.buttonText]);
    if (!state.selectedSlot) {
      cta.removeAttribute('href');
      cta.setAttribute('role', 'button');
      cta.addEventListener('click', () => {
        window.open(buildBookingUrl(), '_blank', 'noopener');
      });
    }
    body.append(cta);

    widget.append(body);
    root.append(widget);
  }
}

// ── Button mode ──────────────────────────────────────────────────────

export function createButtonWidget(root: HTMLElement, config: WidgetConfig): void {
  let overlayEl: HTMLElement | null = null;
  let inlineRoot: HTMLElement | null = null;
  let initialized = false;

  const initialTheme = resolveTheme(config, null);
  if (config.themeOverrides.primaryColor) {
    applyPrimaryColor(root, config.themeOverrides.primaryColor);
  }

  const btnLabel = document.createTextNode(initialTheme.buttonText);
  const btn = h('button', { className: 'rt-trigger-btn', type: 'button' }, [
    calendarIcon(),
    btnLabel,
  ]);
  btn.addEventListener('click', openModal);
  root.append(btn);

  // Pick up the server-side widget theme for the trigger button.
  fetchRestaurant(config.apiUrl, config.restaurantId)
    .then((restaurant) => {
      const theme = resolveTheme(config, restaurant);
      btnLabel.textContent = theme.buttonText;
      applyPrimaryColor(root, theme.primaryColor);
    })
    .catch(() => {
      // Keep defaults; the inline widget will surface any load error.
    });

  function openModal() {
    if (overlayEl) {
      overlayEl.style.display = 'flex';
      requestAnimationFrame(() => overlayEl?.classList.add('rt-overlay--visible'));
      return;
    }

    overlayEl = h('div', { className: 'rt-overlay' });
    overlayEl.addEventListener('click', (e) => {
      if (e.target === overlayEl) closeModal();
    });

    const modal = h('div', { className: 'rt-modal' });

    const closeBtn = h('button', { className: 'rt-close', type: 'button' }, ['\u00d7']);
    closeBtn.addEventListener('click', closeModal);
    modal.append(closeBtn);

    inlineRoot = h('div');
    modal.append(inlineRoot);

    overlayEl.append(modal);
    root.append(overlayEl);

    requestAnimationFrame(() => overlayEl?.classList.add('rt-overlay--visible'));

    if (!initialized) {
      initialized = true;
      createInlineWidget(inlineRoot, { ...config, mode: 'inline' });
    }
  }

  function closeModal() {
    if (!overlayEl) return;
    overlayEl.classList.remove('rt-overlay--visible');
    setTimeout(() => {
      if (overlayEl) overlayEl.style.display = 'none';
    }, 200);
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlayEl?.style.display !== 'none') {
      closeModal();
    }
  });
}

// ── Shared state renderers ───────────────────────────────────────────

function renderLoading(): HTMLElement {
  const wrap = h('div', { className: 'rt-widget' });
  const inner = h('div', { className: 'rt-loading' });
  inner.append(h('div', { className: 'rt-spinner' }));
  inner.append(h('div', { className: 'rt-loading-text' }, ['Loading…']));
  wrap.append(inner);
  return wrap;
}

function renderError(message: string, onRetry: () => void): HTMLElement {
  const wrap = h('div', { className: 'rt-widget' });
  const inner = h('div', { className: 'rt-error' });
  inner.append(h('div', { className: 'rt-error-text' }, [message]));
  const retryBtn = h('button', { className: 'rt-error-retry', type: 'button' }, ['Try again']);
  retryBtn.addEventListener('click', () => {
    onRetry();
  });
  inner.append(retryBtn);
  wrap.append(inner);
  return wrap;
}
