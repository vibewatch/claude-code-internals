// @ts-check

/**
 * Render prompt-catalog preview table cells as code blocks.
 *
 * The prompt catalog stores embedded prompt/template text in Markdown tables.
 * As prose cells, those previews can accidentally render bundled Markdown links
 * and long prompt snippets as ordinary page text. For tables with a `Preview`
 * header, convert preview cells into `<pre><code>` blocks so the snippets read
 * as literal prompt/source text.
 */

function walk(node, visit) {
  if (!node) return;
  if (node.type === 'element') visit(node);
  if (Array.isArray(node.children)) {
    for (const child of node.children) walk(child, visit);
  }
}

function textContent(node) {
  if (!node) return '';
  if (node.type === 'text') return node.value ?? '';
  if (!Array.isArray(node.children)) return '';
  return node.children.map(textContent).join('');
}

function promptLiteralContent(node) {
  if (!node) return '';
  if (node.type === 'text') return node.value ?? '';
  if (!Array.isArray(node.children)) return '';

  const inner = node.children.map(promptLiteralContent).join('');
  if (node.type !== 'element') return inner;

  switch (node.tagName) {
    case 'br':
      return '\n';
    case 'code':
      return `\`${inner}\``;
    case 'strong':
    case 'b':
      return `**${inner}**`;
    case 'em':
    case 'i':
      return `_${inner}_`;
    case 'del':
    case 's':
      return `~~${inner}~~`;
    case 'a': {
      const href = node.properties?.href;
      return href ? `[${inner}](${href})` : inner;
    }
    default:
      return inner;
  }
}

function elementChildren(node, tagName) {
  return (node.children ?? []).filter(
    (child) => child.type === 'element' && child.tagName === tagName,
  );
}

function tableRows(section) {
  return elementChildren(section, 'tr');
}

function codeBlock(value) {
  return {
    type: 'element',
    tagName: 'pre',
    properties: { className: ['prompt-preview-code'] },
    children: [
      {
        type: 'element',
        tagName: 'code',
        properties: {},
        children: [{ type: 'text', value: value.trim() }],
      },
    ],
  };
}

function transformTable(table) {
  const thead = elementChildren(table, 'thead')[0];
  const tbody = elementChildren(table, 'tbody')[0];
  if (!thead || !tbody) return;

  const headerRow = tableRows(thead)[0];
  if (!headerRow) return;

  const headers = elementChildren(headerRow, 'th').map((cell) =>
    textContent(cell).trim().toLowerCase(),
  );
  const previewIndexes = headers
    .map((header, index) => (header === 'preview' ? index : -1))
    .filter((index) => index >= 0);

  if (previewIndexes.length === 0) return;

  for (const row of tableRows(tbody)) {
    const cells = elementChildren(row, 'td');
    for (const index of previewIndexes) {
      const cell = cells[index];
      if (!cell) continue;
      const preview = promptLiteralContent(cell).trim();
      if (!preview) continue;
      cell.children = [codeBlock(preview)];
    }
  }
}

export default function rehypeCodeblockPromptPreviews() {
  return function transformer(tree) {
    walk(tree, (node) => {
      if (node.tagName === 'table') transformTable(node);
    });
  };
}
