const { series } = require('gulp');
const fs = require('fs');
const gulp = require('gulp');
const zip = require('gulp-zip');
const merge = require('merge-stream');

const filesToCopy = [
    'extension.js',
    'package.json',
    'icon.png',
    'LICENSE.md',
    'README.md'
];

function clean(cb) {
    fs.rm('./package', { recursive: true }, (err) => {
        if (err) { console.log('Clean', err); }
        cb();
    });
}

function stage() {
    const streams = filesToCopy.map(file => {
        if (fs.existsSync(file)) {
            return gulp.src(file).pipe(gulp.dest('package/core-curation'));
        }
    }).filter(s => s !== undefined);
    return merge([
        ...streams,
        gulp.src('out/**/*').pipe(gulp.dest('package/core-curation/out')),
        gulp.src('dist/**/*').pipe(gulp.dest('package/core-curation/dist')),
        gulp.src('static/**/*').pipe(gulp.dest('package/core-curation/static')),
    ]);
}

function package() {
    return gulp.src('package/**/*').pipe(zip('core-curation.fplx')).pipe(gulp.dest('.'));
}

exports.clean = clean;
exports.stage = stage;
exports.package = package;
exports.default = series(clean, stage, package);
