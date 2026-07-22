/**
 * Removes component="..." from non-native JSX tags (keeps it on div, span, img, etc.).
 */
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const ROOT = path.resolve(import.meta.dirname, '..');

const NATIVE = new Set([
  'a', 'abbr', 'address', 'area', 'article', 'aside', 'audio', 'b', 'base', 'bdi', 'bdo',
  'blockquote', 'body', 'br', 'button', 'canvas', 'caption', 'cite', 'code', 'col', 'colgroup',
  'data', 'datalist', 'dd', 'del', 'details', 'dfn', 'dialog', 'div', 'dl', 'dt', 'em',
  'embed', 'fieldset', 'figcaption', 'figure', 'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5',
  'h6', 'head', 'header', 'hr', 'html', 'i', 'iframe', 'img', 'input', 'ins', 'kbd', 'label',
  'legend', 'li', 'link', 'main', 'map', 'mark', 'menu', 'meta', 'meter', 'nav', 'noscript',
  'object', 'ol', 'optgroup', 'option', 'output', 'p', 'picture', 'pre', 'progress', 'q', 'rp',
  'rt', 'ruby', 's', 'samp', 'section', 'select', 'slot', 'small', 'source', 'span', 'strong',
  'style', 'sub', 'summary', 'sup', 'svg', 'table', 'tbody', 'td', 'template', 'textarea',
  'tfoot', 'th', 'thead', 'time', 'title', 'tr', 'track', 'u', 'ul', 'var', 'video', 'wbr',
]);

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, acc);
    else if (entry.name.endsWith('.tsx')) acc.push(full);
  }
  return acc;
}

function collectFiles() {
  const bases = [
    path.join(ROOT, 'apps/dashboard/src'),
    path.join(ROOT, 'apps/web/src'),
    path.join(ROOT, 'packages/ui/src'),
  ];
  const files = new Set();
  for (const base of bases) walk(base, []).forEach((f) => files.add(f));
  return [...files].sort();
}

function getTagName(tagName) {
  if (ts.isIdentifier(tagName)) return tagName.text;
  if (ts.isPropertyAccessExpression(tagName)) return tagName.name.text;
  return null;
}

function processFile(filePath) {
  const sourceText = fs.readFileSync(filePath, 'utf8');
  const sourceFile = ts.createSourceFile(
    filePath,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );

  const removals = [];

  function visit(node) {
    const opening = ts.isJsxElement(node)
      ? node.openingElement
      : ts.isJsxSelfClosingElement(node)
        ? node
        : null;

    if (opening) {
      const tag = getTagName(opening.tagName);
      if (tag && !NATIVE.has(tag)) {
        for (const attr of opening.attributes.properties) {
          if (ts.isJsxAttribute(attr) && attr.name.text === 'component') {
            removals.push(attr);
          }
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  if (removals.length === 0) return 0;

  removals.sort((a, b) => b.getStart() - a.getStart());
  let result = sourceText;
  for (const attr of removals) {
    const start = attr.getStart();
    let end = attr.getEnd();
    if (result[end] === ' ') end++;
    if (result[end] === '\n') end++;
    result = result.slice(0, start) + result.slice(end);
  }

  fs.writeFileSync(filePath, result);
  return removals.length;
}

let total = 0;
for (const file of collectFiles()) {
  const count = processFile(file);
  if (count > 0) {
    total += count;
    console.log(`✓ ${path.relative(ROOT, file)} (${count})`);
  }
}
console.log(`\nStripped ${total} non-DOM component attributes.`);
