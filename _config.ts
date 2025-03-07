import lume from "lume/mod.ts";
import basePath from "lume/plugins/base_path.ts";
import date from "lume/plugins/date.ts";
import favicon from "lume/plugins/favicon.ts";
import feed from "lume/plugins/feed.ts";
import minifyHTML from "lume/plugins/minify_html.ts";
import nunjucks from "lume/plugins/nunjucks.ts";
import redirects from "lume/plugins/redirects.ts";
import slugifyUrls from "lume/plugins/slugify_urls.ts";
import transformImages from "lume/plugins/transform_images.ts";
import type { Page } from "lume/core/file.ts";

import processCJK from "./_extra/cjk.ts";
import markdownDigest from "./_extra/digest.ts";
import { getImageSize, slugify } from "./_extra/util.ts";

const site = lume({
  src: "./src",
  location: new URL("https://nostalgic-future.net/"),
});

site
  .copy("asset", "/")
  .copyRemainingFiles()
  .use(nunjucks())
  .use(date())
  .use(basePath())
  .use(redirects())
  .use(minifyHTML())
  .use(slugifyUrls())
  .use(transformImages())
  .use(favicon({ input: "/favicon.png" }))
  .use(feed({
    query: "type=note|log|music-log|track|photo",
    sort: "date=desc",
    limit: 1000,
    info: {
      title: "=site.title",
      description: "=site.description",
      lang: "zh",
    },
    items: {
      title: "=title",
      published: "=date",
      description: "=digest",
      lang: "zh",
    },
  }));

// Generate digest for markdown files with type of post
site.hooks.addMarkdownItPlugin(markdownDigest);

// Filter: CJK typography
site.filter("cjk", processCJK);

// Filter: turn phrase into a slug
site.filter("slug", slugify);

// Filter: filename with extension
site.filter(
  "with_ext",
  (path: string, ext: string) =>
    path.includes(".")
      ? `${path.slice(0, path.lastIndexOf("."))}.${ext}`
      : `${path}.${ext}`,
);

// Filter: sort by length of array attribute
site.filter(
  "sort_by_array",
  // deno-lint-ignore no-explicit-any
  (data: any[], attr: string) =>
    data.toSorted((a, b) => b[attr].length - a[attr].length),
);

// Filter: get image's dimension
site.filter("imageSize", getImageSize, true);

// Preprocess: add oldUrl to note pages
site.preprocess([".md"], (pages: Page[]) => {
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
