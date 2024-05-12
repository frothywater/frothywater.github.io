import { markdownIt } from "lume/deps/markdown_it.ts";

import { slugify, getImageSize } from "../../_extra/util.ts";

export const layout = "layouts/photo.njk";
export const type = "photo";

export default async function* ({ photos }) {
  for (const photo of photos) {
    const name = slugify(photo.file);
    const path = `/photo/image/${photo.file}`;
    const size = await getImageSize(path);

    const imagePart = `<img src="${path}" width="${size.width}" height="${size.height}">`;
    const textPart = markdownIt().render(photo.note || "");
    const rendered = `${imagePart}<br>${textPart}`;

    yield {
      url: `/photo/${name}/`,
      title: "📷",
      digest: photo.note,
      content: rendered,
      ...photo,
    };
  }
}
