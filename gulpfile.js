const gulp = require('gulp');
const gulpif = require('gulp-if');
const uglify = require('gulp-uglify');
const webpack = require('webpack-stream');
const typescript = require('gulp-typescript');
const mainTsProject = typescript.createProject('tsconfig-main.json');

gulp.task('default', ['build', 'watch']);
gulp.task('watch', ['watch_main', 'watch_renderer', 'watch_static']);
gulp.task('build', ['build_main', 'build_renderer', 'copy_static']);

gulp.task('watch_main', watchMain);
gulp.task('build_main', buildMain);

gulp.task('watch_renderer', watchRenderer);
gulp.task('build_renderer', buildRenderer);

gulp.task('watch_static', watchStatic);
gulp.task('copy_static',  copyStatic);

const config = {
  isRelease: false,
  paths: {
    main: {
      src:  './src/main',
      dest: './dist' // (It includes both /main/ and /shared/, so it is one folder higher than otherwise!)
    },
    renderer: {
      src:  './src/renderer',
      dest: './dist/renderer'
    },
    static: {
      src:  './static',
      dest: './dist/renderer'
    },
    shared: {
      src:  './src/shared',
    },
  }
}

function watchMain() {
  gulp.watch([config.paths.main.src+'/**/*'], ['build_main']);
}
function buildMain() {
  const webpackConfig = require('./webpack.config.js');
  // Build source
  return mainTsProject.src()
    .pipe(mainTsProject()).js
    .pipe(gulpif(config.isRelease, uglify()))
    .pipe(gulp.dest(config.paths.main.dest));
}

function watchRenderer() {
  gulp.watch([config.paths.renderer.src+'/**/*',
              config.paths.shared.src+'/**/*'], ['build_renderer']);
}
function buildRenderer() {
  const webpackConfig = require('./webpack.config.js');
  // Alter config
  if (config.isRelease) {
    delete webpackConfig.devtool;
  }
  // Build source
  gulp.src(webpackConfig.entry)
    .pipe(webpack(webpackConfig))
    .pipe(gulpif(config.isRelease, uglify()))
    .pipe(gulp.dest(config.paths.renderer.dest));
}

function watchStatic() {
  gulp.watch([config.paths.static.src+'/**/*'], ['copy_static']);
}
function copyStatic() {
  // Copy files
  gulp.src(config.paths.static.src+'/**/*')
    .pipe(gulp.dest(config.paths.static.dest));
}
