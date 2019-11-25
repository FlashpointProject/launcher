const fs = require('fs-extra');
const gulp = require('gulp');
const builder = require('electron-builder');
const { Platform, archFromString } = require('electron-builder');
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
  sevenZip: './extern/7zip-bin',
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
  const targets = createBuildTargets(process.env.PACK_PLATFORM, process.env.PACK_ARCH);
  const publish = process.env.PUBLISH ? createPublishInfo() : [];
  console.log(publish);
  builder.build({
    config: {
      appId: 'com.bluemaxima.flashpoint-launcher',
      productName: 'FlashpointLauncher',
      directories: {
        buildResources: './static/',
        output: './dist/'
      },
      files: [
        './build',
        './static'
      ],
      extraFiles: [
        { // Only copy 7zip execs for packed platform
          from: './extern/7zip-bin',
          to: './extern/7zip-bin',
          filter: ['${os}/**/*']
        },
        './lang',
        './upgrade',
        './licenses',
        {
          from: './LICENSE',
          to: './licenses/LICENSE'
        }
      ],
      compression: 'maximum', // Only used if a compressed target (like 7z, zip, etc)
      onNodeModuleFile: compressModule,
      target: 'dir',
      asar: config.isRelease,
      publish: publish,
      win: {
        icon: './icons/icon.ico',
      },
      mac: {
        icon: './icons/icon.icns'
      }
    },
    targets: targets
    // // "afterCopy" in the docs:
    // // "An array of functions to be called after your app directory has been copied to a temporary directory."
    // afterCopy: [[
    //   function(buildPath, electronVersion, platform, arch) {
    //     // Save file to the temporary folder (that gets moved or packed into the release)
    //     fs.writeFileSync(path.join(buildPath, 'package.json'), minifyPackage(fs.readFileSync('package.json')));
    //     // Copy dependencies of the Node processes
    //     const deps = ['ws', 'async-limiter'];
    //     for (let dep of deps) {
    //       const depPath = 'node_modules/'+dep;
    //       const packagePath = path.join(buildPath, depPath, 'package.json');
    //       fs.copySync(depPath, path.join(buildPath, depPath));
    //       fs.writeFileSync(packagePath, minifyPackage(fs.readFileSync(packagePath)));
    //     }
    //     /** Copy only some fields (I'm not really sure which are required or serves any purpose - but these have been enough so far) */
    //     function minifyPackage(package) {
    //       const p = JSON.parse(package);
    //       return JSON.stringify({
    //         name: p.name,
    //         version: p.version,
    //         description: p.description,
    //         main: p.main,
    //         author: p.author,
    //         license: p.license,
    //         dependencies: p.dependencies
    //       }, undefined, 2);
    //     }
    //   },
    // ]],
  })
  .then(()         => { console.log('Pack - Done!');         })
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

function compressModule(file) {
}

function createBuildTargets(os, arch) {
  switch (os) {
    case 'win32':
      return Platform.WINDOWS.createTarget('nsis', archFromString(arch));
    case 'mac':
      return Platform.MAC.createTarget('dmg');
    case 'linux':
      return Platform.LINUX.createTarget('appimage', archFromString(arch));
  }
}

function createPublishInfo() {
  return [
    {
      provider: 'generic',
      url: 'http://localhost:8000/${name}/${os}/${arch}/${channel}/'
      // url: 'https://download.unstable.life/${name}/${os}/${arch}/${channel}/'
    }
  ];
}