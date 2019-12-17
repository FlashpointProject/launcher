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
  },
  back: {
    src: './src/back',
  }
};

/* ------ Watch ------ */

gulp.task('watch-main', (done) => {
  execute(`npx tsc --project "${config.main.src}" --pretty --watch`, done);
});

gulp.task('watch-back', (done) => {
  execute(`npx tsc --project "${config.back.src}" --pretty --watch`, done);
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

gulp.task('build-back', (done) => {
  execute(`npx tsc --project "${config.back.src}" --pretty`, done);
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
        // Save file to the temporary folder (that gets moved or packed into the release)
        fs.writeFileSync(path.join(buildPath, 'package.json'), minifyPackage(fs.readFileSync('package.json')));
        // Copy dependencies of the Node processes
        const deps = ['ws', 'async-limiter', 'uuid'];
        for (let dep of deps) {
          const depPath = 'node_modules/'+dep;
          const packagePath = path.join(buildPath, depPath, 'package.json');
          fs.copySync(depPath, path.join(buildPath, depPath));
          fs.writeFileSync(packagePath, minifyPackage(fs.readFileSync(packagePath)));
        }
        /** Copy only some fields (I'm not really sure which are required or serves any purpose - but these have been enough so far) */
        function minifyPackage(package) {
          const p = JSON.parse(package);
          return JSON.stringify({
            name: p.name,
            version: p.version,
            description: p.description,
            main: p.main,
            author: p.author,
            license: p.license,
            dependencies: p.dependencies
          }, undefined, 2);
        }
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
        // Copy Language folder
        fs.copySync('./lang', path.join(buildPath, 'lang/'));
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

gulp.task('watch', gulp.parallel('watch-main', 'watch-back', 'watch-renderer', 'watch-static', 'copy-static'));

gulp.task('build', gulp.parallel('build-main', 'build-back', 'build-renderer', 'copy-static', 'config-install', 'config-version'));

/* ------ Misc ------*/

function execute(command, callback) {
  const child = exec(command);
  child.stderr.on('data', data => { console.log(data); });
  child.stdout.on('data', data => { console.log(data); });
  if (callback) {
    child.once('exit', () => { callback(); });
  }
}
