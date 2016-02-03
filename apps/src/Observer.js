/** @file Helper for consuming ObservableEvents. */
// This block enables extra-strict linting, since this is new code.
/* jshint
 funcscope: true,
 newcap: true,
 nonew: true,
 shadow: false,
 unused: true,
 eqeqeq: true,

 maxlen: 90,
 maxparams: 3,
 maxstatements: 200
 */
'use strict';

/**
 * Helper object for consuming ObservableEvents, designed for composition into
 * other classes.  Remembers what it's observing and provides safer ways to
 * stop observing those things.
 * @constructor
 */
var Observer = module.exports = function () {
  /**
   * @private {Array.<Object>} event-key pairs of observed events, for easy
   *          unregistering later.
   */
  this.observed_ = [];
};

/**
 * Begin observing the given event, forwarding it to the provided callback
 * whenever the event occurs.
 * @param {!ObservableEvent} event
 * @param {!function} callback
 */
Observer.prototype.observe = function (event, callback) {
  var key = event.register(callback);
  this.observed_.push({
    event: event,
    key: key
  });
};

/**
 * Unregister all callbacks from all observed events.
 */
Observer.prototype.unobserveAll = function () {
  this.observed_.forEach(function (observable) {
    observable.event.unregister(observable.key);
  });
  this.observed_.length = 0;
};
