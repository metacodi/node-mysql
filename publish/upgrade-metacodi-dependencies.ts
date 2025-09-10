import chalk from 'chalk';
import * as Prompt from 'commander';

import { Terminal, upgradeDependency } from '@metacodi/node-utils';

/**
 * **Usage**
 *
 * ```bash
 * npx ts-node publish/upgrade-metacodi-dependencies.ts
 * ```
 */

Terminal.title('UPGRADE METACODI');
 
/** {@link https://www.npmjs.com/package/commander#common-option-types-boolean-and-value } */
Prompt.program
  // .requiredOption('-f, --folder <folder>', 'Ruta absoluta de la carpeta i nom del component.')
  // .option('-c, --commit <dir>', 'Descripció pel commit')
  .option('-v, --verbose', 'Log verbose')
;
Prompt.program.parse(process.argv);

const options = Prompt.program.opts();

if (options.verbose) { console.log('Arguments: ', options); }

(async () => {

  try {
  
    Terminal.log(`Actualitzant dependències de ${chalk.bold(`@metacodi`)}`);
  
    await upgradeDependency(`@metacodi/node-utils`, '--save-peer');
    await upgradeDependency(`@metacodi/api-model`, '--save-peer');
  
    Terminal.log(`Dependències actualitzades correctament!`);

  } catch (error) {
    Terminal.error(error);
  }

})();
