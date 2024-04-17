import lume from "lume/mod.ts";
import nunjucks from "lume/plugins/nunjucks.ts";
import date from "lume/plugins/date.ts";
import transformImages from "lume/plugins/transform_images.ts";

import markdownDigest from "./_extra/digest.ts";

const site = lume({
  src: "./src",
});

site
  .copy("style")
  .use(nunjucks())
  .use(date())
  .use(transformImages());

// Generate digest for markdown files with type of post
site.hooks.addMarkdownItPlugin(markdownDigest);

// Filter: filename with extension
site.filter(
  "with_ext",
  (path: string, ext: string) =>
    path.includes(".") ? `${path.split(".")[0]}.${ext}` : `${path}.${ext}`,
);

export default site;
