import { Notice } from 'obsidian';

export function noticeMessage(message: string, duration?: number) {
  new Notice(`[Typst Mate] ${message}`, duration);
}

export function consoleWarn(message: any, obj?: unknown) {
  console.warn(message, obj);
}
export function noticeWarning(message: string, warn?: { message: any; obj?: unknown }, duration?: number) {
  if (warn) consoleWarn(warn);
  noticeMessage(message, duration);
}

export function consoleError(message: any, obj?: unknown) {
  console.error(message, obj);
}
export function noticeError(message: string, error?: { message: any; obj?: unknown }, duration?: number) {
  if (error) consoleError(error);
  noticeMessage(message, duration);
}
