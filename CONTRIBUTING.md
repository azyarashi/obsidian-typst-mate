# Contributing to Typst Mate

I appreciate your interest in contributing to this project!
This document is a guide to help make your contribution easier and more effective.

## Getting Started

### Prerequisites

#### System

- JavaScript runtime: [Bun](https://bun.sh)
- Rust runtime: [Rustup](https://rustup.rs)
- Wasm compiler: [wasm-pack](https://drager.github.io/wasm-pack/) (install with `cargo install wasm-pack`)
- Task runner: [Taskfile](https://taskfile.dev)
- Code styler: [Biome](https://biomejs.dev/) (not required beforehand, as it will be installed later with `bun install`)

##### Windows only

These are required because the Taskfile uses GNU OS commands (e.g. `cp`, `mv`, `rm`, `touch`).

1. [MSYS2](https://www.msys2.org/)
2. [coreutils](https://packages.msys2.org/packages/coreutils) (install with `pacman -S coreutils`)
3. Add `C:\msys64\usr\bin` to your `PATH`

#### VSCode

- [Biome](https://biomejs.dev/guides/editors/first-party-extensions/) extension
- [i18n Ally](https://marketplace.visualstudio.com/items?itemName=Lokalise.i18n-ally) extension (Recommended)

#### Obsidian

- [Hot-Reload](https://github.com/pjeby/hot-reload) plugin (install via [BRAT](https://obsidian.md/plugins?id=obsidian42-brat))

### Installation

Clone the repository, move to the directory, and install dependencies

```sh
git clone https://github.com/azyarashi/obsidian-typst-mate.git
cd obsidian-typst-mate
bun install
```

Add your `.env` file

```toml
CONFIG_DIR='/path/to/your_vault/.obsidian'
```

Place static files (`manifest.json`, `.hotreload`) into your vault

```sh
task placestatic
```

## Development

### Scripts

The main scripts used during development are:

- `task wasm-release`: Build the wasm file and copy it to the plugin directory
- `task dev`: Build the plugin files in development mode, copy them to plugin directory, and watch for changes
- `bun check`: Run formatter and linter
- `bun test`: Run tests
- `bun test --watch`: Run tests in watch mode

### Structure

(AI generated)

- `src/`
  - `main.ts`: Entry point of the plugin, managing lifecycle and registering commands/views.
  - `editor/`: CodeMirror 6 extensions and editor logic.
    - `typst/`: Typst-specific editor features.
      - `extensions/decorations/`: Specialized visual features like `ErrorLens` (inline errors), `IndentRainbow`, and `StatusBar` integration.
    - `shared/`: Generic editor enhancements shared between modes.
      - `actions/`: Editor commands like toggling font styles.
      - `decorations/`: General visual decorations.
      - `popup/`: Management for tooltips and contextual popups.
  - `ui/`
    - `views/`
      - `typst-pdf/, typst-text/`: Typst Editor and Previewer.
      - `typst-tools/`: Sidebar tools for Typst-related actions.
    - `settingsTab/`: The plugin's configuration interface.
    - `modals/`: User interaction dialogs and modals.
  - `libs/`: Core logic and bridge to Typst.
    - `typst.ts`: Manager orchestrating Typst initialization, font loading, and rendering.
    - `worker.ts`: Web Worker implementation that hosts the WASM module for non-blocking compilation.
    - `processor.ts`: Logic for handling different Typst rendering kinds (inline, display, and codeblock).
- `wasm/`
  - `world.rs`: Implementation of the Typst `World` trait, providing access to fonts and files.
  - `vfs.rs`: Virtual File System to bridge Typst's file requests with Obsidian's vault.
  - `lib.rs`: Main entry point for `wasm-bindgen` exports to JavaScript.
  - `serde/`: Custom serialization logic for communicating complex data between Rust and JS.
- `packages/`
  - `typst-syntax/`: Pure TypeScript implementation of typst-syntax crate.

You can also refer to [deepwiki](https://deepwiki.com/azyarashi/obsidian-typst-mate).

## How to Contribute

Please open an Issue before submitting a Pull Request.
If you are planning to submit a PR, mention it in the Issue.
