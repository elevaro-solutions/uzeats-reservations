/**
 * Moves component="..." off non-DOM JSX tags onto a display:contents wrapper div.
 * Run after add-component-attr.mjs when needed.
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

function getComponentAttr(opening) {
  for (const attr of opening.attributes.properties) {
    if (!ts.isJsxAttribute(attr) || attr.name.text !== 'component') continue;
    if (attr.initializer && ts.isStringLiteral(attr.initializer)) {
      return { attr, value: attr.initializer.text };
    }
  }
  return null;
}

function removeAttr(sourceText, attr) {
  const start = attr.getStart();
  let end = attr.getEnd();
  const after = sourceText.slice(end);
  if (after.startsWith('\n')) end += 1;
  else if (after.startsWith(' ')) {
    while (sourceText[end] === ' ') end++;
  }
  return sourceText.slice(0, start) + sourceText.slice(end);
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

  const wraps = [];

  function visit(node) {
    const opening = ts.isJsxElement(node)
      ? node.openingElement
      : ts.isJsxSelfClosingElement(node)
        ? node
        : null;

    if (opening) {
      const tag = getTagName(opening.tagName);
      const comp = getComponentAttr(opening);
      if (tag && comp && !NATIVE.has(tag)) {
        wraps.push({ node, name: comp.value, attr: comp.attr });
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  if (wraps.length === 0) return { changed: false, count: 0 };

  wraps.sort((a, b) => b.node.getStart() - a.node.getStart());
  let result = sourceText;

  for (const { node, name, attr } of wraps) {
    const start = node.getStart();
    const end = node.getEnd();
    const jsx = result.slice(start, end);
    const opening = ts.isJsxElement(node) ? node.openingElement : node;
    const openingStart = opening.getStart() - start;
    const openingEnd = opening.getEnd() - start;
    const openingText = jsx.slice(openingStart, openingEnd);
    const cleanedOpening = removeAttr(openingText, attr);
    const cleanedJsx = jsx.slice(0, openingStart) + cleanedOpening + jsx.slice(openingEnd);
    const wrapped = `<div component="${name}" style={{ display: 'contents' }}>${cleanedJsx}</div>`;
    result = result.slice(0, start) + wrapped + result.slice(end);
  }

  fs.writeFileSync(filePath, result);
  return { changed: true, count: wraps.length };
}

let total = 0;
for (const file of collectFiles()) {
  const { changed, count } = processFile(file);
  if (changed) {
    total += count;
    console.log(`✓ ${path.relative(ROOT, file)} (${count})`);
  }
}
console.log(`\nFixed ${total} non-DOM component attributes.`);
