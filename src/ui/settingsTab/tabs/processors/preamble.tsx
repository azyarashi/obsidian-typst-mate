import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { Setting } from '@components/obsidian/Setting';
import { type TabDefinition, Tabs } from '@components/Tabs';
import { debounce } from 'obsidian';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { t } from '@/i18n';
import { extensionManager, settingsManager } from '@/libs';
import { RenderingEngine } from '@/libs/processor';

export function Preamble() {
  const [activePreambleRenderingEngine, setActivePreambleRenderingEngineInternal] = useState<RenderingEngine>(
    settingsManager.settings.settingsStates.preambleRenderingEngineTab,
  );

  const getPreambleValue = (engine: RenderingEngine) => {
    switch (engine) {
      case RenderingEngine.TypstSVG:
        return settingsManager.settings.preambleSvg;
      case RenderingEngine.TypstHTML:
        return settingsManager.settings.preambleHtml;
      case RenderingEngine.MathJax:
        return settingsManager.settings.preambleMathJax;
      default:
        return '';
    }
  };

  const [preamble, setPreamble] = useState(getPreambleValue(activePreambleRenderingEngine));
  const [isEditingPreamble, setIsEditingPreamble] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  const onChangePreambleRenderingEngine = (tab: RenderingEngine) => {
    setActivePreambleRenderingEngineInternal(tab);
    setPreamble(getPreambleValue(tab));
    setIsEditingPreamble(false);
    settingsManager.settings.settingsStates.preambleRenderingEngineTab = tab;
    settingsManager.saveSettings();
  };

  const debouncedSavePreamble = useMemo(
    () =>
      debounce(async (val: string, engine: RenderingEngine) => {
        switch (engine) {
          case RenderingEngine.TypstSVG:
            settingsManager.settings.preambleSvg = val;
            break;
          case RenderingEngine.TypstHTML:
            settingsManager.settings.preambleHtml = val;
            break;
          case RenderingEngine.MathJax:
            settingsManager.settings.preambleMathJax = val;
            break;
        }
        await settingsManager.saveSettings();
      }, 100),
    [],
  );

  useEffect(() => {
    if (isEditingPreamble && editorRef.current && !viewRef.current) {
      const state = EditorState.create({
        doc: preamble,
        extensions: [
          ...extensionManager.buildSettingsEditorExtensions(),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              const val = update.state.doc.toString();
              setPreamble(val);
              debouncedSavePreamble(val, activePreambleRenderingEngine);
            }
          }),
        ],
      });
      viewRef.current = new EditorView({
        parent: editorRef.current,
        state,
      });
      setTimeout(() => viewRef.current?.focus(), 10);
    }
    return () => {
      if (viewRef.current) {
        viewRef.current.destroy();
        viewRef.current = null;
      }
    };
  }, [isEditingPreamble, activePreambleRenderingEngine]);

  const subTabs = useMemo<TabDefinition<RenderingEngine>[]>(() => {
    const tabs: TabDefinition<RenderingEngine>[] = [
      {
        id: RenderingEngine.TypstSVG,
        name: t('settings.processors.renderingEngineTabs.typstSVG'),
        renderContent: () => <></>,
      },
      {
        id: RenderingEngine.TypstHTML,
        name: t('settings.processors.renderingEngineTabs.typstHTML'),
        renderContent: () => <></>,
      },
      {
        id: RenderingEngine.MathJax,
        name: t('settings.processors.renderingEngineTabs.mathjax'),
        renderContent: () => <></>,
      },
    ];

    return tabs;
  }, []);

  return (
    <details onToggle={(e: Event) => setIsOpen((e.currentTarget as HTMLDetailsElement).open)}>
      <summary
        style={{
          listStyle: 'none',
          cursor: 'pointer',
        }}
      >
        <Setting
          build={(setting) =>
            setting.setName(`${isOpen ? '▼' : '▶︎'} ${t('settings.processors.preambleName')}`).addButton((b) => {
              b.setIcon('info');
            })
          }
        />
      </summary>

      <div
        onClick={(e) => {
          e.stopPropagation();
          setIsEditingPreamble(true);
        }}
      >
        <Tabs tabs={subTabs} activeTab={activePreambleRenderingEngine} onTabChange={onChangePreambleRenderingEngine} />
        {isEditingPreamble ? (
          <div className="typstmate-processor-format-editor is-editing-preamble" ref={editorRef} />
        ) : (
          <textarea className="typstmate-textarea">{preamble}</textarea>
        )}
      </div>
    </details>
  );
}
