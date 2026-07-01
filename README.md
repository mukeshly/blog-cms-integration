# `@vibeshipteam/blog-cms-integration`

Opinionated blog + CMS integration for Next.js sites using Sanity and [`@vibeshipteam/genio-nextjs-sanity-kit`](https://github.com/mukeshly/genio-nextjs-sanity-kit).

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

The package depends on `@vibeshipteam/genio-nextjs-sanity-kit` from npm.

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
  articleBasePath: "/blog",
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

Frontend helpers:

```ts
import {
  createBlogPortableTextComponents,
  normalizeBlogArticleHref,
} from "@vibeshipteam/blog-cms-integration";

const portableTextComponents = createBlogPortableTextComponents({
  articleBasePath: "/blog",
  getImageUrl: cms.media.getBlogBodyImageUrl,
  reservedRootSlugs: ["about", "blog", "contact"],
  siteUrl: "https://example.com",
});

const href = normalizeBlogArticleHref("/my-article-slug", {
  articleBasePath: "/blog",
  reservedRootSlugs: ["about", "blog", "contact"],
  siteUrl: "https://example.com",
});
```

Server-side publish helpers:

```ts
import { createBlogCmsPublisher } from "@vibeshipteam/blog-cms-integration/server";

export const publisher = createBlogCmsPublisher(process.env);
```

## Portable Text Rendering Contract

This package wires Sanity reads, schema assembly, and Studio setup into a Next.js site, but the consuming app still owns the actual article renderer.

For Genio-published content, the consuming site must:

- render Portable Text `marks.link` as real anchors
- render Portable Text `types.image` explicitly for inline body images
- keep featured images separate from body images
- verify that inline body images remain present after hydration, not only in SSR HTML
- verify that internal article links use the site's real route pattern, usually `/blog/[slug]`
- verify that no raw markdown artifacts such as `[text](url)` appear on the live page

Recommended implementation notes:

- use the shared toolkit's blog helpers for reads
- use the toolkit image helpers for cover and body images
- normalize body image blocks before rendering when you need concrete image URLs in the client tree
- use `normalizeBlogArticleHref()` or `cms.frontend.normalizeBlogArticleHref()` so stored internal links resolve onto the real article route
- use `createBlogPortableTextComponents()` or `cms.frontend.createPortableTextComponents()` as the default renderer baseline for new clients

## Frontend Quickstart

For a new client blog frontend, the minimum path is:

1. Create the CMS bootstrap with `createBlogCmsIntegration()`
2. Set `articleBasePath`, usually `/blog`
3. Use `cms.blog.getAllBlogPosts()` in the blog index
4. Use `cms.blog.getBlogPostBySlug()` in the article page
5. Render the body with `createBlogPortableTextComponents({ getImageUrl: cms.media.getBlogBodyImageUrl, ... })`
6. If needed, call `cms.blog.normalizeBlogPostBody()` before rendering client-side Portable Text
7. Validate the shared golden test article before go-live

If the client blog frontend uses Genio-published Portable Text from Sanity, also follow the Genio-side policy document:

- `docs/CLIENT_BLOG_INLINE_IMAGE_RENDER_POLICY.md`

## Live Studio Setup

Package installation is not enough to make Studio work reliably on a deployed Next.js app. The consuming app still needs a Studio route, public Sanity config, and a `sanity.config.ts` setup that is safe to import from a client boundary.

### Required environment variables

Studio expects these public variables:

```bash
NEXT_PUBLIC_SANITY_PROJECT_ID=your_project_id
NEXT_PUBLIC_SANITY_DATASET=production
NEXT_PUBLIC_SANITY_API_VERSION=2025-02-19
NEXT_PUBLIC_SANITY_STUDIO_TITLE=Your Site CMS
```

If you use server-side publish helpers, also set:

```bash
BLOG_PUBLISH_API_SECRET=your_secret_here
```

### Studio route

Mount Studio under `/studio/[workspace]` and redirect `/studio` to a concrete workspace such as `/studio/production`.

```tsx
// app/studio/[[...tool]]/page.tsx
import { redirect } from "next/navigation";
import { hasSanityConfig } from "@/sanity/env";
import StudioClient from "./StudioClient";

export { metadata, viewport } from "next-sanity/studio";

export default async function StudioPage({
  params,
}: {
  params: Promise<{ tool?: string[] }>;
}) {
  if (!hasSanityConfig) {
    return <section>Sanity setup required.</section>;
  }

  const resolvedParams = await params;

  if (!resolvedParams.tool || resolvedParams.tool.length === 0) {
    redirect("/studio/production");
  }

  return <StudioClient />;
}
```

```tsx
// app/studio/[[...tool]]/StudioClient.tsx
"use client";

import { NextStudio } from "next-sanity/studio";
import config from "../../../sanity.config";

export default function StudioClient() {
  return <NextStudio config={config} />;
}
```

### `sanity.config.ts`

Do not rely on runtime-only server env access inside `sanity.config.ts`. In real apps this config is often imported by a client component.

Instead, pass the public Sanity values explicitly:

```ts
import { createBlogCmsIntegration } from "@vibeshipteam/blog-cms-integration";
import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";

const cms = createBlogCmsIntegration(
  {
    NEXT_PUBLIC_SANITY_PROJECT_ID: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
    NEXT_PUBLIC_SANITY_DATASET: process.env.NEXT_PUBLIC_SANITY_DATASET,
    NEXT_PUBLIC_SANITY_API_VERSION: process.env.NEXT_PUBLIC_SANITY_API_VERSION,
    NEXT_PUBLIC_SANITY_STUDIO_TITLE: process.env.NEXT_PUBLIC_SANITY_STUDIO_TITLE,
    NODE_ENV: process.env.NODE_ENV,
  },
  cmsOptions,
);

export default defineConfig(
  cms.createStudioWorkspaces({
    plugins: [structureTool()],
  }) as Parameters<typeof defineConfig>[0],
);
```

If config may be missing in some environments, prefer rendering a harmless fallback workspace instead of crashing the Studio route.

### Publish and revalidation

If your app creates or updates content through the server helpers, add an authenticated route that:

- validates `BLOG_PUBLISH_API_SECRET`
- calls the publish helper
- revalidates the affected paths

Typical revalidation targets are:

- `/blog`
- the published URL
- `/sitemap.xml`

### Deployment notes

Some hosts treat `NEXT_PUBLIC_SANITY_*` values as secrets during scanning even though they are intentionally public. If your platform supports secret-scan allowlists, you may need to exempt these keys.

Example for Netlify:

```toml
[build.environment]
SECRETS_SCAN_OMIT_KEYS = "NEXT_PUBLIC_SANITY_API_VERSION,NEXT_PUBLIC_SANITY_DATASET,NEXT_PUBLIC_SANITY_PROJECT_ID"
```

### Production checklist

Before considering Studio setup complete, verify:

- `/studio` redirects to `/studio/production`
- `/studio/production` loads successfully
- missing env vars produce a clear setup state instead of a runtime crash
- Sanity images load from `cdn.sanity.io`
- publish flows revalidate the blog index and the affected page

## Release

```bash
npm run check
npm run build
npm run pack:dry-run
```

Tag-based npm publishing is wired through GitHub Actions. Publishing a tag like `v0.1.1` will run validation and publish the package with provenance enabled.
