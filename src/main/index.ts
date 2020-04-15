import { Coerce } from '@shared/utils/Coerce';
import { flash } from './Flash';
import { main } from './Main';
import { Init } from './types';

const init = getArgs();

if (init.args['flash']) {
  flash(init);
} else {
  main(init);
}

function getArgs(): Init {
  const init: Init = {
    args: {},
    rest: '',
  };

  const args = process.argv.slice(2);
  let lastArgIndex = -1;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const eqIndex = arg.indexOf('=');
    if (eqIndex >= 0) {
      const name = arg.substr(0, eqIndex);
      const value = arg.substr(eqIndex + 1);
      switch (name) {
        // String value
        case 'connect-remote':
        case 'plugin':
          init.args[name] = value;
          lastArgIndex = i;
          break;
        // Boolean value
        case 'host-remote':
        case 'back-only':
        case 'flash':
          init.args[name] = Coerce.strToBool(value);
          lastArgIndex = i;
          break;
        // Numerical value
        case 'width':
        case 'height':
          init.args[name] = Coerce.num(value);
          lastArgIndex = i;
          break;
      }
    }
  }

  init.rest = args.slice(lastArgIndex + 1).join(' ');

  console.log(init); // @DEBUG

  return init;
}
