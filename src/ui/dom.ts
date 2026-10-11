/** Tiny DOM helpers. No framework. */

export interface Props {
  class?: string;
  testid?: string;
  text?: string;
  html?: never;
  attrs?: Record<string, string>;
  style?: Record<string, string>;
  onClick?: (ev: MouseEvent) => void;
  disabled?: boolean;
}

export type Child = Node | string | null | undefined | false;

export function h<K extends keyof HTMLElementTagNameMap>(tag: K, props: Props = {}, ...children: Child[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (props.class) el.className = props.class;
  if (props.testid) el.dataset['testid'] = props.testid;
  if (props.text !== undefined) el.textContent = props.text;
  if (props.attrs) for (const [k, v] of Object.entries(props.attrs)) el.setAttribute(k, v);
  if (props.style) for (const [k, v] of Object.entries(props.style)) el.style.setProperty(k, v);
  if (props.onClick) el.addEventListener('click', props.onClick as EventListener);
  if (props.disabled && 'disabled' in el) (el as unknown as HTMLButtonElement).disabled = true;
  for (const c of children) {
    if (c === null || c === undefined || c === false) continue;
    el.append(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  return el;
}

export function clear(el: Element): void {
  while (el.firstChild) el.removeChild(el.firstChild);
}

export function must<T extends Element>(el: T | null, what: string): T {
  if (!el) throw new Error(`Missing element: ${what}`);
  return el;
}

/** Replace all children of el (null/false children are skipped). */
export function replace(el: Element, ...children: Child[]): void {
  clear(el);
  for (const c of children) {
    if (c === null || c === undefined || c === false) continue;
    el.append(typeof c === 'string' ? document.createTextNode(c) : c);
  }
}
