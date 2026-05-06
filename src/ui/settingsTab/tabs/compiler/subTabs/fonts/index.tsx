import { useEffect, useState } from 'preact/hooks';
import { TypstMate } from '@/api';
import { fileManager } from '@/libs';
import { tFragment } from '@/libs/i18n';
import { Setting } from '@/ui/components/obsidian/Setting';
import { LoadedFontList } from './imported';
import { SystemFontList } from './local';

export function FontListContainer() {
  const [importedFonts, setImportedFonts] = useState<string[]>([]);

  const loadImportedFonts = async () => {
    const fonts = await fileManager.collectFonts();
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
