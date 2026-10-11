import { h } from '../dom';
import { engine } from '../engine';
import { downloadText } from '../storage';
import { dispatch, game, go, localDateKey, replaceSave, resetProgress, saveFile, settings, setSettings } from '../store';
import { tutorialReset } from '../tutorial';
import { confirmDialog, toast, topBar } from '../ui';
import type { Screen } from './types';

function row(label: string, hint: string, control: HTMLElement, testid: string): HTMLElement {
  return h('div', { class: 'setting-row', testid },
    h('div', { class: 'setting-text' }, h('strong', { text: label }), h('span', { class: 'hint', text: hint })),
    control,
  );
}

export function buildSettings(): Screen {
  const eng = engine;
  const back = (): void => go('home');
  const hasRun = game().run !== null;

  const motion = h('button', {
    class: `toggle${settings().reduceMotion ? ' on' : ''}`,
    testid: 'btn-reduce-motion',
    attrs: { role: 'switch', 'aria-checked': String(settings().reduceMotion) },
    text: settings().reduceMotion ? 'On' : 'Off',
    onClick: () => setSettings({ reduceMotion: !settings().reduceMotion }),
  });

  const fileInput = h('input', { testid: 'input-import', attrs: { type: 'file', accept: '.json,application/json', hidden: 'true' } });
  fileInput.addEventListener('change', () => {
    const f = fileInput.files?.[0];
    fileInput.value = '';
    if (!f) return;
    void f.text().then(async (text) => {
      let parsed;
      try {
        parsed = eng.load(text);
      } catch (e) {
        toast(`That file cannot be used: ${e instanceof Error ? e.message : 'unreadable'}`);
        return;
      }
      const ok = await confirmDialog({
        testid: 'confirm-import',
        title: 'Replace your progress?',
        text: 'This replaces everything on this phone (progress, records and any run in progress) with the contents of the file.',
        confirmLabel: 'Replace',
        danger: true,
      });
      if (ok) {
        replaceSave(parsed);
        toast('Progress imported.');
      }
    });
  });

  const el = h('main', { class: 'screen settings', testid: 'screen-settings' },
    topBar('Settings', back),
    h('div', { class: 'scrollable list' },
      row('Reduce motion', 'Replaces movement with quick fades.', motion, 'row-reduce-motion'),
      row('Tutorial', 'A short guided first fight.', h('button', {
        class: 'btn plain',
        testid: 'btn-replay-tutorial',
        text: 'Replay',
        disabled: hasRun,
        onClick: () => {
          tutorialReset();
          dispatch({ type: 'startTutorial' });
          go('home');
        },
      }), 'row-tutorial'),
      hasRun ? h('p', { class: 'hint pad', text: 'Finish or abandon your current run to replay the tutorial.' }) : null,
      row('Export progress', 'Save a backup file.', h('button', {
        class: 'btn plain',
        testid: 'btn-export',
        text: 'Export',
        onClick: () => {
          downloadText(`pip-and-blade-${localDateKey()}.json`, eng.save(saveFile()));
          toast('Backup file created.');
        },
      }), 'row-export'),
      row('Import progress', 'Restore from a backup file.', h('button', {
        class: 'btn plain',
        testid: 'btn-import',
        text: 'Import',
        onClick: () => fileInput.click(),
      }), 'row-import'),
      row('Reset progress', 'Erase everything and start over.', h('button', {
        class: 'btn danger',
        testid: 'btn-reset',
        text: 'Reset',
        onClick: () => {
          void confirmDialog({
            testid: 'confirm-reset',
            title: 'Erase all progress?',
            text: 'Heroes, unlocks, feats, records and any run in progress will be erased. This cannot be undone.',
            confirmLabel: 'Erase everything',
            danger: true,
          }).then((ok) => {
            if (ok) {
              resetProgress();
              toast('Progress erased.');
            }
          });
        },
      }), 'row-reset'),
      fileInput,
    ),
  );
  return { el };
}
