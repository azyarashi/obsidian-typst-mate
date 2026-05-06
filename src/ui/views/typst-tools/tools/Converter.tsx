import { useEffect, useRef, useState } from 'preact/hooks';
import { TypstMate } from '@/api';
import { rendererManager } from '@/libs';
import { t } from '@/libs/i18n';

type ConverterMode = 'math-eq' | 'markup-doc' | 'cetz-tikz';

export const Converter = () => {
  const [mode, setMode] = useState<ConverterMode>('math-eq');
  const [latexValue, setLatexValue] = useState('');
  const [typstValue, setTypstValue] = useState('');
  const previewRef = useRef<HTMLDivElement>(null);

  const updatePreview = (value: string) => {
    if (!previewRef.current) return;
    previewRef.current.empty();

    if (!value) return;

    switch (mode) {
      case 'math-eq':
        rendererManager.render(value, previewRef.current, 'display', '/');
        break;
      case 'markup-doc':
      case 'cetz-tikz':
        rendererManager.render(value, previewRef.current, 'typst', '/');
        break;
    }
  };

  useEffect(() => {
    updatePreview(typstValue);
  }, [typstValue, mode]);

  const handleLatexChange = async (val: string) => {
    setLatexValue(val);
    try {
      let result = '';
      switch (mode) {
        case 'math-eq':
          result = await TypstMate.wasm!.latexeq_to_typm(val);
          break;
        case 'markup-doc':
          result = await TypstMate.wasm!.latex_to_typst(val);
          break;
        case 'cetz-tikz':
          result = await TypstMate.wasm!.tikz_to_cetz(val);
          break;
      }
      setTypstValue(result);
    } catch (error) {
      setTypstValue(String(error));
    }
  };

  const handleTypstChange = async (val: string) => {
    setTypstValue(val);
    try {
      let result = '';
      switch (mode) {
        case 'math-eq':
          result = await TypstMate.wasm!.typm_to_latexeq(val);
          break;
        case 'markup-doc':
          result = await TypstMate.wasm!.typst_to_latex(val);
          break;
        case 'cetz-tikz':
          result = await TypstMate.wasm!.cetz_to_tikz(val);
          break;
      }
      setLatexValue(result);
    } catch (error) {
      setLatexValue(String(error));
    }
  };

  const handleCopy = () => {
    const text = mode === 'math-eq' ? `$ ${typstValue} $` : typstValue;
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="typstmate-converter">
      <select
        className="dropdown"
        value={mode}
        onChange={(e) => setMode((e.target as HTMLSelectElement).value as ConverterMode)}
      >
        <option value="math-eq">{t('views.typstTools.converter.mathEquation')}</option>
        <option value="markup-doc">{t('views.typstTools.converter.markupDocument')}</option>
        <option value="cetz-tikz">{t('views.typstTools.converter.cetzTikz')}</option>
      </select>

      <textarea
        className="typstmate-form-control"
        placeholder={t('views.typstTools.converter.latexPlaceholder')}
        value={latexValue}
        onInput={(e) => handleLatexChange((e.target as HTMLTextAreaElement).value)}
      />

      <textarea
        className="typstmate-form-control"
        placeholder={t('views.typstTools.converter.typstPlaceholder')}
        value={typstValue}
        onInput={(e) => handleTypstChange((e.target as HTMLTextAreaElement).value)}
      />

      <div ref={previewRef} className="typstmate-settings-preview-preview" />

      <button className="typstmate-button" onClick={handleCopy}>
        {t('views.typstTools.converter.buttons.copy')}
      </button>
    </div>
  );
};
