/**
 * Insertion of user-authored Typst into a processor's format string.
 *
 * This lives apart from the element that calls it so it can be tested without
 * loading `obsidian`, which has no runtime outside the app.
 */

/** The placeholder a processor format string uses to mark the code position. */
export const CODE_PLACEHOLDER = '{CODE}';

/**
 * Substitute `source` into `format` at `{CODE}`, inserting it verbatim.
 *
 * `source` is user-authored Typst, not a replacement template, so it must not be
 * passed to `String.prototype.replace` as a replacement *string*: that form
 * scans for `$` substitution patterns and rewrites the code before the compiler
 * ever sees it.
 *
 * | in the block | as a replacement string | verbatim |
 * | ------------ | ----------------------- | -------- |
 * | `$$`         | `$`                     | `$$`     |
 * | `$&`         | the matched `{CODE}`    | `$&`     |
 * | `` $` ``     | the text before `{CODE}`| `` $` `` |
 * | `$'`         | the text after `{CODE}` | `$'`     |
 *
 * An empty Typst equation `$$` — the natural way to give a fletcher node an
 * invisible label — therefore reached the compiler as a lone `$` and failed to
 * parse with "unclosed delimiter". A replacer *function* returns its value
 * literally, which is the only form that inserts `source` unchanged.
 *
 * @param format the processor's format string
 * @param source the block's Typst source, inserted exactly as written
 * @param useReplaceAll replace every placeholder rather than only the first
 */
export function substituteCode(format: string, source: string, useReplaceAll = false): string {
  const replacer = () => source;

  return useReplaceAll ? format.replaceAll(CODE_PLACEHOLDER, replacer) : format.replace(CODE_PLACEHOLDER, replacer);
}
