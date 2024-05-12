import { markdownIt } from "lume/deps/markdown_it.ts";

import { slugify } from "../../_extra/util.ts";

export const layout = "layouts/track.njk";
export const type = "track";

export default function* ({ tracks }) {
  for (const track of tracks) {
    const title = track.file.replace(/\.mp3$/, "");
    const name = slugify(title);

    const audioPart = `<audio src="/track/audio/${track.file}" controls style="inline-size: 100%;"></audio>`;
    const textPart = markdownIt().render(track.text || "");
    const rendered = `${audioPart}<br>${textPart}`;

    yield {
      url: `/track/${name}/`,
      title: "🎵 " + title,
      digest: track.text,
      content: rendered,
      ...track,
    };
  }
}
