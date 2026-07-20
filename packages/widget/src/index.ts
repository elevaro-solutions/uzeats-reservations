import { STYLES } from './styles';
import { createInlineWidget, createButtonWidget } from './ui';
import type { WidgetConfig, WidgetTheme } from './api';

const DEFAULT_API_URL = 'https://tablevera.online/graphql';
const DEFAULT_APP_URL = 'https://tablevera.online';

function init() {
  const scripts = document.querySelectorAll<HTMLScriptElement>(
    'script[data-restaurant-id]',
  );

  scripts.forEach((script) => {
    const restaurantId = script.dataset.restaurantId;
    if (!restaurantId) return;

    // Embed-level theme overrides: data-primary-color, data-button-text, data-show-reviews.
    const themeOverrides: Partial<WidgetTheme> = {};
    if (script.dataset.primaryColor) themeOverrides.primaryColor = script.dataset.primaryColor;
    if (script.dataset.buttonText) themeOverrides.buttonText = script.dataset.buttonText;
    if (script.dataset.showReviews != null) {
      themeOverrides.showReviews = script.dataset.showReviews !== 'false';
    }

    const config: WidgetConfig = {
      restaurantId,
      apiUrl: script.dataset.apiUrl || DEFAULT_API_URL,
      appUrl: script.dataset.appUrl || DEFAULT_APP_URL,
      mode: (script.dataset.mode as 'inline' | 'button') || 'inline',
      themeOverrides,
    };

    const host = document.createElement('div');
    host.setAttribute('data-tablevera-widget', '');
    script.insertAdjacentElement('afterend', host);

    const shadow = host.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    style.textContent = STYLES;
    shadow.appendChild(style);

    const container = document.createElement('div');
    shadow.appendChild(container);

    if (config.mode === 'button') {
      createButtonWidget(container, config);
    } else {
      createInlineWidget(container, config);
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
