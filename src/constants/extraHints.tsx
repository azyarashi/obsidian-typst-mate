import { ChangeSet } from '@codemirror/state';
import type { EditorView } from '@codemirror/view';
import type { JSX } from 'preact';
import type { TypstDiagnostic } from '@/editor';

import './extraHints.css';

export function getExtraHints(view: EditorView, diag: TypstDiagnostic, doc: string): JSX.Element[] {
  const { message, from, to } = diag;
  const line = view.state.doc.lineAt(from);
  const u = line.text.slice(0, from - line.from);
  const c = doc.slice(from, to);
  const d = u.endsWith('#');

  const extraHints: JSX.Element[] = [];

  const applyChange = (
    change: { from: number; to?: number; insert: string },
    selectInNew?: { from: number; to: number },
  ) => {
    const transaction = view.state.update({
      changes: ChangeSet.of([change], view.state.doc.length),
      selection: selectInNew
        ? { anchor: change.from + selectInNew.from, head: change.from + selectInNew.to }
        : undefined,
      scrollIntoView: true,
    });
    view.dispatch(transaction);
  };
  const Action = ({ label, onClick }: { label: string; onClick: () => void }) => (
    <button
      className="typstmate-button-link"
      onClick={(e) => {
        e.preventDefault();
        onClick();
      }}
    >
      {label}
    </button>
  );
  const Escape = (char: string, offset: number = 0, article: boolean = true) => (
    <>
      Do you want to type {article ? (['a', 'e', 'i', 'o', 'u'].includes(char[0]!.toLowerCase()) ? 'an' : 'a') : ''}{' '}
      {char}? Escape it{' '}
      <Action
        label="by adding a backslash before it"
        onClick={() => applyChange({ from: from + offset, insert: '\\' })}
      />
      .
    </>
  );

  if (message === 'expected expression' || message === 'unexpected end of file') {
    if (d) {
      extraHints.push(Escape('hash', -1, false));
      extraHints.push(
        <>
          Do you want to add an expression (e.g. a set rule)? Type it after the hash.{' '}
          <a href="https://typst.app/docs/reference/scripting">Learn more here</a>.
        </>,
      );
    }

    const reForArr = /for\s+[^\s+:!"§$%&/()=?`*'#,]+\s+in\s*$/;
    const reForDict = /for\s+\(\s*[^\s+:!"§$%&/()=?`*'#,]+\s*,\s*[^\s+:!"§$%&/()=?`*'#,]\s*\)\s*in\s*$/;
    const reShowColon = /show\s*:\s*$/;

    if (reForArr.test(u) || reForDict.test(u)) {
      extraHints.push(
        <>
          Do you want to iterate over a previously defined array?{' '}
          <Action
            label="Add its identifier"
            onClick={() => applyChange({ from, insert: 'identifier ' }, { from: 0, to: 10 })}
          />
          .
        </>,
      );
    } else if (reShowColon.test(u)) {
      extraHints.push(
        <>
          Do you want to use a previously defined function in this show rule?{' '}
          <Action
            label="Add its name after the colon"
            onClick={() => applyChange({ from: to, insert: ' my-function' }, { from: 1, to: 12 })}
          />
          .
        </>,
      );
    } else if (!d) {
      extraHints.push(
        <>
          Do you want to perform maths?{' '}
          <Action label="Insert an arithmetic expression" onClick={() => applyChange({ from, insert: ' 1 + 4' })} />.
        </>,
      );
      extraHints.push(
        <>
          Do you want to add some markup?{' '}
          <Action
            label="Insert a content block"
            onClick={() => applyChange({ from, insert: ' [My *content*]' }, { from: 2, to: 14 })}
          />
          .
        </>,
      );
    }

    return extraHints;
  }

  if (message === 'unclosed delimiter') {
    const smartClose = (char: string, label: string, desc: string) => (
      <>
        Do you want to {desc}?{' '}
        <Action
          label={`Add a second ${label}`}
          onClick={() => {
            const suffix = view.state.doc.sliceString(to, Math.min(to + 128, view.state.doc.length));
            const match = /[^\p{L}]/u.exec(suffix);
            const pos = (match?.index ?? suffix.length) + to;
            applyChange({ from: pos, insert: char });
          }}
        />{' '}
        to emphasize the text between them.
      </>
    );

    const hashCheck = (label: string) => {
      const hashPos = u.lastIndexOf('#') + line.from;
      return (
        <>
          Do you want to type a {label}?{' '}
          <Action label="Remove" onClick={() => applyChange({ from: hashPos, to: hashPos + 1, insert: '' })} /> or{' '}
          <Action label="escape" onClick={() => applyChange({ from: hashPos, insert: '\\' })} /> the hash to insert it.
        </>
      );
    };

    switch (c) {
      case '*':
        extraHints.push(smartClose('*', 'asterisk', 'strongly emphasize some content'));
        extraHints.push(Escape('asterisk'));
        break;
      case '_':
        extraHints.push(smartClose('_', 'underscore', 'emphasize some content'));
        extraHints.push(Escape('underscore'));
        break;
      case '$':
        extraHints.push(smartClose('$', 'dollar sign', 'insert math'));
        extraHints.push(Escape('dollar sign'));
        break;
      case '[':
        extraHints.push(
          <>
            Do you want to add a markup block?{' '}
            <Action label="Add a second square bracket" onClick={() => applyChange({ from: to, insert: ']' })} /> to add
            a markup block.
          </>,
        );
        if (d) extraHints.push(hashCheck('square bracket'));
        break;
      case '{':
        extraHints.push(
          <>
            Do you want to add a code block?{' '}
            <Action label="Add a second curly brace" onClick={() => applyChange({ from: to, insert: '}' })} /> to group
            multiple expressions together.
          </>,
        );
        if (d) extraHints.push(hashCheck('curly brace'));
        break;
      case '(':
        extraHints.push(
          <>
            Do you want to add a parenthesized expression?{' '}
            <Action label="Add a second parenthesis" onClick={() => applyChange({ from: to, insert: ')' })} /> to create
            a larger expression.
          </>,
        );
        if (d) extraHints.push(hashCheck('parenthesis'));
        break;
    }

    return extraHints;
  }

  if (message.startsWith('unknown variable:')) {
    extraHints.push(
      <>
        Do you want to access a feature of Typst? This is likely misspelled,{' '}
        <a href="https://typst.app/docs/reference/">see the reference</a> for all available functions.
      </>,
    );
    extraHints.push(
      <>
        Do you want to access a custom variable? Remember to{' '}
        <Action
          label="define it"
          onClick={() => {
            const startOfDoc = 0;
            applyChange({ from: startOfDoc, insert: `#let ${c} = \n` }, { from: 5 + c.length, to: 5 + c.length });
          }}
        />{' '}
        first.
      </>,
    );
    if (d) extraHints.push(Escape(`'#${c}'`, -1, false));

    return extraHints;
  }

  if (message === 'expected comma') {
    extraHints.push(
      <>
        Do you want to pass multiple arguments to a function?{' '}
        <Action label="Separate them with a comma" onClick={() => applyChange({ from, insert: ',' })} />.
      </>,
    );

    return extraHints;
  }

  if (message === 'expected identifier') {
    if (/for\s*$/.test(u)) {
      extraHints.push(
        <>
          Do you want to iterate over values or just a preset number of times?{' '}
          <Action
            label="Write the loop head for arrays"
            onClick={() => applyChange({ from, insert: ' x in ' }, { from: 1, to: 2 })}
          />
          .
        </>,
      );
    } else if (/let\s*$/.test(u)) {
      extraHints.push(
        <>
          Do you want to assign a value to a variable?{' '}
          <Action
            label="Define the variable"
            onClick={() => applyChange({ from, insert: ' my-variable = ' }, { from: 1, to: 12 })}
          />
          .
        </>,
      );
    }

    return extraHints;
  }

  if (message.includes('label') && message.includes('does not exist')) {
    const rawLabel = c.replace(/^@/, '');
    extraHints.push(
      <>
        Do you want to reference an existing label? Check the spelling or{' '}
        <Action
          label="create a heading with this label"
          onClick={() => applyChange({ from: view.state.doc.length, insert: `\n\n= Heading <${rawLabel}>` })}
        />
        .
      </>,
    );

    return extraHints;
  }

  if (message === 'unclosed raw text') {
    const backticks = c.match(/^`+/)?.[0] || '`';
    extraHints.push(
      <>
        Do you want to include a code sample? Close the code block by{' '}
        <Action label={`adding ${backticks}`} onClick={() => applyChange({ from: to, insert: backticks })} />.
      </>,
    );

    return extraHints;
  }

  if (message === 'unclosed string') {
    extraHints.push(
      <>
        The string needs to be closed with another double quote.{' '}
        <Action label="Add it" onClick={() => applyChange({ from: to, insert: '"' })} />.
      </>,
    );

    return extraHints;
  }

  if (message === 'unclosed label') {
    extraHints.push(
      <>
        Do you want to insert a label?{' '}
        <Action label="Add a closing angle bracket" onClick={() => applyChange({ from: to, insert: '>' })} />.
      </>,
    );

    return extraHints;
  }

  if (message === 'expected colon') {
    extraHints.push(
      <>
        Try <Action label="inserting a colon" onClick={() => applyChange({ from: to, insert: ':' })} /> to fix this
        error.
      </>,
    );

    return extraHints;
  }

  if (message === 'document set rules must appear before any content') {
    extraHints.push(
      <Action
        label="Move the set rule to the top of the document."
        onClick={() => {
          const ruleText = doc.slice(from - 1, to);
          applyChange({ from: from - 1, to, insert: '' });
          applyChange({ from: 0, insert: `${ruleText}\n` });
        }}
      />,
    );

    return extraHints;
  }

  if (message === 'expected semicolon or line break') {
    extraHints.push(
      <>
        Separate the two expressions with a{' '}
        <Action label="line break" onClick={() => applyChange({ from, insert: '\n' })} />.
      </>,
    );
    extraHints.push(
      <>
        Separate the two expressions with a{' '}
        <Action label="semicolon" onClick={() => applyChange({ from, insert: ';' })} />.
      </>,
    );

    return extraHints;
  }

  const reUnexpectedChar = /^the character `(\S)` is not valid in code$/;
  const matchChar = reUnexpectedChar.exec(message);
  if (matchChar) {
    const char = matchChar[1];
    extraHints.push(<Action label={`Remove '${char}'.`} onClick={() => applyChange({ from, to, insert: '' })} />);

    return extraHints;
  }

  if (message === 'expected block') {
    extraHints.push(
      <>
        Do you want to insert predominantly markup and text?{' '}
        <Action label="Open a content block" onClick={() => applyChange({ from, insert: '[]' }, { from: 1, to: 1 })} />.
      </>,
    );
    extraHints.push(
      <>
        Do you want to insert predominantly code?{' '}
        <Action label="Open a code block" onClick={() => applyChange({ from, insert: '{}' }, { from: 1, to: 1 })} />.
      </>,
    );

    return extraHints;
  }

  if (message === 'expected argument list') {
    extraHints.push(
      <>
        <Action label="Add parentheses" onClick={() => applyChange({ from, insert: '()' }, { from: 1, to: 1 })} /> and,
        if necessary, add your arguments inside.
      </>,
    );

    return extraHints;
  }

  if (message === 'missing argument: body') {
    extraHints.push(
      <>
        Add the body for this function{' '}
        <Action label="in square brackets" onClick={() => applyChange({ from: to, insert: '[My body]' })} />.
      </>,
    );

    return extraHints;
  }

  if (message.includes('does not contain field')) {
    const reField = /^function `(.+)` does not contain field `(.+)`$/;
    const matchField = reField.exec(message);
    if (matchField) {
      const field = matchField[2];
      extraHints.push(
        <>
          <Action
            label={`Remove the '${field}' field.`}
            onClick={() => applyChange({ from: from - 1, to, insert: '' })}
          />
          .
        </>,
      );
    }

    return extraHints;
  }

  if (message === 'only element functions can be used as selectors') {
    extraHints.push(
      <>
        Show and set rules and queries only work with element functions.{' '}
        <a href="https://typst.app/docs/reference/styling#selectors">Consult the reference</a> to learn which element
        functions are available.
      </>,
    );

    return extraHints;
  }

  return extraHints;
}
