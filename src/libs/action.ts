export const ActionContexts = ['Markdown', 'MathJax', 'Markup', 'Code', 'Math', 'Opaque', 'Vim'] as const;
export type ActionContext = (typeof ActionContexts)[number];

export const TriggerTypes = ['hotkey', 'long-press', 'type', 'regex', 'none'] as const;
export type TriggerType = (typeof TriggerTypes)[number];

export const ActionTypes = ['snippet', 'script', 'command', 'action'] as const;
export type ActionType = (typeof ActionTypes)[number];

export interface Action {
  id: string;
  contexts: ActionContext[];
  trigger: {
    t: TriggerType;
    v: string;
  };
  action: {
    t: ActionType;
    v: string;
  };
}

export const newAction: Action = {
  id: 'new-action',
  contexts: ['Math'],
  trigger: {
    t: 'type',
    v: '(・ω・っ)3',
  },
  action: {
    t: 'snippet',
    v: '#.0',
  },
};

import type { ComponentChildren } from 'preact';
import { ICONS } from '@/constants/icons';

export const CONTEXT_ICON_MAP: Record<ActionContext, ComponentChildren> = {
  Markdown: ICONS.FileText,
  MathJax: ICONS.Sigma,
  Markup: ICONS.Code,
  Code: ICONS.Code,
  Math: ICONS.Sigma,
  Opaque: ICONS.Zap,
  Vim: ICONS.Keyboard,
};
