/* eslint-disable @typescript-eslint/no-var-requires */
const fs = require('fs-extra');
const gulp = require('gulp');
const builder = require('electron-builder');
const tar = require('tar-fs');
const zlib = require('zlib');
const { parallel, series } = require('gulp');
const { installExtensions, buildExtensions, watchExtensions } = require('./gulpfile.extensions');
const { execute } = require('./gulpfile.util');
const { execSync } = require('child_process');
const { promisify } = require('util');
const esbuild = require('esbuild');

// Promisify the pipeline function
const pipeline = promisify(require('stream').pipeline);

const packageJson = JSON.parse(fs.readFileSync('./package.json', { encoding: 'utf-8' }));

const config = {
  buildVersion: Date.now().toString(),
  publish: !!process.env.PUBLISH,
  isRelease: process.env.NODE_ENV === 'production',
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
  },
};
// Copy extensions after packing
const extraResources = [
  {
    from: './extensions',
    to: './extensions',
    filter: ['!**/node_modules/**', '!**/.git/**'],
  },
];
// Files to copy after packing
const copyFiles = [
  {
    from: './extern/utils',
    to: './extern/utils',
    filter: ['**'],
  },
  {
    // Only copy 7zip execs for packed platform
    from: './extern/7zip-bin',
    to: './extern/7zip-bin',
    filter: ['${os}/**/*'],
  },
  {
    from: './extern/elevate',
    to: './extern/elevate',
    filter: ['**'],
  },
  './lang',
  './licenses',
  'ormconfig.json',
  {
    from: './LICENSE',
    to: './licenses/LICENSE',
  },
  {
    // Copy the OS specific upgrade file
    from: './upgrade/${os}.json',
    to: './upgrade.json',
  },
];
// Options to append when releasing
const extraOptions = {
  win: {
    target: [
      {
        target: 'nsis-web',
        arch: ['x64', 'ia32'],
      },
      {
        target: '7z',
        arch: ['x64', 'ia32'],
      },
    ],
    icon: './icons/icon.ico',
  },
  mac: {
    target: ['dmg', '7z'],
    icon: './icons/icon.icns',
    protocols: {
      name: 'flashpoint-protocol',
      schemes: ['flashpoint'],
    },
  },
  linux: {
    target: ['deb', '7z'],
    category: 'games',
  },
};
// Publish info for electron builder
const publishInfo = [
  {
    provider: 'github',
    vPrefixedTagName: false,
  },
];

/* - Cross Arch Deps - */

function installCrossDeps(done) {
  console.log('Checking for installed cross-platform packages...');
  // Get existing version of FP Archive
  const packageLock = JSON.parse(fs.readFileSync('./package-lock.json', { encoding: 'utf-8' }));
  const fpa = packageLock.packages['node_modules/@fparchive/flashpoint-archive'];

  const platform = process.env.PACK_PLATFORM || process.platform;
  const arch = process.env.PACK_ARCH || process.arch;
  console.log(`Platform: ${platform} - Arch: ${arch}`);

  const packageName = Object.keys(fpa.optionalDependencies).find(p => p.includes(`${platform}-${arch}`));
  if (!packageName) {
    console.log('No package found for this platform and arch combination, skipping...');
    done();
    return;
  }
  // List installed deps for fparchive
  const packageLocation = 'node_modules/' + packageName;
  const badPackages = fs.readdirSync('./node_modules/@fparchive/', { withFileTypes: true }).filter(m => m.isDirectory() && m.name !== 'flashpoint-archive' && ('@fparchive/' + m.name) !== packageName);

  // Remove old packages
  for (const bp of badPackages) {
    console.log(`Removing: ${bp.path + bp.name}`);
    fs.removeSync(bp.path + bp.name);
  }

  try {
    // Check if required version already exists and exit early if matches version needed
    const existingInfo = JSON.parse(fs.readFileSync(packageLocation + '/package.json', { encoding: 'utf-8' }));
    if (existingInfo.version === fpa.version) {
      // Already exists, up to date
      done();
      return;
    } else {
      console.log(`Removed old version (${existingInfo.version})`);
      // Wrong version, delete and replace
      fs.removeSync(packageLocation);
    }
  } catch {
    // Pacakge not installed, carry on
  }

  const packageFilename = `fparchive-${packageName.split('/')[1]}-${fpa.version}.tgz`;
  execSync(`npm pack ${packageName}@${fpa.version}`);
  console.log('Unpacking ' + packageFilename);
  // Extract and move all files to new folder
  extractTarball(packageFilename, './package-extract')
  .then(() => {
    fs.removeSync(packageFilename);
    fs.mkdirSync(`./node_modules/${packageName}`, { recursive: true });
    for (const file of fs.readdirSync('./package-extract/package/')) {
      fs.moveSync('./package-extract/package/' + file, packageLocation + '/' + file);
    }
    fs.removeSync('./package-extract');
    console.log(`Installed ${packageName}@${fpa.version}`);
    done();
  });
}


