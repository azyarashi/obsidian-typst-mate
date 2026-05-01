import { StateEffect, StateField } from '@codemirror/state';

export interface TabStopState {
  activeGroup: number | null;
  maxGroup: number;
  originCursor: number | null;
  isJustExecuted: boolean;
}

export const setTabStopEffect = StateEffect.define<TabStopState>();
export const clearTabStopEffect = StateEffect.define<void>();

export const tabStopField = StateField.define<TabStopState>({
  create: () => ({ activeGroup: null, maxGroup: 0, originCursor: null, isJustExecuted: false }),
  update(state, tr) {
    let newState = state;
    let effectApplied = false;

    for (const effect of tr.effects) {
      if (effect.is(setTabStopEffect)) {
        newState = effect.value;
        effectApplied = true;
      } else if (effect.is(clearTabStopEffect)) {
        newState = { activeGroup: null, maxGroup: 0, originCursor: null, isJustExecuted: false };
        effectApplied = true;
      }
    }

    if (!effectApplied) {
      // If the user types or moves the cursor after a tabstop jump, it's no longer "just executed"
      if ((tr.docChanged || tr.selection) && newState.isJustExecuted) {
        newState = { ...newState, isJustExecuted: false };
      }
    }

    return newState;
  },
});
