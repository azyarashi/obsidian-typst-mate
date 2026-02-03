import { class_, MathClass } from '../unicode-math-class';

export function defaultMathClass(c: string): MathClass | undefined {
  switch (c) {
    case ':':
      return MathClass.Relation;

    case '⋯':
    case '⋱':
    case '⋰':
    case '⋮':
      return MathClass.Normal;

    case '.':
    case '/':
      return MathClass.Normal;

    case '\u{22A5}':
      return MathClass.Normal;

    case '⅋':
      return MathClass.Binary;
    case '⎰':
    case '⟅':
      return MathClass.Opening;
    case '⎱':
    case '⟆':
      return MathClass.Closing;

    case '⟇':
      return MathClass.Binary;

    case '،':
      return MathClass.Punctuation;

    default:
      return class_(c);
  }
}
