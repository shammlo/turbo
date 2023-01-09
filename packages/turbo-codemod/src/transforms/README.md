# `@turbo/codemod` Transformers

## Adding new transformers

Add new transformers using the [plopjs](https://github.com/plopjs/plop) template by running:

```bash
pnpm add-transformer
```

New Transformers will be automatically surfaced to the `transform` CLI command and used by the `migrate` CLI command when appropriate.

## How it works

Transformers are loaded automatically from the `src/transforms/` directory via the [`loadTransforms`](../utils/loadTransforms.ts) function.

All new transformers must contain a default export that matches the [`Transformer`](../types.ts) type:

```ts
export type Transformer = {
  name: string;
  value: string;
  introducedIn: string;
  transform: (args: TransformArgs) => TransformResult;
};
```
