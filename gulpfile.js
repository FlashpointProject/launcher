/* eslint-disable @typescript-eslint/no-var-requires */
const fs = require("fs-extra");
const gulp = require("gulp");
const builder = require("electron-builder");
const { parallel, series } = require("gulp");
const { buildExtensions, watchExtensions } = require("./gulpfile.extensions");
const { execute } = require("./gulpfile.util");

const packageJson = JSON.parse(fs.readFileSync("./package.json"));
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
    filter: ["!**/node_modules/**"],
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
    process.env.PACK_ARCH === "ia32" ? "--target i686-pc-windows-msvc" : "";
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

/* ------ Pack ------ */

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
  parallel(
    buildRust,
    watchBack,
    watchRenderer,
    watchExtensions,
    buildStatic,
    watchStatic
  )
);

exports.pack = series(pack);
