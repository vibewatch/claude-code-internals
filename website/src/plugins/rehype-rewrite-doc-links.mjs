// @ts-check
import fs from 'node:fs';
import path from 'node:path';

/**
 * Rewrite GitHub-flavored Markdown links to website-safe links.
 *
 * Docs use file-relative links that work on GitHub, but Starlight renders each
 * non-index Markdown file as a directory URL. This plugin rewrites local docs
 * links to those route URLs and rewrites repository-local links outside docs to
 * GitHub blob/tree URLs.
 */

const DEFAULT_REPOSITORY_URL = 'https://github.com/vibewatch/claude-code-internals';
const REPOSITORY_URL = (process.env.PUBLIC_REPOSITORY_URL ?? DEFAULT_REPOSITORY_URL).replace(/\/$/, '');
const REPOSITORY_BRANCH = process.env.PUBLIC_REPOSITORY_BRANCH ?? 'main';

function walk(node, visit) {
  if (!node) return;
  if (node.type === 'element') visit(node);
  if (Array.isArray(node.children)) {
    for (const child of node.children) walk(child, visit);
  }
}

function toPosixPath(value) {
  return value.replace(/\\/g, '/');
}

function isInsidePath(root, target) {
  const rel = path.relative(root, target);
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}

function splitHref(href) {
  const match = href.match(/^([^?#]*)([?#].*)?$/);
  return {
    pathPart: match?.[1] ?? href,
    suffix: match?.[2] ?? '',
  };
}

function getDocsRoot(file) {
  return path.resolve(file?.cwd ?? process.cwd(), '..', 'docs');
}

function deriveDocRoute(relPath) {
  let id = toPosixPath(relPath).replace(/\.mdx?$/i, '');
  id = id.replace(/(^|\/)README$/i, '$1');
  id = id.replace(/^SUMMARY$/, 'summary');
  id = id.replace(/\/$/, '');
  return id === '' ? '/' : `/${id}/`;
}

function relativeRouteHref(sourceRoute, targetRoute) {
  let rel = path.posix.relative(sourceRoute, targetRoute);
  if (rel === '') rel = '.';
  if (!rel.endsWith('/')) rel = `${rel}/`;
  return rel;
}

function resolveDocsTarget(targetPath) {
  if (/\.mdx?$/i.test(targetPath)) return targetPath;
  try {
    if (fs.existsSync(targetPath) && fs.statSync(targetPath).isDirectory()) {
      const readmePath = path.join(targetPath, 'README.md');
      if (fs.existsSync(readmePath)) return readmePath;
    }
  } catch {
    // Leave unknown targets unchanged below.
  }
  return null;
}

function repositoryUrlForTarget(repoRoot, targetPath) {
  if (!isInsidePath(repoRoot, targetPath) || !fs.existsSync(targetPath)) return null;

  const rel = toPosixPath(path.relative(repoRoot, targetPath));
  const encodedRel = rel.split('/').map(encodeURIComponent).join('/');
  const kind = fs.statSync(targetPath).isDirectory() ? 'tree' : 'blob';
  return `${REPOSITORY_URL}/${kind}/${REPOSITORY_BRANCH}/${encodedRel}`;
}

function rewriteMarkdownHrefWithoutFileContext(pathPart) {
  if (!/\.mdx?$/i.test(pathPart)) return null;

  let p = pathPart.replace(/\.mdx?$/i, '');
  p = p.replace(/(^|\/)README$/i, '$1');
  p = p.replace(/(^|\/)SUMMARY$/i, '$1summary');
  if (p !== '' && !p.endsWith('/')) p = `${p}/`;
  return p;
}

function rewriteHref(href, file) {
  if (typeof href !== 'string' || href.length === 0) return href;
  if (/^([a-z][a-z0-9+.-]*:|\/\/)/i.test(href)) return href;
  if (href.startsWith('#')) return href;

  const { pathPart, suffix } = splitHref(href);
  if (!pathPart || pathPart.startsWith('/')) return href;

  if (!file?.path || !path.isAbsolute(file.path)) {
    const fallback = rewriteMarkdownHrefWithoutFileContext(pathPart);
    return fallback === null ? href : `${fallback}${suffix}`;
  }

  const docsRoot = getDocsRoot(file);
  const repoRoot = path.resolve(docsRoot, '..');
  const sourcePath = path.resolve(file.path);
  const targetPath = path.resolve(path.dirname(sourcePath), pathPart);

  if (isInsidePath(docsRoot, targetPath)) {
    const targetDocPath = resolveDocsTarget(targetPath);
    if (!targetDocPath) return href;

    const sourceRoute = deriveDocRoute(path.relative(docsRoot, sourcePath));
    const targetRoute = deriveDocRoute(path.relative(docsRoot, targetDocPath));
    return `${relativeRouteHref(sourceRoute, targetRoute)}${suffix}`;
  }

  const repositoryUrl = repositoryUrlForTarget(repoRoot, targetPath);
  return repositoryUrl === null ? href : `${repositoryUrl}${suffix}`;
}

export default function rehypeRewriteDocLinks() {
  return function transformer(tree, file) {
    walk(tree, (node) => {
      if (node.tagName !== 'a' || !node.properties) return;
      const href = node.properties.href;
      const next = rewriteHref(href, file);
      if (next !== href) node.properties.href = next;
    });
  };
}
