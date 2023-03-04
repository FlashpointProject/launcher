import { EditAddAppCurationMeta, EditCurationMeta } from './OLD_types';

/** Return value type of the parseCurationMeta function. */
export type ParsedCurationMeta = {
  /** Meta data of the game. */
  game: EditCurationMeta;
  /** Meta data of the additional applications. */
  addApps: EditAddAppCurationMeta[];
};

export function generateExtrasAddApp(folderName: string) : EditAddAppCurationMeta {
  return {
    heading: 'Extras',
    applicationPath: ':extras:',
    launchCommand: folderName
  };
}

export function generateMessageAddApp(message: string) : EditAddAppCurationMeta {
  return {
    heading: 'Message',
    applicationPath: ':message:',
    launchCommand: message
  };
}
