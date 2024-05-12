import Cache from "lume/core/cache.ts";

import { existsSync } from "https://deno.land/std@0.223.0/fs/mod.ts";
import { imageDimensionsFromData } from "npm:image-dimensions";
import { join } from "lume/deps/path.ts";

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const cache = new Cache({ folder: "src/_cache" });
export const getImageSize = async (path: string) => {
  const fullPath = join("src", path);
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
};
