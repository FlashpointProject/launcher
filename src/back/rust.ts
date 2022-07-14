import { ContentTree } from '@shared/curate/types';
import * as path from 'path';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const rust = require('../fp-rust.node');

export async function genContentTree(folder: string): Promise<ContentTree> {
  try {
    const tree = JSON.parse(await rust.genContentTree(folder));
    return {
      root: tree,
    };
  } catch (error) {
    log.error('Curate', `Error generating content tree: ${error}`);
    return {
      root: {
        name: '',
        expanded: true,
        type: 'directory',
        children: [],
        count: 0
      }
    };
  }
}

export async function copyFolder(src: string, dest: string): Promise<void> {
  return rust.copyFolder(path.resolve(src), path.resolve(dest));
}
