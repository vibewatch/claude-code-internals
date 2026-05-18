// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import { readFileSync } from 'node:fs';
import rehypeCodeblockPromptPreviews from './src/plugins/rehype-codeblock-prompt-previews.mjs';
import rehypeRewriteDocLinks from './src/plugins/rehype-rewrite-doc-links.mjs';

/**
 * GitHub Pages deploy config.
 *
 * Production deploys default to the custom domain
 * https://claude-code.genisisiq.com (served from the root path).
 *
 * Override values when needed, e.g.:
 *   SITE_URL=https://my-org.github.io SITE_BASE=/claude-code-internals \
 *     DEPLOY_TARGET=github-pages npm run build
 */
const isGitHubPages = process.env.DEPLOY_TARGET === 'github-pages';
const siteUrl = process.env.SITE_URL ?? 'https://claude-code.genisisiq.com';
const basePath = process.env.SITE_BASE ?? '';

const codeTheme = {
  name: 'claude-code-code',
  type: 'dark',
  semanticHighlighting: false,
  colors: {
    foreground: '#ffffff',
    'editor.foreground': '#ffffff',
    'editor.background': '#23251d',
    'editor.selectionBackground': '#ffffff24',
    'editor.lineHighlightBackground': '#ffffff0f',
    'editorWhitespace.foreground': '#ffffff66',
    'editorIndentGuide.background': '#ffffff33',
    'editorGroupHeader.tabsBackground': '#23251d',
    'editorGroupHeader.tabsBorder': '#23251d',
    'tab.activeBackground': '#23251d',
    'tab.activeForeground': '#ffffff',
    'tab.activeBorder': '#f7a501',
    'titleBar.activeBackground': '#23251d',
    'titleBar.activeForeground': '#ffffff',
    'terminal.background': '#23251d',
    'terminal.foreground': '#ffffff',
  },
  tokenColors: [
    {
      name: 'White code text',
      settings: {
        foreground: '#ffffff',
      },
    },
  ],
};

function forceStarlightLightTheme() {
  const starlightPagePath = '/node_modules/@astrojs/starlight/components/Page.astro';
  const darkThemeShell = "const htmlDataAttributes: DOMStringMap = { 'data-theme': 'dark' };";
  const lightThemeShell = "const htmlDataAttributes: DOMStringMap = { 'data-theme': 'light' };";
  const isStarlightPage = (id) => id.split('?', 1)[0].replaceAll('\\', '/').endsWith(starlightPagePath);

  return {
    name: 'claude-code-starlight-light-theme',
    enforce: 'pre',
    load(id) {
      if (!isStarlightPage(id)) return;
      return readFileSync(id.split('?', 1)[0], 'utf8').replace(darkThemeShell, lightThemeShell);
    },
    transform(code, id) {
      if (!isStarlightPage(id)) return;
      return code.replace(darkThemeShell, lightThemeShell);
    },
  };
}

