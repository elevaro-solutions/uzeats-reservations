/**
 * Tablevera email branding — Forest & Gold palette.
 * Shared layout and HTML building blocks for all transactional emails.
 */

export const EMAIL_BRAND = {
  brand: '#0b3d2e',
  brandDark: '#071f18',
  brandLight: '#f0f7f4',
  accent: '#c5a059',
  background: '#f7f5f2',
  surface: '#ffffff',
  border: '#e3dfd8',
  textPrimary: '#1a1816',
  textSecondary: '#5a554d',
  textMuted: '#a39e94',
  textInverse: '#ffffff',
  fontFamily:
    "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  logoWhiteUrl: 'https://tablevera.online/brand/tablevera_logo_white_v2.svg',
  siteUrl: 'https://tablevera.online',
} as const;

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function linkify(text: string) {
  const urlPattern = /(https?:\/\/[^\s<]+)/g;
  return escapeHtml(text).replace(urlPattern, (url) => {
    const safe = url.replace(/&amp;/g, '&');
    return `<a href="${safe}" style="color:${EMAIL_BRAND.brand};text-decoration:underline;">${url}</a>`;
  });
}

/** Convert plain-text email body into branded HTML paragraphs. */
export function textToEmailHtml(body: string) {
  const blocks = body.split(/\n{2,}/).filter(Boolean);
  if (!blocks.length) return emailParagraph(escapeHtml(body));
  return blocks
    .map((block) => {
      const lines = block.split('\n');
      if (lines.length === 1) return emailParagraph(linkify(block));
      return `<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:${EMAIL_BRAND.textPrimary};">${lines.map((l) => linkify(l)).join('<br />')}</p>`;
    })
    .join('');
}

export function emailGreeting(name: string) {
  return `<p style="margin:0 0 20px;font-size:16px;line-height:1.6;color:${EMAIL_BRAND.textPrimary};">Hi ${escapeHtml(name)},</p>`;
}

export function emailParagraph(html: string) {
  return `<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:${EMAIL_BRAND.textPrimary};">${html}</p>`;
}

export function emailHeading(text: string) {
  return `<h1 style="margin:0 0 8px;font-size:22px;font-weight:700;line-height:1.3;color:${EMAIL_BRAND.textPrimary};">${escapeHtml(text)}</h1>`;
}

export function emailMuted(html: string) {
  return `<p style="margin:16px 0 0;font-size:14px;line-height:1.5;color:${EMAIL_BRAND.textMuted};">${html}</p>`;
}

export function emailDivider() {
  return `<hr style="border:none;border-top:1px solid ${EMAIL_BRAND.border};margin:28px 0;" />`;
}

export function emailButton(href: string, label: string) {
  return `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:28px 0;">
  <tr>
    <td style="border-radius:10px;background:${EMAIL_BRAND.brand};">
      <a href="${escapeHtml(href)}" style="display:inline-block;padding:14px 32px;color:${EMAIL_BRAND.textInverse};text-decoration:none;font-weight:600;font-size:16px;line-height:1;border-radius:10px;mso-padding-alt:0;">${escapeHtml(label)}</a>
    </td>
  </tr>
</table>`;
}

export function emailDetailBox(rows: Array<{ label: string; value: string }>) {
  const rowsHtml = rows
    .map(
      (row, i) => `<tr>
    <td style="padding:${i === 0 ? '0' : '12px'} 0 0;font-size:13px;font-weight:600;color:${EMAIL_BRAND.textSecondary};text-transform:uppercase;letter-spacing:0.04em;width:120px;vertical-align:top;">${escapeHtml(row.label)}</td>
    <td style="padding:${i === 0 ? '0' : '12px'} 0 0 16px;font-size:16px;font-weight:500;color:${EMAIL_BRAND.textPrimary};vertical-align:top;">${escapeHtml(row.value)}</td>
  </tr>`,
    )
    .join('');

  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:24px 0;background:${EMAIL_BRAND.brandLight};border-radius:12px;border:1px solid ${EMAIL_BRAND.border};">
  <tr>
    <td style="padding:20px 24px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">${rowsHtml}</table>
    </td>
  </tr>
</table>`;
}

export function emailNotice(html: string) {
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:20px 0;">
  <tr>
    <td style="padding:16px 20px;background:${EMAIL_BRAND.brandLight};border-left:4px solid ${EMAIL_BRAND.accent};border-radius:0 10px 10px 0;font-size:14px;line-height:1.5;color:${EMAIL_BRAND.textSecondary};">${html}</td>
  </tr>
</table>`;
}

export function emailSignature() {
  return `<p style="margin:24px 0 0;font-size:16px;line-height:1.6;color:${EMAIL_BRAND.textPrimary};">— The Tablevera team</p>`;
}

export function emailLinkFallback(href: string) {
  return emailMuted(
    `Or copy this link:<br /><a href="${escapeHtml(href)}" style="color:${EMAIL_BRAND.brand};word-break:break-all;">${escapeHtml(href)}</a>`,
  );
}

export function wrapEmailHtml(innerHtml: string) {
  const year = new Date().getFullYear();
  const { brandDark, accent, background, border, textMuted, brand, fontFamily, logoWhiteUrl, siteUrl } =
    EMAIL_BRAND;

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <title>Tablevera</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    body { margin: 0 !important; padding: 0 !important; width: 100% !important; }
    a[x-apple-data-detectors] { color: inherit !important; text-decoration: none !important; }
  </style>
</head>
<body style="margin:0;padding:0;background:${background};font-family:${fontFamily};color:${EMAIL_BRAND.textPrimary};">
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">&nbsp;</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${background};padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:${EMAIL_BRAND.surface};border-radius:16px;overflow:hidden;box-shadow:0 4px 14px rgba(26,24,22,0.07);">
          <tr>
            <td style="background:${brandDark};padding:32px 40px 28px;text-align:center;">
              <a href="${siteUrl}" style="text-decoration:none;">
                <img src="${logoWhiteUrl}" alt="Tablevera" width="180" height="43" style="display:block;margin:0 auto;max-width:180px;height:auto;border:0;" />
              </a>
              <div style="width:48px;height:3px;background:${accent};margin:20px auto 0;border-radius:2px;font-size:0;line-height:0;">&nbsp;</div>
            </td>
          </tr>
          <tr>
            <td style="padding:40px;font-size:16px;line-height:1.6;color:${EMAIL_BRAND.textPrimary};">
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
