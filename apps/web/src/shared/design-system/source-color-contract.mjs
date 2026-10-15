// Source-contract lint, not a renderer or an accessibility assertion.
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import ts from "typescript";

const palette =
  /^(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}$|^(?:white|black)$/;
const role =
  /^(?:on-|primary|secondary|surface|background|outline|error|success|warning|scrim)/;
const paint =
  /^(?:color|.*Color|background|border(?:Top|Right|Bottom|Left)?|outline|fill|stroke|boxShadow|textShadow)$/;

function isVariantDefinition(node) {
  for (let parent = node.parent; parent; parent = parent.parent) {
    if (
      ts.isCallExpression(parent) &&
      ts.isIdentifier(parent.expression) &&
      parent.expression.text === "cva"
    )
      return true;
  }
  return false;
}

export function auditSource(source, definitions) {
  const file = ts.createSourceFile(
    "component.tsx",
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const issues = [];
  function visit(node) {
    if (
      ts.isStringLiteralLike(node) ||
      ts.isTemplateHead(node) ||
      ts.isTemplateMiddle(node) ||
      ts.isTemplateTail(node)
    ) {
      const value = node.text;
      for (const utility of value.split(/\s+/)) {
        const match = utility.match(
          /(?:^|:)(?:bg|text|border(?:-[trblxy])?|ring(?:-offset)?|outline|accent|fill|stroke|divide|decoration|placeholder|shadow)-(.*)$/,
        );
        if (!match) continue;
        const name = match[1].split("/")[0];
        const kind = palette.test(name)
          ? "palette"
          : /\[(?:#|(?:rgba?|hsla?|oklch|oklab|lab|lch|color)\(|(?:color:)?[a-z]+\])/.test(
                name,
              )
            ? "literal-color"
            : (role.test(name) ||
                  (/(?:^|:)bg-/.test(utility) &&
                    !/^(?:none|transparent|current|inherit|auto|cover|contain|fixed|local|scroll|clip-|origin-|repeat|no-repeat|center|top|bottom|left|right|linear-|gradient-|radial|conic|\[)/.test(
                      name,
                    ))) &&
                !definitions.has(name)
              ? "undefined-token"
              : null;
        if (kind) issues.push({ kind, value: utility });
      }
      for (const match of value.matchAll(/var\(--color-([\w-]+)/g)) {
        if (!definitions.has(match[1]))
          issues.push({ kind: "undefined-token", value: match[1] });
      }
    }
    const jsxPaint =
      ts.isJsxAttribute(node) &&
      node.initializer &&
      ts.isJsxExpression(node.initializer)
        ? node.initializer.expression
        : node.initializer;
    if (
      ts.isJsxAttribute(node) &&
      paint.test(node.name.getText(file)) &&
      jsxPaint &&
      ts.isStringLiteral(jsxPaint) &&
      !/^(?:currentColor|none|transparent|inherit|var\(--[\w-]+\))$/.test(
        jsxPaint.text,
      )
    ) {
      issues.push({ kind: "inline-color", value: jsxPaint.text });
    }
    if (
      ts.isPropertyAssignment(node) &&
      !isVariantDefinition(node) &&
      paint.test(node.name.getText(file).replace(/['"]/g, "")) &&
      ts.isStringLiteralLike(node.initializer) &&
      !/^(?:var\(--|currentColor$|none$|transparent$|inherit$)/.test(
        node.initializer.text,
      )
    ) {
      issues.push({ kind: "inline-color", value: node.initializer.text });
    }
    ts.forEachChild(node, visit);
  }
  visit(file);
  return issues.filter(
    (issue, index) =>
      issues.findIndex(
        (other) => other.kind === issue.kind && other.value === issue.value,
      ) === index,
  );
}

function walk(path) {
  return readdirSync(path, { withFileTypes: true }).flatMap((item) =>
    item.isDirectory() ? walk(join(path, item.name)) : [join(path, item.name)],
  );
}

export function reachableSources(rootUrl) {
  const root = rootUrl.pathname;
  const all = walk(root).filter((path) => /\.tsx?$/.test(path));
  const queue = all.filter(
    (path) =>
      path.startsWith(join(root, "app") + "/") &&
      /\/(?:page|layout|loading|error|not-found|global-error|template|default|route)\.tsx?$/.test(
        path,
      ),
  );
  const seen = new Set();
  while (queue.length) {
    const path = queue.pop();
    if (seen.has(path)) continue;
    seen.add(path);
    const file = ts.createSourceFile(
      path,
      readFileSync(path, "utf8"),
      ts.ScriptTarget.Latest,
      true,
    );
    function visit(node) {
      const specifier =
        ts.isImportDeclaration(node) || ts.isExportDeclaration(node)
          ? node.moduleSpecifier
          : ts.isCallExpression(node) &&
              node.expression.kind === ts.SyntaxKind.ImportKeyword
            ? node.arguments[0]
            : undefined;
      if (
        specifier &&
        ts.isStringLiteral(specifier) &&
        /^(?:@\/|\.)/.test(specifier.text)
      ) {
        const base = specifier.text.startsWith("@/")
          ? join(root, specifier.text.slice(2))
          : resolve(dirname(path), specifier.text);
        const resolved = [
          base,
          `${base}.tsx`,
          `${base}.ts`,
          join(base, "index.tsx"),
          join(base, "index.ts"),
        ].find((candidate) => all.includes(candidate) && existsSync(candidate));
        if (resolved) queue.push(resolved);
      }
      ts.forEachChild(node, visit);
    }
    visit(file);
  }
  return [...seen].sort();
}
