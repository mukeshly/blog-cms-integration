import { createSchemaTypes } from "genio-nextjs-sanity-kit/schemas";
import { getSanityEnvConfig, hasSanityConfig, requireSanityValue } from "genio-nextjs-sanity-kit/sanity";
import { createSiteToolkit } from "genio-nextjs-sanity-kit/site";

export type BlogCmsIntegrationOptions = {
  defaultAuthorName?: string;
  fallbackCategoryLabel?: string;
  fallbackImage?: string;
  includeCategory?: boolean;
  includeSiteSettings?: boolean;
  locale?: string;
  reservedRootSlugs?: string[];
  siteUrl?: string;
  studioBasePath?: string;
  studioTitle: string;
  timeZone?: string;
  useCdn?: boolean;
};

type SiteToolkit = ReturnType<typeof createSiteToolkit>;
type ToolkitImageSource = Parameters<SiteToolkit["getSanityImageUrl"]>[0];
type StudioWorkspaceConfig = {
  name: string;
  title: string;
  subtitle: string;
  projectId: string;
  dataset: string;
  basePath: string;
  plugins: unknown[];
  schema: {
    types: unknown[];
  };
};

export type StudioConfigOptions = {
  plugins?: unknown[];
  productionBasePath?: string;
  stagingBasePath?: string;
  stagingTitleSuffix?: string;
};

export function createBlogCmsIntegration(
  env: NodeJS.ProcessEnv,
  options: BlogCmsIntegrationOptions,
) {
  const sanity = getSanityEnvConfig({
    NEXT_PUBLIC_SANITY_API_VERSION: env.NEXT_PUBLIC_SANITY_API_VERSION,
    NEXT_PUBLIC_SANITY_DATASET: env.NEXT_PUBLIC_SANITY_DATASET,
    NEXT_PUBLIC_SANITY_PRODUCTION_DATASET: env.NEXT_PUBLIC_SANITY_PRODUCTION_DATASET,
    NEXT_PUBLIC_SANITY_PROJECT_ID: env.NEXT_PUBLIC_SANITY_PROJECT_ID,
    NEXT_PUBLIC_SANITY_STAGING_DATASET: env.NEXT_PUBLIC_SANITY_STAGING_DATASET,
    NEXT_PUBLIC_SANITY_STUDIO_TITLE: env.NEXT_PUBLIC_SANITY_STUDIO_TITLE,
    NODE_ENV: env.NODE_ENV,
  });

  const toolkit = createSiteToolkit({
    sanity: {
      apiVersion: sanity.apiVersion,
      dataset: sanity.dataset,
      projectId: sanity.projectId,
      useCdn: options.useCdn ?? env.NODE_ENV !== "development",
    },
    defaultAuthorName: options.defaultAuthorName,
    fallbackCategoryLabel: options.fallbackCategoryLabel,
    fallbackImage: options.fallbackImage,
    locale: options.locale,
    reservedRootSlugs: options.reservedRootSlugs,
    siteUrl: options.siteUrl,
    timeZone: options.timeZone,
  });

  const schemaTypes = createSchemaTypes({
    includeCategory: options.includeCategory ?? true,
    includeSiteSettings: options.includeSiteSettings ?? false,
  }) as unknown[];

  function createStudioWorkspaces(studioOptions: StudioConfigOptions = {}): StudioWorkspaceConfig[] {
    const projectId = requireSanityValue(
      sanity.projectId,
      "NEXT_PUBLIC_SANITY_PROJECT_ID",
    );
    const productionDataset = requireSanityValue(
      sanity.productionDataset,
      "NEXT_PUBLIC_SANITY_PRODUCTION_DATASET",
    );
    const stagingDataset = requireSanityValue(
      sanity.stagingDataset,
      "NEXT_PUBLIC_SANITY_STAGING_DATASET",
    );

    const plugins = studioOptions.plugins ?? [];
    const productionBasePath =
      studioOptions.productionBasePath ?? `${options.studioBasePath ?? "/studio"}/production`;
    const stagingBasePath =
      studioOptions.stagingBasePath ?? `${options.studioBasePath ?? "/studio"}/staging`;
    const stagingTitleSuffix = studioOptions.stagingTitleSuffix ?? "Staging";
    const schema = { types: schemaTypes };

    return [
      {
        name: productionDataset,
        title: options.studioTitle,
        subtitle: productionDataset,
        projectId,
        dataset: productionDataset,
        basePath: productionBasePath,
        plugins,
        schema,
      },
      {
        name: stagingDataset,
        title: `${options.studioTitle} ${stagingTitleSuffix}`,
        subtitle: stagingDataset,
        projectId,
        dataset: stagingDataset,
        basePath: stagingBasePath,
        plugins,
        schema,
      },
    ];
  }

  return {
    sanity: {
      ...sanity,
      hasConfig: hasSanityConfig(sanity),
      requireValue: requireSanityValue,
      studioTitle: options.studioTitle,
    },
    schemaTypes,
    media: {
      getSanityImageUrl: (
        source: ToolkitImageSource,
        width: number,
        height: number,
      ) => toolkit.getSanityImageUrl(source, width, height),
      getBlogCoverImageUrl: toolkit.getBlogCoverImageUrl,
      getPageBodyImageUrl: toolkit.getPageBodyImageUrl,
      getPageCoverImageUrl: toolkit.getPageCoverImageUrl,
    },
    blog: {
      getAllBlogPosts: toolkit.getAllBlogPosts,
      getBlogCoverImageUrl: toolkit.getBlogCoverImageUrl,
      getBlogPostByOldSlug: toolkit.getBlogPostByOldSlug,
      getBlogPostBySlug: toolkit.getBlogPostBySlug,
      getBlogPostPlainText: toolkit.getBlogPostPlainText,
      getBlogPostSlugs: toolkit.getBlogPostSlugs,
    },
    pages: {
      getAllSitePages: toolkit.getAllSitePages,
      getPageBodyImageUrl: toolkit.getPageBodyImageUrl,
      getPageCoverImageUrl: toolkit.getPageCoverImageUrl,
      getSitePageByOldSlug: toolkit.getSitePageByOldSlug,
      getSitePageBySlug: toolkit.getSitePageBySlug,
      getSitePagePlainText: toolkit.getSitePagePlainText,
      getSitePageSlugs: toolkit.getSitePageSlugs,
    },
    createStudioWorkspaces,
  };
}
