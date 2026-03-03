import '@typstmate/typst-syntax';

declare module '@typstmate/typst-syntax' {
  export enum SyntaxMode {
    Markup,
    Math,
    Code,
    Opaque,
  }
}
