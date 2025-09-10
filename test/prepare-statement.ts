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
 * npx ts-node test/prepare-statement.ts
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

    // const sql = 'UPDATE `taula` SET field1 = :param_1, field2 = :param_2, \'concepto\' = "s\'u "":madre" \'\' WHERE id = :id';
    // const params = mysql.parseNamedParams(sql);    
    // let replaced = mysql.replaceNamedParams(sql, params);
    // let numbered = mysql.replaceNamedParams(sql, params, { numbered: true });
    // console.log({ sql, params, replaced, numbered });

    const users = await mysql.query<any[]>('SELECT id, email FROM `users` ORDER BY id');
    const statement = await mysql.prepare('select-user-devices', 'SELECT id, id_user FROM `devices` WHERE id = :idFakeId1 OR id_user = :id_user OR id = :idFakeId2');


    for (const user of users) {
      const values = { idFakeId2: 2222222222, idFakeId1: 1111111111, id_user: user.id };
      const [ devices ] = await statement.execute(values);
      user.devices = devices;
    }

    statement.close();

    Resource.save(`test/prepare-statement.json`, JSON.stringify(users, null, '  '));

  } catch (error) {
    Terminal.error(error);
  }

  Terminal.line();

})();
