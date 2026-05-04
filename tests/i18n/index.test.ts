import { I18n } from '@typstmate/i18n';
import { beforeAll, describe, expect, it } from 'bun:test';
import en from '@/resources/locales/en.json5';

describe('i18n integration', () => {
  const i18n = I18n.createInstance();

  beforeAll(async () => {
    await i18n.init({
      lng: 'en',
      fallbackLng: 'en',
      defaultNS: 'translation',
      resources: { en: { translation: en } },
    });
  });

  it('translates a key', () => {
    expect(i18n.t('commands.openTypstTools')).toBe('Open Typst Tools');
  });

  it('returns the key for missing translations', () => {
    expect(i18n.t('nonexistent.key')).toBe('nonexistent.key');
  });

  it('interpolates values', () => {
    expect(i18n.t('notices.exportedTo', { path: 'out.pdf' })).toBe('Exported to out.pdf');
  });
});
