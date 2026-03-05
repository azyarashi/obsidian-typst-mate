# Locales

This directory contains translation files used by `i18next`. Each JSON file corresponds to a supported locale and maps dot-separated keys to translated strings.

Always write `en.json` first. The TypeScript type [`TranslationKey`](https://github.com/azyarashi/obsidian-typst-mate/blob/main/src/i18n/index.ts) is derived from `en.json`, so all other locale files are type-checked against it.
