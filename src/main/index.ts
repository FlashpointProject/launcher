import { app } from 'electron';
import { parseArgs } from 'node:util';
import { main } from './Main';
import { Init } from './types';

const init = getArgs();

main(init);

function getArgs(): Init {
  const rawArgs = process.argv.slice(app.isPackaged ? 1 : 2);

  const { values, positionals } = parseArgs({
    args: rawArgs,
    options: {
      'browser-mode-url': { type: 'string' },
      'browser-mode-host': { type: 'string' },
      'browser-mode-port': { type: 'string' },
      'browser-mode': { type: 'boolean' },
      'connect-remote': { type: 'string' },
      'plugin': { type: 'string' },
      'logger': { type: 'boolean' },
      'host-remote': { type: 'boolean' },
      'back-only': { type: 'boolean' },
      'verbose': { type: 'boolean' },
      'width': { type: 'string' },
      'height': { type: 'string' }
    },
    allowPositionals: true
  });

  const init: Init = {
    args: { ...values },
    rest: positionals.join(' '),
    protocol: rawArgs.find((arg) => arg.startsWith('flashpoint://'))
  };

  console.log(init);

  return init;
}
