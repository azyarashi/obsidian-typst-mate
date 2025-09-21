# Snippet

Snippets can only be used in *inline math* or *display math*.

## How to Use

Enter @-mode by typing `@` after a-zA-Z character(s).
In this mode, `@` turns rainbow-colored and the input method changes.
In this state, keyboard input will enter characters before the `@` (or inside parentheses).
For operations like completion and execution, refer to the following:

|Role|Command|
|---|---|
|Select|`↑ Key`, `↓ Key` / `Mouse Over`, `Scroll`|
|Complete|`→ Key`, `Tab Key`|
|Execute|`Enter Key` / `Click`, `Touch`|

(\*script snippets will complete instead of execute)

## #CURSOR

When a snippet is executed, the first `#CURSOR` is removed and the cursor moves there.
Also, pressing the Tab key moves to the next `#CURSOR`.

## Script Mode

The value inside parentheses before `@` is passed as a string to `value`.
Additionally, the `window` object is also passed.
You can execute JavaScript using these.
The value must be returned with a `return` statement.
