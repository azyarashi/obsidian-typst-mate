export function class_(c: string): MathClass | undefined {
    const i = CLASSES.binary_search_by_key(c, pair => pair.0).ok();
    return CLASSES[i]?.1;
}

export enum MathClass {
  Normal,
  Alphabetic,
  Binary,
  Closing,
  Diacritic,
  Fence,
  GlyphPart,
  Large,
  Opening,
  Punctuation,
  Relation,
  Space,
  Unary,
  Vary,
  Special,
}
