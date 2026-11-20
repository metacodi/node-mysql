import * as Prompt from 'commander';

import { publishPackage, Terminal, upgradeDependency } from '@metacodi/node-utils';

/**
 * **Usage**
 *
 * ```bash
 * pnpm exec ts-node publish\publish.ts   
 * ```
 */

Terminal.title('PUBLISH');

/** {@link https://www.npmjs.com/package/commander#common-option-types-boolean-and-value } */
Prompt.program
  .option('-v, --verbose', 'Log verbose')
  .option('-c, --commit <message>', 'Descripció del commit')
  .option('-r, --republish', 'Republica sense incrementar la versió del package.json')
;
Prompt.program.parse(process.argv);

const promptOpts = Prompt.program.opts();
Terminal.verboseEnabled = !!promptOpts.verbose;

if (promptOpts.verbose) { console.log('Arguments: ', promptOpts); }

(async () => {
  try {

    await publishPackage({
      verbose: !!promptOpts.verbose,
      commitMessage: promptOpts.commit,
      incrementVersion: !promptOpts.republish,
      removeCurrentVersion: !!promptOpts.republish,
    });

  } catch (error) {
    Terminal.error(error);
  }
  Terminal.line();
})();