/* ------ Watch ------ */

function watchBack(done) {
  execute('npx swc --strip-leading-paths --no-swcrc --config-file swcrc.back.dev.json --source-maps true -d build src --watch', done);
}

async function watchRenderer() {
  const ctx = await esbuild.context({
    bundle: true,
    loader: { '.node': 'file' },
    entryPoints: ['./src/renderer/index.tsx'],
    outdir: './build/window',
    minify: false,
    outExtension: {
      '.js': '.bundle.js'
    },
    external: ['electron', ...require('module').builtinModules],
  });
  return ctx.watch();
}

function watchStatic() {
  gulp.watch(config.static.src + '/**/*', buildStatic);
}

/* ------ Build ------ */

function buildBack(done) {
  execute('npx swc --strip-leading-paths --no-swcrc --config-file swcrc.back.prod.json -d build src', done);
}

async function buildRenderer() {
  return esbuild.build({
    bundle: true,
    loader: { '.node': 'file' },
    entryPoints: ['./src/renderer/index.tsx'],
    outdir: './build/window',
    minify: true,
    outExtension: {
      '.js': '.bundle.js'
    },
    external: ['electron', ...require('module').builtinModules],
  });
}

function buildStatic() {
  return gulp
  .src(config.static.src + '/**/*')
  .pipe(gulp.dest(config.static.dest));
}

function configVersion(done) {
  fs.writeFile('.version', config.buildVersion, done);
}

/* ----- Version ---- */

function createVersionFile(done) {
  // Get the current date
  const currentDate = new Date();

  // Get the year, month, and day components
  const year = currentDate.getFullYear();
  // JavaScript months are 0-indexed, so we add 1 to get the actual month
  const month = (currentDate.getMonth() + 1).toString().padStart(2, '0');
  const day = currentDate.getDate().toString().padStart(2, '0');

  // Create the formatted date string in "YYYY-MM-DD" format
  const formattedDate = `${year}-${month}-${day}`;

  // Get Git Commit Hash
  const gitCommitHash = execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();

  const packageLockJson = JSON.parse(fs.readFileSync('./package-lock.json', { encoding: 'utf-8' }));
  const fpaVersion = packageLockJson['packages']['node_modules/@fparchive/flashpoint-archive']['version'];

  const data = `export const VERSION = '${formattedDate} (${gitCommitHash})';
export const FPA_VERSION = '${fpaVersion}';
`;

  // Write to src/shared/version.ts
  fs.writeFile('src/shared/version.ts', data, (err) => {
    if (err) {
      throw `Error writing to version.ts: ${err}`;
    } else {
      console.log(`Build ver: "${formattedDate} (${gitCommitHash})"`);
      done();
    }
  });
}

/* ------ Pack ------ */

