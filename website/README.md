# Claude Code Internals website

Astro/Starlight wiki for the Markdown documentation in `../docs/`.

The website intentionally does **not** copy docs into `website/src/content/`. A custom Starlight content loader reads the workspace-root `docs/` tree directly, injects page titles from Markdown H1s, and strips the duplicate H1 from rendered pages.

## Scripts

- `npm run dev` — local development server.
- `npm run build` — production static build to `dist/`.
- `npm run preview` — preview the production build.

## Analytics

Set `PUBLIC_GA_ID` to a Google Analytics 4 measurement ID such as
`G-ABC123DEF4` before building. The tag is only emitted in production builds
(`npm run build`), not during local dev.

For GitHub Pages, add it as a repository variable:

1. Open **Settings → Secrets and variables → Actions → Variables**.
2. Add `PUBLIC_GA_ID` with the GA4 measurement ID.
3. Re-run the **Deploy website** workflow, or push to `main`.

## Deployment

The GitHub Pages workflow builds from this directory and uploads `website/dist`.

Defaults:

- `SITE_URL=https://claude-code.genisisiq.com`
- root base path, because `public/CNAME` configures the custom domain.

For a repository-subpath Pages deployment, override the build env values, for example:

```sh
SITE_URL=https://vibewatch.github.io SITE_BASE=/claude-code-internals DEPLOY_TARGET=github-pages npm run build
```

## Content model

- Source docs: `../docs/**/*.md`
- Generated routes: `README.md` becomes the section root, e.g. `docs/00-start-here/README.md` → `/00-start-here/`.
- GitHub-style relative `.md` links are rewritten to Starlight routes at render time.
- Links to repository artifacts outside `docs/` are rewritten to GitHub blob/tree URLs.
