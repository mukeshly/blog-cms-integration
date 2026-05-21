import "server-only";
import { createPublishToolkit } from "@vibeshipteam/genio-nextjs-sanity-kit/site/server";

export function createBlogCmsPublisher(env: NodeJS.ProcessEnv) {
  return createPublishToolkit(env);
}
