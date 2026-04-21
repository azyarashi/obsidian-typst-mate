import { IconS } from '@components/Icon';
import { SortableItem } from '@components/List/ListContainer';
import { Setting } from '@components/obsidian/Setting';
import { parse, SyntaxMode } from '@typstmate/typst-syntax';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { debounce } from 'obsidian';
import type { ComponentChildren } from 'preact';
import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { ICONS } from '@/constants/icons';
import { t, tFragment } from '@/i18n';
import {
  CodeblockStyling,
  DisplayStyling,
  hasFitToNoteWidth,
  hasNoPreamble,
  InlineStyling,
  type ProcessorKind,
  type ProcessorOfKind,
  type ProcessorWithFit,
  type ProcessorWithPreamble,
  RenderingEngine,
  type Processor as TypstProcessor,
} from '@/libs/processor';
import { getMiniEditorExtensions } from '@/ui/modals/miniEditor';
import { getModeAndKind } from '@/utils/typstSyntax';

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
      if (field === 'renderingEngine' && value === RenderingEngine.MathJax) {
        partial.syntaxMode = SyntaxMode.Opaque;
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
        if (p.renderingEngine === RenderingEngine.MathJax) {
          if (p.syntaxMode !== SyntaxMode.Opaque) {
            (handleUpdateRef.current as (field: 'syntaxMode', value: SyntaxMode) => void)(
              'syntaxMode',
              SyntaxMode.Opaque,
            );
          }
          return;
        }

        try {
          const codeIndex = format.indexOf('{CODE}');
          const defaultMode = kind === 'inline' || kind === 'display' ? SyntaxMode.Math : SyntaxMode.Markup;

          if (codeIndex === -1) {
            // Revert to default if {CODE} is missing
            if (p.syntaxMode !== defaultMode) {
              (handleUpdateRef.current as (field: 'syntaxMode', value: SyntaxMode) => void)('syntaxMode', defaultMode);
            }
            return;
          }

          const dummy = format.slice(0, codeIndex) + format.slice(codeIndex + 6);
          const tree = parse(dummy);
          const { mode } = getModeAndKind(tree, codeIndex, defaultMode);

          if (mode !== undefined && mode !== null && mode !== p.syntaxMode) {
            (handleUpdateRef.current as (field: 'syntaxMode', value: SyntaxMode) => void)(
              'syntaxMode',
              mode as SyntaxMode,
            );
          }
        } catch (e) {
          console.warn('[Typst Mate] Mode detection failed', e);
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
      deleteLabel={t('settings.processors.deleteProcessorButton')}
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
                {t('settings.processors.renderingEngineOptions.typstSVG')}
              </option>
              <option
                value={RenderingEngine.TypstHTML}
                selected={processor.renderingEngine === RenderingEngine.TypstHTML}
              >
                {t('settings.processors.renderingEngineOptions.typstHTML')}
              </option>
              <option value={RenderingEngine.MathJax} selected={processor.renderingEngine === RenderingEngine.MathJax}>
                {t('settings.processors.renderingEngineOptions.mathjax')}
              </option>
            </select>
          </label>
          <label>
            <select
              onChange={(e) =>
                handleUpdate('styling', (e.target as HTMLSelectElement).value as ProcessorOfKind<K>['styling'])
              }
              onClick={preventAccordion}
              onKeyDown={preventAccordion}
            >
              {kind === 'inline' && (
                <>
                  <option value={InlineStyling.Inline} selected={processor.styling === InlineStyling.Inline}>
                    {t('settings.processors.stylingOptions.inline')}
                  </option>
                  <option value={InlineStyling.Baseline} selected={processor.styling === InlineStyling.Baseline}>
                    {t('settings.processors.stylingOptions.baseline')}
                  </option>
                  <option value={InlineStyling.Middle} selected={processor.styling === InlineStyling.Middle}>
                    {t('settings.processors.stylingOptions.middle')}
                  </option>
                </>
              )}
              {kind === 'display' && (
                <>
                  <option value={DisplayStyling.Block} selected={processor.styling === DisplayStyling.Block}>
                    {t('settings.processors.stylingOptions.block')}
                  </option>
                  <option
                    value={DisplayStyling.BlockCenter}
                    selected={processor.styling === DisplayStyling.BlockCenter}
                  >
                    {t('settings.processors.stylingOptions.blockCenter')}
                  </option>
                </>
              )}
              {(kind === 'codeblock' || kind === 'excalidraw') && (
                <>
                  <option value={CodeblockStyling.Block} selected={processor.styling === CodeblockStyling.Block}>
                    {t('settings.processors.stylingOptions.block')}
                  </option>
                  <option
                    value={CodeblockStyling.BlockCenter}
                    selected={processor.styling === CodeblockStyling.BlockCenter}
                  >
                    {t('settings.processors.stylingOptions.blockCenter')}
                  </option>
                  <option
                    value={CodeblockStyling.Codeblock}
                    selected={processor.styling === CodeblockStyling.Codeblock}
                  >
                    {t('settings.processors.stylingOptions.codeblock')}
                  </option>
                </>
              )}
            </select>
          </label>
        </>
      }
      quickIcons={
        <>
          <IconS
            icon={ICONS.ReplaceAll}
            title={t('settings.processors.iconTooltips.useReplaceAll')}
            isActive={processor.useReplaceAll ?? false}
            onClick={() => {
              (handleUpdate as (field: 'useReplaceAll', value: boolean) => void)(
                'useReplaceAll',
                !(processor.useReplaceAll ?? false),
              );
            }}
          />
          {hasFitToNoteWidth(kind) && (
            <IconS
              icon={ICONS.MoveHorizontal}
              title={t('settings.processors.iconTooltips.fitToNoteWidth')}
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
              title={t('settings.processors.iconTooltips.noPreamble')}
              isActive={(processor as ProcessorWithPreamble).noPreamble ?? false}
              onClick={() => {
                const p = processor as ProcessorWithPreamble;
                (handleUpdate as (field: 'noPreamble', value: boolean) => void)('noPreamble', !(p.noPreamble ?? false));
              }}
            />
          )}
          <IconS
            icon={isDetecting ? ICONS.Loading : getSyntaxModeIcon(kind, processor.syntaxMode)}
            className={isDetecting ? 'typstmate-spinner' : ''}
            title={
              isDetecting
                ? t('settings.processors.iconTooltips.syntaxModeAnalyzing')
                : (() => {
                    switch (processor.syntaxMode) {
                      case SyntaxMode.Markup:
                        return t('settings.processors.iconTooltips.syntaxModeMarkup');
                      case SyntaxMode.Math:
                        return t('settings.processors.iconTooltips.syntaxModeMath');
                      case SyntaxMode.Code:
                        return t('settings.processors.iconTooltips.syntaxModeCode');
                      case SyntaxMode.Opaque:
                        return t('settings.processors.iconTooltips.syntaxModeOpaque');
                      default:
                        return kind !== 'codeblock' && kind !== 'excalidraw'
                          ? t('settings.processors.iconTooltips.syntaxModeMath')
                          : t('settings.processors.iconTooltips.syntaxModeMarkup');
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
          <Setting
            build={(s) =>
              s
                .setName(tFragment('settings.processors.useReplaceAll.name'))
                .setDesc(tFragment('settings.processors.useReplaceAll.desc'))
                .addToggle((t) => {
                  t.setValue(processor.useReplaceAll ?? false).onChange((v) =>
                    handleUpdate('useReplaceAll' as keyof ProcessorOfKind<K>, v as ProcessorOfKind<K>['useReplaceAll']),
                  );
                })
            }
          />
          {hasFitToNoteWidth(kind) && (
            <Setting
              build={(s) =>
                s
                  .setName(tFragment('settings.processors.fitToNoteWidth.name'))
                  .setDesc(tFragment('settings.processors.fitToNoteWidth.desc'))
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
                  .setName(tFragment('settings.processors.noPreamble.name'))
                  .setDesc(tFragment('settings.processors.noPreamble.desc'))
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
      return ICONS.Heading1;
    case SyntaxMode.Math:
      return ICONS.SquareFunction;
    case SyntaxMode.Code:
      return ICONS.Code;
    case SyntaxMode.Opaque:
      return ICONS.CircleDashed;
    default:
      return kind === 'codeblock' || kind === 'excalidraw' ? ICONS.Heading1 : ICONS.SquareFunction;
  }
}
