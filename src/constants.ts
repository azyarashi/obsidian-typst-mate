export const PLUGIN_ID = 'typst-mate';
export const DEFAULT_FONT_SIZE = 16;
export const BASE_COLOR_VAR = '--typst-base-color';
export const TYPST_SVG_FILL =
  '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><g transform="translate(50 50) scale(3.687) translate(-7.22315 -12.20305)"><path d="M7.88785 18.1481C7.88785 19.2805 8.05033 20.0404 8.3753 20.4278C8.70026 20.8152 9.29111 21.0089 10.1478 21.0089C11.0341 21.0089 12.1715 20.5619 13.56 19.6679L14.4463 21.143C11.8465 23.3184 9.70471 24.4061 8.02079 24.4061C6.33687 24.4061 5.00745 24.0038 4.03255 23.1992C3.05765 22.3648 2.5702 20.9046 2.5702 18.8186V7.10728H0.35451L0 5.45338L2.5702 4.64879V2.45849L7.88785 0V4.91699L13.1169 4.51469L12.6294 7.42018L7.88785 7.24138V18.1481Z" fill="currentColor"/></g></svg>';
export const TYPST_SVG_STROKE = TYPST_SVG_FILL.replace(
  'fill="currentColor"',
  'fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"',
);
