/**
 * Adds component="ComponentName" to the root JSX element of React components.
 * Run: node scripts/add-component-attr.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const ROOT = path.resolve(import.meta.dirname, '..');

const GLOBS = [
  'apps/dashboard/src/**/*.tsx',
  'apps/web/src/**/*.tsx',
  'packages/ui/src/**/*.tsx',
];

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
  const files = new Set();
  for (const pattern of GLOBS) {
    const parts = pattern.split('/');
    const base = path.join(ROOT, ...parts.slice(0, parts.indexOf('**')));
    walk(base, []).forEach((f) => files.add(f));
  }
  return [...files].sort();
}

function isPascalCase(name) {
  return /^[A-Z][A-Za-z0-9]*$/.test(name);
}

function getJsxTagName(tagName) {
  if (ts.isIdentifier(tagName)) return tagName.text;
  if (ts.isPropertyAccessExpression(tagName)) return tagName.name.text;
  return null;
}

function hasComponentAttr(attrs) {
  return attrs?.properties?.some(
    (p) =>
      ts.isJsxAttribute(p) &&
      (p.name.text === 'component' ||
        (ts.isIdentifier(p.name) && p.name.text === 'component')),
  );
}

function findInsertPos(opening) {
  const tagName = opening.tagName;
  return tagName.getEnd();
}

function unwrapExpression(expr) {
  let current = expr;
  while (
    ts.isParenthesizedExpression(current) ||
    ts.isAsExpression(current) ||
    ts.isTypeAssertionExpression(current)
  ) {
    current = current.expression;
  }
  return current;
}

function getReturnJsx(stmt) {
  if (!stmt?.expression) return null;
  const expr = unwrapExpression(stmt.expression);
  if (ts.isJsxElement(expr) || ts.isJsxSelfClosingElement(expr)) return expr;
  if (ts.isJsxFragment(expr)) return expr;
  return null;
}

function findTopLevelReturns(body) {
  const returns = [];
  for (const stmt of body.statements) {
    if (ts.isReturnStatement(stmt)) returns.push(stmt);
    if (ts.isIfStatement(stmt)) {
      if (stmt.thenStatement && ts.isReturnStatement(stmt.thenStatement)) {
        returns.push(stmt.thenStatement);
      }
      if (stmt.elseStatement && ts.isReturnStatement(stmt.elseStatement)) {
        returns.push(stmt.elseStatement);
      }
    }
  }
  return returns;
}

function collectComponents(sourceFile) {
  const components = [];

  function maybeAdd(node, name) {
    if (!isPascalCase(name)) return;
    const body = node.body;
    if (!body || !ts.isBlock(body)) return;
    const returns = findTopLevelReturns(body);
    if (returns.length === 0) return;
    components.push({ name, returns });
  }

  function visit(node) {
    if (ts.isFunctionDeclaration(node) && node.name) {
      maybeAdd(node, node.name.text);
    }
    if (
      ts.isVariableStatement(node) &&
      node.declarationList.declarations.length === 1
    ) {
      const decl = node.declarationList.declarations[0];
      if (ts.isIdentifier(decl.name) && decl.initializer) {
        if (
          ts.isArrowFunction(decl.initializer) ||
          ts.isFunctionExpression(decl.initializer)
        ) {
          maybeAdd(decl.initializer, decl.name.text);
        }
        if (
          ts.isCallExpression(decl.initializer) &&
          decl.initializer.expression.getText(sourceFile) === 'forwardRef' &&
          decl.initializer.arguments[0]
        ) {
          const arg = decl.initializer.arguments[0];
          if (
            (ts.isFunctionExpression(arg) || ts.isArrowFunction(arg)) &&
            arg.name &&
            ts.isIdentifier(arg.name)
          ) {
            maybeAdd(arg, arg.name.text);
          } else if (ts.isFunctionExpression(arg) || ts.isArrowFunction(arg)) {
            maybeAdd(arg, decl.name.text);
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return components;
}

function wrapFragment(sourceText, fragment, componentName) {
  const start = fragment.getStart();
  const end = fragment.getEnd();
  const original = sourceText.slice(start, end);
  const wrapped = `<div component="${componentName}" style={{ display: 'contents' }}>${original}</div>`;
  return { start, end, text: wrapped };
}

function addAttrToOpening(sourceText, opening, componentName) {
  if (hasComponentAttr(opening.attributes)) return null;
  const pos = findInsertPos(opening);
  return {
    start: pos,
    end: pos,
    text: ` component="${componentName}"`,
  };
}

function processFile(filePath) {
  const sourceText = fs.readFileSync(filePath, 'utf8');
  if (sourceText.includes('component="') && !sourceText.match(/component="\w+"/)) {
    // already processed partially — still run
  }

  const sourceFile = ts.createSourceFile(
    filePath,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );

  const components = collectComponents(sourceFile);
  if (components.length === 0) return { filePath, changed: false, count: 0 };

  const edits = [];

  for (const { name, returns } of components) {
    for (const ret of returns) {
      const jsx = getReturnJsx(ret);
      if (!jsx) continue;

      if (ts.isJsxFragment(jsx)) {
        edits.push(wrapFragment(sourceText, jsx, name));
        continue;
      }

      const opening = ts.isJsxElement(jsx) ? jsx.openingElement : jsx;
      const tag = getJsxTagName(opening.tagName);
      if (!tag) continue;

      // React built-ins that don't render DOM nodes
      if (tag === 'Suspense' || tag === 'Fragment' || tag === 'StrictMode') {
        if (ts.isJsxElement(jsx) && jsx.children.length === 1) {
          const child = jsx.children[0];
          if (ts.isJsxElement(child) || ts.isJsxSelfClosingElement(child)) {
            const childOpening = ts.isJsxElement(child)
              ? child.openingElement
              : child;
            const edit = addAttrToOpening(sourceText, childOpening, name);
            if (edit) edits.push(edit);
            continue;
          }
        }
        edits.push(wrapFragment(sourceText, jsx, name));
        continue;
      }

      const edit = addAttrToOpening(sourceText, opening, name);
      if (edit) edits.push(edit);
    }
  }

  if (edits.length === 0) return { filePath, changed: false, count: 0 };

  edits.sort((a, b) => b.start - a.start);
  let result = sourceText;
  for (const edit of edits) {
    result = result.slice(0, edit.start) + edit.text + result.slice(edit.end);
  }

  fs.writeFileSync(filePath, result);
  return { filePath, changed: true, count: edits.length };
}

const files = collectFiles();
let totalEdits = 0;
let changedFiles = 0;

for (const file of files) {
  const result = processFile(file);
  if (result.changed) {
    changedFiles++;
    totalEdits += result.count;
    console.log(`✓ ${path.relative(ROOT, result.filePath)} (${result.count})`);
  }
}

console.log(`\nDone: ${totalEdits} attributes in ${changedFiles} files.`);
