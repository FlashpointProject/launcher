const path = require('path');
const fs = require('fs-extra');
const gulp = require('gulp');
const packager = require('electron-packager');
const serialHooks = require('electron-packager/src/hooks').serialHooks;
const { exec } = require('child_process');

const config = {
  buildVersion: Date.now().toString(),
  isRelease: process.env.NODE_ENV === 'production',
  isStaticInstall: process.env.STATIC_INSTALL ? true : false,
  static: {
    src: './static',
    dest: './build',
  },
  main: {
    src: './src/main',
  }
};

/* ------ Watch ------ */

gulp.task('watch-main', (done) => {
  execute(`npx tsc --project "${config.main.src}" --pretty --watch`, done);
});

gulp.task('watch-renderer', (done) => {
  const mode = config.isRelease ? 'production' : 'development';
  execute(`npx webpack --color true --mode "${mode}" --watch`, done);
});

gulp.task('watch-static', () => {
  gulp.watch(config.static.src+'/**/*', gulp.task('copy-static'));
});


/* ------ Build ------ */

gulp.task('build-main', (done) => {
  execute(`npx tsc --project "${config.main.src}" --pretty`, done);
});

gulp.task('build-renderer', (done) => {
  const mode = config.isRelease ? 'production' : 'development';
  execute(`npx webpack --color true --mode "${mode}"`, done);
});

gulp.task('copy-static', () => {
  return gulp.src(config.static.src+'/**/*').pipe(gulp.dest(config.static.dest));
});

gulp.task('config-install', (done) => {
  if (config.isStaticInstall) {
    fs.createFile('.installed', done);
  } else {
    fs.remove('.installed', done);
  }
});

gulp.task('config-version', (done) => {
  fs.writeFile('.version', config.buildVersion, done);
});

/* ------ Pack ------ */

gulp.task('pack', (done) => {
  packager({
    dir: './build/',
    out: './dist/',
    // ...
    prune: true,
    packageManager: 'npm',
    tmpdir: './temp/',
    overwrite: true,
    icon: './icons/icon.ico',
    // Build settings
    executableName: 'FlashpointLauncher',
    platform: process.env.PACK_PLATFORM,
    arch: process.env.PACK_ARCH,
    asar: config.isRelease,
    // "afterCopy" in the docs:
    // "An array of functions to be called after your app directory has been copied to a temporary directory."
    afterCopy: [serialHooks([
      function(buildPath, electronVersion, platform, arch) {
        // Read the package.json file (it is required to run the electron app)
        const package = require('./package.json');
        // Copy only some fields
        // (I'm not really sure which are required or serves any purpose - but these have been enough thus far)
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
        fs.writeFileSync(path.join(buildPath, 'package.json'), data, 'utf8');
      },
    ])],
    // "afterExtract" in the docs:
    // "An array of functions to be called after Electron has been extracted to a temporary directory."
    afterExtract: [serialHooks([
      function(buildPath, electronVersion, platform, arch) {
        // Create "installed" file (this tells the launcher that it is installed, and not portable)
        if (config.isStaticInstall) {
          fs.createFileSync(path.join(buildPath, '.installed'));
        }
        // Create build version file
        fs.writeFileSync(path.join(buildPath, '.version'), config.buildVersion, done);
        // Copy licenses folder and the LICENSE file
        fs.copySync('./licenses', path.join(buildPath, 'licenses/'));
        fs.copySync('./LICENSE',  path.join(buildPath, 'licenses/LICENSE'));
        // Move electron license into the licenses folder
        fs.moveSync(path.join(buildPath, 'LICENSE'), path.join(buildPath, 'licenses/electron/LICENSE'));
      },
    ])],
  })
  .then((appPaths) => { console.log('Pack - Done!');         })
  .catch((error)   => { console.log('Pack - Error!', error); })
  .then(done);
});

/* ------ Meta Tasks ------*/

gulp.task('watch', gulp.parallel('watch-main', 'watch-renderer', 'watch-static', 'copy-static'));

gulp.task('build', gulp.parallel('build-main', 'build-renderer', 'copy-static', 'config-install', 'config-version'));

/* ------ Misc ------*/

function execute(command, callback) {
  const child = exec(command);
  child.stderr.on('data', data => { console.log(data); });
  child.stdout.on('data', data => { console.log(data); });
  if (callback) {
    child.once('exit', () => { callback(); });
  }
}
