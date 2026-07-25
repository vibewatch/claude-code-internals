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
            { label: 'Daemon and background service', link: '/01-runtime-lifecycle/daemon-and-background-service/' },
            { label: 'Command-line reference', link: '/01-runtime-lifecycle/command-line-reference/' },
            { label: 'Terminal UI renderer and input', link: '/01-runtime-lifecycle/terminal-ui-renderer-and-input/' },
            { label: 'Accessibility and screen-reader mode', link: '/01-runtime-lifecycle/accessibility-and-screen-reader-mode/' },
            { label: 'Conversation termination', link: '/01-runtime-lifecycle/conversation-termination/' },
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
            { label: 'Team memory', link: '/02-context-model-loop/team-memory/' },
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
            { label: 'Browser automation and Chrome', link: '/03-tools-integrations-security/browser-automation-and-claude-in-chrome/' },
            { label: 'Computer-use MCP', link: '/03-tools-integrations-security/computer-use-mcp/' },
            { label: 'IDE integration and LSP', link: '/03-tools-integrations-security/ide-integration-and-lsp-diagnostics/' },
            { label: 'Artifact publishing and live pages', link: '/03-tools-integrations-security/artifact-publishing-and-live-pages/' },
            { label: 'Claude Design and design sync', link: '/03-tools-integrations-security/claude-design-and-design-sync/' },
            { label: 'Sandbox and isolation', link: '/03-tools-integrations-security/sandbox-and-isolation/' },
            { label: 'MCP, plugins, hooks', link: '/03-tools-integrations-security/mcp-plugins-hooks/' },
            { label: 'Plugin lifecycle and configuration', link: '/03-tools-integrations-security/plugin-lifecycle-and-configuration/' },
            { label: 'Skills system', link: '/03-tools-integrations-security/skills-system/' },
            { label: 'Hooks and events reference', link: '/03-tools-integrations-security/hooks-and-events-reference/' },
            { label: 'Status line runtime', link: '/03-tools-integrations-security/status-line/' },
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
            { label: 'Hosted Projects and knowledge', link: '/04-sessions-persistence-remote/hosted-projects-and-knowledge/' },
            { label: 'Team onboarding and share flows', link: '/04-sessions-persistence-remote/team-onboarding-and-share-flows/' },
            { label: 'Remote control and teleport', link: '/04-sessions-persistence-remote/remote-control-and-teleport/' },
            { label: 'Remote egress and file staging', link: '/04-sessions-persistence-remote/remote-environment-egress-and-file-staging/' },
            { label: 'Session API and storage', link: '/04-sessions-persistence-remote/session-api-events-and-storage/' },
            { label: 'SDK query and session API', link: '/04-sessions-persistence-remote/sdk-query-and-session-api/' },
            { label: 'Session recording', link: '/04-sessions-persistence-remote/session-recording/' },
            { label: 'Data models and frames', link: '/04-sessions-persistence-remote/data-models-and-frame-schemas/' },
            { label: 'Architecture', link: '/04-sessions-persistence-remote/architecture/' },
          ],
        },
        {
          label: 'Operations and native support',
          items: [
            { label: 'Overview', link: '/05-hosted-agent-ops/' },
            { label: 'Diagnostics and logs', link: '/05-hosted-agent-ops/diagnostics-and-debug-logs/' },
            { label: 'Telemetry and tracing', link: '/05-hosted-agent-ops/telemetry-and-tracing/' },
            { label: 'Feature gates reference', link: '/05-hosted-agent-ops/feature-gates-reference/' },
            { label: 'Updater and doctor', link: '/05-hosted-agent-ops/updater-and-doctor/' },
            { label: 'Safe mode and recovery', link: '/05-hosted-agent-ops/safe-mode-and-recovery/' },
            { label: 'Environment variables', link: '/05-hosted-agent-ops/environment-variables-reference/' },
            { label: 'Enterprise gateway server', link: '/05-hosted-agent-ops/enterprise-gateway/' },
            { label: 'Media native modules', link: '/05-hosted-agent-ops/media-native-modules/' },
            { label: 'Audio capture and voice', link: '/05-hosted-agent-ops/audio-capture-and-voice/' },
            { label: 'Audio capture native module', link: '/05-hosted-agent-ops/audio-capture-native/' },
            { label: 'Image processor native module', link: '/05-hosted-agent-ops/image-processor-native/' },
            { label: 'Architecture', link: '/05-hosted-agent-ops/architecture/' },
          ],
        },
        {
          label: 'Agents and automation',
          items: [
            { label: 'Overview', link: '/06-agents-automation/' },
            { label: 'Agents, tasks, subagents', link: '/06-agents-automation/agents-tasks-and-subagents/' },
            { label: 'Worktree isolation and handoffs', link: '/06-agents-automation/worktree-isolation-and-handoffs/' },
            { label: 'Agent messaging', link: '/06-agents-automation/agent-messaging/' },
            { label: 'Agent Teams', link: '/06-agents-automation/agent-teams/' },
            { label: 'Observer agents', link: '/06-agents-automation/observer-agents/' },
            { label: 'Steering and completion', link: '/06-agents-automation/agent-steering-interruption-and-completion/' },
            { label: 'Dynamic workflows', link: '/06-agents-automation/dynamic-workflows/' },
            { label: 'Slash commands', link: '/06-agents-automation/slash-commands-and-automation/' },
            { label: 'Cron and scheduled tasks', link: '/06-agents-automation/cron-and-scheduled-tasks/' },
            { label: 'Architecture', link: '/06-agents-automation/architecture/' },
          ],
        },
        {
          label: 'Research atlas',
          items: [
            { label: 'Overview', link: '/99-research-atlas/' },
            { label: 'Bundle module map', link: '/99-research-atlas/module-map-from-renamed-cli/' },
            { label: 'Full-system coverage review', link: '/99-research-atlas/full-system-coverage-review/' },
            { label: 'Documentation structure review', link: '/99-research-atlas/documentation-structure-review/' },
            { label: 'String-surface review', link: '/99-research-atlas/disassembled-string-surface-review/' },
            { label: 'Runtime mechanism audit', link: '/99-research-atlas/mechanism-question-audit-runtime/' },
            { label: 'Context/model mechanism audit', link: '/99-research-atlas/mechanism-question-audit-context-model/' },
            { label: 'Tools/security mechanism audit', link: '/99-research-atlas/mechanism-question-audit-tools-security/' },
            { label: 'Sessions/remote mechanism audit', link: '/99-research-atlas/mechanism-question-audit-sessions-remote/' },
            { label: 'Operations/native mechanism audit', link: '/99-research-atlas/mechanism-question-audit-operations-native/' },
            { label: 'Agents/automation mechanism audit', link: '/99-research-atlas/mechanism-question-audit-agents-automation/' },
          ],
        },
      ],
    }),
  ],
});
