export function wrapWithTypcInline(text: string) {
  return `\`\`\`typc ${text}\`\`\``;
}

export function wrapWithTypcBlock(text: string) {
  return `\`\`\`typc\n${text}\n\`\`\``;
}
