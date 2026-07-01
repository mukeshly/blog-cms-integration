import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";

import type {
  PortableTextBlock,
  PortableTextImage,
  PortableTextMarkDef,
  PortableTextNode,
  PortableTextSpan,
} from "@vibeshipteam/genio-nextjs-sanity-kit/types";

type PortableTextLinkMark = PortableTextMarkDef & {
  ctaDestinationType?: "internal_page" | "whatsapp" | "calendly" | "external_page";
  ctaPosition?: "mid" | "end";
  ctaVariantId?: string;
};

type BlogPortableTextBlock = PortableTextBlock & {
  children?: PortableTextSpan[];
  markDefs?: PortableTextLinkMark[];
};

export type NormalizeBlogArticleHrefOptions = {
  articleBasePath?: string;
  internalDomains?: string[];
  reservedRootSlugs?: string[];
  siteUrl?: string;
};

export type ExtractedBlogCta = {
  heading: string;
  description: string;
  buttonText: string;
  buttonUrl: string;
  variantId?: string;
  position?: "mid" | "end";
  destinationType?: "internal_page" | "whatsapp" | "calendly" | "external_page";
};

export type CreateBlogPortableTextComponentsOptions = NormalizeBlogArticleHrefOptions & {
  externalLinkRel?: string;
  figureClassName?: string;
  getImageUrl?: (source: PortableTextImage | null | undefined, width: number, height: number) => string | null;
  imageHeight?: number;
  imageSizes?: string;
  imageWidth?: number;
  inlineCaptionClassName?: string;
};

function normalizeBasePath(articleBasePath = "/blog") {
  const trimmed = articleBasePath.trim();
  if (!trimmed) {
    return "/blog";
  }

  const withLeadingSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return withLeadingSlash.replace(/\/+$/, "") || "/blog";
}

function getReservedInternalPaths(options: NormalizeBlogArticleHrefOptions) {
  const articleBasePath = normalizeBasePath(options.articleBasePath);
  const reservedSlugs = options.reservedRootSlugs || [];
  const reservedPaths = new Set<string>([
    "/",
    articleBasePath,
    ...reservedSlugs
      .map((slug) => slug.trim())
      .filter(Boolean)
      .map((slug) => (slug.startsWith("/") ? slug : `/${slug}`)),
  ]);

  return reservedPaths;
}

function getInternalDomains(options: NormalizeBlogArticleHrefOptions) {
  const domains = new Set<string>((options.internalDomains || []).map((domain) => domain.toLowerCase()));

  if (options.siteUrl) {
    try {
      const site = new URL(options.siteUrl);
      domains.add(site.hostname.toLowerCase());
    } catch {
      // Ignore invalid site URLs and fall back to explicit internalDomains only.
    }
  }

  return domains;
}

export function normalizeBlogArticleHref(
  href: string,
  options: NormalizeBlogArticleHrefOptions = {},
): string | null {
  const trimmed = href.trim();
  if (!trimmed) {
    return null;
  }

  const articleBasePath = normalizeBasePath(options.articleBasePath);
  const reservedPaths = getReservedInternalPaths(options);

  const normalizePathname = (pathname: string, search = "", hash = "") => {
    if (pathname.startsWith(`${articleBasePath}/`)) {
      return `${pathname}${search}${hash}`;
    }

    if (reservedPaths.has(pathname)) {
      return `${pathname}${search}${hash}`;
    }

    const segments = pathname.split("/").filter(Boolean);
    if (segments.length === 1) {
      return `${articleBasePath}/${segments[0]}${search}${hash}`;
    }

    return `${pathname}${search}${hash}`;
  };

  if (!trimmed.includes("://") && !trimmed.startsWith("/") && !trimmed.startsWith("#")) {
    return normalizePathname(`/${trimmed}`);
  }

  if (trimmed.startsWith("/")) {
    return normalizePathname(trimmed);
  }

  try {
    const url = new URL(trimmed);
    const internalDomains = getInternalDomains(options);
    if (internalDomains.has(url.hostname.toLowerCase())) {
      return normalizePathname(url.pathname, url.search, url.hash);
    }
  } catch {
    return null;
  }

  return null;
}

export function isExternalBlogHref(
  href: string,
  options: NormalizeBlogArticleHrefOptions = {},
) {
  return normalizeBlogArticleHref(href, options) === null;
}

function isPortableTextBlock(value: PortableTextNode | undefined): value is BlogPortableTextBlock {
  return Boolean(value && value._type === "block");
}

function getBlockText(block: BlogPortableTextBlock | undefined) {
  if (!block?.children?.length) {
    return "";
  }

  return block.children
    .map((child) => (typeof child.text === "string" ? child.text : ""))
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}

function getLastLinkMark(block: BlogPortableTextBlock | undefined): PortableTextLinkMark | null {
  if (!block?.children?.length || !block.markDefs?.length) {
    return null;
  }

  for (const child of block.children) {
    for (const markKey of child.marks || []) {
      const match = block.markDefs.find((markDef) => markDef?._key === markKey && typeof markDef?.href === "string");
      if (match) {
        return match;
      }
    }
  }

  return null;
}

