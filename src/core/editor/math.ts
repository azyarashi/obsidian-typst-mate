class MathObject {
  kind: 'inline' | 'display' | null = null;

  startOffset = 0;
  endOffset = 0;

  constructor() {}

  deactivate() {
    this.kind = null;
  }

  activate(kind: 'inline' | 'display', startOffset: number, endOffset: number) {
    this.kind = kind;
    this.startOffset = startOffset;
    this.endOffset = endOffset;
  }
}

export default MathObject;
