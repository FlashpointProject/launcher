const fs = require('fs-extra');
const path = require('path');
const gulp = require('gulp');
const gulpif = require('gulp-if');
const uglify = require('gulp-uglify');
const webpack = require('webpack-stream');
const packager = require('electron-packager');
const serialHooks = require('electron-packager/hooks').serialHooks;
const typescript = require('gulp-typescript');
const mainTsProject = typescript.createProject('tsconfig-main.json');

gulp.task('default', ['build', 'watch']);
gulp.task('watch', ['watch_main', 'watch_renderer', 'watch_static']);
gulp.task('build', ['build_main', 'build_renderer', 'copy_static']);
gulp.task('pack', pack);

gulp.task('watch_main', watchMain);
gulp.task('build_main', buildMain);

gulp.task('watch_renderer', watchRenderer);
gulp.task('build_renderer', buildRenderer);

gulp.task('watch_static', watchStatic);
gulp.task('copy_static',  copyStatic);

const appPath = './binaries/resources/app.asar/';
const config = {
  isRelease: false,
  paths: {
    main: {
      src:  './src/main',
      dest: './build', // (It includes both /main/ and /shared/, so it is one folder higher than otherwise!)
    },
    renderer: {
      src:  './src/renderer',
      dest: './build/renderer',
    },
    static: {
      src:  './static',
      dest: './build'
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

function pack() {
  packager({
    dir: './build/', 
    out: './dist/',
    // ...
    prune: true,
    packageManager: 'npm',
    tmpdir: './temp/', // (Remove this to use the temp folder in appdata instead)
    overwrite: true, // For debugging
    // Build settings
    executableName: 'LibraryThingie',
    platform: 'win32',
    arch: 'ia32',
    // ...
    afterCopy: [serialHooks([
      function(buildPath, electronVersion, platform, arch) {
        console.log('Pack - AfterCopy!', arguments)
        //
        fs.copy('./package.json', path.join(buildPath, './package.json'));
        /*
        return fs.copy('./node_modules', path.join(buildPath, './node_modules'), { overwrite: false })
          .catch(console.log);
        */
      },
    ])],
    //asar: true,
  })
  .then((appPaths) => {
    console.log('Pack - Done!', appPaths);
  })
  .catch((error) => {
    console.log('Pack - Error!', error);
  });
}
