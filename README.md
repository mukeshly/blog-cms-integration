# `@vibeshipteam/blog-cms-integration`

Opinionated blog + CMS integration for Next.js sites using Sanity and [`genio-nextjs-sanity-kit`](https://github.com/mukeshly/genio-nextjs-sanity-kit).

## What it wraps

- Sanity environment parsing
- shared Sanity schema assembly
- blog and CMS page read helpers
- Studio workspace config generation
- server-side publish and write helpers

## Repository

- Source: [github.com/mukeshly/blog-cms-integration](https://github.com/mukeshly/blog-cms-integration)
- Issues: [github.com/mukeshly/blog-cms-integration/issues](https://github.com/mukeshly/blog-cms-integration/issues)

## Install

```bash
npm install @vibeshipteam/blog-cms-integration
```

The package pulls in `genio-nextjs-sanity-kit` from GitHub until that dependency is published to npm.

Required peer dependencies come from the consuming app:

- `next`
- `react`
- `react-dom`
- `next-sanity`
- `sanity`

## Usage

```ts
import { createBlogCmsIntegration } from "@vibeshipteam/blog-cms-integration";

export const cms = createBlogCmsIntegration(process.env, {
  defaultAuthorName: "Example Site",
  fallbackCategoryLabel: "Editorial",
  fallbackImage: "/og-default.jpg",
  includeCategory: true,
  includeSiteSettings: false,
  locale: "en-US",
  reservedRootSlugs: ["about", "blog", "contact"],
  siteUrl: "https://example.com",
  studioTitle: "Example CMS",
  timeZone: "UTC",
});
```

Server-side publish helpers:

```ts
import { createBlogCmsPublisher } from "@vibeshipteam/blog-cms-integration/server";

export const publisher = createBlogCmsPublisher(process.env);
```

## Release

```bash
npm run check
npm run build
npm run pack:dry-run
```

Tag-based npm publishing is wired through GitHub Actions. Publishing a tag like `v0.1.1` will run validation and publish the package with provenance enabled.
