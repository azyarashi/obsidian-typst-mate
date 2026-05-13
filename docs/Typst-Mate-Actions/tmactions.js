/** @see https://github.com/azyarashi/obsidian-typst-mate/tree/main/docs/Typst-Mate-Actions/README.md */

const markdown = [
  // Enter math (remove either these or LaTeX Suite's)
  {trigger: 'mk', action: '\${} $1 {}$'},
  {r: 'H', trigger: 'dm', action: '$$\n$1\n$$', e: 'l', p: 1},
  {trigger: 'dm', action: '\n$$\n$1\n$$', e: 'l'},


  // Enter codeblcok
  {r: 'H', trigger: 'typst', action: '```typst\n$1\n```', e: 'l'},
].map(a => {return {...a, c: 'md'}})

const typstMath = [
    // Greek letters (@b -> beta) (:ab -> beta.alt)
  ...['alpha', 'beta', 'chi',
    'delta',
    'epsilon',
    'gamma',
    'iota',
    'kappa',
    'lambda',
    'mu',
    'nu',
    'omega',
    'phi',
    'rho',
    'sigma',
    'theta',
    'upsilon',
    'xi',
    'zeta',
  ].flatMap((name) => {
    const initial = name.charAt(0);
    return [
      { trigger: `@${initial}`, action: name },
      { trigger: `@${initial.toUpperCase()}`, action: name },
    ];
  }),
  ...['eta', 'omicron', 'psi', 'tau'].flatMap((name) => {
    const initial = name.charAt(0);
    return [
      { trigger: `@j${initial}`, action: name },
      { trigger: `@j${initial.toUpperCase()}`, action: name },
    ];
  }),
  ...['Theta', 'Pi', 'beta', 'epsilon', 'kappa', 'phi', 'rho', 'sigma', 'theta'].map((name) => {
    return { trigger: `:a${name.charAt(0)}`, action: `${name}.alt` };
  }),

  // Operator
  ...['lim', 'inf', 'sup', 'liminf', 'limsup'].map((op) => {return {trigger: { t: 'complete', v: op }, action: `${op}_($1)`, e: 'TODO'}}),
  ...['cos', 'sin', 'tan', 'sec', 'csc', 'cot', 'arccos', 'arcsin', 'arctan', 'cosh', 'sinh', 'tanh', 'sech', 'csch', 'coth', 'sinc', 'tg', 'ctg',
    'lg', 'ln', 'log', 'exp', 'deg',
    'tr', 'det',
    'dim', 'hom', 'id', 'im', 'ker',
    'gcd', 'lcm',
    'Pr',
  ].map((op) => {return {trigger: {t: 'complete', v: op}, action: `${op}($1)`}}),
  // id, hom, ker, im, dim, tr, det, deg
  ...['max', 'min'].map((op) => {return { trigger: { t: 'complete', v: op }, action: `${op}{$1}`}}),

  // Spacing
  ...['thin', 'med', 'thick', 'quad', 'wide'].map((s) => {return {trigger: {t: 'complete', v: s}, action: `${s} `}}),

  // Long Press
  // Cancel
  {trigger: '!', action: 'cancel($1)', e: 's'},
  // Left/Right
  {trigger: 'l', action: 'lr($1)'},
  {trigger: 'a', action: 'abs($1)', e: 's'},
  {trigger: 'n', action: 'norm($1)', e: 's'},
  {trigger: 'f', action: 'floor($1)', e: 's'},
  {trigger: 'c', action: 'ceil($1)', e: 's'},
  {trigger: 'e', action: 'round($1)', e: 's'},
  // Roots
  {trigger: '2', action: 'sqrt($1)', e: 's'},
  {trigger: '3', action: 'root(3, $1)', e: 's'},
  // Stretch
  {trigger: '^', action: 'stretch($1)^"#.1" #.2'},
  {trigger: '_', action: 'stretch($1)_"#.1" #.2'},
  // Styles
  {trigger: 'u', action: 'upright($1)', e: 's'},
  {trigger: 'i', action: 'italic($1)', e: 's'},
  {trigger: 'b', action: 'bold($1)', e: 's'},
  // Under/Over
  {trigger: 'U', action: 'underbrace($1, "$2")', e: 's'},
  {trigger: 'O', action: 'overbrace($1, "$2")', e: 's'},
  // Variants
  {trigger: 's', action: 'sans($1)', e: 's'},
  {trigger: 'F', action: 'frak($1)', e: 's'},
  {trigger: 'M', action: 'mono($1)', e: 's'},
  {trigger: 'B', action: 'bb($1)', e: 's'},
  {trigger: 'C', action: 'cal($1)', e: 's'},
  {trigger: 'S', action: 'scr($1)', e: 's'},
]
const typstMarkup = [

].map(a => {return {...a, c: ['typ']}})

