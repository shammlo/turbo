import chalk from "chalk";
import inquirer from "inquirer";

import loadTransformers from "../../utils/loadTransformers";
import checkGitStatus from "../../utils/checkGitStatus";
import directoryInfo from "../../utils/directoryInfo";
import type { TransformCommandOptions, TransformCommandArgument } from "./types";
import TransformerRunner from "../../runner/Runner";

export default async function transform(
  transform: TransformCommandArgument,
  directory: TransformCommandArgument,
  options: TransformCommandOptions
) {
  const transforms = await loadTransformers();
  if (options.list) {
    console.log(
      transforms
        .map((transform) => `- ${chalk.cyan(transform.value)}`)
        .join("\n")
    );
    process.exit(0);
  }

  // check git status
  if (!options.dry) {
    checkGitStatus(options.force);
  }

  // validate transforms
  const transformKeys = transforms.map((transform) => transform.value);
  if (transform && !transformKeys.includes(transform)) {
    console.error(
      `Invalid transform choice ${chalk.dim(`(${transform})`)}, pick one of:`
    );
    console.error(transformKeys.map((key) => `- ${key}`).join("\n"));
    process.exit(1);
  }

  const answers = await inquirer.prompt<{
    directoryInput?: string;
    transformerInput?: string;
  }>([
    {
      type: "input",
      name: "directoryInput",
      message: "Where is the root of the repo where the transform should run?",
      when: !directory,
      default: ".",
      validate: (directory: string) => {
        const { exists, absolute } = directoryInfo({ directory });
        if (exists) {
          return true;
        } else {
          return `Directory ${chalk.dim(`(${absolute})`)} does not exist`;
        }
      },
      filter: (directory: string) => directory.trim(),
    },
    {
      type: "list",
      name: "transformerInput",
      message: "Which transform would you like to apply?",
      when: !transform,
      pageSize: transforms.length,
      choices: transforms,
    },
  ]);

  const {
    directoryInput: selectedDirectory = directory as string,
    transformerInput: selectedTransformer = transform as string,
  } = answers;
  const { exists, absolute: root } = directoryInfo({
    directory: selectedDirectory,
  });
  if (!exists) {
    console.error(`Directory ${chalk.dim(`(${root})`)} does not exist`);
    process.exit(1);
  }

  const transformData = transforms.find(
    (transform) => transform.value === selectedTransformer
  );

  if (!transformData) {
    console.log(`No transform found matching ${selectedTransformer}`);
    process.exit(0);
  }

  // run the transform
  const result = transformData.transformer({
    root,
    options,
  });

  if (result.fatalError) {
    // Runner already logs this, so we can just exit
    process.exit(1);
  }

  TransformerRunner.logResults(result);
}
