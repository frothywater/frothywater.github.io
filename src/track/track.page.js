import { slugify } from "../../_extra/util.ts";

export const layout = "layouts/track.njk";
export const type = "track";

export default function* ({ tracks }) {
  for (const track of tracks) {
    const title = track.file.replace(/\.mp3$/, "");
    const name = slugify(title);
    yield {
      url: `/track/${name}`,
      title,
      digest: track.text,
      content: track.text,
      ...track,
    };
  }
}
