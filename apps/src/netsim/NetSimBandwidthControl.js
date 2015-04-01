/* jshint
 funcscope: true,
 newcap: true,
 nonew: true,
 shadow: false,
 unused: true,

 maxlen: 90,
 maxstatements: 200
 */
'use strict';

// Utils required only for Function.prototype.inherits()
require('../utils');
var netsimConstants = require('./netsimConstants');
var netsimUtils = require('./netsimUtils');
var NetSimSlider = require('./NetSimSlider');

/**
 * Generator and controller for packet size slider/selector
 * @param {jQuery} rootDiv
 * @param {function} changeCallback
 * @constructor
 */
var NetSimBandwidthControl = module.exports = function (rootDiv, changeCallback) {
  NetSimSlider.LogarithmicSlider.call(this, rootDiv, {
    onChange: changeCallback,
    value: Infinity,
    min: 4,
    max: 128 * netsimConstants.BITS_PER_KILOBIT,
    upperBoundInfinite: true
  });

  // Auto-render, unlike our base class
  this.render();
};
NetSimBandwidthControl.inherits(NetSimSlider.LogarithmicSlider);

/**
 * Converts a numeric bandwidth value (in bits) into a compact localized string
 * representation of that value.
 * @param {number} val - numeric value of the control
 * @returns {string} - localized string representation of value
 * @override
 */
NetSimBandwidthControl.prototype.valueToLabel = function (val) {
  return netsimUtils.bitsToLocalizedRoundedBitrate(val);
};