const typstMarkupAndCode = [

].map(a => {return {...a, c: ['typ', 'typc'], e: 'sH'}})

const snippets = [...markdown, ...typstMath, ...typstMarkup, ...typstMarkupAndCode,
  /* Typst (Markup Mode) */
  // Enter math
  { trigger: 'mk', action: '$$1$', c: 'typ' },
  { trigger: 'dm', action: '$\n  $1\n$', c: 'typ' },

  // Define
  { r: 'H', trigger: 'text', action: '#set text($1)', c: 'typ', e: 'l' },
  { r: 'H', trigger: 'op', action: '#let $1 = math.op("$1")', c: 'typ', e: 'l' },
  { r: 'H', trigger: 'class', action: '#let $1 = math.class("#.1", #.2)', c: 'typ', e: 'l' },

  /* Typst (Code Mode) */
  /** alignment
   * @see https://typst.app/docs/reference/layout/alignment/
   * stop -> start + top
   */
  ...['start', 'end', 'left', 'center', 'right'].flatMap((h) =>
    ['top', 'horizon', 'bottom'].map((v) => ({ trigger: `${h[0]}${v}`, action: `${h} + ${v}`, c: 'typc' })),
  ),

  /* Typst (Markup & Code) */
  {r: 'H', trigger: 'half', action: 'let ${1:half} = $2 / 2', c: ['typ', 'typc'], e: 'HB'},
  {r: 'H', trigger: 'third', action: 'let ${1:third} = $2 / 3', c: ['typ', 'typc'], e: 'HB'},
  {r: 'H', trigger: 'quarter', action: 'let ${1:quarter} = $2 / 4', c: ['typ', 'typc'], e: 'HB'},

  {r: 'H', trigger: '```', action: '```$1\n```', c: ['typ', 'typc'], e: 'H'},

  {trigger: { t: 'regex', v: '=(\\d)' }, action: (match) => `${'='.repeat(Number(match[1]))} $0`, c: ['typ']},

  {trigger: '^^^', action: 'super[$1]', c: ['typ', 'typc'], e: 'HB'},
  {trigger: '___', action: 'sub[$1]', c: ['typ', 'typc'], e: 'HB'},

  // Long Press
  {trigger: '!', action: 'strike[$1]', c: ['typ', 'typc'], e: 'HB'},
  {trigger: 'b', action: 'strong[$1]', c: ['typ', 'typc'], e: 'HB'},
  {trigger: 'i', action: 'emph[$1]', c: ['typ', 'typc'], e: 'HB'},
  {trigger: 'u', action: 'underline[$1]', c: ['typ', 'typc'], e: 'HB'},
  {trigger: 'o', action: 'overline[$1]', c: ['typ', 'typc'], e: 'HB'},
  {trigger: 'h', action: 'highlight[$1]', c: ['typ', 'typc'], e: 'HB'},
  {trigger: 's', action: 'smallcaps[$1]', c: ['typ', 'typc'], e: 'HB'},
];

const hotkeys = [
  // tab jump

  // zoom

  // history
  // selection
]

export default [...snippets, ...hotkeys]

/** Typst Mate Actions
 * `c` (contexts): List of contexts where the action is active. Defaults to ['typm'].
 *   - `md`: Markdown, `mjx`: MathJax
 *   - `typ`: Typst Markup, `typc`: Typst Code, `typm`: Typst Math
 *   - `plain`: Plain Typst (Comment, Str, Raw, etc.)
 *
 * `r` (restrictions):
 *   - `H`: Start of line only, `E`: End of line only
 *   - `i`/`b`: Inline/Block math only (Typst)
 *   - `I`/`D`: Inline/Display math only (Markdown)
 *   - `M`: MarkdownView only, `t`: .typ editor only
 *   - `V`: Vim normal mode as well
 *
 * `e` (extras):
 *   - `C`: show completions after execution
 *   - `B`: insert space before the inserted text
 *   - `l`: add a newline and tabstop after the inserted text
 *   - `s`: add a space and tabstop after the inserted text
 *   - `H`: if markup, prepend `#` to the inserted text
 *
 * trigger:
 *   - full form: `{t: 'hotkey' | 'long-press' | 'type' | 'regex' | 'complete', v: string}`
 *   - 1 char string: maps to `long-press`
 *   - multi char string: maps to `type`
 *
 * action:
 *   - full form: `{t: 'snippet' | 'script' | 'commands', v: string | ScriptFn}`
 *   - `string`: maps to 'snippet'
 *   - `ScriptFn`: maps to 'script'
 *
 * Some options not listed here do exist, but they are experimental and should not be used.
 */