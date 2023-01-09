import axios from "axios";
import { MigrateCommandOptions } from "../types";

const REGISTRY = "https://registry.npmjs.org";

async function getLatestVersion({
  to,
}: MigrateCommandOptions): Promise<{ version: string }> {
  if (to) {
    return Promise.resolve({ version: to });
  }

  try {
    const result = await axios.get(`${REGISTRY}/turbo`);
    const versions = result.data["dist-tags"];
    return { version: versions.latest as string };
  } catch (err) {
    throw new Error(
      `Unable to determine latest version of turbo - registry lookup failed - ${err}`
    );
  }
}

export default getLatestVersion;
