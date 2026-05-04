import { foldAll, unfoldAll } from '@codemirror/language';
import { openSearchPanel } from '@codemirror/search';
import { Prec } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import { debounce, Notice, TFile } from 'obsidian';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
// TODO import { obsidianTheme } from '@/editor';
import { buildJSSimpleEditorExtensions } from '@/editorSimple/js';
import { t } from '@/i18n';
import { appUtils, extensionManager, settingsManager, tmActionsManager } from '@/libs';
import { importRaw, normalizeTMActionRaw, validateTMAction } from '@/libs/tmActionsManager/utils';
import { Setting } from '@/ui/components/obsidian/Setting';

export function ActionCodeTab() {
  const [useFile] = useState(settingsManager.settings.useTmactionsFile);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isPendingValidation, setIsPendingValidation] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  const reloadActions = async () => {
    await tmActionsManager.load();
    extensionManager.reconfigure('typstmate-action');
  };

  const saveSettings = debounce(async (source: string) => {
    if (useFile) {
      if (!filePath) return;
      try {
        const file = appUtils.app.vault.getAbstractFileByPath(filePath);
        if (file instanceof TFile) {
          await appUtils.app.vault.modify(file, source);
          setFileContent(source);
        }
      } catch (e) {
        console.error('[ActionCodeTab] Failed to save to file:', e);
        new Notice(t('notices.failedToSaveFile'));
      }
    } else {
      settingsManager.settings.tmactionsSource = source;
      await settingsManager.saveSettings();
    }
    await reloadActions();
    setIsPendingValidation(true);
    debouncedValidate(source);
  }, 1000);

  const validate = async (source: string, manual = false) => {
    setIsPendingValidation(false);
    setIsValidating(true);
    try {
      const raw = await importRaw(source);
      if (!Array.isArray(raw)) throw new Error('Exported value must be an array');
      for (const item of raw) {
        const normalized = normalizeTMActionRaw(item as any);
        validateTMAction(normalized);
      }
      if (manual) new Notice(t('settings.actions.validation.success'));
      setError(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      if (manual) new Notice(t('settings.actions.validation.failed', { error: msg }));
    } finally {
      setIsValidating(false);
    }
  };

  const debouncedValidate = useMemo(() => debounce((source: string) => validate(source), 3000), []);

  useEffect(() => {
    if (useFile) {
      if (!filePath) {
        setFileContent(null);
        return;
      }
      const file = appUtils.app.vault.getAbstractFileByPath(filePath);
      if (file instanceof TFile) {
        appUtils.app.vault.cachedRead(file).then(setFileContent);
      } else {
        setFileContent(null);
      }
    }
  }, [useFile, filePath]);

  useEffect(() => {
    if (!editorRef.current) return;

    if (!viewRef.current) {
      const updateListener = EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          saveSettings(update.state.doc.toString());
        }
      });
      const saveKeymap = Prec.highest(
        keymap.of([
          {
            key: 'Mod-s',
            run: (view) => {
              validate(view.state.doc.toString(), true);
              return true;
            },
          },
        ]),
      );

      const initialDoc = useFile ? (fileContent ?? '') : settingsManager.settings.tmactionsSource;

      viewRef.current = new EditorView({
        doc: initialDoc,
        extensions: [
          ...buildJSSimpleEditorExtensions(),
          obsidianTheme,
          updateListener,
          saveKeymap,
          EditorView.theme({
            '&': { height: '100%' },
            '.cm-scroller': { overflow: 'auto' },
          }),
        ],
        parent: editorRef.current,
      });
    }

    return () => {
      if (viewRef.current) {
        viewRef.current.destroy();
        viewRef.current = null;
      }
    };
  }, [useFile, fileContent === null]);

  const handleSearch = () => {
    if (viewRef.current) {
      openSearchPanel(viewRef.current);
    }
  };

  const handleFoldAll = () => {
    if (viewRef.current) {
      foldAll(viewRef.current);
    }
  };

  const handleUnfoldAll = () => {
    if (viewRef.current) {
      unfoldAll(viewRef.current);
    }
  };

  if (useFile && fileContent === null) {
    return (
      <Setting
        build={(setting) =>
          setting
            .setName(t('settings.actions.sourceName'))
            .setDesc(filePath ? t('notices.failedToLoadFile') : t('settings.actions.filePathDesc'))
        }
      />
    );
  }

  return (
    <>
      <Setting
        deps={[isValidating, isPendingValidation]}
        build={(setting) => {
          const loading = isValidating || isPendingValidation;
          setting
            .setName(t('settings.actions.sourceName'))
            .setDesc(useFile ? `📄 ${filePath}` : t('settings.actions.sourceDesc'))
            .addButton((btn) => {
              btn
                .setIcon(loading ? 'loader' : 'check')
                .setTooltip(t('settings.actions.tooltips.validate'))
                .onClick(() => validate(viewRef.current?.state.doc.toString() ?? '', true));
              if (loading) {
                btn.buttonEl.addClass('is-loading');
              }
            })
            .addButton((btn) =>
              btn
                .setIcon('search')
                .setTooltip(t('settings.actions.tooltips.search'))
                .onClick(() => handleSearch()),
            )
            .addButton((btn) =>
              btn
                .setIcon('chevrons-down-up')
                .setTooltip(t('settings.actions.tooltips.foldAll'))
                .onClick(() => handleFoldAll()),
            )
            .addButton((btn) =>
              btn
                .setIcon('chevrons-up-down')
                .setTooltip(t('settings.actions.tooltips.unfoldAll'))
                .onClick(() => handleUnfoldAll()),
            );
        }}
      />
      {error && (
        <div
          style={{
            color: 'var(--text-error)',
            fontSize: 'var(--font-smaller)',
            marginBottom: 'var(--size-4-2)',
            whiteSpace: 'pre-wrap',
            padding: '0 var(--size-4-2)',
          }}
        >
          {error}
        </div>
      )}
      <div
        ref={editorRef}
        style={{
          border: '1px solid var(--background-modifier-border)',
          borderRadius: 'var(--radius-s)',
          overflow: 'hidden',
          margin: '0 var(--size-4-2)',
          flexGrow: 1,
        }}
      />
    </>
  );
}
