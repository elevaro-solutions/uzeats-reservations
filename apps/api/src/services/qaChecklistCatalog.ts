export const QA_CHECKLIST_RELEASE = '0.105.0';

export type QaChecklistGate = 'required' | 'recommended';

export type QaChecklistCatalogItem = {
  id: string;
  gate: QaChecklistGate;
  group: string;
  label: string;
  /** How to verify this item. Shown beside the checkbox and in the steps panel. */
  steps: string[];
};

/** Release-delta items stored by id. Labels ship with the API so the saved row stays small. */
export const QA_CHECKLIST_CATALOG: QaChecklistCatalogItem[] = [
  {
    id: 'rel-profile-change-review',
    gate: 'required',
    group: 'Profile requests',
    label: 'Live restaurant name, cuisine, description, price, photos, logo, contact, and address go to review',
    steps: [
      'Sign in as the owner (or manager) of an approved, live restaurant. In Restaurant profile, change the name and description, add a photo, and change the phone or address. Save.',
      'Confirm Partner Hub says the changes were sent for review, and the diner restaurant page still shows the old name, description, photos, and contact.',
      'Change a booking setting (e.g. party size or deposit) and save. Confirm it applies right away without review.',
      'Save the Menu page without touching the listing. Confirm the pending name / description request is still pending (not wiped).',
    ],
  },
  {
    id: 'rel-profile-request-approve-deny',
    gate: 'required',
    group: 'Profile requests',
    label: 'Admin approves or denies the queued profile change in Profile requests',
    steps: [
      'As Super Admin, open Partner Hub → Profile requests. Confirm the request from the previous task lists each changed field with old and new values.',
      'Approve it. Confirm the diner restaurant page now shows the new name, description, photos, and contact.',
      'Submit another change as the owner, then deny it. Confirm the live listing is unchanged and the owner can edit again.',
    ],
  },
  {
    id: 'rel-images-cdn',
    gate: 'required',
    group: 'Images',
    label: 'Restaurant, menu, review, profile, blog, and floor images load from the Spaces CDN',
    steps: [
      'On diner web, open a restaurant page, a search / map card, Saved, and a blog post. In DevTools → Network → Img, confirm uploaded photos load from a *.cdn.digitaloceanspaces.com URL (not *.digitaloceanspaces.com and not /_next/image).',
      'Confirm the photos actually display (no broken images) on the restaurant gallery, map card, discovery cards, and blog cover / inline images.',
      'In Partner Hub, open Restaurant profile photos, Menu dish photos, and the floor plan background. Confirm they display and load from the CDN.',
      'Upload a new photo in Partner Hub and confirm it shows right away.',
    ],
  },
  {
    id: 'rel-telegram-link-before-start',
    gate: 'required',
    group: 'Telegram bot',
    label: 'Linking a Telegram chat before Start shows steps and a bot link, not Internal server error',
    steps: [
      'In Partner Hub → Notifications → Telegram messenger bot, open Link Telegram chat ID. Enter the numeric chat ID of a Telegram account that has never opened the bot, and submit.',
      'Confirm the modal shows the steps (open the bot, tap Start or send /start, copy the chat ID, paste again) with a clickable bot link, not Internal server error.',
      'From that account, open the bot and send /start before linking. Confirm the reply includes the numeric chat ID. Paste it in Partner Hub and confirm the link succeeds.',
    ],
  },
  {
    id: 'rel-admin-exports-moved',
    gate: 'recommended',
    group: 'Admin',
    label: 'Admin Data exports live under Platform → Configuration',
    steps: [
      'As Super Admin, open Platform. Confirm Data exports is a card under Configuration and is no longer under Billing.',
      'Open it and confirm /admin/exports still loads and downloads an export.',
    ],
  },
];
