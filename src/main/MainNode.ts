import { BackInitArgs } from '@shared/back/types';
import { fork } from 'child_process';
import * as path from 'path';

main();

async function main() {
  const cwd = process.cwd();
  const msg: BackInitArgs = {
    configFolder: cwd,
    isDev: true,
    verbose: false,
    // On windows you have to wait for app to be ready before you call app.getLocale() (so it will be sent later)
    localeCode: 'en',
    exePath: cwd,
    acceptRemote: false,
  };

  // Increase memory limit in dev instance
  const env = Object.assign({ 'NODE_OPTIONS' : '--max-old-space-size=6144' }, process.env );
  const backProc = fork(path.join(__dirname, '../back/backend.js'), [], { detached: true, env, stdio: 'pipe' });

  backProc.on('exit', (code) => {
    if (!code || code === 0) {
      console.log('Back proc exited cleanly, killing self.');
      process.exit(process.pid);
    } else {
      console.log(`Back proc exited unclean (${code}), killing self after 60 seconds to allow time to view message.`);
      setTimeout(() => {
        process.exit(process.pid);

      }, 60000);
    }
  });

  if (backProc.stdout) {
    backProc.stdout.on('data', (chunk) => {
      process.stdout.write(chunk);
    });
  }
  if (backProc.stderr) {
    backProc.stderr.on('data', (chunk) => {
      process.stderr.write(chunk);
    });
  }

  backProc.on('message', (msg: any) => {
    console.log(`--- Ready on port ${msg.port} ---`);
  });
  backProc.send(JSON.stringify(msg));

  // backProc.once('message', () => {
  //   // Backend ready, send config information
  //   console.log('Backend Ready');
  //   backProc.send(JSON.stringify(msg));
  // });
}
