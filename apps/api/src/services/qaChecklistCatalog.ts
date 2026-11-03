export const QA_CHECKLIST_RELEASE = '0.98.0';

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
    id: 'rel-branding-upload-folder',
    gate: 'required',
    group: 'Partner Hub',
    label: 'Restaurant logo and gallery upload under restaurants/{id}/branding',
    steps: [
      'As owner or admin on an existing restaurant, open Restaurant profile (or Admin manage restaurant) Photos. Upload a logo and one gallery photo.',
      'Confirm both succeed and show on the form. Open the image URLs (or the returned key): they include restaurants/<that restaurant id>/branding/, not a flat uploads/ path.',
      'Save the profile and confirm the public restaurant page still shows the new logo and hero photo.',
    ],
  },
  {
    id: 'rel-menu-upload-folder',
    gate: 'required',
    group: 'Partner Hub',
    label: 'Menu dish photos upload under restaurants/{id}/menu',
    steps: [
      'Open Menu for an active restaurant. Upload a photo on a dish and save the menu.',
      'Confirm the dish photo URL includes restaurants/<restaurant id>/menu/.',
      'Reload Menu and confirm the photo is still on that dish.',
    ],
  },
  {
    id: 'rel-add-restaurant-drafts',
    gate: 'required',
    group: 'Admin',
    label: 'Add restaurant photos before create go to accounts/.../drafts',
    steps: [
      'As Super Admin, open Admin → Restaurants → Add restaurant. On Details, upload a logo or gallery photo before Create restaurant.',
      'Confirm the upload succeeds. The URL or key includes accounts/<your user id>/drafts/, not restaurants/... (there is no restaurant id yet).',
      'Finish Create restaurant and confirm the logo or photo is still attached on the new restaurant.',
    ],
  },
  {
    id: 'rel-avatar-upload-folder',
    gate: 'required',
    group: 'Diner',
    label: 'Profile photo uploads under accounts/{userId}/avatar',
    steps: [
      'As a diner on web, open Account / profile and upload a new profile photo.',
      'Confirm the photo shows and its URL includes accounts/<your user id>/avatar/.',
      'On diner mobile (if available for this build), edit profile photo and confirm the same folder pattern.',
    ],
  },
  {
    id: 'rel-review-photo-access',
    gate: 'required',
    group: 'Diner',
    label: 'Review photos only for a booked restaurant, under reviews/',
    steps: [
      'As a diner with a completed (or reviewable) reservation, open post-visit / write review and attach a photo. Confirm upload succeeds and the URL includes restaurants/<that restaurant id>/reviews/.',
      'Confirm the review submits with the photo visible on the restaurant reviews.',
      'If you can try a restaurant you have never booked, confirm attaching a review photo is rejected (forbidden / cannot upload), not stored under that restaurant.',
    ],
  },
  {
    id: 'rel-platform-discovery-blog',
    gate: 'required',
    group: 'Admin',
    label: 'Admin discovery and blog images land under platform/',
    steps: [
      'As admin, open Admin → Discovery, upload or replace a taxonomy image (or icon). Confirm the URL includes platform/discovery/.',
      'Open Admin → Blog, set a cover image on a post. Confirm the URL includes platform/blog/.',
      'Confirm both images still render in the admin form after reload.',
    ],
  },
  {
    id: 'rel-support-upload-folder',
    gate: 'recommended',
    group: 'Partner Hub',
    label: 'Support ticket attachments go under accounts/.../support',
    steps: [
      'Open Support (owner or admin ticket detail) and attach an image.',
      'Confirm the attachment URL or key includes accounts/<uploader id>/support/ (or platform/support for a platform-only path).',
      'Confirm the attachment remains visible on the ticket after refresh.',
    ],
  },
  {
    id: 'rel-virtual-room-folder',
    gate: 'recommended',
    group: 'Partner Hub',
    label: 'Virtual room media uploads under restaurants/{id}/virtual-room',
    steps: [
      'On a restaurant with Virtual room, upload a walkthrough photo (and a short video if practical).',
      'Confirm the media URL includes restaurants/<restaurant id>/virtual-room/.',
      'Confirm the media still appears in the Virtual room editor after reload.',
    ],
  },
];
