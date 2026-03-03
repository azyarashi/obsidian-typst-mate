# Matrix

## mat / display (script)

`e.g. 3,3`

```js
const parts = input.split(",").map(s => s.trim());
const [x, y] = parts.map(Number)

const rowText = `${("#CURSOR, ".repeat(x)).slice(0, -2)} ;\n`;
const contentText = `  ${rowText}`.repeat(y);

return `mat(\n${contentText})`;
```

## matInline / inline (script)

`e.g. 3,3`

```js
const parts = input.split(",").map(s => s.trim());
const [x, y] = parts.map(Number)

const rowText = `${("#CURSOR, ".repeat(x)).slice(0, -2)} ;`;
const contentText = `${rowText}`.repeat(y);

return `mat(${contentText})`;
```
