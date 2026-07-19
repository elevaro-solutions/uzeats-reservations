export const STYLES = /* css */ `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');

  :host {
    /* --rt-brand can be overridden at runtime (server widgetTheme or embed options) */
    --rt-brand: #c4472f;
    --rt-brand-hover: color-mix(in srgb, var(--rt-brand) 80%, #1a1816);
    --rt-brand-light: color-mix(in srgb, var(--rt-brand) 7%, #ffffff);
    --rt-brand-shadow: color-mix(in srgb, var(--rt-brand) 28%, transparent);
    --rt-bg: #f7f5f2;
    --rt-surface: #ffffff;
    --rt-border: #e3dfd8;
    --rt-border-subtle: #f0ede8;
    --rt-text: #1a1816;
    --rt-text-secondary: #5a554d;
    --rt-text-tertiary: #a39e94;
    --rt-text-inverse: #ffffff;
    --rt-success: #2e9e5b;
    --rt-radius-sm: 8px;
    --rt-radius-md: 12px;
    --rt-radius-lg: 16px;
    --rt-shadow-sm: 0 1px 3px rgba(26, 24, 22, 0.05), 0 1px 2px rgba(26, 24, 22, 0.04);
    --rt-shadow-md: 0 4px 14px rgba(26, 24, 22, 0.07), 0 1px 3px rgba(26, 24, 22, 0.04);
    --rt-shadow-lg: 0 16px 40px rgba(26, 24, 22, 0.1), 0 2px 8px rgba(26, 24, 22, 0.05);
    --rt-transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);

    display: block;
    font-family: 'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
      'Helvetica Neue', Arial, sans-serif;
    font-size: 14px;
    line-height: 1.55;
    color: var(--rt-text);
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  *, *::before, *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  /* ── Inline widget ──────────────────────────────────────────────── */

  .rt-widget {
    background: var(--rt-surface);
    border: 1px solid var(--rt-border);
    border-radius: var(--rt-radius-lg);
    box-shadow: var(--rt-shadow-sm);
    overflow: hidden;
    max-width: 380px;
    width: 100%;
  }

  .rt-header {
    padding: 20px 20px 0;
  }

  .rt-brand {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    font-weight: 500;
    color: var(--rt-text-tertiary);
    text-decoration: none;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    margin-bottom: 14px;
  }

  .rt-brand svg {
    flex-shrink: 0;
  }

  .rt-brand:hover {
    color: var(--rt-brand);
  }

  .rt-restaurant-name {
    font-size: 18px;
    font-weight: 700;
    color: var(--rt-text);
    margin: 0 0 2px;
    line-height: 1.3;
  }

  .rt-restaurant-meta {
    font-size: 13px;
    color: var(--rt-text-secondary);
    margin: 0 0 16px;
  }

  /* ── Form section ───────────────────────────────────────────────── */

  .rt-body {
    padding: 0 20px 20px;
  }

  .rt-field {
    margin-bottom: 14px;
  }

  .rt-label {
    display: block;
    font-size: 13px;
    font-weight: 600;
    color: var(--rt-text);
    margin-bottom: 6px;
  }

  .rt-row {
    display: flex;
    gap: 10px;
  }

  .rt-row > * {
    flex: 1;
  }

  /* ── Date input ─────────────────────────────────────────────────── */

  .rt-date-input {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid var(--rt-border);
    border-radius: var(--rt-radius-sm);
    font-family: inherit;
    font-size: 14px;
    color: var(--rt-text);
    background: var(--rt-surface);
    outline: none;
    transition: var(--rt-transition);
    cursor: pointer;
  }

  .rt-date-input:hover {
    border-color: var(--rt-text-tertiary);
  }

  .rt-date-input:focus {
    border-color: var(--rt-brand);
    box-shadow: 0 0 0 3px var(--rt-brand-light);
  }

  /* ── Party size stepper ─────────────────────────────────────────── */

  .rt-stepper {
    display: flex;
    align-items: center;
    border: 1px solid var(--rt-border);
    border-radius: var(--rt-radius-sm);
    overflow: hidden;
  }

  .rt-stepper-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border: none;
    background: var(--rt-surface);
    color: var(--rt-text-secondary);
    font-size: 18px;
    cursor: pointer;
    transition: var(--rt-transition);
    user-select: none;
    flex-shrink: 0;
  }

  .rt-stepper-btn:hover:not(:disabled) {
    background: var(--rt-bg);
    color: var(--rt-text);
  }

  .rt-stepper-btn:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }

  .rt-stepper-value {
    flex: 1;
    text-align: center;
    font-size: 14px;
    font-weight: 600;
    color: var(--rt-text);
    padding: 0 4px;
    white-space: nowrap;
  }

  /* ── Time slots grid ────────────────────────────────────────────── */

  .rt-slots-label {
    font-size: 13px;
    font-weight: 600;
    color: var(--rt-text);
    margin-bottom: 10px;
  }

  .rt-slots {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
    gap: 8px;
    margin-bottom: 16px;
  }

  .rt-slot {
    padding: 10px 4px;
    border: 1px solid var(--rt-border);
    border-radius: var(--rt-radius-sm);
    background: var(--rt-surface);
    font-family: inherit;
    font-size: 14px;
    font-weight: 500;
    color: var(--rt-text);
    cursor: pointer;
    text-align: center;
    transition: var(--rt-transition);
  }

  .rt-slot:hover {
    border-color: var(--rt-brand);
    background: var(--rt-brand-light);
    color: var(--rt-brand);
  }

  .rt-slot--selected {
    background: var(--rt-brand);
    border-color: var(--rt-brand);
    color: var(--rt-text-inverse);
    box-shadow: 0 2px 8px var(--rt-brand-shadow);
  }

  .rt-slot--selected:hover {
    background: var(--rt-brand-hover);
    border-color: var(--rt-brand-hover);
    color: var(--rt-text-inverse);
  }

  /* ── CTA button ─────────────────────────────────────────────────── */

  .rt-cta {
    display: block;
    width: 100%;
    padding: 12px 20px;
    border: none;
    border-radius: var(--rt-radius-sm);
    background: var(--rt-brand);
    color: var(--rt-text-inverse);
    font-family: inherit;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    transition: var(--rt-transition);
    text-align: center;
    text-decoration: none;
  }

  .rt-cta:hover {
    background: var(--rt-brand-hover);
    box-shadow: 0 4px 12px var(--rt-brand-shadow);
  }

  .rt-cta:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    box-shadow: none;
  }

  /* ── States ─────────────────────────────────────────────────────── */

  .rt-loading, .rt-error, .rt-empty {
    padding: 20px;
    text-align: center;
  }

  .rt-spinner {
    display: inline-block;
    width: 28px;
    height: 28px;
    border: 3px solid var(--rt-border);
    border-top-color: var(--rt-brand);
    border-radius: 50%;
    animation: rt-spin 0.7s linear infinite;
    margin-bottom: 10px;
  }

  @keyframes rt-spin {
    to { transform: rotate(360deg); }
  }

  .rt-loading-text {
    font-size: 13px;
    color: var(--rt-text-secondary);
  }

  .rt-error-text {
    font-size: 13px;
    color: #d64550;
  }

  .rt-error-retry {
    display: inline-block;
    margin-top: 8px;
    padding: 6px 14px;
    border: 1px solid var(--rt-border);
    border-radius: var(--rt-radius-sm);
    background: var(--rt-surface);
    font-family: inherit;
    font-size: 13px;
    font-weight: 500;
    color: var(--rt-text);
    cursor: pointer;
    transition: var(--rt-transition);
  }

  .rt-error-retry:hover {
    border-color: var(--rt-text-tertiary);
    background: var(--rt-bg);
  }

  .rt-empty-text {
    font-size: 13px;
    color: var(--rt-text-secondary);
    padding: 8px 0;
  }

  /* ── Divider ────────────────────────────────────────────────────── */

  .rt-divider {
    height: 1px;
    background: var(--rt-border-subtle);
    margin: 0 20px;
  }

  /* ── Button mode ────────────────────────────────────────────────── */

  .rt-trigger-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 12px 24px;
    border: none;
    border-radius: var(--rt-radius-sm);
    background: var(--rt-brand);
    color: var(--rt-text-inverse);
    font-family: inherit;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    transition: var(--rt-transition);
  }

  .rt-trigger-btn:hover {
    background: var(--rt-brand-hover);
    box-shadow: 0 4px 12px var(--rt-brand-shadow);
  }

  .rt-trigger-btn svg {
    flex-shrink: 0;
  }

  /* ── Modal overlay ──────────────────────────────────────────────── */

  .rt-overlay {
    position: fixed;
    inset: 0;
    z-index: 2147483647;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(28, 25, 23, 0.5);
    backdrop-filter: blur(4px);
    opacity: 0;
    transition: opacity 0.2s ease;
    padding: 16px;
  }

  .rt-overlay--visible {
    opacity: 1;
  }

  .rt-modal {
    position: relative;
    max-height: calc(100vh - 32px);
    overflow-y: auto;
    animation: rt-slide-up 0.25s ease;
  }

  .rt-modal .rt-widget {
    max-width: 400px;
    box-shadow: var(--rt-shadow-lg);
  }

  .rt-close {
    position: absolute;
    top: 12px;
    right: 12px;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    border-radius: 50%;
    background: transparent;
    color: var(--rt-text-secondary);
    font-size: 18px;
    cursor: pointer;
    transition: var(--rt-transition);
    z-index: 1;
  }

  .rt-close:hover {
    background: var(--rt-bg);
    color: var(--rt-text);
  }

  @keyframes rt-slide-up {
    from {
      opacity: 0;
      transform: translateY(12px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  /* ── Responsive ─────────────────────────────────────────────────── */

  @media (max-width: 400px) {
    .rt-widget {
      border-radius: var(--rt-radius-md);
    }

    .rt-header {
      padding: 16px 16px 0;
    }

    .rt-body {
      padding: 0 16px 16px;
    }

    .rt-divider {
      margin: 0 16px;
    }

    .rt-slots {
      grid-template-columns: repeat(auto-fill, minmax(72px, 1fr));
    }
  }
`;