// https://astro.build/config
export default defineConfig({
  site: siteUrl,
  base: isGitHubPages && basePath ? basePath : undefined,
  trailingSlash: 'always',
  vite: {
    plugins: [forceStarlightLightTheme()],
  },
  markdown: {
    rehypePlugins: [rehypeCodeblockPromptPreviews, rehypeRewriteDocLinks],
  },
  integrations: [
    starlight({
      title: 'Claude Code Internal Analysis',
      description:
        'Reverse-engineering wiki for the @anthropic-ai/claude-code bundle (cli.js).',
      logo: {
        src: './src/assets/dog.svg',
        replacesTitle: false,
      },
      tableOfContents: { minHeadingLevel: 2, maxHeadingLevel: 4 },
      lastUpdated: true,
      pagination: true,
      expressiveCode: {
        themes: [codeTheme],
        useStarlightDarkModeSwitch: false,
      },
      customCss: [
        './src/assets/fonts.css',
        './src/styles/tokens.css',
        './src/styles/theme.css',
        './src/styles/typography.css',
        './src/styles/code.css',
        './src/styles/components.css',
      ],
      components: {
        Head: './src/components/Head.astro',
        ThemeProvider: './src/components/LightThemeProvider.astro',
        ThemeSelect: './src/components/ThemeSelect.astro',
        SiteTitle: './src/components/SiteTitle.astro',
        Footer: './src/components/Footer.astro',
      },
      social: [
        {
          icon: 'github',
          label: 'GitHub',
          href: 'https://github.com/vibewatch/claude-code-internals',
        },
      ],
      sidebar: [
        {
          label: 'Start here',
          items: [
            { label: 'Wiki home', link: '/' },
            { label: 'Start here', link: '/00-start-here/' },
            { label: 'Glossary and aliases', link: '/00-start-here/glossary-and-aliases/' },
            { label: 'What is cli.js', link: '/00-start-here/what-is-cli-js/' },
            { label: 'Main feature map', link: '/00-start-here/main-feature-map/' },
            { label: 'System architecture', link: '/00-start-here/system-architecture/' },
            { label: 'Communication protocols', link: '/00-start-here/runtime-communication-protocols/' },
            { label: 'Full table of contents', link: '/summary/' },
          ],
        },
        {
          label: 'Runtime lifecycle',
          items: [
            { label: 'Overview', link: '/01-runtime-lifecycle/' },
            { label: 'Package and Bun bootstrap', link: '/01-runtime-lifecycle/package-and-bun-bootstrap/' },
            { label: 'CLI main paths', link: '/01-runtime-lifecycle/cli-main-paths/' },
            { label: 'Commands and flags', link: '/01-runtime-lifecycle/commands-and-flags/' },
            { label: 'Command-line reference', link: '/01-runtime-lifecycle/command-line-reference/' },
            { label: 'Architecture', link: '/01-runtime-lifecycle/architecture/' },
          ],
        },
        {
          label: 'Context and model loop',
          items: [
            { label: 'Overview', link: '/02-context-model-loop/' },
            { label: 'Prompt, context, memory', link: '/02-context-model-loop/prompt-context-memory/' },
            { label: 'Prompt assembly scenarios', link: '/02-context-model-loop/prompt-assembly-scenarios/' },
            { label: 'Compaction and checkpoints', link: '/02-context-model-loop/context-memory-compaction-checkpoints/' },
            { label: 'Prompt template catalog', link: '/02-context-model-loop/prompt-template-catalog/' },
            { label: 'Models, providers, auth', link: '/02-context-model-loop/models-providers-auth/' },
            { label: 'Model selection and quota', link: '/02-context-model-loop/model-selection-usage-quota-billing/' },
            { label: 'Headless streaming', link: '/02-context-model-loop/headless-streaming-and-resilience/' },
            { label: 'Architecture', link: '/02-context-model-loop/architecture/' },
          ],
        },
        {
          label: 'Tools, integrations, security',
          items: [
            { label: 'Overview', link: '/03-tools-integrations-security/' },
            { label: 'Tool runtime events', link: '/03-tools-integrations-security/tool-runtime-events-and-integrations/' },
            { label: 'Tool inventory and schemas', link: '/03-tools-integrations-security/tool-inventory-and-schemas/' },
            { label: 'Built-in tools and permissions', link: '/03-tools-integrations-security/built-in-tools-and-permissions/' },
            { label: 'Sandbox and isolation', link: '/03-tools-integrations-security/sandbox-and-isolation/' },
            { label: 'MCP, plugins, hooks', link: '/03-tools-integrations-security/mcp-plugins-hooks/' },
            { label: 'Hooks and events reference', link: '/03-tools-integrations-security/hooks-and-events-reference/' },
            { label: 'Settings and integrations', link: '/03-tools-integrations-security/settings-policy-and-integrations/' },
            { label: 'Settings schema reference', link: '/03-tools-integrations-security/settings-schema-reference/' },
            { label: 'Architecture', link: '/03-tools-integrations-security/architecture/' },
          ],
        },
        {
          label: 'Sessions, persistence, remote',
          items: [
            { label: 'Overview', link: '/04-sessions-persistence-remote/' },
            { label: 'Resume and transcripts', link: '/04-sessions-persistence-remote/session-resume-and-transcripts/' },
            { label: 'Remote control and teleport', link: '/04-sessions-persistence-remote/remote-control-and-teleport/' },
            { label: 'Session API and storage', link: '/04-sessions-persistence-remote/session-api-events-and-storage/' },
            { label: 'Data models and frames', link: '/04-sessions-persistence-remote/data-models-and-frame-schemas/' },
            { label: 'Architecture', link: '/04-sessions-persistence-remote/architecture/' },
          ],
        },
        {
          label: 'Hosted agent ops',
          items: [
            { label: 'Overview', link: '/05-hosted-agent-ops/' },
            { label: 'Diagnostics and logs', link: '/05-hosted-agent-ops/diagnostics-and-debug-logs/' },
            { label: 'Telemetry and tracing', link: '/05-hosted-agent-ops/telemetry-and-tracing/' },
            { label: 'Feature gates reference', link: '/05-hosted-agent-ops/feature-gates-reference/' },
            { label: 'Updater and doctor', link: '/05-hosted-agent-ops/updater-and-doctor/' },
            { label: 'Environment variables', link: '/05-hosted-agent-ops/environment-variables-reference/' },
            { label: 'Media native modules', link: '/05-hosted-agent-ops/media-native-modules/' },
            { label: 'Audio capture and voice', link: '/05-hosted-agent-ops/audio-capture-and-voice/' },
            { label: 'Architecture', link: '/05-hosted-agent-ops/architecture/' },
          ],
        },
        {
          label: 'Agents and automation',
          items: [
            { label: 'Overview', link: '/06-agents-automation/' },
            { label: 'Agents, tasks, subagents', link: '/06-agents-automation/agents-tasks-and-subagents/' },
            { label: 'Runtime and scheduling', link: '/06-agents-automation/agent-runtime-scheduling-and-completion/' },
            { label: 'Slash commands', link: '/06-agents-automation/slash-commands-and-automation/' },
            { label: 'Architecture', link: '/06-agents-automation/architecture/' },
          ],
        },
        {
          label: 'Research atlas',
          items: [
            { label: 'Overview', link: '/99-research-atlas/' },
            { label: 'Artifact map and bytecode', link: '/99-research-atlas/artifact-map-and-bytecode/' },
            { label: 'Decoded-classified audit', link: '/99-research-atlas/decoded-classified-decompilation-audit/' },
          ],
        },
      ],
    }),
  ],
});
