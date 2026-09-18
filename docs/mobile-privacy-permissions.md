# Mobile permissions ↔ privacy disclosures

Canonical store Privacy Policy URL: **https://tablevera.online/privacy**  
In-app: Profile → Privacy Policy (`/privacy`). Terms: **https://tablevera.online/terms**.

Use this matrix when filling App Store Privacy Nutrition Labels and Google Play Data safety.

| Permission / data | When requested | App behavior | Disclosed in Privacy Policy |
| --- | --- | --- | --- |
| Location (when in use) | Near-me / location sheet | Coarse/fine location to rank restaurants nearby; never background tracking | Device & usage data — approximate location when granted |
| Push notifications | Notification settings / first enable | Registers Expo/FCM push token; inbox + reservation alerts | Notification preferences; push tokens; optional push |
| Calendar (write-only) | User taps Add to calendar | Creates one event for the reservation; no calendar read | Calendar (mobile, optional) |
| Photo library | Leave-review “Add photos” | Picks up to 3 images via `expo-image-picker`; uploads to API storage | Photos you choose to attach to reviews |
| Google Sign-In | Sign-in / Sign-up | Receives Google ID token → backend session | Information from third parties |
| Stripe / Apple Pay / Google Pay | Deposit checkout | PaymentSheet; card data stays with Stripe | Payment information (Stripe); no full PAN stored |
| Secure session tokens | After login | Access/refresh tokens in SecureStore | Account information; secure token storage |

## Store questionnaire quick answers

- **Encryption export (iOS):** `ITSAppUsesNonExemptEncryption: false` in `apps/mobile/app.config.js` (standard HTTPS/TLS only).
- **Tracking / ATT:** App does not use App Tracking Transparency / IDFA advertising tracking.
- **Camera / mic:** Not requested. **Photos library:** requested only when attaching review photos (`NSPhotoLibraryUsageDescription` / Android `READ_MEDIA_IMAGES`).
- **Background location:** Not used.
- **Data deletion:** Account / data requests via `support@tablevera.online` (see Privacy Policy contact section).

## Config sources

- Location + calendar strings: `apps/mobile/app.config.js` (`expo-location`, `expo-calendar`)
- Photo library: `apps/mobile/app.config.js` (`ios.infoPlist.NSPhotoLibraryUsageDescription`, `expo-image-picker` plugin, Android `READ_MEDIA_IMAGES`) — requires a native rebuild after changing
- Push: `expo-notifications` plugin + `PushBootstrap` / notification settings
- Stripe: `@stripe/stripe-react-native` merchant id `merchant.com.tablevera.app`, `urlScheme="tablevera"`, `returnURL: "tablevera://stripe-redirect"`
