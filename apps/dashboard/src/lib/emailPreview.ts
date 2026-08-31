/** Client-side email chrome + sample vars for template preview. */

const EMAIL_BRAND = {
  brand: '#0b3d2e',
  brandDark: '#071f18',
  accent: '#c5a059',
  background: '#f7f5f2',
  surface: '#ffffff',
  border: '#e3dfd8',
  textPrimary: '#1a1816',
  textMuted: '#a39e94',
  fontFamily:
    "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  logoWhiteUrl: 'https://tablevera.online/brand/tablevera_logo_white_v2.svg',
  siteUrl: 'https://tablevera.online',
} as const;

export const EMAIL_TEMPLATE_VARIABLES: Record<string, string[]> = {
  password_reset: ['firstName', 'resetUrl'],
  booking_confirmation: ['firstName', 'restaurantName', 'date', 'partySize'],
  booking_reminder: ['firstName', 'restaurantName', 'date'],
  booking_cancelled: ['firstName', 'restaurantName', 'date'],
  waitlist_available: ['firstName', 'restaurantName', 'bookUrl'],
  staff_invite: ['firstName', 'restaurantName', 'role', 'inviteUrl'],
  restaurant_approved: ['firstName', 'restaurantName', 'dashboardUrl'],
  restaurant_created: [
    'firstName',
    'restaurantName',
    'plan',
    'invoiceNumber',
    'amount',
    'dueDate',
    'billingUrl',
  ],
  invoice_ready: ['firstName', 'invoiceNumber', 'period', 'amount', 'invoiceUrl'],
};

export const SAMPLE_EMAIL_VARS: Record<string, string> = {
  firstName: 'Alex',
  restaurantName: 'Cedar & Salt',
  resetUrl: 'https://tablevera.online/reset?token=preview',
  bookUrl: 'https://tablevera.online/restaurants/cedar-salt',
  inviteUrl: 'https://dashboard.tablevera.online/invite?token=preview',
  role: 'Manager',
  date: 'Saturday, Sep 12 · 7:30 PM',
  partySize: '4',
  dashboardUrl: 'https://dashboard.tablevera.online',
  plan: 'Growth',
  invoiceNumber: 'INV-1042',
  amount: '$149.00',
  dueDate: 'Sep 15, 2026',
  billingUrl: 'https://dashboard.tablevera.online/billing',
  period: 'Sep 2026',
  invoiceUrl: 'https://dashboard.tablevera.online/invoices/INV-1042',
};

export function renderTemplateString(
  template: string,
  vars: Record<string, string | number | undefined | null> = SAMPLE_EMAIL_VARS,
) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const value = vars[key];
    return value == null ? `{{${key}}}` : String(value);
  });
}

export function wrapEmailHtml(innerHtml: string) {
  const year = new Date().getFullYear();
  const {
    brandDark,
    accent,
    background,
    border,
    textMuted,
    brand,
    fontFamily,
    logoWhiteUrl,
    siteUrl,
    textPrimary,
    surface,
  } = EMAIL_BRAND;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Email preview</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
    body { margin: 0 !important; padding: 0 !important; width: 100% !important; }
  </style>
</head>
<body style="margin:0;padding:0;background:${background};font-family:${fontFamily};color:${textPrimary};">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${background};padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:${surface};border-radius:16px;overflow:hidden;box-shadow:0 4px 14px rgba(26,24,22,0.07);">
          <tr>
            <td style="background:${brandDark};padding:32px 40px 28px;text-align:center;">
              <a href="${siteUrl}" style="text-decoration:none;">
                <img src="${logoWhiteUrl}" alt="Tablevera" width="180" height="43" style="display:block;margin:0 auto;max-width:180px;height:auto;border:0;" />
              </a>
              <div style="width:48px;height:3px;background:${accent};margin:20px auto 0;border-radius:2px;font-size:0;line-height:0;">&nbsp;</div>
            </td>
          </tr>
          <tr>
            <td style="padding:40px;font-size:16px;line-height:1.6;color:${textPrimary};">
              ${innerHtml}
            </td>
          </tr>
          <tr>
            <td style="background:${background};padding:24px 40px;text-align:center;border-top:1px solid ${border};">
              <a href="${siteUrl}" style="color:${brand};text-decoration:none;font-weight:600;font-size:14px;">tablevera.online</a>
              <p style="margin:12px 0 0;font-size:12px;color:${textMuted};line-height:1.6;">
                &copy; ${year} Tablevera. All rights reserved.<br />
                Restaurant reservations made simple.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function buildEmailPreviewHtml(bodyHtml: string, subject?: string) {
  const rendered = renderTemplateString(bodyHtml);
  const html = wrapEmailHtml(rendered);
  if (!subject) return html;
  const renderedSubject = renderTemplateString(subject);
  // Inject subject into title for the preview chrome
  return html.replace('<title>Email preview</title>', `<title>${renderedSubject}</title>`);
}
