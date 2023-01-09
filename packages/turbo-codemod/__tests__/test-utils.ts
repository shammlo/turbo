import { v4 as uuidv4 } from "uuid";
import path from "path";
import fs from "fs-extra";

function getFixturePath({ fixture }: { fixture: string }) {
  const fixturesDirectory = path.join(__dirname, "__fixtures__");
  return path.join(fixturesDirectory, fixture);
}

/*
  To test transforms:
  1. create a temporary directory, x
  2. copy the target fixture to x
  3. run the transformer against x
  4. verify the output of the transform
  5. remove
*/
function testTransform({ fixture }: { fixture: string }) {
  const testDirectoryName = uuidv4();
  const testDirectory = path.join(__dirname, testDirectoryName);

  if (!fs.existsSync(testDirectory)) {
    fs.mkdirSync(testDirectory);
  }

  // copy fixture to test directory
  fs.copySync(getFixturePath({ fixture }), testDirectory, { recursive: true });

  // helpers
  const read = (filename: string) => {
    try {
      return fs.readFileSync(path.join(testDirectory, filename), "utf8");
    } catch (e) {
      return undefined;
    }
  };
  const cleanup = () =>
    fs.rmSync(testDirectory, { recursive: true, force: true });

  return { root: testDirectory, read, cleanup };
}

export { testTransform };
