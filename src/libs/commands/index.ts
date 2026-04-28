import type { Command } from 'obsidian';
import type ObsidianTypstMate from '@/main';
import { formatTypstCommand } from './format-typst';
import { boxEquationCommand, selectEquationCommand } from './latex-suite';
import { openTypstToolsCommand } from './open-typst-tools';
import { reloadTagFilesCommand } from './reload-tag-files';
import { tex2typCommand } from './tex2typ';
import { toggleBackgroundRenderingCommand } from './toggle-background-rendering';

export type CommandGen = () => Command;

export function registerCommands(plugin: ObsidianTypstMate) {
  const commands: CommandGen[] = [
    openTypstToolsCommand,
    toggleBackgroundRenderingCommand,
    tex2typCommand,
    reloadTagFilesCommand,
    boxEquationCommand,
    selectEquationCommand,
    formatTypstCommand,
  ];

  for (const command of commands) plugin.addCommand(command());
}
