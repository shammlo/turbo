import path from "path";
import fs from "fs";
import type { Transformer } from "../types";

// transforms/ is a sibling when built in in dist/
export const transformerDirectory = path.join(__dirname, "./transforms");

export default async function loadTransformers(): Promise<Array<Transformer>> {
  const transformerFiles = await fs.promises.readdir(transformerDirectory);
  return transformerFiles.map((transformerFilename) => {
    const transformerPath = path.join(
      transformerDirectory,
      transformerFilename
    );
    try {
      return require(transformerPath).default;
    } catch (e) {
      // we ignore this error because it's likely that the file is not a transformer (README, etc)
      return undefined
    }
  }).filter(Boolean);
}
