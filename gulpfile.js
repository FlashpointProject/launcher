const path = require('path');
const fs = require('fs-extra');
const gulp = require('gulp');
const packager = require('electron-packager');
const serialHooks = require('electron-packager/hooks').serialHooks;
const { exec } = require('child_process');

const config = {
  isRelease: process.env.NODE_ENV === 'production',
  static: {
    src: './static',
    dest: './build',
  }
};

/* ------ Watch ------ */

gulp.task('watch', ['watch-main', 'watch-renderer', 'watch-static', 'copy-static']);

gulp.task('watch-main', () => {
  execute('tsc --project tsconfig-main.json --watch --preserveWatchOutput --pretty');
});

gulp.task('watch-renderer', () => {
  const mode = config.isRelease ? 'production' : 'development';
  execute(`webpack --color true --mode "${mode}" --watch`);
});

gulp.task('watch-static', () => {
  gulp.watch([config.static.src+'/**/*'], ['copy-static']);
});

/* ------ Build ------ */

gulp.task('build', ['build-main', 'build-renderer', 'copy-static']);

gulp.task('build-main', () => {
  execute('tsc --project tsconfig-main.json --pretty');
});

gulp.task('build-renderer', () => {
  const mode = config.isRelease ? 'production' : 'development';
  execute(`webpack --color true --mode "${mode}"`);
});

gulp.task('copy-static', () => {
  return gulp.src(config.static.src+'/**/*').pipe(gulp.dest(config.static.dest));
});

/* ------ Pack ------ */

gulp.task('pack', () => {
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
    // ...
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
        fs.writeFileSync(path.join(buildPath, './package.json'), data, 'utf8');
      },
    ])],
  })
  .then((appPaths) => { console.log('Pack - Done!');         })
  .catch((error)   => { console.log('Pack - Error!', error); });
});

/* ------ Misc ------*/

function execute(command) {
  const child = exec(command);
  child.stderr.on('data', data => { console.log(data); });
  child.stdout.on('data', data => { console.log(data); });
}
