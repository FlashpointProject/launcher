const { series } = require('gulp');
const fs = require('fs');
const gulp = require('gulp');
const zip = require('gulp-zip');
const merge = require('merge-stream');
const esbuild = require('esbuild');

const filesToCopy = [
    'extension.js',
    'package.json',
    'icon.png',
    'LICENSE.md',
    'README.md'
];

function build(done) {
    esbuild.build({
        bundle: true,
        entryPoints: ['./src/extension.ts'],
        outfile: './dist/extension.js',
        platform: 'node',
        external: ['flashpoint-launcher'],
    })
    .catch(console.error)
    .finally(done);
}

async function watch() {
    const ctx = await esbuild.context({
        bundle: true,
        entryPoints: ['./src/extension.ts'],
        outfile: './dist/extension.js',
        platform: 'node',
        external: ['flashpoint-launcher'],
    });
    return ctx.watch();
}

function clean(cb) {
    fs.rm('./package', { recursive: true }, (err) => {
        if (err) { console.log('Clean', err); }
        cb();
    });
}

function stage() {
    const streams = filesToCopy.map(file => {
        if (fs.existsSync(file)) {
            return gulp.src(file).pipe(gulp.dest('package/core-ruffle'));
        }
    }).filter(s => s !== undefined);
    return merge([
        ...streams,
        gulp.src('out/**/*').pipe(gulp.dest('package/core-ruffle/out')),
        gulp.src('dist/**/*').pipe(gulp.dest('package/core-ruffle/dist')),
        gulp.src('static/**/*').pipe(gulp.dest('package/core-ruffle/static')),
    ]);
}

function package() {
    return gulp.src('package/**/*').pipe(zip('core-ruffle.fplx')).pipe(gulp.dest('.'));
}

exports.build = series(build);
exports.watch = series(watch);
exports.package = series(clean, stage, package);