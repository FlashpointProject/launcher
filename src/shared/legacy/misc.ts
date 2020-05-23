import { Legacy_ErrorCopy } from './types';

/** Copy properties from an error to a new object. */
export function Legacy_errorCopy(error: any): Legacy_ErrorCopy {
  if (typeof error !== 'object' || error === null) { error = {}; }
  const copy: Legacy_ErrorCopy = {
    message: error.message+'',
    name: error.name+'',
  };
  // @TODO These properties are not standard, and perhaps they have different types in different environments.
  //       So do some testing and add some extra checks mby?
  if (typeof error.columnNumber === 'number') { copy.columnNumber = error.columnNumber; }
  if (typeof error.fileName     === 'string') { copy.fileName     = error.fileName;     }
  if (typeof error.lineNumber   === 'number') { copy.lineNumber   = error.lineNumber;   }
  if (typeof error.stack        === 'string') { copy.stack        = error.stack;        }
  return copy;
}