/* jshint
 funcscope: true,
 newcap: true,
 nonew: true,
 shadow: false,
 unused: true,

 maxlen: 90,
 maxstatements: 200
 */
/* global $ */
'use strict';

var markup = require('./NetSimDnsTab.html');
var DnsMode = require('./netsimConstants').DnsMode;
var NetSimDnsModeControl = require('./NetSimDnsModeControl');
var NetSimDnsManualControl = require('./NetSimDnsManualControl');
var NetSimDnsTable = require('./NetSimDnsTable');

/**
 * Generator and controller for "My Device" tab.
 * @param {jQuery} rootDiv
 * @param {NetSimLevelConfiguration} levelConfig
 * @param {function} dnsModeChangeCallback
 * @param {function} becomeDnsCallback
 * @constructor
 */
var NetSimDnsTab = module.exports = function (rootDiv, levelConfig,
    dnsModeChangeCallback, becomeDnsCallback) {
  /**
   * Component root, which we fill whenever we call render()
   * @type {jQuery}
   * @private
   */
  this.rootDiv_ = rootDiv;

  /**
   * @type {NetSimLevelConfiguration}
   * @private
   */
  this.levelConfig_ = levelConfig;

  /**
   * @type {function}
   * @private
   */
  this.dnsModeChangeCallback_ = dnsModeChangeCallback;

  /**
   * @type {function}
   * @private
   */
  this.becomeDnsCallback_ = becomeDnsCallback;

  /**
   * @type {NetSimDnsModeControl}
   * @private
   */
  this.dnsModeControl_ = null;

  /**
   * @type {NetSimDnsManualControl}
   * @private
   */
  this.dnsManualControl_ = null;

  /**
   * @type {NetSimDnsTable}
   * @private
   */
  this.dnsTable_ = null;

  this.render();
};

/**
 * Fill the root div with new elements reflecting the current state
 */
NetSimDnsTab.prototype.render = function () {
  var renderedMarkup = $(markup({
    level: this.levelConfig_
  }));
  this.rootDiv_.html(renderedMarkup);

  if (this.levelConfig_.showDnsModeControl) {
    this.dnsModeControl_ = new NetSimDnsModeControl(
        this.rootDiv_.find('.dns_mode'),
        this.dnsModeChangeCallback_);
  }

  this.dnsManualControl_ = new NetSimDnsManualControl(
      this.rootDiv_.find('.dns_manual_control'),
      this.becomeDnsCallback_);

  this.dnsTable_ = new NetSimDnsTable(
      this.rootDiv_.find('.dns_table'));
};

/**
 * @param {DnsMode} newDnsMode
 */
NetSimDnsTab.prototype.setDnsMode = function (newDnsMode) {
  if (this.dnsModeControl_) {
    this.dnsModeControl_.setDnsMode(newDnsMode);
  }

  this.dnsTable_.setDnsMode(newDnsMode);
  if (newDnsMode === DnsMode.MANUAL) {
    this.rootDiv_.find('.dns_manual_control').show();
  } else {
    this.rootDiv_.find('.dns_manual_control').hide();
  }
};

/**
 * @param {boolean} isDnsNode
 */
NetSimDnsTab.prototype.setIsDnsNode = function (isDnsNode) {
  this.dnsManualControl_.setIsDnsNode(isDnsNode);
};

/**
 * @param {Array} tableContents
 */
NetSimDnsTab.prototype.setDnsTableContents = function (tableContents) {
  this.dnsTable_.setDnsTableContents(tableContents);
};
