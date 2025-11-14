import { CurationState } from 'flashpoint-launcher';
import uuid from 'uuid';

export function mockCuration(): CurationState {
  const id = uuid();
  return {
    folder: id,
    uuid: id,
    group: 'None',
    contentRequested: false,
    alreadyImported: false,
    warnings: {
      fieldWarnings: [],
      writtenWarnings: []
    },
    game: { title: id },
    addApps: [],
    thumbnail: {
      exists: false,
      version: 0
    },
    screenshot: {
      exists: false,
      version: 0
    },
    fpfssInfo: null
  };
}
