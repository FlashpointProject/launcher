/* eslint-disable @typescript-eslint/no-var-requires */
const fs = require('fs-extra');
const gulp = require('gulp');
const builder = require('electron-builder');
const { execute } = require('./gulpfile.util');
const { buildExtensions, watchExtensions } = require('./gulpfile.extensions');
const { parallel, series } = require('gulp');

const packageJson = JSON.parse(fs.readFileSync('./package.json'));
const config = {
  buildVersion: Date.now().toString(),
  isRelease: !!process.env.PUBLISH,
  isStaticInstall: packageJson.config.installed,
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
// Copy extensions after packing
const extraResources = [
  {
    from: './extensions',
    to: './extensions',
    filter: ['!**/node_modules/**']
  }
];
// Files to copy after packing
const copyFiles = [
  {
    from :'./extern/utils',
    to: './extern/utils',
    filter: ['**']
  },
  {
    from :'./extern/bluezip',
    to: './extern/bluezip',
    filter: ['**']
  },
  { // Only copy 7zip execs for packed platform
    from: './extern/7zip-bin',
    to: './extern/7zip-bin',
    filter: ['${os}/**/*']
  },
  {
    from: './extern/elevate',
    to: './extern/elevate',
    filter: ['**']
  },
  './lang',
  './licenses',
  './.installed',
  'ormconfig.json',
  {
    from: './LICENSE',
    to: './licenses/LICENSE'
  },
  { // Copy the OS specific upgrade file
    from: './upgrade/${os}.json',
    to: './upgrade.json'
  }
];
// Options to append when releasing
const extraOptions = {
  win: {
    target: [
      {
        target: 'nsis-web',
        arch: ['x64', 'ia32']
      },
      {
        target: '7z',
        arch: ['x64', 'ia32']
      }
    ],
    icon: './icons/icon.ico'
  },
  mac: {
    target: ['dmg', '7z'],
    icon: './icons/icon.icns'
  },
  linux: {
    target: ['deb', '7z'],
    category: 'games'
  }
};
// Publish info for electron builder
const publishInfo = [
  {
    provider: 'github',
    vPrefixedTagName: false
  }
];

/* ------ Watch ------ */

function watchBack(done) {
  execute('npx ttsc --project tsconfig.backend.json --pretty --watch', done);
}

function watchRenderer(done) {
  const mode = config.isRelease ? 'production' : 'development';
  execute(`npx webpack --color true --mode "${mode}" --watch`, done);
}

function watchStatic() {
  gulp.watch([config.static.src+'/**/*'], (cb) => {
    buildStatic();
    cb();
  });
}


/* ------ Build ------ */

function buildBack(done) {
  execute('npx ttsc --project tsconfig.backend.json --pretty', done);
}

function buildRenderer(done) {
  const mode = config.isRelease ? 'production' : 'development';
  execute(`npx webpack --color true --mode "${mode}"`, done);
}

function buildStatic() {
  return gulp.src(config.static.src+'/**/*').pipe(gulp.dest(config.static.dest));
}

function configInstall(done) {
  if (config.isStaticInstall) {
    fs.createFile('.installed', done);
  } else {
    fs.remove('.installed', done);
  }
}

function configVersion(done) {
  fs.writeFile('.version', config.buildVersion, done);
}

/* ------ Pack ------ */

function pack(done) {
  const publish = config.isRelease ? publishInfo : []; // Uses Git repo for unpublished builds
  const extraOpts = config.isRelease ? extraOptions : {};
  const archOpts = !config.isRelease ? {
    ia32: process.env.PACK_ARCH === 'ia32' || undefined,
    x64: process.env.PACK_ARCH === 'x64' || undefined,
    armv7l: process.env.PACK_ARCH === 'armv7l' || undefined,
    arm64: process.env.PACK_ARCH === 'arm64' || undefined
  } : {};
  builder.build({
    ...archOpts,
    config: Object.assign({
      appId: 'com.bluemaxima.flashpoint-launcher',
      productName: 'Flashpoint',
      directories: {
        buildResources: './static/',
        output: './dist/'
      },
      files: [
        './build',
      ],
      extraFiles: copyFiles, // Files to copy to the build folder
      extraResources: extraResources, // Copy extensions
      compression: 'maximum', // Only used if a compressed target (like 7z, nsis, dmg etc.)
      target: 'dir',
      asar: true,
      asarUnpack: ['./extensions'],
      publish: publish,
      artifactName: '${productName}-${version}_${os}-${arch}.${ext}',
      win: {
        target: 'dir',
        icon: './icons/icon.ico'
      },
      mac: {
        target: 'dir',
        icon: './icons/icon.icns'
      },
      linux: {
        target: 'dir'
      }
    }, extraOpts)
  })
  .then(()         => { console.log('Pack - Done!');         })
  .catch((error)   => { console.log('Pack - Error!', error); })
  .then(done);
}

/* ------ Meta Tasks ------*/

exports.build = series(
  parallel(
    buildBack,
    buildRenderer,
    buildExtensions,
    buildStatic,
    configInstall,
    configVersion
  )
);

exports.watch = series(
  parallel(
    watchBack,
    watchRenderer,
    watchExtensions,
    buildStatic,
    watchStatic
  ),
);

exports.pack = series(
  pack
);

/* ------ Misc ------*/

// function execute(command, callback) {
//   const child = exec(command);
//   child.stderr.on('data', data => { console.log(data); });
//   child.stdout.on('data', data => { console.log(data); });
//   if (callback) {
//     child.once('exit', () => { callback(); });
//   }
// }
