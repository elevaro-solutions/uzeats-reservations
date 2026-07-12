# ReserveTable Embeddable Widget

Drop-in booking widget that lets diners reserve a table directly from your restaurant's website.

## Quick Start

Add this snippet anywhere in your HTML:

```html
<script
  src="https://reservetable.com/widget.js"
  data-restaurant-id="YOUR_RESTAURANT_ID"
></script>
```

The widget renders immediately after the `<script>` tag.

## Options

All configuration is done via `data-*` attributes on the script tag:

| Attribute              | Required | Default                            | Description                                                      |
| ---------------------- | -------- | ---------------------------------- | ---------------------------------------------------------------- |
| `data-restaurant-id`   | Yes      | —                                  | Your restaurant's ID from the ReserveTable dashboard             |
| `data-mode`            | No       | `inline`                           | `inline` — full form embedded on page. `button` — compact button that opens a modal |
| `data-api-url`         | No       | `https://reservetable.com/graphql` | API endpoint (useful for staging/development)                    |
| `data-app-url`         | No       | `https://reservetable.com`         | Web app base URL for the final booking redirect                  |

## Display Modes

### Inline Mode (default)

Shows the full date picker, party size stepper, and time slots directly on your page:

```html
<script
  src="https://reservetable.com/widget.js"
  data-restaurant-id="abc123"
  data-mode="inline"
></script>
```

### Button Mode

Shows a "Reserve a table" button. Clicking it opens a modal with the full booking form:

```html
<script
  src="https://reservetable.com/widget.js"
  data-restaurant-id="abc123"
  data-mode="button"
></script>
```

## How It Works

1. The widget fetches your restaurant's details and available time slots from the ReserveTable API.
2. Diners pick a date, party size, and time slot.
3. Clicking "Complete reservation" opens the ReserveTable web app with the selection pre-filled so they can finish booking.

## Style Isolation

The widget renders inside a [Shadow DOM](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_shadow_DOM), so its styles won't conflict with your site's CSS and vice versa.

## Multiple Widgets

You can embed multiple widgets on the same page (e.g. for different restaurant locations):

```html
<script src="https://reservetable.com/widget.js" data-restaurant-id="location-1"></script>
<script src="https://reservetable.com/widget.js" data-restaurant-id="location-2"></script>
```

## Development

```bash
# Install dependencies
pnpm install

# Build the widget
pnpm build

# Watch mode (rebuild on changes)
pnpm dev
```

The built file is output to `dist/widget.iife.js`.

## Deployment

After building, deploy `dist/widget.iife.js` to your CDN or serve it from the web app's public directory:

```bash
cp dist/widget.iife.js ../web/public/widget.js
```
