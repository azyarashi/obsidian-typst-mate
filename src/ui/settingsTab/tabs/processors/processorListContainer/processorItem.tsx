import { getSyntaxContextAt, parse, SyntaxMode } from '@typstmate/typst-syntax';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { debounce } from 'obsidian';
import type { ComponentChildren } from 'preact';
import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { ICONS } from '@/constants/icons';
import { t, tFragment } from '@/i18n';
import {
  type CodeblockProcessor,
  CodeblockStyling,
  type DisplayProcessor,
  DisplayStyling,
  hasFitToNoteWidth,
  hasNoPreamble,
  type InlineProcessor,
  InlineStyling,
  type ProcessorKind,
  type ProcessorMarkdownBase,
  type ProcessorOfKind,
  type ProcessorWithFit,
  type ProcessorWithPreamble,
  RenderingEngine,
  type Styling,
  type Processor as TypstProcessor,
} from '@/libs/processor';
import { IconS } from '@/ui/components/Icon';
import { SortableItem } from '@/ui/components/List/ListContainer';
import { Setting } from '@/ui/components/obsidian/Setting';
import { getMiniEditorExtensions } from '@/ui/modals/miniEditor';
import { consoleWarn } from '@/utils/notice';

export function ProcessorItem<K extends ProcessorKind>({
  kind,
  processor,
  uuid,
  index,
  processors,
  onUpdate,
  onDelete,
  onMove,
}: {
  kind: K;
  processor: ProcessorOfKind<K>;
  uuid: string;
  index: number;
  processors: ProcessorOfKind<K>[];
  onUpdate: (uuid: string, partial: Partial<TypstProcessor>) => void;
  onDelete: (uuid: string) => void;
  onMove: (dragUuid: string, dropUuid: string, side: 'top' | 'bottom') => void;
}) {
  const isFixed = kind !== 'codeblock' && processor.id === '' && index === processors.length - 1;

  const [isDetecting, setIsDetecting] = useState(false);
  const [isEditorActive, setIsEditorActive] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  const processorRef = useRef(processor);
  processorRef.current = processor;

  const handleUpdate = useCallback(
    <T extends keyof ProcessorOfKind<K>>(field: T, value: ProcessorOfKind<K>[T]) => {
      const partial: Partial<TypstProcessor> = { [field]: value };
      if (hasNoPreamble(kind)) {
        if (field === 'renderingEngine' && value === RenderingEngine.MathJax) {
          (partial as ProcessorMarkdownBase<Styling>).syntaxMode = SyntaxMode.Plain;
        }
      }
      onUpdate(uuid, partial);
    },
    [onUpdate, uuid],
  );

  const handleUpdateRef = useRef(handleUpdate);
  handleUpdateRef.current = handleUpdate;

  // Sync syntaxMode when format changes
  const debouncedDetect = useMemo(
    () =>
      debounce((format: string) => {
        const p = processorRef.current;
        if (!hasNoPreamble(kind)) return;
        const pm = p as ProcessorMarkdownBase<Styling>;

        if (pm.renderingEngine === RenderingEngine.MathJax) {
          if (pm.syntaxMode !== SyntaxMode.Plain) {
            (handleUpdateRef.current as (field: 'syntaxMode', value: SyntaxMode) => void)(
              'syntaxMode',
              SyntaxMode.Plain,
            );
          }
          return;
        }

        try {
          const codeIndex = format.indexOf('{CODE}');
          const defaultMode = kind === 'inline' || kind === 'display' ? SyntaxMode.Math : SyntaxMode.Markup;

          if (codeIndex === -1) {
            // Revert to default if {CODE} is missing
            const pm = p as ProcessorMarkdownBase<Styling>;
            if (pm.syntaxMode !== defaultMode) {
              (handleUpdateRef.current as (field: 'syntaxMode', value: SyntaxMode) => void)('syntaxMode', defaultMode);
            }
            return;
          }

          const dummy = format.slice(0, codeIndex) + format.slice(codeIndex + 6);
          const tree = parse(dummy);
          const { mode } = getSyntaxContextAt(tree, codeIndex, defaultMode);

          const pm = p as ProcessorMarkdownBase<Styling>;
          if (mode !== undefined && mode !== null && pm.syntaxMode !== mode) {
            (handleUpdateRef.current as (field: 'syntaxMode', value: SyntaxMode) => void)(
              'syntaxMode',
              mode as SyntaxMode,
            );
          }
        } catch (e) {
          consoleWarn('Mode detection failed', e);
        } finally {
          setIsDetecting(false);
        }
      }, 500),
    [kind],
  );

  const isFirstMount = useRef(true);
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    if (processor.renderingEngine === RenderingEngine.MathJax) return;

    setIsDetecting(true);
    debouncedDetect(processor.format);
  }, [processor.format, debouncedDetect, processor.renderingEngine]);

  // CM6 instantiation
  useEffect(() => {
    if (isEditorActive && editorRef.current) {
      if (viewRef.current) {
        viewRef.current.destroy();
        viewRef.current = null;
      }
      const state = EditorState.create({
        doc: processor.format,
        extensions: [
          ...getMiniEditorExtensions(processor.renderingEngine),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              handleUpdateRef.current('format', update.state.doc.toString() as ProcessorOfKind<K>['format']);
            }
          }),
        ],
      });
      viewRef.current = new EditorView({
        state,
        parent: editorRef.current,
      });
      viewRef.current.focus();
    }
  }, [isEditorActive, processor.renderingEngine]);

  // Cleanup CM6
  useEffect(() => {
    return () => {
      viewRef.current?.destroy();
      viewRef.current = null;
    };
  }, []);

  const isError =
    (processor.id === '' && index !== processors.length - 1 && kind !== 'codeblock') ||
    (processor.id !== '' && processors.some((p, i) => i !== index && p.id === processor.id));

  const preventAccordion = (e: MouseEvent | Event) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <SortableItem
      uuid={uuid}
      isFixed={isFixed}
      onMove={onMove}
      onDelete={isFixed ? undefined : () => onDelete(uuid)}
      deleteLabel={t('settings.processors.deleteButton')}
      idInput={
        !isFixed ? (
          <input
            type="text"
            placeholder={t('settings.processors.idPlaceholder')}
            value={processor.id}
            onChange={(e) => handleUpdate('id', (e.target as HTMLInputElement).value)}
            onClick={preventAccordion}
            style={{
              borderColor: isError ? 'var(--text-error)' : '',
              borderWidth: isError ? '2px' : '1px',
              boxShadow: isError ? '0 0 0 2px rgba(255, 0, 0, 0.2)' : '',
            }}
          />
        ) : null
      }
      summaryFields={
        <>
          {/* Rendering Engine */}
          <label>
            <select
              onChange={(e) =>
                handleUpdate('renderingEngine', (e.target as HTMLSelectElement).value as RenderingEngine)
              }
              onClick={preventAccordion}
            >
              <option
                value={RenderingEngine.TypstSVG}
                selected={processor.renderingEngine === RenderingEngine.TypstSVG}
              >
                {t('settings.processors.renderingEngineOptions.typstSvg')}
              </option>
              <option
                value={RenderingEngine.TypstHTML}
                selected={processor.renderingEngine === RenderingEngine.TypstHTML}
              >
                {t('settings.processors.renderingEngineOptions.typstHtml')}
              </option>
              <option value={RenderingEngine.MathJax} selected={processor.renderingEngine === RenderingEngine.MathJax}>
                {t('settings.processors.renderingEngineOptions.mathJax')}
              </option>
            </select>
          </label>
          {/* Styling */}
          {hasNoPreamble(kind) && (
            <label>
              <select
                onChange={(e) =>
                  (handleUpdate as (field: 'styling', value: Styling) => void)(
                    'styling',
                    (e.target as HTMLSelectElement).value as Styling,
                  )
                }
                onClick={preventAccordion}
                onKeyDown={preventAccordion}
              >
                {kind === 'inline' && (
                  <>
                    <option
                      value={InlineStyling.Inline}
                      selected={(processor as InlineProcessor).styling === InlineStyling.Inline}
                    >
                      {t('settings.processors.stylingOptions.inline')}
                    </option>
                    <option
                      value={InlineStyling.Baseline}
                      selected={(processor as InlineProcessor).styling === InlineStyling.Baseline}
                    >
                      {t('settings.processors.stylingOptions.baseline')}
                    </option>
                    <option
                      value={InlineStyling.Middle}
                      selected={(processor as InlineProcessor).styling === InlineStyling.Middle}
                    >
                      {t('settings.processors.stylingOptions.middle')}
                    </option>
                  </>
                )}
                {kind === 'display' && (
                  <>
                    <option
                      value={DisplayStyling.Block}
                      selected={(processor as DisplayProcessor).styling === DisplayStyling.Block}
                    >
                      {t('settings.processors.stylingOptions.block')}
                    </option>
                    <option
                      value={DisplayStyling.BlockCenter}
                      selected={(processor as DisplayProcessor).styling === DisplayStyling.BlockCenter}
                    >
                      {t('settings.processors.stylingOptions.blockCenter')}
                    </option>
                  </>
                )}
                {kind === 'codeblock' && (
                  <>
                    <option
                      value={CodeblockStyling.Block}
                      selected={(processor as CodeblockProcessor).styling === CodeblockStyling.Block}
                    >
                      {t('settings.processors.stylingOptions.block')}
                    </option>
                    <option
                      value={CodeblockStyling.BlockCenter}
                      selected={(processor as CodeblockProcessor).styling === CodeblockStyling.BlockCenter}
                    >
                      {t('settings.processors.stylingOptions.blockCenter')}
                    </option>
                    <option
                      value={CodeblockStyling.Codeblock}
                      selected={(processor as CodeblockProcessor).styling === CodeblockStyling.Codeblock}
                    >
                      {t('settings.processors.stylingOptions.codeblock')}
                    </option>
                  </>
                )}
              </select>
            </label>
          )}
        </>
      }
      quickIcons={
        <>
          {hasNoPreamble(kind) && (
            <IconS
              icon={ICONS.ReplaceAll}
              title={t('settings.processors.tooltips.useReplaceAll')}
              isActive={(processor as ProcessorMarkdownBase<Styling>).useReplaceAll ?? false}
              onClick={() => {
                (handleUpdate as (field: 'useReplaceAll', value: boolean) => void)(
                  'useReplaceAll',
                  !((processor as ProcessorMarkdownBase<Styling>).useReplaceAll ?? false),
                );
              }}
            />
          )}
          {hasFitToNoteWidth(kind) && (
            <IconS
              icon={ICONS.MoveHorizontal}
              title={t('settings.processors.tooltips.fitToNote')}
              isActive={(processor as ProcessorWithFit).fitToNoteWidth ?? false}
              onClick={() => {
                const p = processor as ProcessorWithFit;
                (handleUpdate as (field: 'fitToNoteWidth', value: boolean) => void)(
                  'fitToNoteWidth',
                  !(p.fitToNoteWidth ?? false),
                );
              }}
            />
          )}
          {hasNoPreamble(kind) && (
            <IconS
              icon={ICONS.FileX}
              title={t('settings.processors.tooltips.noPreamble')}
              isActive={(processor as ProcessorWithPreamble).noPreamble ?? false}
              onClick={() => {
                const p = processor as ProcessorWithPreamble;
                (handleUpdate as (field: 'noPreamble', value: boolean) => void)('noPreamble', !(p.noPreamble ?? false));
              }}
            />
          )}
          <IconS
            icon={
              isDetecting
                ? ICONS.Loading
                : getSyntaxModeIcon(
                    kind,
                    hasNoPreamble(kind) ? (processor as ProcessorMarkdownBase<Styling>).syntaxMode : undefined,
                  )
            }
            className={isDetecting ? 'typstmate-spinner' : ''}
            title={
              isDetecting
                ? t('settings.processors.tooltips.syntaxModeAnalyzing')
                : (() => {
                    const syntaxMode = hasNoPreamble(kind)
                      ? (processor as ProcessorMarkdownBase<Styling>).syntaxMode
                      : undefined;
                    switch (syntaxMode) {
                      case SyntaxMode.Markup:
                        return t('settings.processors.tooltips.syntaxModeMarkup');
                      case SyntaxMode.Math:
                        return t('settings.processors.tooltips.syntaxModeMath');
                      case SyntaxMode.Code:
                        return t('settings.processors.tooltips.syntaxModeCode');
                      case SyntaxMode.Plain:
                        return t('settings.processors.tooltips.syntaxModePlain');
                      default:
                        return kind !== 'codeblock' && kind !== 'excalidraw'
                          ? t('settings.processors.tooltips.syntaxModeMath')
                          : t('settings.processors.tooltips.syntaxModeMarkup');
                    }
                  })()
            }
            onClick={() => {}}
          />
        </>
      }
      mainField={
        isEditorActive ? (
          <div ref={editorRef} className="typstmate-mini-editor" onClick={preventAccordion} />
        ) : (
          <textarea
            value={processor.format}
            placeholder={t('settings.processors.formatPlaceholder')}
            onFocus={() => setIsEditorActive(true)}
            onClick={preventAccordion}
            className="typstmate-textarea"
            readOnly
          />
        )
      }
      detailsContent={
        <>
          {hasNoPreamble(kind) && (
            <Setting
              build={(s) =>
                s
                  .setName(tFragment('settings.processors.useReplaceAllName'))
                  .setDesc(tFragment('settings.processors.useReplaceAllDesc'))
                  .addToggle((t) => {
                    t.setValue((processor as ProcessorMarkdownBase<Styling>).useReplaceAll ?? false).onChange((v) =>
                      (handleUpdate as (field: 'useReplaceAll', value: boolean) => void)('useReplaceAll', v),
                    );
                  })
              }
            />
          )}
          {hasFitToNoteWidth(kind) && (
            <Setting
              build={(s) =>
                s
                  .setName(tFragment('settings.processors.fitToNoteName'))
                  .setDesc(tFragment('settings.processors.fitToNoteDesc'))
                  .addToggle((t) => {
                    const p = processor as ProcessorWithFit;
                    t.setValue(p.fitToNoteWidth ?? false).onChange((v) => {
                      (handleUpdate as (field: 'fitToNoteWidth', value: boolean) => void)('fitToNoteWidth', v);
                    });
                  })
              }
            />
          )}
          {hasNoPreamble(kind) && (
            <Setting
              build={(s) =>
                s
                  .setName(tFragment('settings.processors.noPreambleName'))
                  .setDesc(tFragment('settings.processors.noPreambleDesc'))
                  .addToggle((t) => {
                    const p = processor as ProcessorWithPreamble;
                    t.setValue(p.noPreamble ?? false).onChange((v) => {
                      (handleUpdate as (field: 'noPreamble', value: boolean) => void)('noPreamble', v);
                    });
                  })
              }
            />
          )}
        </>
      }
    />
  );
}

function getSyntaxModeIcon(kind: ProcessorKind, syntaxMode?: SyntaxMode): ComponentChildren {
  switch (syntaxMode) {
    case SyntaxMode.Markup:
      return ICONS.MarkupMode;
    case SyntaxMode.Math:
      return ICONS.MathMode;
    case SyntaxMode.Code:
      return ICONS.CodeMode;
    case SyntaxMode.Plain:
      return ICONS.PlainMode;
    default:
      return kind === 'inline' || kind === 'display' ? ICONS.MathMode : ICONS.MarkupMode;
  }
}
