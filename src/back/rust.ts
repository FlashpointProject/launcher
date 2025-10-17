import { copyFolder as cf, genContentTree as gct } from '@fparchive/flashpoint-archive';
import { ContentTree } from '@shared/curate/types';
import * as fs from 'node:fs';
import * as path from 'node:path';

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
