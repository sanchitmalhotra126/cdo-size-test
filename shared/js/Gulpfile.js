// There's also a set of code that lives in dashbaord/app/assets/javascript
// that should really be going through our browserify type pipeline

// TODO (brent) - figure out story for sharing code between different packages. (linklocal)
// TODO (brent) - framework for writing tests


var gulp = require('gulp');
var glob = require('glob');
var del = require('del');
var uglify = require('gulp-uglify');
var jshint = require('gulp-jshint');

var browserify = require('./lib/frontend/browserify');

var watchEnabled = false;

var BUILD_TARGET = './build/package/js';

gulp.task('lint', function () {
  // TODO (brent) - should we share jshint config between different packages
  return gulp.src([
      '*.js',
      'client_api/*.js'
    ])
    .pipe(jshint({
      curly: true,
      node: true,
      mocha: true,
      browser: true,
      undef: true
    }))
    .pipe(jshint.reporter('default'));
});

gulp.task('enable-watch', function () {
  watchEnabled = true;
});

gulp.task('bundle-js', function () {
  // May want some sort of step to check dependencies here in the future

  var files = [
    'initApp.js'
  ];
  var config = {
    src: files,
    dest: BUILD_TARGET + '/initApp.js',
    watch: watchEnabled
  };

  return browserify(config)();
});

gulp.task('compress', ['bundle-js'], function () {
  var files = [
    BUILD_TARGET + '/shared.js'
  ];
  return gulp.src(files)
    .pipe(uglify())
    .pipe(gulp.dest(BUILD_TARGET));
});

gulp.task('clean', function (cb) {
  del(BUILD_TARGET, cb);
});

gulp.task('watch', ['enable-watch', 'bundle-js']);
gulp.task('default', ['lint', 'bundle-js']);
