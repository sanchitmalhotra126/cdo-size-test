/** @file Test of consoleShim.js which makes console functions safer to use
 *  on older browsers by filling in no-op functions. */
'use strict';

var assert = require('assert');
var progress = require('../../src/js/progress');

describe('progress', function () {
  it ('returns the correct activity CSS class', function () {
    assert.strictEqual(progress.activityCssClass(null), 'not_tried');
    assert.strictEqual(progress.activityCssClass(0), 'not_tried');
    assert.strictEqual(progress.activityCssClass(-5), 'attempted');
    assert.strictEqual(progress.activityCssClass(19), 'attempted');
    assert.strictEqual(progress.activityCssClass(20), 'passed');
    assert.strictEqual(progress.activityCssClass(29), 'passed');
    assert.strictEqual(progress.activityCssClass(30), 'perfect');
    assert.strictEqual(progress.activityCssClass(101), 'perfect');
  });
});

describe('bestResultLevelId', function () {
  var serverProgress, clientProgress;
  before(function () {
    serverProgress = {
      1: 0,
      2: 0,
      3: -50,
      4: 20,
      5: 100,
      6: 0,
      7: 100,
    };
    clientProgress = {
      6: 20,
      7: 0,
    };
  });
  it('returns the level when there\'s only one', function () {
    assert.strictEqual(progress.bestResultLevelId([1], serverProgress, clientProgress), 1);
  });
  it('returns the first level when none have progress', function () {
    assert.strictEqual(progress.bestResultLevelId([1, 2], serverProgress, clientProgress), 1);
  });
  it('returns the passed level', function () {
    assert.strictEqual(progress.bestResultLevelId([1, 4], serverProgress, clientProgress), 4);
  });
  it('returns the unsubmitted level', function () {
    assert.strictEqual(progress.bestResultLevelId([1, 3], serverProgress, clientProgress), 3);
  });
  it('returns the perfect level over the passed level', function () {
    assert.strictEqual(progress.bestResultLevelId([5, 4], serverProgress, clientProgress), 5);
  });
  it('returns the level with client progress', function () {
    assert.strictEqual(progress.bestResultLevelId([1, 6], serverProgress, clientProgress), 6);
  });
  it('returns the level with server progress', function () {
    assert.strictEqual(progress.bestResultLevelId([6, 7], serverProgress, clientProgress), 7);
  });
});
