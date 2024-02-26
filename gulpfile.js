/* eslint-disable @typescript-eslint/no-var-requires */
const fs = require("fs-extra");
const gulp = require("gulp");
const builder = require("electron-builder");
const { parallel, series } = require("gulp");
const { installExtensions, buildExtensions, watchExtensions } = require("./gulpfile.extensions");
const { execute } = require("./gulpfile.util");
const { execSync } = require('child_process');

const packageJson = JSON.parse(fs.readFileSync("./package.json", { encoding: 'utf-8' }));
const config = {
  buildVersion: Date.now().toString(),
  publish: !!process.env.PUBLISH,
  isRelease: process.env.NODE_ENV === "production",
  isStaticInstall: packageJson.config.installed,
  static: {
    src: "./static",
    dest: "./build",
  },
  main: {
    src: "./src/main",
  },
  sevenZip: "./extern/7zip-bin",
  back: {
    src: "./src/back",
  },
};
// Copy extensions after packing
const extraResources = [
  {
    from: "./extensions",
    to: "./extensions",
    filter: ["!**/node_modules/**", "!**/.git/**"],
  },
];
// Files to copy after packing
const copyFiles = [
  {
    from: "./extern/utils",
    to: "./extern/utils",
    filter: ["**"],
  },
  {
    from: "./extern/bluezip",
    to: "./extern/bluezip",
    filter: ["**"],
  },
  {
    // Only copy 7zip execs for packed platform
    from: "./extern/7zip-bin",
    to: "./extern/7zip-bin",
    filter: ["${os}/**/*"],
  },
  {
    from: "./extern/elevate",
    to: "./extern/elevate",
    filter: ["**"],
  },
  "./lang",
  "./licenses",
  "ormconfig.json",
  {
    from: "./LICENSE",
    to: "./licenses/LICENSE",
  },
  {
    // Copy the OS specific upgrade file
    from: "./upgrade/${os}.json",
    to: "./upgrade.json",
  },
];
// Options to append when releasing
const extraOptions = {
  win: {
    target: [
      {
        target: "nsis-web",
        arch: ["x64", "ia32"],
      },
      {
        target: "7z",
        arch: ["x64", "ia32"],
      },
    ],
    icon: "./icons/icon.ico",
  },
  mac: {
    target: ["dmg", "7z"],
    icon: "./icons/icon.icns",
    protocols: {
      name: "flashpoint-protocol",
      schemes: ["flashpoint"],
    },
  },
  linux: {
    target: ["deb", "7z"],
    category: "games",
  },
};
// Publish info for electron builder
const publishInfo = [
  {
    provider: "github",
    vPrefixedTagName: false,
  },
];

/* - Cross Arch Deps - */

