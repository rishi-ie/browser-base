#!/usr/bin/env node
import { Command } from 'commander';
import { startCommand } from './commands/start.js';
import { installCommand } from './commands/install.js';
import { contextsCommand } from './commands/contexts.js';
import { contextCreateCommand } from './commands/contextCreate.js';

const program = new Command();

program
  .name('browse-local')
  .description('Self-hosted browser infrastructure for AI coding agents')
  .version('0.1.0');

program.addCommand(startCommand);
program.addCommand(installCommand);
program.addCommand(contextsCommand);
program.addCommand(contextCreateCommand);

program.parse();
