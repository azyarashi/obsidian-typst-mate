export function overwriteCustomElements(tagName: string, newCtor: CustomElementConstructor) {
  const registry = window.customElements;
  const existing = registry.get(tagName);

  if (!existing) {
    registry.define(tagName, newCtor);
    return { ctor: newCtor, upgraded: [] as Element[] };
  }

  const copyDescriptorsInPlace = (src: any, dst: any) => {
    for (const key of Reflect.ownKeys(src)) {
      if (key === 'constructor') continue;
      const desc = Object.getOwnPropertyDescriptor(src, key)!;
      try {
        Object.defineProperty(dst, key, desc);
      } catch {}
    }
  };

  copyDescriptorsInPlace(newCtor.prototype, existing.prototype);

  try {
    const newProtoProto = Object.getPrototypeOf(newCtor.prototype);
    const existingProtoProto = Object.getPrototypeOf(existing.prototype);
    if (newProtoProto !== existingProtoProto) {
      Object.setPrototypeOf(existing.prototype, newProtoProto);
    }
  } catch {}

  for (const key of Reflect.ownKeys(newCtor)) {
    if (key === 'prototype' || key === 'name' || key === 'length') continue;
    const desc = Object.getOwnPropertyDescriptor(newCtor, key)!;
    try {
      Object.defineProperty(existing, key, desc);
    } catch {}
  }

  try {
    Object.defineProperty(existing.prototype, 'constructor', {
      value: existing,
      writable: true,
      configurable: true,
      enumerable: false,
    });
  } catch {}

  const els = Array.from(document.getElementsByTagName(tagName));
  const observedAttrs: string[] = (existing as any).observedAttributes ?? [];
  const connectedCb = (existing.prototype as any).connectedCallback;
  const attrChangedCb = (existing.prototype as any).attributeChangedCallback;

  const upgraded: Element[] = [];
  for (const el of els) {
    if (Object.getPrototypeOf(el) !== existing.prototype) {
      try {
        Object.setPrototypeOf(el, existing.prototype);
      } catch {}
    }

    if ((el as Element).isConnected && typeof connectedCb === 'function') {
      try {
        connectedCb.call(el);
      } catch {}
    }

    if (observedAttrs.length > 0 && typeof attrChangedCb === 'function') {
      for (const attr of observedAttrs) {
        if ((el as Element).hasAttribute(attr)) {
          try {
            attrChangedCb.call(el, attr, null, (el as Element).getAttribute(attr));
          } catch {}
        }
      }
    }

    upgraded.push(el);
  }

  return { ctor: existing, upgraded };
}
