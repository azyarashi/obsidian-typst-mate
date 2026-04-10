# Locales

This directory contains translation files. The JSON structure follows the `i18next` style (e.g., dot-separated keys, `{{variable}}` interpolation).
.

Always write `en.json` first. The TypeScript type [`TranslationKey`](https://github.com/azyarashi/obsidian-typst-mate/blob/main/src/i18n/index.ts) is derived from `en.json`, so all other locale files are type-checked against it.
