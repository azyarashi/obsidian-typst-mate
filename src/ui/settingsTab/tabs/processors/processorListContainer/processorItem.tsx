import { IconS } from '@components/Icon';
import { SortableItem } from '@components/List/ListContainer';
import { Setting } from '@components/obsidian/Setting';
import { SyntaxMode } from '@typstmate/typst-syntax';
import type { ComponentChildren } from 'preact';

import { ICONS } from '@/constants/icons';
import { t, tFragment } from '@/i18n';
import {
  CodeblockStyling,
  DisplayStyling,
  InlineStyling,
  type ProcessorKind,
  RenderingEngine,
  type Processor as TypstProcessor,
} from '@/libs/processor';

export function ProcessorItem({
  kind,
  processor,
  uuid,
  index,
  processors,
  onUpdate,
  onDelete,
  onMove,
}: {
  kind: ProcessorKind;
  processor: TypstProcessor;
  uuid: string;
  index: number;
  processors: TypstProcessor[];
  onUpdate: (uuid: string, partial: Partial<TypstProcessor>) => void;
  onDelete: (uuid: string) => void;
  onMove: (dragUuid: string, dropUuid: string, side: 'top' | 'bottom') => void;
}) {
  const isFixed = kind !== 'codeblock' && processor.id === '' && index === processors.length - 1;

  const handleUpdate = <T extends keyof TypstProcessor>(field: T, value: TypstProcessor[T]) => {
    onUpdate(uuid, { [field]: value });
  };

  const isError =
    (processor.id === '' && index !== processors.length - 1 && kind !== 'codeblock') ||
    (processor.id !== '' && processors.some((p, i) => i !== index && p.id === processor.id));

  const preventAccordion = (e: MouseEvent | Event | any) => {
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
              onChange={(e) => handleUpdate('styling', (e.target as HTMLSelectElement).value as any)}
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
              {kind === 'codeblock' && (
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
            onClick={() => handleUpdate('useReplaceAll', !(processor.useReplaceAll ?? false))}
          />
          {kind !== 'inline' && (
            <IconS
              icon={ICONS.MoveHorizontal}
              title={t('settings.processors.iconTooltips.fitToNoteWidth')}
              isActive={processor.fitToNoteWidth ?? false}
              onClick={() => handleUpdate('fitToNoteWidth', !(processor.fitToNoteWidth ?? false))}
            />
          )}
          <IconS
            icon={ICONS.FileX}
            title={t('settings.processors.iconTooltips.noPreamble')}
            isActive={processor.noPreamble ?? false}
            onClick={() => handleUpdate('noPreamble', !(processor.noPreamble ?? false))}
          />
          <IconS
            icon={getSyntaxModeIcon(kind, processor.syntaxMode)}
            title={(() => {
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
                  return kind !== 'codeblock'
                    ? t('settings.processors.iconTooltips.syntaxModeMath')
                    : t('settings.processors.iconTooltips.syntaxModeMarkup');
              }
            })()}
            onClick={() => {}}
          />
        </>
      }
      mainField={
        <textarea
          value={processor.format}
          placeholder={t('settings.processors.formatPlaceholder')}
          onChange={(e) => handleUpdate('format', (e.target as HTMLTextAreaElement).value)}
          onClick={preventAccordion}
          className="typstmate-textarea"
        />
      }
      detailsContent={
        <>
          <Setting
            build={(s) =>
              s
                .setName(tFragment('settings.processors.useReplaceAllName'))
                .setDesc(tFragment('settings.processors.useReplaceAllDesc'))
                .addToggle((t) => {
                  t.setValue(processor.useReplaceAll ?? false).onChange((v) => handleUpdate('useReplaceAll', v));
                })
            }
          />
          {(kind === 'display' || kind === 'codeblock') && (
            <Setting
              build={(s) =>
                s
                  .setName(tFragment('settings.processors.fitToNoteWidthName'))
                  .setDesc(tFragment('settings.processors.fitToNoteWidthDesc'))
                  .addToggle((t) => {
                    t.setValue(processor.fitToNoteWidth ?? false).onChange((v) => handleUpdate('fitToNoteWidth', v));
                  })
              }
            />
          )}
          <Setting
            build={(s) =>
              s
                .setName(tFragment('settings.processors.noPreambleName'))
                .setDesc(tFragment('settings.processors.noPreambleDesc'))
                .addToggle((t) => {
                  t.setValue(processor.noPreamble ?? false).onChange((v) => handleUpdate('noPreamble', v));
                })
            }
          />
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
      return kind === 'codeblock' ? ICONS.Heading1 : ICONS.SquareFunction;
  }
}
