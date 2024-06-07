import { FPFSS_INFO_FILENAME } from '@shared/curate/fpfss';
import { str } from '@shared/utils/Coerce';
import { ObjectParser } from '@shared/utils/ObjectParser';
import { CurationFpfssInfo } from 'flashpoint-launcher';
import * as fs from 'fs';
import * as path from 'path';

export async function getCurationFpfssInfo(folder: string): Promise<CurationFpfssInfo | null> {
  return fs.promises.readFile(path.join(folder, FPFSS_INFO_FILENAME), { encoding: 'utf-8' })
  .then((dataStr) => {
    return parseCurationFpfssInfo(JSON.parse(dataStr));
  })
  .catch(() => {
    return null;
  });
}

export async function saveCurationFpfssInfo(folder: string, info: CurationFpfssInfo) {
  const data = parseCurationFpfssInfo(info);
  return fs.promises.writeFile(path.join(folder, FPFSS_INFO_FILENAME), JSON.stringify(data, undefined, 2));
}

export function parseCurationFpfssInfo(data: any): CurationFpfssInfo {
  const info: CurationFpfssInfo = {
    id: ''
  };

  const parser = new ObjectParser({
    input: data
  });
  parser.prop('id', v => info.id = str(v));

  return info;
}
