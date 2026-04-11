import { Setting } from '@components/obsidian/Setting';
import { useEffect, useState } from 'preact/hooks';
import { TypstMate } from '@/api';
import { tFragment } from '@/i18n';
import { fileManager } from '@/libs';
import { LoadedFontList } from './loadedFontList';
import { SystemFontList } from './systemFontList';

export function FontListContainer() {
  const [importedFonts, setImportedFonts] = useState<string[]>([]);

  const loadImportedFonts = async () => {
    const fonts = await fileManager.getLoadImportedFonts();
    setImportedFonts(fonts);
  };

  useEffect(() => {
    loadImportedFonts();
  }, []);

  return (
    <>
      <Setting
        build={(setting) =>
          setting.setHeading().setDesc(
            tFragment('settings.compiler.fonts.desc', {
              version: TypstMate.typstVersion ? `v${TypstMate.typstVersion}` : 'main',
            }),
          )
        }
      />

      <SystemFontList onImport={loadImportedFonts} importedFonts={importedFonts} />
      <LoadedFontList fonts={importedFonts} onRemove={loadImportedFonts} />
    </>
  );
}
