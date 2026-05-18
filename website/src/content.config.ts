import { defineCollection } from 'astro:content';
import type { Loader } from 'astro/loaders';
import { docsSchema } from '@astrojs/starlight/schema';
import { createMarkdownProcessor } from '@astrojs/markdown-remark';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Read documentation directly from `../docs/` — the workspace-root markdown
 * tree is the single source of truth, no copy or symlink required.
 *
 * Source pages use Markdown H1s rather than YAML title frontmatter. Starlight
 * requires a title, so this loader injects one from the first H1 and removes
 * the matching H1 from the rendered body to avoid duplicate headings.
 */

const here = path.dirname(fileURLToPath(import.meta.url));
const DOCS_ROOT = path.resolve(here, '..', '..', 'docs');
const SITE_ROOT = path.resolve(here, '..');
const EXCLUDE_BASENAMES = new Set<string>();
const EXCLUDE_TOP_LEVEL_DIRS = new Set<string>();

function deriveId(relPath: string): string {
  let id = relPath.replace(/\\/g, '/').replace(/\.mdx?$/i, '');
  id = id.replace(/(^|\/)README$/i, '$1');
  id = id.replace(/^SUMMARY$/, 'summary');
  id = id.replace(/\/$/, '');
  return id === '' ? 'index' : id;
}

function parseFrontmatter(raw: string): {
  data: Record<string, unknown>;
  body: string;
} {
  const match = raw.match(/^---\r?\n([\s\S]+?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return { data: {}, body: raw };
  const data: Record<string, unknown> = {};
  for (const line of match[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (kv) data[kv[1]] = kv[2].replace(/^["']|["']$/g, '').trim();
  }
  return { data, body: match[2] };
}

function extractH1(body: string): string | null {
  const m = body.match(/^#\s+(.+?)\s*#*\s*$/m);
  if (!m) return null;
  return m[1].replace(/`/g, '').trim();
}

function stripMatchingH1(body: string, title: unknown): string {
  if (typeof title !== 'string') return body;
  const normalizedTitle = title.replace(/`/g, '').trim();
  let removed = false;

  return body.replace(/^#\s+(.+?)\s*#*\s*(?:\r?\n|$)/m, (match, h1) => {
    if (removed) return match;
    if (String(h1).replace(/`/g, '').trim() !== normalizedTitle) return match;
    removed = true;
    return '';
  }).replace(/^\r?\n/, '');
}

async function collect(dir: string, prefix = ''): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const out: string[] = [];
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      if (!prefix && EXCLUDE_TOP_LEVEL_DIRS.has(entry.name)) continue;
      out.push(...(await collect(full, rel)));
    } else if (
      /\.(md|mdx)$/i.test(entry.name) &&
      !EXCLUDE_BASENAMES.has(entry.name)
    ) {
      out.push(rel);
    }
  }
  return out;
}

function docsFromWorkspaceRoot(): Loader {
  return {
    name: 'docs-from-workspace-root',
    async load({ store, parseData, generateDigest, watcher, logger, config }) {
      store.clear();
      const files = await collect(DOCS_ROOT);
      logger.info(`Loading ${files.length} doc page(s) from ${DOCS_ROOT}`);

      const processor = await createMarkdownProcessor(config.markdown);

      for (const rel of files) {
        const full = path.join(DOCS_ROOT, rel);
        const relToSite = path.relative(SITE_ROOT, full);
        const raw = await fs.readFile(full, 'utf8');
        const { data, body } = parseFrontmatter(raw);

        if (!data.title) {
          const h1 = extractH1(body);
          data.title = h1 ?? path.basename(rel, path.extname(rel));
        }

        const renderBody = stripMatchingH1(body, data.title);

        const id = deriveId(rel);
        const parsed = await parseData({ id, data, filePath: relToSite });
        const rendered = await processor.render(renderBody, {
          frontmatter: parsed,
          fileURL: new URL(`file://${full}`),
        });

        store.set({
          id,
          data: parsed,
          body: renderBody,
          filePath: relToSite,
          digest: generateDigest(raw),
          rendered: {
            html: rendered.code,
            metadata: {
              headings: rendered.metadata.headings,
              imagePaths: [
                ...(rendered.metadata.localImagePaths ?? []),
                ...(rendered.metadata.remoteImagePaths ?? []),
              ],
              frontmatter: parsed,
            },
          },
        });
      }

      if (watcher) {
        watcher.add(DOCS_ROOT);
      }
    },
  };
}

export const collections = {
  docs: defineCollection({
    loader: docsFromWorkspaceRoot(),
    schema: docsSchema(),
  }),
};
