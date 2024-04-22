import lume from "lume/mod.ts";
import nunjucks from "lume/plugins/nunjucks.ts";
import date from "lume/plugins/date.ts";
import redirects from "lume/plugins/redirects.ts";
import slugifyUrls from "lume/plugins/slugify_urls.ts";
import transformImages from "lume/plugins/transform_images.ts";

import markdownDigest from "./_extra/digest.ts";

import { imageDimensionsFromData } from "npm:image-dimensions";
import { join } from "https://deno.land/std@0.223.0/path/mod.ts";
import { existsSync } from "https://deno.land/std@0.223.0/fs/mod.ts";

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

// Helper: get image's dimension and return img width and height attributes
site.helper("get_img_size", (path: string) => {
  const fullPath = join(site.src(), path);
  if (existsSync(fullPath) === false) return "";
  const data = Deno.readFileSync(fullPath);
  const result = imageDimensionsFromData(data);
  return result ? `width="${result.width}" height="${result.height}"` : "";
}, { type: "tag" });

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
