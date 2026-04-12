import en from '@resources/locales/en.json';
import ja from '@resources/locales/ja.json';

import { I18n } from '@typst-mate/i18n';

const resources = {
  en: { translation: en },
  ja: { translation: ja },
} as const;

type MyResources = typeof resources;
type SupportedLngs = keyof MyResources & string;

const i18n = I18n.createInstance<MyResources>();
function detectLocale(): SupportedLngs {
  const locale = localStorage.getItem('language')?.toLowerCase();
  if (locale && locale in resources) return locale as SupportedLngs;

  console.warn(`Unsupported locale detected: ${locale}, using 'en'`);
  return 'en';
}

export async function initI18n(): Promise<void> {
  await i18n.init({
    lng: detectLocale(),
    fallbackLng: 'en',
    defaultNS: 'translation',
    resources,
  });
}

export type InterpolationValues = Record<string, string | number>;

export type TranslationKey = Parameters<typeof i18n.t>[0];

export const t = i18n.t;
export type TFunction = typeof t;

export { tFragment } from './fragment';
