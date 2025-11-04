import { series } from 'gulp';
import fs from 'fs';
import gulp from 'gulp';
import zip from 'gulp-zip';
import merge from 'merge-stream';
import esbuild from 'esbuild';
import { build as rslibBuild, loadConfig } from '@rslib/core';

const filesToCopy = [
    'extension.js',
    'package.json',
    'icon.png',
    'LICENSE.md',
    'README.md'
];

async function buildTask(done) {
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

async function watchTask(done) {
    const ctx = await esbuild.context({
        bundle: true,
        entryPoints: ['./src/extension.ts'],
        outfile: './dist/extension.js',
        platform: 'node',
        external: ['flashpoint-launcher'],
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

function packageExtTask() {
    return gulp.src('package/**/*').pipe(zip('core-ruffle.fplx')).pipe(gulp.dest('.'));
}

export const build = series(buildTask);
export const watch = series(watchTask);
export const packageExt = series(clean, stage, packageExtTask);