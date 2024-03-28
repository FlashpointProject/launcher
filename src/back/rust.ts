import { ContentTree } from '@shared/curate/types';
import * as path from 'path';
import * as fs from 'fs';
import { genContentTree as gct, copyFolder as cf } from '@fparchive/flashpoint-archive';

export async function genContentTree(folder: string): Promise<ContentTree> {
  try {
    const tree = await gct(folder);
    return {
      root: tree,
    };
  } catch (error) {
    log.error('Curate', `Error generating content tree: ${error}`);
    return {
      root: {
        name: '',
        expanded: true,
        nodeType: 'directory',
        children: [],
        count: 0
      }
    };
  }
}

export async function copyFolder(src: string, dest: string): Promise<void> {
  const rootFiles = await fs.promises.readdir(src);
  await Promise.all(rootFiles.map(async (f) => {
    await cf(path.resolve(path.join(src, f)), path.resolve(dest));
  }));
}