function parseLegacyButtonBlock(text: string): { buttonText: string; buttonUrl: string } | null {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return null;
  }

  const labeledUrlMatch = normalized.match(/^(.*?):\s*((?:https?:\/\/|\/)\S+)$/i);
  if (labeledUrlMatch) {
    const [, label, url] = labeledUrlMatch;
    const buttonText = label.trim();
    const buttonUrl = url.trim();
    if (buttonText && buttonUrl) {
      return { buttonText, buttonUrl };
    }
  }

  const bareUrlMatch = normalized.match(/^((?:https?:\/\/|\/)\S+)$/i);
  if (bareUrlMatch) {
    return {
      buttonText: "Learn More",
      buttonUrl: bareUrlMatch[1].trim(),
    };
  }

  return null;
}

function isHeadingStyle(style: BlogPortableTextBlock["style"] | undefined) {
  return style === "h2" || style === "h3";
}

function isEmptyNormalBlock(value: PortableTextNode | undefined) {
  if (!isPortableTextBlock(value) || value.style !== "normal") {
    return false;
  }

  return getBlockText(value).length === 0;
}

export function extractTrailingBlogCta(value: PortableTextNode[]): {
  body: PortableTextNode[];
  cta: ExtractedBlogCta | null;
} {
  if (!Array.isArray(value)) {
    return { body: [], cta: null };
  }

  let endIndex = value.length;
  while (endIndex > 0 && isEmptyNormalBlock(value[endIndex - 1])) {
    endIndex -= 1;
  }

  if (endIndex < 3) {
    return { body: value, cta: null };
  }

  const lastThree = value.slice(endIndex - 3, endIndex);
  const [headingBlock, descriptionBlock, buttonBlock] = lastThree;

  if (!isPortableTextBlock(headingBlock) || !isPortableTextBlock(descriptionBlock) || !isPortableTextBlock(buttonBlock)) {
    return { body: value, cta: null };
  }

  if (!isHeadingStyle(headingBlock.style) || descriptionBlock.style !== "normal" || buttonBlock.style !== "normal") {
    return { body: value, cta: null };
  }

  const heading = getBlockText(headingBlock);
  const description = getBlockText(descriptionBlock);
  const linkMark = getLastLinkMark(buttonBlock);
  const legacyButton = parseLegacyButtonBlock(getBlockText(buttonBlock));
  const buttonText = typeof linkMark?.href === "string" ? getBlockText(buttonBlock) : (legacyButton?.buttonText || "");
  const buttonUrl = typeof linkMark?.href === "string" ? linkMark.href.trim() : (legacyButton?.buttonUrl || "");

  if (!heading || !description || !buttonText || !buttonUrl) {
    return { body: value, cta: null };
  }

  return {
    body: value.slice(0, endIndex - 3),
    cta: {
      heading,
      description,
      buttonText,
      buttonUrl,
      variantId: typeof linkMark?.ctaVariantId === "string" ? linkMark.ctaVariantId : undefined,
      position: linkMark?.ctaPosition === "mid" ? "mid" : "end",
      destinationType:
        linkMark?.ctaDestinationType === "internal_page"
        || linkMark?.ctaDestinationType === "whatsapp"
        || linkMark?.ctaDestinationType === "calendly"
        || linkMark?.ctaDestinationType === "external_page"
          ? linkMark.ctaDestinationType
          : undefined,
    },
  };
}

export function createBlogPortableTextComponents(
  options: CreateBlogPortableTextComponentsOptions = {},
) {
  const imageWidth = options.imageWidth || 1400;
  const imageHeight = options.imageHeight || 900;
  const imageSizes = options.imageSizes || "(min-width: 1024px) 60rem, 100vw";
  const externalLinkRel = options.externalLinkRel || "noopener noreferrer";

  return {
    block: {
      h2: ({ children }: { children?: ReactNode }) => children ? <h2>{children}</h2> : null,
      h3: ({ children }: { children?: ReactNode }) => children ? <h3>{children}</h3> : null,
      blockquote: ({ children }: { children?: ReactNode }) => children ? <blockquote>{children}</blockquote> : null,
      normal: ({ children }: { children?: ReactNode }) => children ? <p>{children}</p> : null,
    },
    list: {
      bullet: ({ children }: { children?: ReactNode }) => children ? <ul>{children}</ul> : null,
      number: ({ children }: { children?: ReactNode }) => children ? <ol>{children}</ol> : null,
    },
    marks: {
      link: ({
        children,
        value,
      }: {
        children?: ReactNode;
        value?: { href?: string };
      }) => {
        const href = value?.href || "#";
        const internalHref = normalizeBlogArticleHref(href, options);

        if (internalHref) {
          return <Link href={internalHref}>{children}</Link>;
        }

        const isExternal = /^https?:\/\//i.test(href);
        return (
          <a href={href} target={isExternal ? "_blank" : undefined} rel={isExternal ? externalLinkRel : undefined}>
            {children}
          </a>
        );
      },
    },
    types: {
      image: ({ value }: { value?: PortableTextImage }) => {
        const directUrl = typeof value?._seoImageUrl === "string" && value._seoImageUrl.trim()
          ? value._seoImageUrl.trim()
          : typeof value?.url === "string" && value.url.trim()
            ? value.url.trim()
            : null;
        const imageUrl = directUrl || options.getImageUrl?.(value, imageWidth, imageHeight) || null;
        if (!imageUrl) {
          return null;
        }

        return (
          <figure className={options.figureClassName}>
            <Image
              src={imageUrl}
              alt={value?.alt || "Article image"}
              width={imageWidth}
              height={imageHeight}
              sizes={imageSizes}
            />
            {value?.alt ? <figcaption className={options.inlineCaptionClassName}>{value.alt}</figcaption> : null}
          </figure>
        );
      },
    },
  };
}
