import fs from 'fs-extra';

function defaultWriter(filePath: string, contents: string): void {
  return fs.writeFileSync(filePath, contents);
}

export {
  defaultWriter
}

