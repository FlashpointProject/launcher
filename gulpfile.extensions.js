/* eslint-disable @typescript-eslint/no-var-requires */

const glob = require('glob');
const path = require('path');
const { execute } = require('./gulpfile.util');
const { parallel } = require('gulp');
const extensionsPath = path.resolve('extensions');
const fs = require('fs');

const tsConfigPaths = glob.sync('**/tsconfig.json', {
  cwd: extensionsPath,
  ignore: ['**/out/**', '**/dist/**', '**/node_modules/**']
});

const targets = tsConfigPaths.map(target => {
  const name = path.dirname(target).replace(/\//g, '-');
  const folder = path.join('./extensions', path.dirname(target));
  const packageJsonPath = path.join(folder, 'package.json');
  const json = JSON.parse(fs.readFileSync(packageJsonPath).toString());

  const buildTaskExec = `cd ${folder} && ${json['scripts']['build']}`;
  const watchTaskExec = `cd ${folder} && ${json['scripts']['watch']}`;

  const buildTask = (cb) => execute(buildTaskExec, cb);
  const watchTask = (cb) => execute(watchTaskExec, cb);
  Object.defineProperty(buildTask, 'name', { value: `buildExtension:${name}` });
  Object.defineProperty(watchTask, 'name', { value: `watchExtension:${name}` });

  return {
    buildTask,
    watchTask
  };
});

const buildExtensions = parallel(targets.map(t => t.buildTask));
const watchExtensions = parallel(targets.map(t => t.watchTask));

exports.buildExtensions = buildExtensions;
exports.watchExtensions = watchExtensions;
