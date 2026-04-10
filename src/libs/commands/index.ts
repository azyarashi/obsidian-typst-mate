import type ObsidianTypstMate from '@/main';
import { formatTypstCommand } from './format-typst';
import { boxEquationCommand, selectEquationCommand } from './latexSuite';
import { openTypstToolsCommand } from './open-typst-tools';
import { reloadTagFilesCommand } from './reload-tag-files';
import { tex2typCommand } from './tex2typ';
import { toggleBackgroundRenderingCommand } from './toggle-background-rendering';

export function registerCommands(plugin: ObsidianTypstMate) {
  plugin.addCommand(openTypstToolsCommand);
  plugin.addCommand(toggleBackgroundRenderingCommand);
  plugin.addCommand(tex2typCommand);
  plugin.addCommand(reloadTagFilesCommand);
  plugin.addCommand(boxEquationCommand);
  plugin.addCommand(selectEquationCommand);
  plugin.addCommand(formatTypstCommand);
}
