import Cache from "lume/core/cache.ts";
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

import processCJK from "./_extra/cjk.ts";
import markdownDigest from "./_extra/digest.ts";
import { slugify } from "./_extra/util.ts";

import { existsSync } from "https://deno.land/std@0.223.0/fs/mod.ts";
import { imageDimensionsFromData } from "npm:image-dimensions";

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
    query: "type=note|log|music-log",
    sort: "date=desc",
    limit: 1000,
    info: {
      title: "=site.title",
      description: "=site.description",
      lang: "zh",
    },
    items: {
      title: "=title",
      description: "=digest",
      published: "=date",
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
const cache = new Cache({ folder: site.src("_cache") });
site.filter("imageSize", async (path: string) => {
  const fullPath = site.src(path);
  if (existsSync(fullPath) === false) return "";

  const cached = await cache.getText("imageSize", fullPath);
  if (cached) return JSON.parse(cached);

  const data = Deno.readFileSync(fullPath);
  const result = imageDimensionsFromData(data);
  if (!result) return null;
  const { width, height } = result;

  console.log(`[image-size]: ${path}: ${width}x${height}`);
  await cache.set("imageSize", fullPath, JSON.stringify({ width, height }));

  return { width, height };
}, true);

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
