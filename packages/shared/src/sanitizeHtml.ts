import sanitizeHtml from "sanitize-html";

const HTTP_HREF = /^(https?:)\/\//i;

const CMS_ALLOWED_TAGS = [
  "p",
  "br",
  "hr",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "blockquote",
  "ul",
  "ol",
  "li",
  "a",
  "pre",
  "code",
  "span",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
];

const CMS_ALLOWED_ATTRIBUTES: sanitizeHtml.IOptions["allowedAttributes"] = {
  a: ["href", "rel", "target"],
  th: ["colspan", "rowspan"],
  td: ["colspan", "rowspan"],
  p: ["style"],
  h1: ["style"],
  h2: ["style"],
  h3: ["style"],
  h4: ["style"],
  h5: ["style"],
  h6: ["style"],
  span: ["style"],
};

const TEXT_ALIGN_STYLES: sanitizeHtml.IOptions["allowedStyles"] = {
  p: { "text-align": [/^(left|right|center|justify)$/] },
  h1: { "text-align": [/^(left|right|center|justify)$/] },
  h2: { "text-align": [/^(left|right|center|justify)$/] },
  h3: { "text-align": [/^(left|right|center|justify)$/] },
  h4: { "text-align": [/^(left|right|center|justify)$/] },
  h5: { "text-align": [/^(left|right|center|justify)$/] },
  h6: { "text-align": [/^(left|right|center|justify)$/] },
  span: { "text-align": [/^(left|right|center|justify)$/] },
};

function cmsOptions(): sanitizeHtml.IOptions {
  return {
    allowedTags: CMS_ALLOWED_TAGS,
    allowedAttributes: CMS_ALLOWED_ATTRIBUTES,
    allowedStyles: TEXT_ALIGN_STYLES,
    allowedSchemes: ["http", "https"],
    allowedSchemesByTag: { a: ["http", "https"] },
    allowProtocolRelative: false,
    transformTags: {
      a: (tagName, attribs): sanitizeHtml.Tag => {
        const href = attribs.href ?? "";
        if (!HTTP_HREF.test(href)) {
          return { tagName: "span", attribs: {} };
        }
        return {
          tagName,
          attribs: {
            href,
            rel: "noopener noreferrer",
            target: "_blank",
          },
        };
      },
    },
  };
}

/** TipTap/blog HTML: drop scripts, event handlers, and unknown tags. */
export function sanitizeBlogHtml(html: string) {
  return sanitizeHtml(html, cmsOptions()).trim();
}

const SUPPORT_TAGS = [
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "h2",
  "h3",
  "ul",
  "ol",
  "li",
  "a",
  "blockquote",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
  "code",
];

/** Owner-support TipTap HTML. Same engine as blog; narrower tag list. */
export function sanitizeSupportHtml(html: string) {
  return sanitizeHtml(html, {
    ...cmsOptions(),
    allowedTags: SUPPORT_TAGS,
  }).trim();
}
