import {
  type Action,
  type TMAction,
  TMActionContexts,
  TMActionExtraActions,
  type TMActionRaw,
  TMActionRequirements,
  type Trigger,
} from './definition';

function importCodeAsModule(code: string): Promise<object> {
  const sourceWithSourceURL = `${code}\n//# sourceURL=typst-mate:tmactions`;
  const blob = new Blob([sourceWithSourceURL], { type: 'text/javascript' });
  const url = URL.createObjectURL(blob);

  const result = import(url);

  URL.revokeObjectURL(url);
  return result;
}

export async function importRaw(source: string): Promise<unknown> {
  let data: object;
  try {
    data = await importCodeAsModule(`export default ${source}`);
  } catch (e) {
    console.error(e);
    try {
      data = await importCodeAsModule(source);
    } catch (e) {
      console.error(e);
      throw 'Syntax Error';
    }
  }
  if ('default' in data) {
    return data.default;
  } else {
    throw 'Default export is missing';
  }
}

export function normalizeTMActionRaw(tmaction: TMActionRaw): TMAction {
  const { c: contextsRaw, trigger: triggerRaw, action: actionRaw } = tmaction;
  const contexts = contextsRaw ?? ['typm'];

  const trigger: Trigger =
    typeof triggerRaw === 'string'
      ? {
          t: triggerRaw?.length === 1 ? 'long-press' : 'type',
          v: triggerRaw,
        }
      : triggerRaw;

  const action: Action =
    typeof actionRaw === 'string'
      ? {
          t: 'snippet',
          v: actionRaw,
        }
      : actionRaw;

  return {
    ...tmaction,
    id: tmaction.id ?? '',
    c: contexts,
    trigger,
    action,
  };
}

type MaybeTMAction = TMAction | Record<string, unknown>;
export function validateTMAction(tmaction: MaybeTMAction): asserts tmaction is TMAction {
  const { id, c, r, e, trigger, action, p, ...others } = tmaction;
  if (0 < Object.keys(others).length) throw new Error('Invalid fields are included');

  // id
  if (id !== undefined && typeof id !== 'string') throw new Error('ID is not a string');

  // c
  if (!Array.isArray(c)) throw new Error('Contexts is not an array');
  if (c.length === 0) throw new Error('Contexts is empty');
  const contextsLength = c.filter((context) => TMActionContexts.includes(context)).length;
  if (contextsLength !== c.length) throw new Error('Invalid context is included');

  // r
  if (r) {
    if (!Array.isArray(r)) throw new Error('Requirements is not an array');
    const requirementsLength = r.filter((requirement) => TMActionRequirements.includes(requirement)).length;
    if (requirementsLength !== r.length) throw new Error('Invalid requirement is included');
  }

  // e
  if (e) {
    if (!Array.isArray(e)) throw new Error('Extra actions is not an array');
    const extraActionsLength = e.filter((extraAction) => TMActionExtraActions.includes(extraAction)).length;
    if (extraActionsLength !== e.length) throw new Error('Invalid extra action is included');
  }

  // trigger
  if (!trigger) throw new Error('Trigger is missing');
  if (typeof trigger !== 'object' || trigger === null) throw new Error('Trigger is not an object');
  if (!('t' in trigger)) throw new Error('Trigger type is missing');
  if (!('v' in trigger)) throw new Error('Trigger value is missing');
  switch (trigger.t) {
    case 'hotkey':
    case 'long-press':
      if ('p' in trigger && trigger.p !== undefined && ![-2, -1, 0, 1, 2].includes(trigger.p as any))
        throw new Error('Trigger priority is invalid');
      break;
    case 'type':
    case 'regex':
    case 'complete':
      if (typeof trigger.v !== 'string') throw new Error('Trigger value is not a string');
      if (trigger.v.length === 0) throw new Error('Trigger value is empty');
      break;

    default:
      throw new Error('Trigger type is invalid');
  }

  // action
  if (!action) throw new Error('Action is missing');
  if (typeof action !== 'object' || action === null) throw new Error('Action is not an object');
  if (!('t' in action)) throw new Error('Action type is missing');
  if (!('v' in action)) throw new Error('Action value is missing');
  switch (action.t) {
    case 'snippet':
    case 'script':
    case 'commands':
    case 'actions':
      if (typeof action.v !== 'string') throw new Error('Action value is not a string');
      if (action.v.length === 0) throw new Error('Action value is empty');
      break;
    default:
      throw new Error('Action type is invalid');
  }

  // p
  if (p !== undefined && (typeof p !== 'number' || !Number.isFinite(p)))
    throw new Error('Priority is not a finite number');
}
