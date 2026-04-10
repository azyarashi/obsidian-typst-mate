export const ActionContexts = ['Markdown', 'MathJax', 'Markup', 'Code', 'Math', 'Opaque', 'Vim'] as const;
export type ActionContext = (typeof ActionContexts)[number];

export const TriggerTypes = ['hotkey', 'long-press', 'type', 'regex'] as const;
export type TriggerType = (typeof TriggerTypes)[number];

export const ActionTypes = ['snippet', 'script', 'command'] as const;
export type ActionType = (typeof ActionTypes)[number];

export interface ActionDef {
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

export const newActionDef: ActionDef = {
  id: 'new-action',
  contexts: ['Markdown', 'Vim'],
  trigger: {
    t: 'hotkey',
    v: 'mod-alt-t',
  },
  action: {
    t: 'snippet',
    v: '#CURSOR',
  },
};

import type { Child } from 'hono/jsx';
import { ICONS } from '@/constants/icons';

export const CONTEXT_ICON_MAP: Record<ActionContext, Child> = {
  Markdown: ICONS.FileText,
  MathJax: ICONS.Sigma,
  Markup: ICONS.Code,
  Code: ICONS.Code,
  Math: ICONS.Sigma,
  Opaque: ICONS.Zap,
  Vim: ICONS.Keyboard,
};
