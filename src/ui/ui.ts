/** Small shared UI pieces: modal, info sheet, toast, long-press, top bar. */
import { icon } from './art';
import { clear, h } from './dom';
import { scrollBox } from './scroll';

const overlays = (): HTMLElement => {
  const el = document.getElementById('overlays');
  if (!el) throw new Error('#overlays missing');
  return el;
};

export interface ModalButton {
  label: string;
  testid: string;
  kind?: 'primary' | 'danger' | 'plain';
  onClick?: () => void | Promise<void>;
}

/** A centred dialog. Closes when any button is pressed. */
export function modal(opts: { testid: string; title: string; body?: (string | Node)[]; buttons: ModalButton[] }): { close: () => void } {
  const back = h('div', { class: 'modal-back', testid: `${opts.testid}-back` });
  const close = (): void => back.remove();
  const card = h('div', { class: 'modal-card', testid: opts.testid, attrs: { role: 'dialog', 'aria-modal': 'true' } },
    h('h2', { text: opts.title }),
    scrollBox(opts.testid, { class: 'modal-body' }, ...(opts.body ?? []).map((b) => (typeof b === 'string' ? h('p', { text: b }) : b))),
    h('div', { class: `modal-buttons${opts.buttons.length > 2 || opts.buttons.some((b) => b.label.length > 9) ? ' stack' : ''}` },
      ...opts.buttons.map((b) =>
        h('button', {
          class: `btn ${b.kind ?? 'plain'}`,
          testid: b.testid,
          text: b.label,
          onClick: () => {
            close();
            void b.onClick?.();
          },
        }),
      ),
    ),
  );
  back.append(card);
  overlays().append(back);
  return { close };
}

export function confirmDialog(opts: { testid: string; title: string; text: string; confirmLabel: string; danger?: boolean }): Promise<boolean> {
  return new Promise((resolve) => {
    modal({
      testid: opts.testid,
      title: opts.title,
      body: [opts.text],
      buttons: [
        { label: 'Cancel', testid: `${opts.testid}-cancel`, onClick: () => resolve(false) },
        { label: opts.confirmLabel, testid: `${opts.testid}-confirm`, kind: opts.danger ? 'danger' : 'primary', onClick: () => resolve(true) },
      ],
    });
  });
}

/** A bottom sheet with exact rules text. */
export function infoSheet(opts: { testid?: string; title: string; icon?: Node | null; lines: (string | Node)[]; onClose?: () => void }): { close: () => void } {
  const back = h('div', { class: 'modal-back sheet-back', testid: 'info-sheet-back' });
  const close = (): void => {
    back.remove();
    opts.onClose?.();
  };
  back.addEventListener('click', (e) => {
    if (e.target === back) close();
  });
  const id = opts.testid ?? 'info-sheet';
  const sheet = h('div', { class: 'sheet', testid: id, attrs: { role: 'dialog' } },
    h('div', { class: 'sheet-head' }, opts.icon ?? null, h('h2', { text: opts.title })),
    scrollBox(id, { class: 'sheet-body' }, ...opts.lines.map((l) => (typeof l === 'string' ? h('p', { text: l }) : l))),
    h('div', { class: 'sheet-foot' }, h('button', { class: 'btn primary', testid: 'info-close', text: 'Close', onClick: close })),
  );
  back.append(sheet);
  overlays().append(back);
  return { close };
}

let toastTimer: ReturnType<typeof setTimeout> | undefined;
export function toast(text: string): void {
  const host = overlays();
  host.querySelector('.toast')?.remove();
  if (toastTimer) clearTimeout(toastTimer);
  const t = h('div', { class: 'toast', testid: 'toast', text });
  host.append(t);
  toastTimer = setTimeout(() => t.remove(), 2600);
}

export function closeAllOverlays(): void {
  clear(overlays());
}

/**
 * Long-press (about half a second) opens info without also triggering the tap.
 * The timer only exists while a finger is down.
 */
export function onLongPress(el: HTMLElement, handler: () => void, ms = 350): void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let fired = false;
  let sx = 0;
  let sy = 0;
  const cancel = (): void => {
    if (timer) clearTimeout(timer);
    timer = undefined;
  };
  el.addEventListener('pointerdown', (e) => {
    fired = false;
    sx = e.clientX;
    sy = e.clientY;
    cancel();
    timer = setTimeout(() => {
      timer = undefined;
      fired = true;
      handler();
    }, ms);
  });
  el.addEventListener('pointermove', (e) => {
    if (Math.abs(e.clientX - sx) > 10 || Math.abs(e.clientY - sy) > 10) cancel();
  });
  for (const t of ['pointerup', 'pointercancel', 'pointerleave'] as const) el.addEventListener(t, cancel);
  // A long press must not also count as a tap.
  el.addEventListener('click', (e) => {
    if (fired) {
      e.stopImmediatePropagation();
      e.preventDefault();
      fired = false;
    }
  }, true);
  el.addEventListener('contextmenu', (e) => e.preventDefault());
}

export function topBar(title: string, onBack?: () => void): HTMLElement {
  return h('header', { class: 'topbar' },
    onBack ? h('button', { class: 'icon-btn', testid: 'btn-back', attrs: { 'aria-label': 'Back' }, onClick: onBack }, icon('ui.back', 36)) : h('span', { class: 'icon-btn spacer' }),
    h('h1', { text: title, testid: 'screen-title' }),
    h('span', { class: 'icon-btn spacer' }),
  );
}

export interface ChoiceItem {
  label: string;
  sub?: string;
  icon?: Node | null;
  testid: string;
  disabled?: boolean;
}

/** A bottom sheet of choices. Resolves with the chosen index, or null if cancelled. */
export function chooseSheet(opts: { testid: string; title: string; hint?: string; items: ChoiceItem[] }): Promise<number | null> {
  return new Promise((resolve) => {
    const back = h('div', { class: 'modal-back sheet-back', testid: `${opts.testid}-back` });
    const done = (v: number | null): void => {
      back.remove();
      resolve(v);
    };
    back.addEventListener('click', (e) => {
      if (e.target === back) done(null);
    });
    const sheet = h('div', { class: 'sheet choose', testid: opts.testid, attrs: { role: 'dialog' } },
      h('div', { class: 'sheet-head col' }, h('h2', { text: opts.title }), opts.hint ? h('p', { class: 'hint', text: opts.hint }) : null),
      scrollBox(opts.testid, { class: 'sheet-body choose-list' },
        ...opts.items.map((it, i) =>
          h('button', { class: 'choice', testid: it.testid, disabled: it.disabled, onClick: () => done(i) },
            it.icon ?? null,
            h('span', { class: 'choice-text' }, h('strong', { text: it.label }), it.sub ? h('small', { text: it.sub }) : null),
          ),
        ),
      ),
      h('div', { class: 'sheet-foot' }, h('button', { class: 'btn plain', testid: `${opts.testid}-cancel`, text: 'Cancel', onClick: () => done(null) })),
    );
    back.append(sheet);
    overlays().append(back);
  });
}
