# @typstmate/typst-syntax

This project is a TypeScript port of `typst-syntax` from [typst/typst](https://github.com/typst/typst) Modified.

## Installation

```sh
bun install @typstmate/typst-syntax
```

## Usage

```typescript
import { parse, type SyntaxNode } from "@typstmate/typst-syntax";

const code = "#let x = 1; x + 1";
const ast: SyntaxNode = parse(code);

console.log(ast);
```
