export function overwriteCustomElements(tagName: string, newCtor: CustomElementConstructor) {
  const registry = window.customElements;
  const existing = registry.get(tagName);

  if (!existing) {
    registry.define(tagName, newCtor);
    return;
  }

  // すべてのプロパティとシンボルを取得
  const copyAllProps = (src: any, dst: any) => {
    const keys = Object.getOwnPropertyNames(src).concat(Object.getOwnPropertySymbols(src) as any);
    for (const k of keys) {
      if (k === 'constructor') continue;
      try {
        const desc = Object.getOwnPropertyDescriptor(src, k);
        if (desc) Object.defineProperty(dst, k, desc);
      } catch (err) {
        console.warn(`Failed to copy property ${String(k)}:`, err);
      }
    }
  };

  // プロトタイプチェーン全体をコピー
  const copyPrototypeChain = (newProto: any, existingProto: any) => {
    // 現在のレベルのプロパティをコピー
    copyAllProps(newProto, existingProto);

    // 親プロトタイプが存在し、かつHTMLElementでない場合は再帰的にコピー
    const newParent = Object.getPrototypeOf(newProto);
    const existingParent = Object.getPrototypeOf(existingProto);

    if (newParent && existingParent && newParent !== HTMLElement.prototype && newParent !== Object.prototype) {
      copyPrototypeChain(newParent, existingParent);
    }
  };

  // プロトタイプチェーン全体をコピー
  copyPrototypeChain(newCtor.prototype, existing.prototype);

  // 静的プロパティをコピー
  const staticKeys = Object.getOwnPropertyNames(newCtor).filter((k) => !['length', 'name', 'prototype'].includes(k));
  for (const k of staticKeys) {
    try {
      const desc = Object.getOwnPropertyDescriptor(newCtor, k);
      if (desc) {
        Object.defineProperty(existing, k, desc);
      }
    } catch (err) {
      console.warn(`Failed to copy static property ${k}:`, err);
    }
  }

  // observedAttributes の更新
  if ((newCtor as any).observedAttributes) {
    Object.defineProperty(existing, 'observedAttributes', {
      get() {
        return (newCtor as any).observedAttributes;
      },
      configurable: true,
    });
  }

  // コンストラクタ参照を更新
  try {
    Object.defineProperty(existing.prototype, 'constructor', {
      value: existing,
      writable: true,
      configurable: true,
    });
  } catch {}

  // 既存のDOM要素を再初期化
  const els = Array.from(document.querySelectorAll(tagName));
  const observed = (newCtor as any).observedAttributes ?? [];

  for (const el of els) {
    // プロトタイプを強制的に更新
    Object.setPrototypeOf(el, existing.prototype);

    // disconnectedCallbackがあれば呼び出してクリーンアップ
    if (typeof (el as any).disconnectedCallback === 'function') {
      try {
        (el as any).disconnectedCallback();
      } catch (err) {
        console.warn('disconnectedCallback error during reload:', err);
      }
    }

    // connectedCallbackを再度呼び出して初期化
    if (el.isConnected && typeof (existing.prototype as any).connectedCallback === 'function') {
      try {
        (existing.prototype as any).connectedCallback.call(el);
      } catch (err) {
        console.error('connectedCallback error during reload:', err);
      }
    }

    // attributeChangedCallbackを呼び出して属性を再処理
    if (observed.length > 0 && typeof (existing.prototype as any).attributeChangedCallback === 'function') {
      for (const attr of observed) {
        if (!el.hasAttribute(attr)) continue;
        try {
          (existing.prototype as any).attributeChangedCallback.call(el, attr, null, (el as Element).getAttribute(attr));
        } catch (err) {
          console.error('attributeChangedCallback error during reload:', err);
        }
      }
    }
  }
}
