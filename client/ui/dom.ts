type Child = HTMLElement | string | null | false;

/** Build an element. Text always goes through textContent, never innerHTML. */
export function h(tag: string, className = '', ...children: Child[]): HTMLElement {
  const el = document.createElement(tag);
  if (className) el.className = className;
  for (const child of children) {
    if (child === null || child === false) continue;
    el.append(child);
  }
  return el;
}

export function byId<T extends HTMLElement = HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing #${id} in index.html`);
  return el as T;
}

export function setChildren(parent: HTMLElement, children: readonly Child[]): void {
  parent.replaceChildren(...children.filter((c): c is HTMLElement | string => c !== null && c !== false));
}
