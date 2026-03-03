const isXidStartRegex = /^\p{XID_Start}$/u;
const isXidContinueRegex = /^\p{XID_Continue}$/u;

export function isXidStart(c: string): boolean {
  return isXidStartRegex.test(c);
}

export function isXidContinue(c: string): boolean {
  return isXidContinueRegex.test(c);
}
