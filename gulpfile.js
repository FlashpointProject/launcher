const fs = require('fs-extra');
const path = require('path');
const gulp = require('gulp');
const argv = require('yargs').argv;
const gulpif = require('gulp-if');
const gutil = require('gulp-util');
const uglify = require('gulp-uglify-es').default;
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
  isRelease: argv.production !== undefined,
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
  gulp.watch([config.paths.main.src+'/**/*',
              config.paths.shared.src+'/**/*'], ['build_main']);
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
    executableName: 'LunchBox',
    platform: 'win32',
    arch: 'ia32',
    asar: config.isRelease,
    // ...
    afterCopy: [serialHooks([
      function(buildPath, electronVersion, platform, arch) {
        // Read the package.json file (it is requiered to run the electron app)
        const package = require('./package.json');
        // Copy only some fields
        // (I'm not really sure which are required or which serves any purpuse)
        const data = JSON.stringify({
          name: package.name,
          version: package.version,
          description: package.description,
          main: package.main,
          author: package.author,
          license: package.license,
          dependencies: package.dependencies
        });
        // Save file to the temporary folder (that gets moved or packed into the release)
        fs.writeFileSync(path.join(buildPath, './package.json'), data, 'utf8');
      },
    ])],
  })
  .then((appPaths) => {
    console.log('Pack - Done!');
  })
  .catch((error) => {
    console.log('Pack - Error!', error);
  });
}
