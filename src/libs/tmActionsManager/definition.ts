/** 文脈
 * `c` で指定
 */
export const TMActionContexts = [
  'md', // Markdown
  'mjx', // MathJax
  'typ', // Typst
  'typc', // Typst code
  'typm', // Typst math
  'plain', // Typst plain
] as const;
export type TMActionContext = (typeof TMActionContexts)[number];

/** 要件
 * `r` で指定
 */
export const TMActionRequirements = [
  'i', // inline math only (`typm`)
  'b', // block math only (`typm`)
  'I', // inline math only (`mjx`)
  'D', // display math only (`mjx`)
  'T', // `.typ` editor only
  'H', // start of line only
  'E', // end of line only
  'V', // vim normal mode
  'K', // ime conversion mode
] as const;
export type TMActionRequirement = (typeof TMActionRequirements)[number];

/**
 * `e` で指定
 */
export const TMActionExtraActions = [
  'SC', // suggest complete after execute action
  'IS', // insert space beside inserted text
] as const;
export type TMActionExtraAction = (typeof TMActionExtraActions)[number];

/**
 * lowest, low, default, high, highest
 */
export const TMActionPrecedences = [-2, -1, 0, 1, 2] as const;
export type TMActionPrecedence = (typeof TMActionPrecedences)[number];

export type TMPriority = number;

// * トリガー

export const TriggerTypes = [
  'hotkey', // キーボードショートカット (`selected`)
  'long-press', // ロングプレス (`selected`)
  'type', // タイピング
  'regex', // 正規表現 (`match`)
  'complete', // 補完の実行を置き換える (`complete`)
  'none', // なにもしない
] as const;
export type TriggerType = (typeof TriggerTypes)[number];

export interface HotkeyTrigger {
  t: 'hotkey';
  v: string;
  p?: TMActionPrecedence;
}

export interface LongPressTrigger {
  t: 'long-press';
  v: string;
  p?: TMActionPrecedence;
}

export interface TypeTrigger {
  t: 'type';
  v: string;
}

export interface RegexTrigger {
  t: 'regex';
  v: string;
}

export interface CompleteTrigger {
  t: 'complete';
  v: string;
}

export type Trigger = HotkeyTrigger | LongPressTrigger | TypeTrigger | RegexTrigger | CompleteTrigger;

// アクション

export const ActionTypes = ['snippet', 'script', 'commands', 'actions'] as const;
export type ActionType = (typeof ActionTypes)[number];

export interface SnippetAction {
  t: 'snippet';
  v: string;
}

export interface ScriptAction {
  t: 'script';
  v: string;
}

export interface CommandsAction {
  t: 'commands';
  v: string;
}

export interface ActionsAction {
  t: 'actions';
  v: string;
}

export type Action = SnippetAction | ScriptAction | CommandsAction | ActionsAction;

export interface TMActionRaw {
  id?: string;
  /** undefined なら自動的に typm */
  c?: TMActionContext[];
  r?: TMActionRequirement[];
  e?: TMActionExtraAction[];

  /** stringの場合, 1文字なら自動的に 'long-press', そうじゃなければ 'type' */
  trigger: Trigger | string;
  /** stringの場合, 自動的に 'snippet' */
  action: Action | string;

  p?: TMPriority;
}

export interface TMAction {
  id?: string;
  c: TMActionContext[];
  r?: TMActionRequirement[];
  e?: TMActionExtraAction[];
  trigger: Trigger;
  action: Action;
  p?: TMPriority;
}
