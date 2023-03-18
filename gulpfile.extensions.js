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

  const installTaskExec = `cd ${folder} && npm install`;
  const buildTaskExec = `cd ${folder} && ${json['scripts']['build']}`;
  const watchTaskExec = `cd ${folder} && ${json['scripts']['watch']}`;

  const installTask = (cb) => execute(installTaskExec, cb);
  const buildTask = (cb) => execute(buildTaskExec, cb);
  const watchTask = (cb) => execute(watchTaskExec, cb);
  
  Object.defineProperty(installTask, 'name', { value: `installExtension:${name}`});
  Object.defineProperty(buildTask, 'name', { value: `buildExtension:${name}` });
  Object.defineProperty(watchTask, 'name', { value: `watchExtension:${name}` });

  return {
    installTask,
    buildTask,
    watchTask
  };
});

const installExtensions = targets.length > 0 ? parallel(targets.map(t => t.installTask)) : parallel([(done) => { done(); }]);
const buildExtensions = targets.length > 0 ? parallel(targets.map(t => t.buildTask)) : parallel([(done) => { done(); }]);
const watchExtensions = targets.length > 0 ? parallel(targets.map(t => t.watchTask)) : parallel([(done) => { done(); }]);

exports.installExtensions = installExtensions;
exports.buildExtensions = buildExtensions;
exports.watchExtensions = watchExtensions;
