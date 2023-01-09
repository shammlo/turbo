import chalk from "chalk";
import { UtilityArgs } from "../types";

export default class Logger {
  transform: string;
  dry: boolean;

  constructor(args: UtilityArgs) {
    this.transform = args.transformer;
    this.dry = args.dry;
  }
  modified(...args: any[]) {
    console.log(
      chalk.green.inverse(` MODIFIED `),
      ...args,
      this.dry ? chalk.dim(`(dry run)`) : ""
    );
  }
  unchanged(...args: any[]) {
    console.log(
      chalk.gray.inverse(` UNCHANGED `),
      ...args,
      this.dry ? chalk.dim(`(dry run)`) : ""
    );
  }
  skipped(...args: any[]) {
    console.log(
      chalk.yellow.inverse(` SKIPPED `),
      ...args,
      this.dry ? chalk.dim(`(dry run)`) : ""
    );
  }
  error(...args: any[]) {
    console.log(
      chalk.red.inverse(` ERROR `),
      ...args,
      this.dry ? chalk.dim(`(dry run)`) : ""
    );
  }
  info(...args: any[]) {
    console.log(
      chalk.white.inverse(` INFO `),
      ...args,
      this.dry ? chalk.dim(`(dry run)`) : ""
    );
  }
}
