# Contributing to Typst Mate

I appreciate your consideration to contribute to this project!
This document is a guide to help make your contribution easier and more effective.

## Getting Started

### Prerequisites

- JavaScript runtime: [Bun](https://bun.sh)
- Rust runtime: [Rustup](https://rustup.rs)
- Wasm compiler: [wasm-pack](https://drager.github.io/wasm-pack/) (install with `cargo install wasm-pack`)
- Task runner: [Taskfile](https://taskfile.dev)
- Code styler: [Biome](https://biomejs.dev/) and the [its IDE extension](https://biomejs.dev/guides/editors/first-party-extensions/)
- Hot-Reload Plugin: [Hot-Reload](https://github.com/obsidianmd/obsidian-hot-reload) (install via [BRAT](https://obsidian.md/plugins?id=obsidian42-brat))

#### Windows only

These are required because the Taskfile uses GNU OS commands (e.g. `cp`, `mv`, `rm`, `touch`).
1. [MSYS2](https://www.msys2.org/)
2. [coreutils](https://packages.msys2.org/packages/coreutils) (install with `pacman -S coreutils`)
3. add `C:\msys64\usr\bin` to your `PATH`

### Installation

1. Clone the repository, move to the directory and install dependencies

```bash
git clone https://github.com/azyarashi/obsidian-typst-mate.git
cd obsidian-typst-mate
bun install
```

2. Add your `.env` file

```
CONFIG_DIR='/path/to/your_vault/.obsidian'
```

3. Place static files into your vault

```
task placestatic
```

## Development

### Scripts

The main scripts used during development are:

- `task wasm`: Build the wasm file in development mode and copy it to the plugin directory
- `task dev`:  Build the plugin files in development mode, copy them to plugin directory, and watch for changes
- `bun check`: Run formatter and linter

### Important

- The `3.0.0` branch is under active development and may not work correctly. It contains large-scale changes to the code logic. Please use the `main` branch.

### Structure (before 3.0.0)

- `src/core/editor/`: inline preview and autocomplete(snippet/symbol)
- `src/core/settings/`, `src/ui/modals/`: settings tab UI
- `wasm/`, `src/libs/typst.ts`, `src/libs/worker.ts`, `src/ui/elements/Typst.ts`: typst core logic

## How to Contribute

Please open an Issue before submitting a Pull Request.
If you are planning to submit a PR, mention it in the Issue.

