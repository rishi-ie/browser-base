#!/usr/bin/env node
import { Command } from 'commander';
import { startCommand } from './commands/start.js';
import { installCommand } from './commands/install.js';
import { contextsCommand } from './commands/contexts.js';
import { contextCreateCommand } from './commands/contextCreate.js';
import { actCommand } from './commands/act.js';
import { navigateCommand } from './commands/navigate.js';
import { observeCommand } from './commands/observe.js';
import { extractCommand } from './commands/extract.js';
import { useContextCommand } from './commands/useContext.js';
import { statusCommand } from './commands/status.js';

const program = new Command();

program
  .name('browse-local')
  .description('Self-hosted browser infrastructure for AI coding agents')
  .version('0.1.0');

program.addCommand(startCommand);
program.addCommand(installCommand);
program.addCommand(statusCommand);
program.addCommand(actCommand);
program.addCommand(navigateCommand);
program.addCommand(observeCommand);
program.addCommand(extractCommand);
program.addCommand(useContextCommand);
program.addCommand(contextsCommand);
program.addCommand(contextCreateCommand);

program.parse();
