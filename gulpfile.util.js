/* eslint-disable @typescript-eslint/no-var-requires */
const { exec } = require('child_process');

const execute = (command, callback) => {
  const child = exec(command);
  child.stderr.on('data', data => { process.stdout.write(data); });
  child.stdout.on('data', data => { process.stdout.write(data); });
  if (callback) {
    child.once('exit', () => { callback(); });
  }
};

exports.execute = execute;
