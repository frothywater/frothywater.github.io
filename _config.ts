import lume from "lume/mod.ts";
import nunjucks from "lume/plugins/nunjucks.ts";
import date from "lume/plugins/date.ts";
import redirects from "lume/plugins/redirects.ts";
import slugifyUrls from "lume/plugins/slugify_urls.ts";
import transformImages from "lume/plugins/transform_images.ts";

import markdownDigest from "./_extra/digest.ts";
import { Page } from "lume/core/file.ts";

const site = lume({
  src: "./src",
});

site
  .copyRemainingFiles()
  .use(nunjucks())
  .use(date())
  .use(redirects())
  .use(slugifyUrls())
  .use(transformImages());

// Generate digest for markdown files with type of post
site.hooks.addMarkdownItPlugin(markdownDigest);

// Filter: turn phrase into a slug
site.filter("slug", (phrase: string) =>
  phrase
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, ""));

// Filter: filename with extension
site.filter(
  "with_ext",
  (path: string, ext: string) =>
    path.includes(".") ? `${path.split(".")[0]}.${ext}` : `${path}.${ext}`,
);

// Preprocess: add oldUrl to note pages
site.preprocess([".md"], (pages) => {
  for (const page of pages) {
    if (page.data.type === "note") {
      const year = page.data.date.getFullYear();
      const month = page.data.date.getMonth()! + 1;
      const day = page.data.date.getDate();
      const slug = page.data.basename;
      page.data.oldUrl = `/${year}/${month.toString().padStart(2, "0")}/${
        day.toString().padStart(2, "0")
      }/${slug}/`;
    }
  }
});

export default site;
