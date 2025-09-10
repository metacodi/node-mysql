#!/usr/bin/env node
import chalk from 'chalk';
import * as Prompt from 'commander';
import moment from 'moment';

import { upgradeDependency, Terminal, Resource, ResourceType } from '@metacodi/node-utils';
import { DatabaseConnection } from '@metacodi/api-model';

import { MySqlDatabase } from '../src/mysql-database';
import { Pool } from 'mysql2';


/**
 * **Usage**
 *
 * ```bash
 * npx ts-node test/retrieve-schema.ts
 * ```
 */

Terminal.title('TEST mysql-database');

/** {@link https://www.npmjs.com/package/commander#common-option-types-boolean-and-value } */
Prompt.program
  // .requiredOption('-f, --folder <folder>', 'Ruta absoluta de la carpeta i nom del component.')
  .option('-u, --upgrade', 'Upgrade metacodi dependencies')
  .option('-v, --verbose', 'Log verbose')
;
Prompt.program.parse(process.argv);

const promptOpts = Prompt.program.opts();

if (promptOpts.verbose) { console.log('Arguments: ', promptOpts); }

(async () => {
  try {

    const scope = Resource.open(`test/resources/test-api-credentials.json`, { parseJsonFile: true }) as { env: 'dev' | 'pre' | 'pro', credentials: DatabaseConnection};

    const mysql = new MySqlDatabase('dev', scope.credentials);

    await mysql.retrieveSchema();

    Resource.save(`test/retrieve-schema.json`, JSON.stringify(mysql.tables, null, '  '));


  } catch (error) {
    Terminal.error(error);
  }

  Terminal.line();

})();