function installCrossDeps(done) {
  if (process.env.PACK_ARCH || process.env.PACK_PLATFORM) {
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
    const packageLocation = 'node_modules/' + packageName;
    try {
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

    execSync(`npm install --no-save --force ${packageName}@${fpa.version}`);
    console.log(`Installed ${packageName}@${fpa.version}`);
  }
  done();
}


/* ------ Watch ------ */

function watchBack(done) {
  execute("npx ttsc --project tsconfig.backend.json --pretty --watch", done);
}

function watchRenderer(done) {
  const mode = config.isRelease ? "production" : "development";
  execute(`npx webpack --mode "${mode}" --watch`, done);
}

function watchStatic() {
  gulp.watch(config.static.src + "/**/*", buildStatic);
}

/* ------ Build ------ */

function buildRust(done) {
  const targetOption =
    process.env.PACK_ARCH === "ia32" ? 
      (process.env.GITHUB_WORKFLOW ? // Use msvc with github actions
      "--target i686-pc-windows-msvc" :
      "--target i686-pc-windows-gnu")
     : "";
  const releaseOption = config.isRelease ? "--release" : "";
  execute(
    `npx cargo-cp-artifact -a cdylib fp-rust ./build/back/fp-rust.node -- cargo build ${targetOption} ${releaseOption} --message-format=json-render-diagnostics`,
    done
  );
}

function buildBack(done) {
  execute("npx ttsc --project tsconfig.backend.json --pretty", done);
}

function buildRenderer(done) {
  const mode = config.isRelease ? "production" : "development";
  execute(`npx webpack --mode "${mode}"`, done);
}

function buildStatic() {
  return gulp
    .src(config.static.src + "/**/*")
    .pipe(gulp.dest(config.static.dest));
}

function configVersion(done) {
  fs.writeFile(".version", config.buildVersion, done);
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

  const data = `export const VERSION = '${formattedDate} (${gitCommitHash})';\n`

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
  const files = ["./build"];
  // Forcefully include ia32 library since nexus builds ia32
  if (process.platform === 'win32') {
    files.push({
      from: '../../node_modules/@fparchive/flashpoint-archive-win32-ia32-msvc',
      to: './node_modules/@fparchive/flashpoint-archive-win32-ia32-msvc',
      filter: ["**/*"]
    });
  }
  builder
    .build({
      targets: builder.Platform.WINDOWS.createTarget(),
      config: Object.assign(
        {
          appId: "com.bluemaxima.flashpoint-launcher",
          productName: "Flashpoint",
          directories: {
            buildResources: "./static/",
            output: "./dist/",
          },
          files: files,
          extraFiles: copyFiles, // Files to copy to the build folder
          extraResources: extraResources, // Copy System Extensions
          compression: "maximum", // Only used if a compressed target (like 7z, nsis, dmg etc.)
          asar: true,
          asarUnpack: ["**/fp-rust.node"],
          artifactName: "${productName}.${ext}",
          win: {
            target: [
              {
                target: "zip",
                arch: "ia32",
              }
            ],
            icon: "./icons/icon.ico",
          }
        }
      ),
    })
    .then(() => {
      console.log("Pack - Done!");
    })
    .catch((error) => {
      console.log("Pack - Error!", error);
    })
    .finally(done);
}

function pack(done) {
  const publish = config.publish ? publishInfo : []; // Uses Git repo for unpublished builds
  const extraOpts = config.publish ? extraOptions : {};
  builder
    .build({
      ia32: process.env.PACK_ARCH === "ia32" || undefined,
      x64: process.env.PACK_ARCH === "x64" || undefined,
      config: Object.assign(
        {
          appId: "com.bluemaxima.flashpoint-launcher",
          productName: "Flashpoint",
          directories: {
            buildResources: "./static/",
            output: "./dist/",
          },
          files: ["./build"],
          extraFiles: copyFiles, // Files to copy to the build folder
          extraResources: extraResources, // Copy System Extensions
          compression: "maximum", // Only used if a compressed target (like 7z, nsis, dmg etc.)
          target: "dir",
          asar: true,
          asarUnpack: ["**/fp-rust.node"],
          publish: publish,
          artifactName: "${productName}-${version}_${os}-${arch}.${ext}",
          win: {
            target: "dir",
            icon: "./icons/icon.ico",
          },
          mac: {
            target: "dir",
            icon: "./icons/icon.icns",
          },
          linux: {
            target: "dir",
          },
        },
        extraOpts
      ),
    })
    .then(() => {
      console.log("Pack - Done!");
    })
    .catch((error) => {
      console.log("Pack - Error!", error);
    })
    .finally(done);
}

/* ------ Clean ------ */

function clean(done) {
  fs.remove("./dist", () => {
    fs.remove("./build", done);
  });
}

/* ------ Meta Tasks ------*/

exports.clean = series(clean);

exports.build = series(
  clean,
  createVersionFile,
  parallel(
    buildRust,
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
  parallel(
    buildRust,
    watchBack,
    watchRenderer,
    watchExtensions,
    buildStatic,
    watchStatic
  )
);

exports.pack = series(
  installCrossDeps,
  pack
);

exports.nexusPack = series(
  installCrossDeps,
  installExtensions,
  buildExtensions,
  nexusPack
);

exports.extInstall = series(installExtensions);