function nexusPack(done) {
  const files = ['./build'];
  // Forcefully include ia32 library since nexus builds ia32
  if (process.platform === 'win32') {
    files.push({
      from: '../../node_modules/@fparchive/flashpoint-archive-win32-ia32-msvc',
      to: './node_modules/@fparchive/flashpoint-archive-win32-ia32-msvc',
      filter: ['**/*']
    });
  }
  builder
  .build({
    targets: builder.Platform.WINDOWS.createTarget(),
    config: Object.assign(
      {
        appId: 'com.bluemaxima.flashpoint-launcher',
        productName: 'Flashpoint',
        directories: {
          buildResources: './static/',
          output: './dist/',
        },
        files: files,
        extraFiles: copyFiles, // Files to copy to the build folder
        extraResources: extraResources, // Copy System Extensions
        compression: 'maximum', // Only used if a compressed target (like 7z, nsis, dmg etc.)
        asar: true,
        artifactName: '${productName}.${ext}',
        win: {
          target: [
            {
              target: 'zip',
              arch: 'ia32',
            }
          ],
          icon: './icons/icon.ico',
        }
      }
    ),
  })
  .then(() => {
    console.log('Pack - Done!');
  })
  .catch((error) => {
    console.log('Pack - Error!', error);
  })
  .finally(done);
}

function pack(done) {
  const publish = config.publish ? publishInfo : []; // Uses Git repo for unpublished builds
  const extraOpts = config.publish ? extraOptions : {};
  builder
  .build({
    ia32: process.env.PACK_ARCH === 'ia32' || undefined,
    x64: process.env.PACK_ARCH === 'x64' || undefined,
    config: Object.assign(
      {
        appId: 'com.bluemaxima.flashpoint-launcher',
        productName: 'Flashpoint',
        directories: {
          buildResources: './static/',
          output: './dist/',
        },
        files: ['./build'],
        extraFiles: copyFiles, // Files to copy to the build folder
        extraResources: extraResources, // Copy System Extensions
        compression: 'maximum', // Only used if a compressed target (like 7z, nsis, dmg etc.)
        target: 'dir',
        asar: true,
        publish: publish,
        artifactName: '${productName}-${version}_${os}-${arch}.${ext}',
        win: {
          target: 'dir',
          icon: './icons/icon.ico',
        },
        mac: {
          target: 'dir',
          icon: './icons/icon.icns',
        },
        linux: {
          target: 'dir',
        },
      },
      extraOpts
    ),
  })
  .then(() => {
    console.log('Pack - Done!');
  })
  .catch((error) => {
    console.log('Pack - Error!', error);
  })
  .finally(done);
}

/* ------ Clean ------ */

function clean(done) {
  fs.remove('./dist', () => {
    fs.remove('./build', done);
  });
}

/* ------ Util ------ */

async function extractTarball(inputFilePath, outputDirectory) {
  try {
    // Create a readable stream from the input file
    const readStream = fs.createReadStream(inputFilePath);

    // Pipe the readable stream through zlib.createGunzip() and then through tar.extract()
    await pipeline(
      readStream,
      zlib.createGunzip(),
      tar.extract(outputDirectory)
    );

    console.log('Extraction complete.');
  } catch (error) {
    console.error('Extraction failed:', error);
  }
}

/* ------ Meta Tasks ------*/

exports.clean = series(clean);

exports.build = series(
  clean,
  createVersionFile,
  installCrossDeps,
  parallel(
    buildBack,
    buildRenderer,
    buildExtensions,
    buildStatic,
    configVersion
  )
);

exports.watch = series(
  clean,
  createVersionFile,
  installCrossDeps,
  parallel(
    watchBack,
    watchRenderer,
    watchExtensions,
    buildStatic,
    watchStatic
  )
);

exports.pack = series(
  pack
);

exports.nexusPack = series(
  installExtensions,
  buildExtensions,
  nexusPack
);

exports.extInstall = series(installExtensions);

exports.esbuildTest = series(buildRenderer);
