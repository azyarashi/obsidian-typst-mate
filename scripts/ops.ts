import type { SymbolData } from './symbols';

const difs = ['dif', 'Dif'].map((name) => ({
  sym: name,
  unicName: '',
  name: name,
  shorthand: null,
  mathClass: 'Op',
  latexName: '',
})) as SymbolData[];

const limits = ['det', 'gcd', 'lcm', 'inf', 'lim', 'liminf', 'limsup', 'max', 'min', 'Pr', 'sup'].map((name) => ({
  sym: name,
  unicName: '',
  name: name,
  shorthand: null,
  mathClass: 'op',
  latexName: '',
})) as SymbolData[];

const others = [
  'arccos',
  'arcsin',
  'arctan',
  'arg',
  'cos',
  'cosh',
  'cot',
  'coth',
  'csc',
  'csch',
  'ctg',
  'deg',
  'dim',
  'exp',
  'hom',
  'id',
  'im',
  'inf',
  'ker',
  'lg',
  'ln',
  'log',
  'mod',
  'sec',
  'sech',
  'sin',
  'sinc',
  'sinh',
  'tan',
  'tanh',
  'tg',
  'tr',
].map((name) => ({
  sym: name,
  unicName: '',
  name: name,
  shorthand: null,
  mathClass: 'op',
  latexName: '',
})) as SymbolData[];

const spacings = [
  ['thin', 'thin (1/6 em)'],
  ['med', 'medium (2/9 em)'],
  ['thick', 'thick (5/18 em)'],
  ['quad', 'quad (1 em)'],
  ['wide', 'wide (2 em)'],
].map(([name, desc]) => ({
  sym: name,
  unicName: '',
  name: desc,
  shorthand: null,
  mathClass: 'spacing',
  latexName: '',
})) as SymbolData[];

export const ops = [...difs, ...limits, ...others, ...spacings];

// 参照: https://github.com/typst/typst/blob/main/crates/typst-library/src/math/mod.rs
// 参照: https://github.com/typst/typst/blob/main/crates/typst-library/src/math/op.rs
