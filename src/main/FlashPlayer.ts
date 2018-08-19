import { spawn } from 'child_process'; 
import * as path from 'path';

export default class FlashPlayer {
  constructor(
		private flashpointPath: string,
  ) {};

  launch(applicationPath: string, args: string[]) {
    const root: string = this.flashpointPath + '/Arcade';
    const filename: string = path.resolve(root, applicationPath);

    const env = process.platform === 'linux'
      ? { ...process.env, http_proxy: 'http://localhost:22500/' }
      : process.env;

    spawn(filename, args, { env });
  }
}
