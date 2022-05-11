/* eslint-disable @typescript-eslint/no-var-requires */

const glob = require('glob');
const path = require('path');
const { execute } = require('./gulpfile.util');
const { parallel } = require('gulp');
const extensionsPath = path.resolve('extensions');

const tsConfigPaths = glob.sync('**/tsconfig.json', {
  cwd: extensionsPath,
  ignore: ['**/out/**', '**/dist/**', '**/node_modules/**']
});

const targets = tsConfigPaths.map(target => {
  const name = path.dirname(target).replace(/\//g, '-');
  const folder = path.join('./extensions', path.dirname(target));
  const webpackConfigFiles = glob.sync('webpack*',  {
    cwd: folder
  });
  const realPath = path.join('./extensions', target);

  const buildTaskExec = webpackConfigFiles.length > 0 ? `cd ${folder} && npx webpack --mode production` : `npx ttsc --project ${realPath} --pretty`;
  const watchTaskExec = webpackConfigFiles.length > 0 ? `cd ${folder} && npx webpack --mode development --watch` : `npx ttsc --project ${realPath} --pretty --watch`;

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
