/* eslint-disable no-undef */
import { createRsbuild, loadConfig } from '@rsbuild/core';
import { execSync, spawn } from 'child_process';
import builder from 'electron-builder';
import fs from 'fs-extra';
import gulp, { parallel, series } from 'gulp';
import path from 'path';
import { pipeline } from 'stream';
import tar from 'tar-fs';
import { promisify } from 'util';
import zlib from 'zlib';
import { buildExtensions, installExtensions, watchExtensions } from './gulpfile.extensions.js';

// Promisify the pipeline function
const pipelineAsync = promisify(pipeline);

const packageJson = JSON.parse(fs.readFileSync('./package.json', { encoding: 'utf-8' }));

const config = {
  buildVersion: Date.now().toString(),
  publish: !!process.env.PUBLISH,
  isRelease: process.env.NODE_ENV === 'production',
  browserBackendHost: packageJson.config.browserBackendHost || 'ws://localhost:12001/',
  isBrowserBackendRemote: !!packageJson.config.isBrowserBackendRemote,
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
  {
    from: './LICENSE',
    to: './licenses/LICENSE',
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
  const crossCompiling = (process.env.PACK_ARCH !== undefined && process.env.PACK_ARCH !== process.arch)
    || (process.env.PACK_PLATFORM !== undefined && process.env.PACK_PLATFORM != process.platform);
  // If the flashpoint-archive package has node_modules, it's probably NPM linked
  const linkedDev = fs.existsSync('./node_modules/@fparchive/flashpoint-archive/node_modules');
  if (linkedDev && !crossCompiling) {
    console.log('In development mode, updating local versions...');
    // We're in dev, copy the built files from there each run instead
    for (const file of fs.readdirSync('./node_modules/@fparchive/flashpoint-archive/')) {
      if (file.endsWith('.node')) {
        const splitFile = file.split('.');
        const directory = splitFile.slice(0, splitFile.length - 1).join('-');
        fs.ensureDirSync(`./node_modules/@fparchive/${directory}`);
        fs.copyFileSync(
          `./node_modules/@fparchive/flashpoint-archive/${file}`,
          `./node_modules/@fparchive/${directory}/${file}`
        );
        console.log(`Updated: ${file}`);
      }
    }
    done();
    return;
  }

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
    // Package not installed, carry on
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

async function watchElectron() {
  const config = await loadConfig({ path: 'rsbuild-electron.config.ts'});
  const rsbuild = await createRsbuild({
    rsbuildConfig: {
      ...config.content
    }
  });
  await rsbuild.build({
    watch: true
  });
}

async function watchElectronPreload() {
  const config = await loadConfig({ path: 'rsbuild-preload.config.ts'});
  const rsbuild = await createRsbuild({
    rsbuildConfig: {
      ...config.content
    }
  });
  await rsbuild.build({
    watch: true
  });
}

async function killProcess(proc) {
  if (!proc || proc.killed) return;
  
  return new Promise((resolve) => {
    proc.on('exit', resolve);
    proc.kill('SIGTERM');
    
    // Force kill after timeout
    setTimeout(() => {
      if (!proc.killed) {
        proc.kill('SIGKILL');
      }
    }, 3000);
  });
}

function watchBackend(withServer) {
  return async () => {
    await copyNativeModule();
    const config = await loadConfig({ path: 'rsbuild-back.config.ts'});
    const rsbuild = await createRsbuild({
      rsbuildConfig: {
        ...config.content,
      },
    });
    let backProc = null;
    if (withServer) {
      rsbuild.onAfterBuild(async () => {
        // Restart backend after it's been built
        console.log('Restarting Backend...');
        if (backProc) {
          console.log('Killing existing backend process...');
          await killProcess(backProc);
          backProc = null;
        }

        backProc = spawn('node', [
          '--inspect=9229',  // Enable debugging
          'build/back/backend.js'
        ], {
          stdio: 'inherit',
          env: { ...process.env, NODE_ENV: 'development' }
        });
      });
    }
    await rsbuild.build({
      watch: true,
    });
  }
}

async function watchRenderer() {
  const config = await loadConfig();
  const rsbuild = await createRsbuild({
    rsbuildConfig: {
      ...config.content
    }
  });
  await rsbuild.build({
    watch: true
  });
}

function watchStaticTask() {
  gulp.watch(config.static.src + '/**/*', buildStatic);
}

/* ------ Build ------ */

async function buildElectron() {
  const config = await loadConfig({ path: 'rsbuild-electron.config.ts'});
  const rsbuild = await createRsbuild({
    rsbuildConfig: config.content
  });
  return rsbuild.build();
}

async function buildElectronPreload() {
  const config = await loadConfig({ path: 'rsbuild-preload.config.ts'});
  const rsbuild = await createRsbuild({
    rsbuildConfig: config.content
  });
  return rsbuild.build();
}

async function copyNativeModule() {
  for (const dir of fs.readdirSync(path.resolve('node_modules/@fparchive'), { withFileTypes: true }).filter(f => f.isDirectory())) {
    for (const f of fs.readdirSync(path.resolve('node_modules/@fparchive', dir.name))) {
      if (f.endsWith('.node')) {
        const fullPath = path.resolve('node_modules/@fparchive/', dir.name, f);
        await fs.promises.mkdir('build/back', { recursive: true });
        const destPath = path.resolve('build/back', f);
        fs.copyFileSync(fullPath, destPath);
        console.log('Copied native module ' + f);
      }
    }
  }
}

async function buildBackend() {
  const config = await loadConfig({ path: 'rsbuild-back.config.ts'});
  const rsbuild = await createRsbuild({
    rsbuildConfig: config.content
  });
  await rsbuild.build();
  return copyNativeModule();
}

async function buildRenderer() {
  const config = await loadConfig();
  const rsbuild = await createRsbuild({
    rsbuildConfig: config.content
  });
  return rsbuild.build();
}

function buildStatic() {
  return gulp
  .src(config.static.src + '/**/*', { encoding: false })
  .pipe(gulp.dest(config.static.dest));
}

function configVersion(done) {
  fs.writeFile('.version', config.buildVersion, done);
}

/* ----- Version ---- */

function updateConstants(done) {
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
export const VERSION_EPOCH = ${Date.now()};
export const FPA_VERSION = '${fpaVersion}';
export const IS_BROWSER_BACKEND_REMOTE = ${config.isBrowserBackendRemote};
export const BROWSER_ISDEV = ${!config.isRelease};
export const getBrowserBackendHost = () => {
  const host = '${config.browserBackendHost}';
  if (host.startsWith('ws:') || host.startsWith('wss:/')) {
    return host;
  } else {
    // Convert relative path to absolute WebSocket URL
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const hostname = window.location.hostname;
    const port = window.location.port;
    const portSuffix = port ? ':' + port : '';
    const basePath = host.startsWith('/') ? host : '/' + host;
    return protocol + '//' + hostname + portSuffix + basePath;
  }
};
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

async function nexusPackTask() {
  await builder.build({
    targets: builder.Platform.WINDOWS.createTarget(),
    config: {
      appId: 'com.bluemaxima.flashpoint-launcher',
      productName: 'Flashpoint',
      directories: {
        output: './dist/',
      },
      files: ['./build'],
      extraFiles: copyFiles, // 7zip, Elevate.exe, licenses etc
      extraResources: extraResources, // System Extensions
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
    },
  });
}

function packTask(done) {
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

function cleanTask(done) {
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
    await pipelineAsync(
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

export const clean = series(cleanTask);
export const build = series(
  cleanTask,
  updateConstants,
  installCrossDeps,
  buildStatic,
  parallel(
    buildElectron,
    buildElectronPreload,
    buildBackend,
    buildRenderer,
    buildExtensions,
    configVersion
  )
);
export const watch = series(
  cleanTask,
  updateConstants,
  installCrossDeps,
  buildStatic,
  parallel(
    watchBackend(false),
    watchElectron,
    watchElectronPreload,
    watchRenderer,
    watchExtensions,
    watchStaticTask,
  )
);
export const watchStatic = series(
  cleanTask,
  updateConstants,
  installCrossDeps,
  buildStatic,
  buildExtensions,
  parallel(
    watchBackend(true),
    watchStaticTask,
  )
);
export const pack = series(packTask);
export const nexusPack = series(
  installExtensions,
  buildExtensions,
  nexusPackTask
);
export const extInstall = series(installExtensions)
