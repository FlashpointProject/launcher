const { series } = require('gulp');
const fs = require('fs');
const gulp = require('gulp');
const zip = require('gulp-zip');
const merge = require('merge-stream');
const esbuild = require('esbuild');
const { build: rslibBuild, loadConfig } = require('@rslib/core');

const filesToCopy = [
    'extension.js',
    'package.json',
    'icon.png',
    'LICENSE.md',
    'README.md'
];

async function build(done) {
    // Build main extension (Node.js)
    const nodeBuild = esbuild.build({
        bundle: true,
        entryPoints: ['./src/extension.ts'],
        outfile: './dist/extension.js',
        platform: 'node',
        external: ['flashpoint-launcher'],
    });

    const config = await loadConfig('./rslib.config.ts');
    
    Promise.all([nodeBuild, rslibBuild({
        ...config.content,
        mode: 'development'
    })])
    .catch(console.error)
    .finally(done);
}

async function watch(done) {
    const ctx = await esbuild.context({
        bundle: true,
        entryPoints: ['./src/extension.ts'],
        outfile: './dist/extension.js',
        platform: 'node',
        external: ['flashpoint-launcher', '*.css'],
    });

    const config = await loadConfig('./rslib.config.ts');
    const renderer = rslibBuild({
        ...config.content,
        mode: 'development',
        watch: true
    });

    return Promise.all([ctx.watch(), renderer])
    .catch(console.error)
    .finally(done);
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
            return gulp.src(file).pipe(gulp.dest('package/core-nga'));
        }
    }).filter(s => s !== undefined);
    return merge([
        ...streams,
        gulp.src('out/**/*').pipe(gulp.dest('package/core-nga/out')),
        gulp.src('dist/**/*').pipe(gulp.dest('package/core-nga/dist')),
        gulp.src('static/**/*').pipe(gulp.dest('package/core-nga/static')),
    ]);
}

function package() {
    return gulp.src('package/**/*').pipe(zip('core-nga.fplx')).pipe(gulp.dest('.'));
}

exports.build = series(build);
exports.watch = series(watch);
exports.package = series(clean, stage, package);