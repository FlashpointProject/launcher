/* eslint-disable @typescript-eslint/no-var-requires */
const { series } = require('gulp');
const fs = require('fs');
const gulp = require('gulp');
const zip = require('gulp-zip');
const webpack = require('webpack');
const merge = require('merge-stream');
const webpackConfig = require('./webpack.config.js');

const filesToCopy = [
  'package.json',
  'icon.png',
  'LICENSE.md',
  'README.md'
];

function clean(cb) {
  fs.rmdir('./package', { recursive: true }, (err) => {
    if (err) { console.log('Clean', err); }
    cb();
  });
}

function build(cb) {
  webpack({...webpackConfig, mode: 'production' }, (err, stats) => {
    if (err) { console.log('Webpack', err); }
    console.log(stats.toString({ /* stats options */ }));
    cb();
  });
}

function stage() {
  const streams = filesToCopy.map(file => {
    if (fs.existsSync(file)) {
      return gulp.src(file).pipe(gulp.dest('package/analytics-check'));
    }
  }).filter(s => s != undefined);
  return merge([
    ...streams,
    gulp.src('dist/**/*').pipe(gulp.dest('package/analytics-check/dist')),
    gulp.src('static/**/*').pipe(gulp.dest('package/analytics-check/static')),
  ]);
}

function package() {
  return gulp.src('package/**/*').pipe(zip('extension.fplx')).pipe(gulp.dest('.'));
}

exports.clean = clean;
exports.build = build;
exports.stage = stage;
exports.package = package;
exports.default = series(clean, build, stage, package);
