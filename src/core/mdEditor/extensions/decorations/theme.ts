import { EditorView } from '@codemirror/view';

export const typstTheme = EditorView.theme({
  // Math
  '.cm-math': {
    color: 'var(--color-base-100)',
  },

  // 独自
  '.cm-math .typ-id': {
    color: '#74747c !important',
  },
  '.cm-math .typ-bracket': {
    color: '#64c8c8',
  },
  '.cm-math .typ-brace': {
    color: '#c8c864',
  },
  '.cm-math .typ-paren': {
    color: '#c864c8',
  },

  '.cm-math .typ-bracket .typ-enclosing': {
    backgroundColor: 'rgba(65, 67, 67, 0.5)',
  },
  '.cm-math .typ-brace .typ-enclosing': {
    backgroundColor: 'rgba(225, 225, 125, 0.5)',
  },
  '.cm-math .typ-paren .typ-enclosing': {
    backgroundColor: 'rgba(225, 125, 225, 0.5)',
  },

  // Shebang, LineComment, BlockComment
  '.cm-math .typ-comment': {
    color: '#74747c',
  },
  // 括弧, Comma, Semicolon, Colon
  '.cm-math .typ-punct': {
    color: 'var(--color-base-100)',
  },
  // Linebreak, Escape, Shorthand
  '.cm-math .typ-escape': {
    color: '#1d6c76',
  },
  // Strong
  '.cm-math .typ-strong': {
    fontWeight: 'bold',
  },
  // Emph
  '.cm-math .typ-emph': {
    fontStyle: 'italic',
  },
  // Link
  '.cm-math .typ-link': {
    textDecoration: 'underline',
  },
  // Raw
  '.cm-math .typ-raw': {
    color: '#6b6b6f',
  },
  // Label
  '.cm-math .typ-label': {
    color: '#1d6c76',
  },
  // Ref
  '.cm-math .typ-ref': {
    color: '#1d6c76',
  },
  // Heading
  '.cm-math .typ-heading': {
    textDecoration: 'underline',
    fontWeight: 'bold',
  },
  // ListMarker, EnumMarker, TermMarker
  '.cm-math .typ-marker': {
    color: '#8b41b1',
  },
  // 親がTermItem かつ コロンの前
  '.cm-math .typ-term': {
    fontWeight: 'bold',
  },
  // Dollar
  '.cm-math .typ-math-delim': {
    color: '#198810',
  },
  // MathAlignPoint, MathAttach, MathFrac, Hat, Prime, Root
  '.cm-math .typ-math-op': {
    color: '#1d6c76',
  },
  // Not, And, Or, None, Auto, Let, Set, Show, Context, If, Else, For, In, While, Break, Continue, Return, Import, Include, As, Bool
  '.cm-math .typ-key': {
    color: '#d73948',
  },
  // Star, Plus, Minus, Slash, Eq, EqEq, ExclEq, Lt, LtEq, Gt, GtEq, PlusEq, HyphEq, StarEq, SlashEq, Dots, Arrow, Root
  '.cm-math .typ-op': {
    color: '#8b41b1',
  },
  // Int, Float, Numeric
  '.cm-math .typ-num': {
    color: '#b60157',
  },
  // Str
  '.cm-math .typ-str': {
    color: '#198810',
  },
  '.cm-math .typ-func': {
    color: '#4b69c6',
  },
  '.cm-math .typ-pol': {
    color: '#8b41b1',
  },
  '.cm-math .typ-error': {
    color: '#f00',
  },
});
