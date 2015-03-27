require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({179:[function(require,module,exports){
var appMain = require('../appMain');
var studioApp = require('../StudioApp').singleton;
var NetSim = require('./netsim');

var levels = require('./levels');
var skins = require('./skins');

window.netsimMain = function(options) {
  options.skinsModule = skins;
  options.isEditorless = true;

  var netSim = new NetSim();
  netSim.injectStudioApp(studioApp);
  appMain(netSim, levels, options);
};

},{"../StudioApp":4,"../appMain":5,"./levels":178,"./netsim":180,"./skins":185}],185:[function(require,module,exports){
var skinBase = require('../skins');

exports.load = function (assetUrl, id) {
  var skin = skinBase.load(assetUrl, id);
  return skin;
};

},{"../skins":189}],180:[function(require,module,exports){
/**
 * @fileoverview Internet Simulator app for Code.org.
 */

/* jshint
 funcscope: true,
 newcap: true,
 nonew: true,
 shadow: false,
 unused: true,

 maxlen: 90,
 maxparams: 3,
 maxstatements: 200
*/
/* global -Blockly */
/* global $ */
'use strict';

var page = require('./page.html');
var i18n = require('../../locale/current/netsim');
var netsimUtils = require('./netsimUtils');
var DnsMode = require('./netsimConstants').DnsMode;
var NetSimConnection = require('./NetSimConnection');
var DashboardUser = require('./DashboardUser');
var NetSimLobby = require('./NetSimLobby');
var NetSimTabsComponent = require('./NetSimTabsComponent');
var NetSimSendPanel = require('./NetSimSendPanel');
var NetSimLogPanel = require('./NetSimLogPanel');
var NetSimStatusPanel = require('./NetSimStatusPanel');
var NetSimVisualization = require('./NetSimVisualization');
var RunLoop = require('../RunLoop');

/**
 * The top-level Internet Simulator controller.
 * @param {StudioApp} studioApp The studioApp instance to build upon.
 */
var NetSim = module.exports = function () {
  /**
   * @type {Object}
   */
  this.skin = null;

  /**
   * @type {netsimLevelConfiguration}
   */
  this.level = {};

  /**
   * @type {number}
   */
  this.heading = 0;

  /**
   * Current user object which asynchronously grabs the current user's
   * info from the dashboard API.
   * @type {DashboardUser}
   * @private
   */
  this.currentUser_ = DashboardUser.getCurrentUser();

  /**
   * Manager for connection to shared shard of netsim app.
   * @type {NetSimConnection}
   * @private
   */
  this.connection_ = null;

  /**
   * Reference to currently connected simulation router.
   * @type {NetSimRouterNode}
   * @private
   */
  this.myConnectedRouter_ = null;

  /**
   * Tick and Render loop manager for the simulator
   * @type {RunLoop}
   * @private
   */
  this.runLoop_ = new RunLoop();

  /**
   * Current chunk size (bytesize)
   * @type {number}
   * @private
   */
  this.chunkSize_ = 8;

  /**
   * Current router maximum (optimistic) bandwidth (bits/second)
   * @type {number}
   * @private
   */
  this.routerBandwidth_ = Infinity;

  /**
   * Current dns mode.
   * @type {DnsMode}
   * @private
   */
  this.dnsMode_ = DnsMode.NONE;
};


/**
 *
 */
NetSim.prototype.injectStudioApp = function (studioApp) {
  this.studioApp_ = studioApp;
};

/**
 * Called on page load.
 * @param {Object} config
 * @param {Object} config.skin
 * @param {netsimLevelConfiguration} config.level
 * @param {boolean} config.enableShowCode - Always false for NetSim
 * @param {function} config.loadAudio
 */
NetSim.prototype.init = function(config) {
  if (!this.studioApp_) {
    throw new Error("NetSim requires a StudioApp");
  }

  /**
   * Skin for the loaded level
   * @type {Object}
   */
  this.skin = config.skin;

  /**
   * Configuration for the loaded level
   * @type {netsimLevelConfiguration}
   */
  this.level = netsimUtils.scrubLevelConfiguration_(config.level);

  config.html = page({
    assetUrl: this.studioApp_.assetUrl,
    data: {
      visualization: '',
      localeDirection: this.studioApp_.localeDirection(),
      controls: require('./controls.html')({assetUrl: this.studioApp_.assetUrl})
    },
    hideRunButton: true
  });

  config.enableShowCode = false;
  config.loadAudio = this.loadAudio_.bind(this);

  // Override certain StudioApp methods - netsim does a lot of configuration
  // itself, because of its nonstandard layout.
  this.studioApp_.configureDom = this.configureDomOverride_.bind(this.studioApp_);
  this.studioApp_.onResize = this.onResizeOverride_.bind(this.studioApp_);

  this.studioApp_.init(config);

  // Create netsim lobby widget in page
  this.currentUser_.whenReady(function () {
    this.initWithUserName_(this.currentUser_);
  }.bind(this));

  // Begin the main simulation loop
  this.runLoop_.begin();
};

/**
 * Extracts query parameters from a full URL and returns them as a simple
 * object.
 * @returns {*}
 */
NetSim.prototype.getOverrideShardID = function () {
  var parts = location.search.split('?');
  if (parts.length === 1) {
    return undefined;
  }

  var shardID;
  parts[1].split('&').forEach(function (param) {
    var sides = param.split('=');
    if (sides.length > 1 && sides[0] === 's') {
      shardID = sides[1];
    }
  });
  return shardID;
};

NetSim.prototype.shouldEnableCleanup = function () {
  return !location.search.match(/disableCleaning/i);
};

NetSim.prototype.shouldShowAnyTabs = function () {
  return this.level.showTabs.length > 0;
};

/**
 * Initialization that can happen once we have a user name.
 * Could collapse this back into init if at some point we can guarantee that
 * user name is available on load.
 * @param {DashboardUser} user
 * @private
 */
NetSim.prototype.initWithUserName_ = function (user) {
  this.mainContainer_ = $('#netsim');

  this.receivedMessageLog_ = new NetSimLogPanel($('#netsim_received'), {
    logTitle: i18n.receivedMessageLog(),
    isMinimized: false,
    packetSpec: this.level.clientInitialPacketHeader
  });

  this.sentMessageLog_ = new NetSimLogPanel($('#netsim_sent'), {
    logTitle: i18n.sentMessageLog(),
    isMinimized: true,
    packetSpec: this.level.clientInitialPacketHeader
  });

  this.connection_ = new NetSimConnection({
    window: window,
    levelConfig: this.level,
    sentLog: this.sentMessageLog_,
    receivedLog: this.receivedMessageLog_,
    enableCleanup: this.shouldEnableCleanup()
  });
  this.connection_.attachToRunLoop(this.runLoop_);
  this.connection_.statusChanges.register(this.refresh_.bind(this));
  this.connection_.shardChange.register(this.onShardChange_.bind(this));

  this.statusPanel_ = new NetSimStatusPanel($('#netsim_status'),
      this.connection_.disconnectFromRouter.bind(this.connection_));

  this.visualization_ = new NetSimVisualization($('svg'), this.runLoop_,
      this.connection_);

  var lobbyContainer = document.getElementById('netsim_lobby_container');
  this.lobbyControl_ = NetSimLobby.createWithin(lobbyContainer, this.level,
      this.connection_, user, this.getOverrideShardID());

  // Tab panel - contains instructions, my device, router, dns
  if (this.shouldShowAnyTabs()) {
    this.tabs_ = new NetSimTabsComponent(
        $('#netsim_tabs'),
        this.level,
        {
          chunkSizeChangeCallback: this.setChunkSize.bind(this),
          encodingChangeCallback: this.changeEncodings.bind(this),
          routerBandwidthChangeCallback: this.changeRemoteRouterBandwidth.bind(this),
          dnsModeChangeCallback: this.changeRemoteDnsMode.bind(this),
          becomeDnsCallback: this.becomeDnsNode.bind(this)
        });
}

  this.sendWidget_ = new NetSimSendPanel($('#netsim_send'), this.level,
      this.connection_);

  this.changeEncodings(this.level.defaultEnabledEncodings);
  this.setChunkSize(this.chunkSize_);
  this.setRouterBandwidth(this.level.defaultRouterBandwidth);
  this.setDnsMode(this.level.defaultDnsMode);
  this.refresh_();
};

/**
 * Respond to connection status changes show/hide the main content area.
 * @private
 */
NetSim.prototype.refresh_ = function () {
  if (this.connection_.isConnectedToRouter()) {
    this.mainContainer_.find('.leftcol_disconnected').hide();
    this.mainContainer_.find('.leftcol_connected').show();
  } else {
    this.mainContainer_.find('.leftcol_disconnected').show();
    this.mainContainer_.find('.leftcol_connected').hide();
  }
  this.render();
};

/**
 * Update encoding-view setting across the whole app.
 *
 * Propagates the change down into relevant child components, possibly
 * including the control that initiated the change; in that case, re-setting
 * the value should be a no-op and safe to do.
 *
 * @param {EncodingType[]} newEncodings
 */
NetSim.prototype.changeEncodings = function (newEncodings) {
  if (this.tabs_) {
    this.tabs_.setEncodings(newEncodings);
  }
  this.receivedMessageLog_.setEncodings(newEncodings);
  this.sentMessageLog_.setEncodings(newEncodings);
  this.sendWidget_.setEncodings(newEncodings);
};

/**
 * Update chunk-size/bytesize setting across the whole app.
 *
 * Propagates the change down into relevant child components, possibly
 * including the control that initiated the change; in that case, re-setting
 * the value should be a no-op and safe to do.
 *
 * @param {number} newChunkSize
 */
NetSim.prototype.setChunkSize = function (newChunkSize) {
  this.chunkSize_ = newChunkSize;
  if (this.tabs_) {
    this.tabs_.setChunkSize(newChunkSize);
  }
  this.receivedMessageLog_.setChunkSize(newChunkSize);
  this.sentMessageLog_.setChunkSize(newChunkSize);
  this.sendWidget_.setChunkSize(newChunkSize);
};

/**
 * Update router bandwidth across the app.
 *
 * Propagates the change down into relevant child components, possibly including
 * the control that initiated the change; in that case, re-setting the value
 * should be a no-op and safe to do.
 *
 * @param {number} newBandwidth in bits/second
 */
NetSim.prototype.setRouterBandwidth = function (newBandwidth) {
  this.routerBandwidth_ = newBandwidth;
  if (this.tabs_) {
    this.tabs_.setRouterBandwidth(newBandwidth);
  }
};

/**
 * Sets router bandwidth across the simulation, proagating the change to other
 * clients.
 * @param {number} newBandwidth in bits/second
 */
NetSim.prototype.changeRemoteRouterBandwidth = function (newBandwidth) {
  this.setRouterBandwidth(newBandwidth);
  if (this.myConnectedRouter_) {
    this.myConnectedRouter_.setBandwidth(newBandwidth);
  }
};

/**
 * Update DNS mode across the whole app.
 *
 * Propagates the change down into relevant child components, possibly
 * including the control that initiated the change; in that case, re-setting
 * the value should be a no-op and safe to do.
 *
 * @param {DnsMode} newDnsMode
 */
NetSim.prototype.setDnsMode = function (newDnsMode) {
  this.dnsMode_ = newDnsMode;
  if (this.tabs_) {
    this.tabs_.setDnsMode(newDnsMode);
  }
  this.visualization_.setDnsMode(newDnsMode);
};

/**
 * Sets DNS mode across the whole simulation, propagating the change
 * to other clients.
 * @param {DnsMode} newDnsMode
 */
NetSim.prototype.changeRemoteDnsMode = function (newDnsMode) {
  this.setDnsMode(newDnsMode);
  if (this.myConnectedRouter_) {
    this.myConnectedRouter_.setDnsMode(newDnsMode);
  }
};

/**
 * @param {boolean} isDnsNode
 */
NetSim.prototype.setIsDnsNode = function (isDnsNode) {
  if (this.tabs_) {
    this.tabs_.setIsDnsNode(isDnsNode);
  }
  if (this.myConnectedRouter_) {
    this.setDnsTableContents(this.myConnectedRouter_.getAddressTable());
  }
};

/**
 * @param {number} dnsNodeID
 */
NetSim.prototype.setDnsNodeID = function (dnsNodeID) {
  this.visualization_.setDnsNodeID(dnsNodeID);
};

/**
 * Tells simulation that we want to become the DNS node for our
 * connected router.
 */
NetSim.prototype.becomeDnsNode = function () {
  this.setIsDnsNode(true);
  if (this.connection_&&
      this.connection_.myNode &&
      this.connection_.myNode.myRouter) {
    // STATE IS THE ROOT OF ALL EVIL
    var myNode = this.connection_.myNode;
    var router = myNode.myRouter;
    router.dnsNodeID = myNode.entityID;
    router.update();
  }
};

/**
 * @param {Array} tableContents
 */
NetSim.prototype.setDnsTableContents = function (tableContents) {
  if (this.tabs_) {
    this.tabs_.setDnsTableContents(tableContents);
  }
};

/**
 * @param {Array} logData
 */
NetSim.prototype.setRouterLogData = function (logData) {
  if (this.tabs_) {
    this.tabs_.setRouterLogData(logData);
  }
};

/**
 * Load audio assets for this app
 * TODO (bbuchanan): Ought to pull this into an audio management module
 * @private
 */
NetSim.prototype.loadAudio_ = function () {
};

/**
 * Replaces StudioApp.configureDom.
 * Should be bound against StudioApp instance.
 * @param {Object} config Should at least contain
 *   containerId: ID of a parent DOM element for app content
 *   html: Content to put inside #containerId
 * @private
 */
NetSim.prototype.configureDomOverride_ = function (config) {
  var container = document.getElementById(config.containerId);
  container.innerHTML = config.html;
};

/**
 * Replaces StudioApp.onResize
 * Should be bound against StudioApp instance.
 * @private
 */
NetSim.prototype.onResizeOverride_ = function() {
  var div = document.getElementById('appcontainer');
  var divParent = div.parentNode;
  var parentStyle = window.getComputedStyle(divParent);
  var parentWidth = parseInt(parentStyle.width, 10);
  div.style.top = divParent.offsetTop + 'px';
  div.style.width = parentWidth + 'px';
};

/**
 * Re-render parts of the page that can be re-rendered in place.
 */
NetSim.prototype.render = function () {
  var isConnected, clientStatus, myHostname, myAddress, remoteNodeName,
      shareLink;

  isConnected = false;
  clientStatus = i18n.disconnected();
  if (this.connection_ && this.connection_.myNode) {
    clientStatus = 'In Lobby';
    myHostname = this.connection_.myNode.getHostname();
    if (this.connection_.myNode.myWire) {
      myAddress = this.connection_.myNode.myWire.localAddress;
    }
  }

  if (this.myConnectedRouter_) {
    isConnected = true;
    clientStatus = i18n.connected();
    remoteNodeName = this.myConnectedRouter_.getDisplayName();
  }

  if (this.statusPanel_) {
    this.statusPanel_.render({
      isConnected: isConnected,
      statusString: clientStatus,
      myHostname: myHostname,
      myAddress: myAddress,
      remoteNodeName: remoteNodeName,
      shareLink: shareLink
    });
  }
};

/**
 * Called whenever the connection notifies us that we've connected to,
 * or disconnected from, a shard.
 * @param {NetSimShard} newShard - null if disconnected.
 * @param {NetSimLocalClientNode} localNode - null if disconnected
 * @private
 */
NetSim.prototype.onShardChange_= function (newShard, localNode) {
  if (localNode) {
    localNode.routerChange.register(this.onRouterChange_.bind(this));
  }
  this.render();
};

/**
 * Called whenever the local node notifies that we've been connected to,
 * or disconnected from, a router.
 * @param {NetSimWire} wire - null if disconnected.
 * @param {NetSimRouterNode} router - null if disconnected
 * @private
 */
NetSim.prototype.onRouterChange_ = function (wire, router) {

  // Unhook old handlers
  if (this.routerStateChangeKey !== undefined) {
    this.myConnectedRouter_.stateChange.unregister(this.routerStateChangeKey);
    this.routerStateChangeKey = undefined;
  }

  if (this.routerWireChangeKey !== undefined) {
    this.myConnectedRouter_.wiresChange.unregister(this.routerWireChangeKey);
    this.routerWireChangeKey = undefined;
  }

  if (this.routerLogChangeKey !== undefined) {
    this.myConnectedRouter_.logChange.unregister(this.routerLogChangeKey);
    this.routerLogChangeKey = undefined;
  }

  this.myConnectedRouter_ = router;
  this.render();

  // Hook up new handlers
  if (router) {
    // Propagate changes
    this.onRouterStateChange_(router);

    // Hook up new handlers
    this.routerStateChangeKey = router.stateChange.register(
        this.onRouterStateChange_.bind(this));

    this.routerWireChangeKey = router.wiresChange.register(
        this.onRouterWiresChange_.bind(this));

    this.routerLogChangeKey = router.logChange.register(
        this.onRouterLogChange_.bind(this));
  }
};

/**
 * @param {NetSimRouterNode} router
 * @private
 */
NetSim.prototype.onRouterStateChange_ = function (router) {
  var myNode = {};
  if (this.connection_ && this.connection_.myNode) {
    myNode = this.connection_.myNode;
  }

  this.setRouterBandwidth(router.bandwidth);
  this.setDnsMode(router.dnsMode);
  this.setDnsNodeID(router.dnsMode === DnsMode.NONE ? undefined : router.dnsNodeID);
  this.setIsDnsNode(router.dnsMode === DnsMode.MANUAL &&
      router.dnsNodeID === myNode.entityID);
};

NetSim.prototype.onRouterWiresChange_ = function () {
  if (this.myConnectedRouter_) {
    this.setDnsTableContents(this.myConnectedRouter_.getAddressTable());
  }
};

NetSim.prototype.onRouterLogChange_ = function () {
  if (this.myConnectedRouter_) {
    this.setRouterLogData(this.myConnectedRouter_.getLog());
  }
};
},{"../../locale/current/netsim":245,"../RunLoop":3,"./DashboardUser":119,"./NetSimConnection":125,"./NetSimLobby":139,"./NetSimLogPanel":144,"./NetSimSendPanel":162,"./NetSimStatusPanel":166,"./NetSimTabsComponent":169,"./NetSimVisualization":170,"./controls.html":176,"./netsimConstants":181,"./netsimUtils":183,"./page.html":184}],184:[function(require,module,exports){
module.exports= (function() {
  var t = function anonymous(locals, filters, escape) {
escape = escape || function (html){
  return String(html)
    .replace(/&(?!\w+;)/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
};
var buf = [];
with (locals || {}) { (function(){ 
 buf.push('');1;
  var msg = require('../../locale/current/common');
; buf.push('\n\n<div id="rotateContainer" style="background-image: url(', escape((5,  assetUrl('media/mobile_tutorial_turnphone.png') )), ')">\n  <div id="rotateText">\n    <p>', escape((7,  msg.rotateText() )), '<br>', escape((7,  msg.orientationLock() )), '</p>\n  </div>\n</div>\n\n');11; var instructions = function() {; buf.push('  <div id="bubble" class="clearfix">\n    <table id="prompt-table">\n      <tr>\n        <td id="prompt-icon-cell">\n          <img id="prompt-icon"/>\n        </td>\n        <td id="prompt-cell">\n          <p id="prompt">\n          </p>\n        </td>\n      </tr>\n    </table>\n    <div id="ani-gif-preview-wrapper">\n      <div id="ani-gif-preview">\n        <img id="play-button" src="', escape((25,  assetUrl('media/play-circle.png') )), '"/>\n      </div>\n    </div>\n  </div>\n');29; };; buf.push('\n<div id="appcontainer">\n  <!-- Should disable spell-check on all netsim elements -->\n  <div id="netsim"  autocapitalize="false" autocorrect="false" autocomplete="false" spellcheck="false">\n    <div id="netsim_rightcol">\n      <div id="netsim_status"></div>\n      <div id="netsim_vizualization">\n        <svg version="1.1" width="300" height="300" xmlns="http://www.w3.org/2000/svg">\n\n          <filter id="backgroundBlur">\n            <feGaussianBlur in="SourceGraphic" stdDeviation="5" />\n            <feComponentTransfer>\n              <feFuncA slope="0.5" type="linear"></feFuncA>\n            </feComponentTransfer>\n          </filter>\n\n          <g id="centered_group" transform="translate(150,150)">\n            <g id="background_group" filter="url(#backgroundBlur)"></g>\n            <g id="foreground_group"></g>\n          </g>\n        </svg>\n      </div>\n      <div id="netsim_tabs"></div>\n    </div>\n    <div id="netsim_leftcol">\n      <div class="leftcol_disconnected">\n        <div id="netsim_lobby_container"></div>\n      </div>\n      <div class="leftcol_connected">\n        <div id="netsim_received"></div>\n        <div id="netsim_sent"></div>\n        <div id="netsim_send"></div>\n      </div>\n    </div>\n  </div>\n  <div id="footers" dir="', escape((64,  data.localeDirection )), '">\n    ');65; instructions() ; buf.push('\n  </div>\n</div>\n\n<div class="clear"></div>\n'); })();
} 
return buf.join('');
};
  return function(locals) {
    return t(locals, require("ejs").filters);
  }
}());
},{"../../locale/current/common":240,"ejs":256}],178:[function(require,module,exports){
/*jshint multistr: true */

var msg = require('../../locale/current/netsim');
var utils = require('../utils');
var netsimConstants = require('./netsimConstants');
var Packet = require('./Packet');
var BITS_PER_NIBBLE = netsimConstants.BITS_PER_NIBBLE;
var DnsMode = netsimConstants.DnsMode;
var EncodingType = netsimConstants.EncodingType;
var NetSimTabType = netsimConstants.NetSimTabType;

/**
 * A level configuration that can be used by NetSim
 * @typedef {Object} netsimLevelConfiguration
 *
 * @property {string} instructions - Inherited from blockly level configuration.
 *
 * @property {boolean} showClientsInLobby - Whether client nodes should appear
 *           in the lobby list at all.
 *
 * @property {boolean} showRoutersInLobby - Whether router nodes should appear
 *           in the lobby list at all.
 *
 * @property {boolean} showAddRouterButton - Whether the "Add Router" button
 *           should appear above the lobby list.
 *
 * @property {packetHeaderSpec} routerExpectsPacketHeader - The header format
 *           the router uses to parse incoming packets and figure out where
 *           to route them.
 *
 * @property {packetHeaderSpec} clientInitialPacketHeader - The header format
 *           used by the local client node when generating/parsing packets,
 *           which affects the layout of the send panel and log panels.
 *
 * @property {boolean} showAddPacketButton - Whether the "Add Packet" button
 *           should appear in the send widget.
 *
 * @property {boolean} showPacketSizeControl - Whether the packet size slider
 *           should appear in the send widget.
 *
 * @property {number} defaultPacketSizeLimit - Initial maximum packet size.
 *
 * @property {NetSimTabType[]} showTabs - Which tabs should appear beneath the
 *           network visualization.  Does not determine tab order; tabs always
 *           appear in the order "Instructions, My Device, Router, DNS."
 *
 * @property {number} defaultTabIndex - The zero-based index of the tab
 *           that should be active by default, which depends on which tabs
 *           you have enabled.
 *
 * @property {EncodingType[]} showEncodingControls - Which encodings, (ASCII,
 *           binary, etc.) should have visible controls on the "My Device" tab.
 *
 * @property {EncodingType[]} defaultEnabledEncodings - Which encodings should
 *           be enabled on page load.  Note: An encoding enabled here but not
 *           included in the visible controls will be enabled and cannot be
 *           disabled by the student.
 *
 * @property {boolean} showRouterBandwidthControl - Whether students should be
 *           able to see and manipulate the slider that adjusts the router's
 *           max throughput speed.
 *
 * @property {number} defaultRouterBandwidth - How fast the router should be
 *           able to process packets, on initial level load.
 *
 * @property {boolean} showDnsModeControl - Whether the DNS mode controls will
 *           be available to the student.
 *
 * @property {DnsMode} defaultDnsMode - Which DNS mode the simulator should
 *           initialize into.
 */

/*
 * Configuration for all levels.
 */
var levels = module.exports = {};

/**
 * A default level configuration so that we can define the others by delta.
 * This default configuration enables everything possible, so other configs
 * should start with this one and disable features.
 * @type {netsimLevelConfiguration}
 */
levels.default = {

  // Lobby configuration
  showClientsInLobby: true,
  showRoutersInLobby: true,
  showAddRouterButton: true,

  // Packet header specification
  routerExpectsPacketHeader: [
    { key: Packet.HeaderType.TO_ADDRESS, bits: BITS_PER_NIBBLE },
    { key: Packet.HeaderType.FROM_ADDRESS, bits: BITS_PER_NIBBLE },
    { key: Packet.HeaderType.PACKET_INDEX, bits: BITS_PER_NIBBLE },
    { key: Packet.HeaderType.PACKET_COUNT, bits: BITS_PER_NIBBLE }
  ],
  clientInitialPacketHeader: [
    { key: Packet.HeaderType.TO_ADDRESS, bits: BITS_PER_NIBBLE },
    { key: Packet.HeaderType.FROM_ADDRESS, bits: BITS_PER_NIBBLE },
    { key: Packet.HeaderType.PACKET_INDEX, bits: BITS_PER_NIBBLE },
    { key: Packet.HeaderType.PACKET_COUNT, bits: BITS_PER_NIBBLE }
  ],

  // Send widget configuration
  showAddPacketButton: true,
  showPacketSizeControl: true,
  defaultPacketSizeLimit: Infinity,

  // Tab-panel control
  showTabs: [
    NetSimTabType.INSTRUCTIONS,
    NetSimTabType.MY_DEVICE,
    NetSimTabType.ROUTER,
    NetSimTabType.DNS
  ],
  defaultTabIndex: 0,

  // Instructions tab and its controls
  // Note: Uses the blockly-standard level.instructions value, which should
  //       be localized by the time it gets here.

  // "My Device" tab and its controls
  showEncodingControls: [
    EncodingType.BINARY,
    EncodingType.A_AND_B,
    EncodingType.HEXADECIMAL,
    EncodingType.DECIMAL,
    EncodingType.ASCII
  ],
  defaultEnabledEncodings: [
    EncodingType.ASCII,
    EncodingType.BINARY
  ],

  // Router tab and its controls
  showRouterBandwidthControl: true,
  defaultRouterBandwidth: Infinity,

  // DNS tab and its controls
  showDnsModeControl: true,
  defaultDnsMode: DnsMode.NONE
};

/**
 * Variant 1 base level
 * Sends individual bits at a time.
 * @type {netsimLevelConfiguration}
 */
levels.variant1 = utils.extend(levels.default, {
  showAddRouterButton: false,
  clientInitialPacketHeader: [],
  showAddPacketButton: false,
  showPacketSizeControl: false,
  showTabs: [NetSimTabType.INSTRUCTIONS],
  defaultEnabledEncodings: [EncodingType.A_AND_B]
});

/**
 * Variant 2 base level
 * Sends messages as packets, all at once.
 * @type {netsimLevelConfiguration}
 */
levels.variant2 = utils.extend(levels.default, {
  showAddRouterButton: false,
  clientInitialPacketHeader: [],
  showAddPacketButton: false,
  showPacketSizeControl: false,
  showTabs: [NetSimTabType.INSTRUCTIONS, NetSimTabType.MY_DEVICE],
  showEncodingControls: [EncodingType.ASCII],
  defaultEnabledEncodings: [EncodingType.BINARY, EncodingType.ASCII]
});

/**
 * Variant 3 base level
 * Enables routers.
 * @type {netsimLevelConfiguration}
 */
levels.variant3 = utils.extend(levels.default, {
  showClientsInLobby: false,
  showAddRouterButton: true,
  showAddPacketButton: true,
  showPacketSizeControl: true,
  defaultPacketSizeLimit: Infinity,

  showTabs: [
    NetSimTabType.INSTRUCTIONS,
    NetSimTabType.MY_DEVICE,
    NetSimTabType.ROUTER,
    NetSimTabType.DNS
  ],

  showEncodingControls: [EncodingType.ASCII],
  defaultEnabledEncodings: [EncodingType.BINARY, EncodingType.ASCII],

  showDnsModeControl: false,
  defaultDnsMode: DnsMode.AUTOMATIC
});

},{"../../locale/current/netsim":245,"../utils":235,"./Packet":175,"./netsimConstants":181}],176:[function(require,module,exports){
module.exports= (function() {
  var t = function anonymous(locals, filters, escape) {
escape = escape || function (html){
  return String(html)
    .replace(/&(?!\w+;)/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
};
var buf = [];
with (locals || {}) { (function(){ 
 buf.push('<div id="slider-cell">\n  <img id="spinner" style="visibility: hidden;" src="', escape((2,  assetUrl('media/turtle/loading.gif') )), '" height=15 width=15>\n</div>\n'); })();
} 
return buf.join('');
};
  return function(locals) {
    return t(locals, require("ejs").filters);
  }
}());
},{"ejs":256}],170:[function(require,module,exports){
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

var utils = require('../utils');
var _ = utils.getLodash();
var netsimNodeFactory = require('./netsimNodeFactory');
var NetSimWire = require('./NetSimWire');
var NetSimVizNode = require('./NetSimVizNode');
var NetSimVizWire = require('./NetSimVizWire');
var tweens = require('./tweens');

/**
 * Top-level controller for the network visualization.
 *
 * For the most part, the visualization attaches to the raw network state
 * representation (the storage tables) and updates to reflect that state,
 * independent of the rest of the controls on the page.  This separation means
 * that the visualization always has one canonical state to observe.
 *
 * @param {jQuery} svgRoot - The <svg> tag within which the visualization
 *        will be created.
 * @param {RunLoop} runLoop - Loop providing tick and render events that the
 *        visualization can hook up to and respond to.
 * @param {NetSimConnection} connection - Reference to the connection manager,
 *        which provides the hooks we need to get the shard, the local node,
 *        and to attach to the shared network state.
 * @constructor
 */
var NetSimVisualization = module.exports = function (svgRoot, runLoop, connection) {
  /**
   * @type {jQuery}
   * @private
   */
  this.svgRoot_ = svgRoot;

  /**
   * The shard currently being represented.
   * We don't have a shard now, but we register with the connection manager
   * to find out when we have one.
   * @type {NetSimShard}
   * @private
   */
  this.shard_ = null;
  connection.shardChange.register(this.onShardChange_.bind(this));

  /**
   * List of VizEntities, which are all the elements that will actually show up
   * in our visualization.
   * @type {Array.<NetSimVizEntity>}
   * @private
   */
  this.entities_ = [];

  /**
   * Width (in svg-units) of visualization
   * @type {number}
   */
  this.visualizationWidth = 300;

  /**
   * Height (in svg-units) of visualization
   * @type {number}
   */
  this.visualizationHeight = 300;

  /**
   * Key used to unregister from the node table.
   * @type {Object}
   */
  this.nodeTableChangeKey = undefined;

  /**
   * Key used to unregister from the wire table.
   * @type {Object}
   */
  this.wireTableChangeKey = undefined;

  // Hook up tick and render methods
  runLoop.tick.register(this.tick.bind(this));
  runLoop.render.register(this.render.bind(this));
};

/**
 * Tick: Update all vizentities, giving them an opportunity to recalculate
 *       their internal state, and remove any dead entities from the
 *       visualization.
 * @param {RunLoop.Clock} clock
 */
NetSimVisualization.prototype.tick = function (clock) {
  // Everyone gets an update
  this.entities_.forEach(function (entity) {
    entity.tick(clock);
  });

  // Tear out dead entities.
  this.entities_ = this.entities_.filter(function (entity) {
    if (entity.isDead()) {
      entity.getRoot().remove();
      return false;
    }
    return true;
  });
};

/**
 * Render: Let all vizentities "redraw" (or in our case, touch the DOM)
 */
NetSimVisualization.prototype.render = function () {
  this.entities_.forEach(function (entity) {
    entity.render();
  });
};

/**
 * Called whenever the connection notifies us that we've connected to,
 * or disconnected from, a shard.
 * @param {?NetSimShard} newShard - null if disconnected.
 * @param {?NetSimLocalClientNode} localNode - null if disconnected
 * @private
 */
NetSimVisualization.prototype.onShardChange_= function (newShard, localNode) {
  this.setShard(newShard);
  this.setLocalNode(localNode);
};

/**
 * Change the shard this visualization will source its data from.
 * Re-attaches table change listeners for all the tables we need to monitor.
 * @param {?NetSimShard} newShard - null if disconnected
 */
NetSimVisualization.prototype.setShard = function (newShard) {
  if (this.nodeTableChangeKey !== undefined) {
    this.shard_.nodeTable.tableChange.unregister(this.nodeTableChangeKey);
    this.nodeTableChangeKey = undefined;
  }

  if (this.wireTableChangeKey !== undefined) {
    this.shard_.wireTable.tableChange.unregister(this.wireTableChangeKey);
    this.wireTableChangeKey = undefined;
  }

  this.shard_ = newShard;
  if (!this.shard_) {
    return;
  }

  this.nodeTableChangeKey = this.shard_.nodeTable.tableChange.register(
      this.onNodeTableChange_.bind(this));

  this.wireTableChangeKey = this.shard_.wireTable.tableChange.register(
      this.onWireTableChange_.bind(this));
};

/**
 * Change which node we consider the 'local node' in the visualization.
 * We go through a special creation process for this node, so that it
 * looks and behaves differently.
 * @param {?NetSimLocalClientNode} newLocalNode - null if disconnected
 */
NetSimVisualization.prototype.setLocalNode = function (newLocalNode) {
  if (newLocalNode) {
    if (this.localNode) {
      this.localNode.configureFrom(newLocalNode);
    } else {
      this.localNode = new NetSimVizNode(newLocalNode);
      this.entities_.push(this.localNode);
      this.svgRoot_.find('#background_group').append(this.localNode.getRoot());
    }
    this.localNode.isLocalNode = true;
  } else {
    this.localNode.kill();
  }
  this.pullElementsToForeground();
};

/**
 * Find a particular VizEntity in the visualization, by type and ID.
 * @param {function} entityType - constructor of entity we're looking for
 * @param {number} entityID - ID, with corresponds to NetSimEntity.entityID
 * @returns {NetSimVizEntity} or undefined if not found
 */
NetSimVisualization.prototype.getEntityByID = function (entityType, entityID) {
  return _.find(this.entities_, function (entity) {
    return entity instanceof entityType && entity.id === entityID;
  });
};

/**
 * Gets the set of VizWires directly attached to the given VizNode, (either
 * on the local end or remote end)
 * @param {NetSimVizNode} vizNode
 * @returns {Array.<NetSimVizWire>} the attached wires
 */
NetSimVisualization.prototype.getWiresAttachedToNode = function (vizNode) {
  return this.entities_.filter(function (entity) {
    return entity instanceof NetSimVizWire &&
        (entity.localVizNode === vizNode || entity.remoteVizNode === vizNode);
  });
};

/**
 * Handle notification that node table contents have changed.
 * @param {Array.<Object>} rows - node table rows
 * @private
 */
NetSimVisualization.prototype.onNodeTableChange_ = function (rows) {
  // Convert rows to correctly-typed objects
  var tableNodes = netsimNodeFactory.nodesFromRows(this.shard_, rows);

  // Update collection of VizNodes from source data
  this.updateVizEntitiesOfType_(NetSimVizNode, tableNodes, function (node) {
    var newVizNode = new NetSimVizNode(node);
    newVizNode.snapToPosition(
        Math.random() * this.visualizationWidth - (this.visualizationWidth / 2),
        Math.random() * this.visualizationHeight - (this.visualizationHeight / 2));
    return newVizNode;
  }.bind(this));
};

/**
 * Handle notification that wire table contents have changed.
 * @param {Array.<Object>} rows - wire table rows
 * @private
 */
NetSimVisualization.prototype.onWireTableChange_ = function (rows) {
  // Convert rows to correctly-typed objects
  var tableWires = rows.map(function (row) {
    return new NetSimWire(this.shard_, row);
  }.bind(this));

  // Update collection of VizWires from source data
  this.updateVizEntitiesOfType_(NetSimVizWire, tableWires, function (wire) {
    return new NetSimVizWire(wire, this.getEntityByID.bind(this));
  }.bind(this));

  // Since the wires table determines simulated connectivity, we trigger a
  // recalculation of which nodes are in the local network (should be in the
  // foreground) and then re-layout the foreground nodes.
  this.pullElementsToForeground();
  this.distributeForegroundNodes();
};

/**
 * Compares VizEntities of the given type that are currently in the
 * visualization to the source data given, and creates/updates/removes
 * VizEntities so that the visualization reflects the new source data.
 *
 * @param {function} vizEntityType
 * @param {Array.<NetSimEntity>} entityCollection
 * @param {function} creationMethod
 * @private
 */
NetSimVisualization.prototype.updateVizEntitiesOfType_ = function (
    vizEntityType, entityCollection, creationMethod) {

  // 1. Kill VizEntities that are no longer in the source data
  this.killVizEntitiesOfTypeMissingMatch_(vizEntityType, entityCollection);

  entityCollection.forEach(function (entity) {
    var vizEntity = this.getEntityByID(vizEntityType, entity.entityID);
    if (vizEntity) {
      // 2. Update existing VizEntities from their source data
      vizEntity.configureFrom(entity);
    } else {
      // 3. Create new VizEntities for new source data
      this.addVizEntity_(creationMethod(entity));
    }
  }, this);
};

/**
 * Call kill() on any vizentities that match the given type and don't map to
 * a NetSimEntity in the provided collection.
 * @param {function} vizEntityType
 * @param {Array.<NetSimEntity>} entityCollection
 * @private
 */
NetSimVisualization.prototype.killVizEntitiesOfTypeMissingMatch_ = function (
    vizEntityType, entityCollection) {
  this.entities_.forEach(function (vizEntity) {
    var isCorrectType = (vizEntity instanceof vizEntityType);
    var foundMatch = entityCollection.some(function (entity) {
      return entity.entityID === vizEntity.id;
    });

    if (isCorrectType && !foundMatch) {
      vizEntity.kill();
    }
  });
};

/**
 * Adds a VizEntity to the visualization.
 * @param {NetSimVizEntity} vizEntity
 * @private
 */
NetSimVisualization.prototype.addVizEntity_ = function (vizEntity) {
  this.entities_.push(vizEntity);
  this.svgRoot_.find('#background_group').prepend(vizEntity.getRoot());
};

/**
 * If we do need a DOM change, detach the entity and reattach it to the new
 * layer. Special rule (for now): Prepend wires so that they show up behind
 * nodes.  Will need a better solution for this if/when the viz gets more
 * complex.
 * @param {NetSimVizEntity} vizEntity
 * @param {jQuery} newParent
 */
var moveVizEntityToGroup = function (vizEntity, newParent) {
  vizEntity.getRoot().detach();
  if (vizEntity instanceof NetSimVizWire) {
    vizEntity.getRoot().prependTo(newParent);
  } else {
    vizEntity.getRoot().appendTo(newParent);
  }
};

/**
 * Recalculate which nodes should be in the foreground layer by doing a full
 * traversal starting with the local node.  In short, everything reachable
 * from the local node belongs in the foreground.
 */
NetSimVisualization.prototype.pullElementsToForeground = function () {
  // Begin by marking all entities background (unvisited)
  this.entities_.forEach(function (vizEntity) {
    vizEntity.visited = false;
  });

  // Use a simple stack for our list of nodes that need visiting.
  // If we have a local node, push it onto the stack as our starting point.
  // (If we don't have a local node, the next step is REALLY EASY)
  var toExplore = [];
  if (this.localNode) {
    toExplore.push(this.localNode);
  }

  // While there are still nodes that need visiting,
  // visit the next node, marking it as "foreground/visited" and
  // pushing all of its unvisited connections onto the stack.
  var currentVizEntity;
  while (toExplore.length > 0) {
    currentVizEntity = toExplore.pop();
    currentVizEntity.visited = true;
    toExplore = toExplore.concat(this.getUnvisitedNeighborsOf_(currentVizEntity));
  }

  // Now, visited nodes belong in the foreground.
  // Move all nodes to their new, correct layers
  // Possible optimization: Can we do this with just one operation on the live DOM?
  var foreground = this.svgRoot_.find('#foreground_group');
  var background = this.svgRoot_.find('#background_group');
  this.entities_.forEach(function (vizEntity) {
    var isForeground = $.contains(foreground[0], vizEntity.getRoot()[0]);

    // Check whether a change should occur.  If not, we leave
    // newParent undefined so that we don't make unneeded DOM changes.
    if (vizEntity.visited && !isForeground) {
      moveVizEntityToGroup(vizEntity, foreground);
      vizEntity.onDepthChange(true);
    } else if (!vizEntity.visited && isForeground) {
      moveVizEntityToGroup(vizEntity, background);
      vizEntity.onDepthChange(false);
    }
  }, this);
};

/**
 * Visit method for pullElementsToForeground, not used anywhere else.
 * Notes that the current entity is should be foreground when we're all done,
 * finds the current entity's unvisited connections,
 * pushes those connections onto the stack.
 * @param {NetSimVizNode|NetSimVizWire} vizEntity
 * @returns {Array.<NetSimVizEntity>}
 * @private
 */
NetSimVisualization.prototype.getUnvisitedNeighborsOf_ = function (vizEntity) {
  // Find new entities to explore based on node type and connections
  var neighbors = [];

  if (vizEntity instanceof NetSimVizNode) {
    neighbors = this.getWiresAttachedToNode(vizEntity);
  } else if (vizEntity instanceof NetSimVizWire) {
    if (vizEntity.localVizNode) {
      neighbors.push(vizEntity.localVizNode);
    }

    if (vizEntity.remoteVizNode) {
      neighbors.push(vizEntity.remoteVizNode);
    }
  }

  return neighbors.filter(function (vizEntity) {
    return !vizEntity.visited;
  });
};

/**
 * Explicitly control VizNodes in the foreground, moving them into a desired
 * configuration based on their number and types.  Nodes are given animation
 * commands (via tweenToPosition) so that they interpolate nicely to their target
 * positions.
 *
 * Configurations:
 * One node (local node): Centered on the screen.
 *   |  L  |
 *
 * Two nodes: Local node on left, remote node on right, nothing in the middle.
 *   | L-R |
 *
 * Three or more nodes: Local node on left, router in the middle, other
 * nodes distributed evenly around the router in a circle
 * 3:         4:    O    5:  O      6:O   O    7:O   O
 *                 /         |         \ /        \ /
 *   L-R-0      L-R        L-R-O      L-R        L-R-O
 *                 \         |         / \        / \
 *                  O        O        O   O      O   O
 */
NetSimVisualization.prototype.distributeForegroundNodes = function () {
  /** @type {Array.<NetSimVizNode>} */
  var foregroundNodes = this.entities_.filter(function (entity) {
    return entity instanceof NetSimVizNode && entity.isForeground;
  });

  // Sometimes, there's no work to do.
  if (foregroundNodes.length === 0) {
    return;
  }

  // One node: Centered on screen
  if (foregroundNodes.length === 1) {
    foregroundNodes[0].tweenToPosition(0, 0, 600, tweens.easeOutQuad);
    return;
  }

  var myNode;

  // Two nodes: Placed across from each other, local node on left
  if (foregroundNodes.length === 2) {
    myNode = this.localNode;
    var otherNode = _.find(foregroundNodes, function (node) {
      return node !== myNode;
    });
    myNode.tweenToPosition(-75, 0, 400, tweens.easeOutQuad);
    otherNode.tweenToPosition(75, 0, 600, tweens.easeOutQuad);
    return;
  }

  // Three or more nodes:
  // * Local node on left
  // * Router in the middle
  // * Other nodes evenly distributed in a circle
  myNode = this.localNode;
  var routerNode = _.find(foregroundNodes, function (node) {
    return node.isRouter;
  });
  var otherNodes = foregroundNodes.filter(function (node) {
    return node !== myNode && node !== routerNode;
  });

  myNode.tweenToPosition(-100, 0, 400, tweens.easeOutQuad);
  routerNode.tweenToPosition(0, 0, 500, tweens.easeOutQuad);
  var radiansBetweenNodes = 2*Math.PI / (otherNodes.length + 1); // Include myNode!
  for (var i = 0; i < otherNodes.length; i++) {
    // sin(rad) = o/h
    var h = 100;
    // Extra Math.PI here puts 0deg on the left.
    var rad = Math.PI + (i+1) * radiansBetweenNodes;
    var x = Math.cos(rad) * h;
    var y = Math.sin(rad) * h;
    otherNodes[i].tweenToPosition(x, y, 600, tweens.easeOutQuad);
  }
};

/**
 * @param {string} newDnsMode
 */
NetSimVisualization.prototype.setDnsMode = function (newDnsMode) {
  // Tell all nodes about the new DNS mode, so they can decide whether to
  // show or hide their address.
  this.entities_.forEach(function (vizEntity) {
    if (vizEntity instanceof NetSimVizNode) {
      vizEntity.setDnsMode(newDnsMode);
    }
  });
};

/**
 * @param {number} dnsNodeID
 */
NetSimVisualization.prototype.setDnsNodeID = function (dnsNodeID) {
  this.entities_.forEach(function (vizEntity) {
    if (vizEntity instanceof NetSimVizNode) {
      vizEntity.setIsDnsNode(vizEntity.id === dnsNodeID);
    }
  });
};

},{"../utils":235,"./NetSimVizNode":172,"./NetSimVizWire":173,"./NetSimWire":174,"./netsimNodeFactory":182,"./tweens":186}],173:[function(require,module,exports){
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

require('../utils');
var jQuerySvgElement = require('./netsimUtils').jQuerySvgElement;
var NetSimVizEntity = require('./NetSimVizEntity');
var NetSimVizNode = require('./NetSimVizNode');

/**
 *
 * @param sourceWire
 * @param {function} getEntityByID - Allows this wire to search
 *        for other entities in the simulation
 * @constructor
 * @augments NetSimVizEntity
 */
var NetSimVizWire = module.exports = function (sourceWire, getEntityByID) {
  NetSimVizEntity.call(this, sourceWire);

  var root = this.getRoot();

  root.addClass('viz-wire');

  this.line_ = jQuerySvgElement('path')
      .appendTo(root);

  /**
   * Bound getEntityByID method from vizualization controller.
   * @type {Function}
   * @private
   */
  this.getEntityByID_ = getEntityByID;

  this.localVizNode = null;
  this.remoteVizNode = null;

  this.configureFrom(sourceWire);
  this.render();
};
NetSimVizWire.inherits(NetSimVizEntity);

NetSimVizWire.prototype.configureFrom = function (sourceWire) {
  this.localVizNode = this.getEntityByID_(NetSimVizNode, sourceWire.localNodeID);
  this.remoteVizNode = this.getEntityByID_(NetSimVizNode, sourceWire.remoteNodeID);

  if (this.localVizNode) {
    this.localVizNode.setAddress(sourceWire.localAddress);
  }

  if (this.remoteVizNode) {
    this.remoteVizNode.setAddress(sourceWire.remoteAddress);
  }
};

NetSimVizWire.prototype.render = function () {
  NetSimVizWire.superPrototype.render.call(this);

  var pathData = 'M 0 0';
  if (this.localVizNode && this.remoteVizNode) {
    pathData = 'M ' + this.localVizNode.posX + ' ' + this.localVizNode.posY +
        ' L ' + this.remoteVizNode.posX + ' ' + this.remoteVizNode.posY;
  }
  this.line_.attr('d', pathData);
};

/**
 * Killing a visualization node removes its ID so that it won't conflict with
 * another node of matching ID being added, and begins its exit animation.
 * @override
 */
NetSimVizWire.prototype.kill = function () {
  NetSimVizWire.superPrototype.kill.call(this);
  this.localVizNode = null;
  this.remoteVizNode = null;
};

},{"../utils":235,"./NetSimVizEntity":171,"./NetSimVizNode":172,"./netsimUtils":183}],172:[function(require,module,exports){
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

require('../utils');
var netsimConstants = require('./netsimConstants');
var jQuerySvgElement = require('./netsimUtils').jQuerySvgElement;
var NetSimVizEntity = require('./NetSimVizEntity');
var tweens = require('./tweens');

var DnsMode = netsimConstants.DnsMode;
var NodeType = netsimConstants.NodeType;

/**
 * @param {NetSimNode} sourceNode
 * @constructor
 * @augments NetSimVizEntity
 */
var NetSimVizNode = module.exports = function (sourceNode) {
  NetSimVizEntity.call(this, sourceNode);

  /**
   * @type {number}
   * @private
   */
  this.address_ = undefined;

  /**
   * @type {DnsMode}
   * @private
   */
  this.dnsMode_ = undefined;

  /**
   * @type {number}
   */
  this.nodeID = undefined;

  /**
   * @type {boolean}
   */
  this.isRouter = false;

  /**
   * @type {boolean}
   */
  this.isLocalNode = false;

  /**
   * @type {boolean}
   */
  this.isDnsNode = false;

  // Give our root node a useful class
  var root = this.getRoot();
  root.addClass('viz-node');

  // Going for a diameter of _close_ to 75
  var radius = 37;
  var textVerticalOffset = 4;

  /**
   *
   * @type {jQuery}
   * @private
   */
  jQuerySvgElement('circle')
      .attr('cx', 0)
      .attr('cy', 0)
      .attr('r', radius)
      .appendTo(root);

  this.displayName_ = jQuerySvgElement('text')
      .attr('x', 0)
      .attr('y', textVerticalOffset)
      .appendTo(root);

  this.addressGroup_ = jQuerySvgElement('g')
      .attr('transform', 'translate(0,30)')
      .hide()
      .appendTo(root);

  var addressBoxHalfWidth = 15;
  var addressBoxHalfHeight = 12;

  jQuerySvgElement('rect')
      .addClass('address-box')
      .attr('x', -addressBoxHalfWidth)
      .attr('y', -addressBoxHalfHeight)
      .attr('rx', 5)
      .attr('ry', 10)
      .attr('width', addressBoxHalfWidth * 2)
      .attr('height', addressBoxHalfHeight * 2)
      .appendTo(this.addressGroup_);

  this.addressText_ = jQuerySvgElement('text')
      .addClass('address-box')
      .attr('x', 0)
      .attr('y', textVerticalOffset)
      .text('?')
      .appendTo(this.addressGroup_);

  // Set an initial default tween for zooming in from nothing.
  this.snapToScale(0);
  this.tweenToScale(0.5, 800, tweens.easeOutElastic);

  this.configureFrom(sourceNode);
  this.render();
};
NetSimVizNode.inherits(NetSimVizEntity);

/**
 *
 * @param {NetSimNode} sourceNode
 */
NetSimVizNode.prototype.configureFrom = function (sourceNode) {
  this.displayName_.text(sourceNode.getDisplayName());
  this.nodeID = sourceNode.entityID;

  if (sourceNode.getNodeType() === NodeType.ROUTER) {
    this.isRouter = true;
    this.getRoot().addClass('router-node');
  }
};

/**
 * Killing a visualization node removes its ID so that it won't conflict with
 * another node of matching ID being added, and begins its exit animation.
 * @override
 */
NetSimVizNode.prototype.kill = function () {
  NetSimVizNode.superPrototype.kill.call(this);
  this.stopAllAnimation();
  this.tweenToScale(0, 200, tweens.easeInQuad);
};

/**
 * Provides drifting animation for nodes in the background.
 * @param {RunLoop.Clock} clock
 */
NetSimVizNode.prototype.tick = function (clock) {
  NetSimVizNode.superPrototype.tick.call(this, clock);
  if (!this.isForeground && this.tweens_.length === 0) {
    var randomX = 300 * Math.random() - 150;
    var randomY = 300 * Math.random() - 150;
    this.tweenToPosition(randomX, randomY, 20000, tweens.easeInOutQuad);
  }
};

/**
 * @param {boolean} isForeground
 */
NetSimVizNode.prototype.onDepthChange = function (isForeground) {
  NetSimVizNode.superPrototype.onDepthChange.call(this, isForeground);
  this.tweens_.length = 0;
  if (isForeground) {
    this.tweenToScale(1, 600, tweens.easeOutElastic);
  } else {
    this.tweenToScale(0.5, 600, tweens.easeOutElastic);
  }
};

NetSimVizNode.prototype.setAddress = function (address) {
  this.address_ = address;
  this.updateAddressDisplay();
};

/**
 * @param {string} newDnsMode
 */
NetSimVizNode.prototype.setDnsMode = function (newDnsMode) {
  this.dnsMode_ = newDnsMode;
  this.updateAddressDisplay();
};

/**
 * @param {boolean} isDnsNode
 */
NetSimVizNode.prototype.setIsDnsNode = function (isDnsNode) {
  this.isDnsNode = isDnsNode;
  this.updateAddressDisplay();
};

NetSimVizNode.prototype.updateAddressDisplay = function () {
  // Routers never show their address
  // If a DNS mode has not been set we never show an address
  if (this.isRouter || this.dnsMode_ === undefined) {
    this.addressGroup_.hide();
    return;
  }

  this.addressGroup_.show();
  if (this.dnsMode_ === DnsMode.NONE) {
    this.addressText_.text(this.address_ !== undefined ? this.address_ : '?');
  } else {
    this.addressText_.text(this.isLocalNode || this.isDnsNode ? this.address_ : '?');
  }
};

},{"../utils":235,"./NetSimVizEntity":171,"./netsimConstants":181,"./netsimUtils":183,"./tweens":186}],171:[function(require,module,exports){
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

var jQuerySvgElement = require('./netsimUtils').jQuerySvgElement;
var tweens = require('./tweens');

/**
 * A VizEntity is an object that maps to a NetSimEntity somewhere in shared
 * storage, and has a representation in the network visualization.  Its role
 * is to maintain that visual representation and update it to reflect the
 * state of the stored entity it represents.
 *
 * In doing so, it has behaviors and a lifetime that don't directly represent
 * the stored entity because while quantities in our model snap to new values
 * or are created/destroyed in a single frame, we want their visual
 * representation to animate nicely.  Thus, a VizEntity has helpers for tweening
 * and may often be in progress toward the state of the entity it represents,
 * rather than an exact representation of that entity.  Likewise, a VizEntity
 * will outlive its actual entity, because it can have a 'death' animation.
 *
 * Every VizEntity has a root element which is a <g> tag, an SVG "group"
 * that contains the other components that will actually draw.
 *
 * @constructor
 * @param {NetSimEntity} entity - the netsim Entity that this element represents
 */
var NetSimVizEntity = module.exports =  function (entity) {
  /**
   * @type {number}
   */
  this.id = entity.entityID;

  /**
   * @type {number}
   */
  this.posX = 0;

  /**
   * @type {number}
   */
  this.posY = 0;

  /**
   * @type {number}
   */
  this.scale = 1;

  /**
   * @type {boolean}
   */
  this.isForeground = false;

  /**
   * Root SVG <g> (group) element for this object.
   * @type {jQuery}
   * @private
   */
  this.rootGroup_ = jQuerySvgElement('g');

  /**
   * Set of tweens we should currently be running on this node.
   * Processed by tick()
   * @type {Array.<exports.TweenValueTo>}
   * @private
   */
  this.tweens_ = [];

  /**
   * @type {boolean}
   * @private
   */
  this.isDead_ = false;
};

/**
 * @returns {jQuery} wrapper around root <g> element
 */
NetSimVizEntity.prototype.getRoot = function () {
  return this.rootGroup_;
};

/**
 * Begins the process of destroying this VizEntity.  Once started, this
 * process cannot be stopped.  Immediately clears its ID to remove any
 * association with the stored entity, which probably doesn't exist anymore.
 * This method can be overridden to trigger an "on-death" animation.
 */
NetSimVizEntity.prototype.kill = function () {
  this.id = undefined;
  this.isDead_ = true;
};

/**
 * @returns {boolean} whether this entity is done with its death animation
 *          and is ready to be cleaned up by the visualization manager.
 *          The default implementation here returns TRUE as soon as kill()
 *          is called and all animations are completed.
 */
NetSimVizEntity.prototype.isDead = function () {
  return this.isDead_ && this.tweens_.length === 0;
};

/**
 * Update all of the tweens currently running on this VizEntity (which will
 * probably modify its properties) and then remove any tweens that are completed
 * from the list.
 * @param {RunLoop.Clock} clock
 */
NetSimVizEntity.prototype.tick = function (clock) {
  this.tweens_.forEach(function (tween) {
    tween.tick(clock);
  });
  this.tweens_ = this.tweens_.filter(function (tween) {
    return !tween.isFinished;
  });
};

/**
 * Update the root group's properties to reflect our current position
 * and scale.
 */
NetSimVizEntity.prototype.render = function () {
  // TODO (bbuchanan): Use a dirty flag to only update the DOM when it's
  //                   out of date.
  var transform = 'translate(' + this.posX + ' ' + this.posY + ')' +
      ' scale(' + this.scale + ')';
  this.rootGroup_.attr('transform', transform);
};

/**
 * @param {boolean} isForeground
 */
NetSimVizEntity.prototype.onDepthChange = function (isForeground) {
  this.isForeground = isForeground;
};

/**
 * Throw away all existing tweens on this object.
 */
NetSimVizEntity.prototype.stopAllAnimation = function () {
  this.tweens_.length = 0;
};

/**
 * Stops any existing motion animation and begins an animated motion to the
 * given coordinates.  Note: This animates the VizEntity's root group.
 * @param {number} newX given in SVG points
 * @param {number} newY given in SVG points
 * @param {number} [duration=600] in milliseconds
 * @param {TweenFunction} [tweenFunction=linear]
 */
NetSimVizEntity.prototype.tweenToPosition = function (newX, newY, duration,
    tweenFunction) {
  // Remove any existing tweens controlling posX or posY
  this.tweens_.filter(function (tween) {
    return tween.target !== this ||
        (tween.propertyName !== 'posX' && tween.propertyName !== 'posY');
  });

  // Add two new tweens, one for each axis
  if (duration > 0) {
    this.tweens_.push(new tweens.TweenValueTo(this, 'posX', newX, duration,
        tweenFunction));
    this.tweens_.push(new tweens.TweenValueTo(this, 'posY', newY, duration,
        tweenFunction));
  } else {
    this.posX = newX;
    this.posY = newY;
  }

};

/**
 * Alias for calling tweenToPosition with a zero duration
 * @param {number} newX given in SVG points
 * @param {number} newY given in SVG points
 */
NetSimVizEntity.prototype.snapToPosition = function (newX, newY) {
  this.tweenToPosition(newX, newY, 0);
};

/**
 * Stops any existing animation of the entity's scale and begins an animated
 * change to the given target scale value.  Note: this animates the VizEntity's
 * root group.
 * @param {number} newScale where 1.0 is 100% (unscaled)
 * @param {number} [duration=600] in milliseconds
 * @param {TweenFunction} [tweenFunction=linear]
 */
NetSimVizEntity.prototype.tweenToScale = function (newScale, duration,
    tweenFunction) {
  // Remove existing scale tweens
  this.tweens_.filter(function (tween) {
    return tween.target !== this || tween.propertyName !== 'scale';
  });

  // On nonzero duration, add tween to target scale.  Otherwise just set it.
  if (duration > 0) {
    this.tweens_.push(new tweens.TweenValueTo(this, 'scale', newScale, duration,
        tweenFunction));
  } else {
    this.scale = newScale;
  }
};

/**
 * Alias for calling tweenToScale with a zero duration.
 * @param {number} newScale where 1.0 is 100% (unscaled)
 */
NetSimVizEntity.prototype.snapToScale = function (newScale) {
  this.tweenToScale(newScale, 0);
};

},{"./netsimUtils":183,"./tweens":186}],186:[function(require,module,exports){
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

var valueOr = require('../utils').valueOr;

/**
 * Default tween duration in milliseconds
 * @type {number}
 * @const
 */
var DEFAULT_TWEEN_DURATION = 600;

/**
 * A four-arg interpolation function.
 *
 * @typedef {function} TweenFunction
 * @param {number} t - current Time, in milliseconds since tween began
 * @param {number} b - Begin value
 * @param {number} c - final Change in value
 * @param {number} d - total tween Duration
 * @returns {number} the interpolated value for the current time
 */

/**
 * Interpolates with a little back-and-forth over the target value at the end.
 * @type {TweenFunction}
 */
exports.easeOutElastic = function (t, b, c, d) {
  var s, p, a;
  s=1.70158;
  p=0;
  a=c;
  if (t===0) {
    return b;
  }
  if ((t/=d)==1) {
    return b+c;
  }
  if (!p) {
    p=d*0.3;
  }
  if (a < Math.abs(c)) {
    a=c;
    s=p/4;
  } else {
    s = p/(2*Math.PI) * Math.asin (c/a);
  }
  return a*Math.pow(2,-10*t) * Math.sin( (t*d-s)*(2*Math.PI)/p ) + c + b;
};

/**
 * Interpolates, accelerating as it goes.
 * @type {TweenFunction}
 */
exports.easeInQuad = function (t, b, c, d) {
  return c*(t/=d)*t + b;
};

/**
 * Interpolates, decelerating as it goes.
 * @type {TweenFunction}
 */
exports.easeOutQuad = function (t, b, c, d) {
  return -c*(t/=d)*(t-2) + b;
};

exports.easeInOutQuad = function (t, b, c, d) {
  if ((t/=d/2) < 1) {
    return c/2*t*t + b;
  }
  return -c/2 * ((--t)*(t-2) - 1) + b;
};

/**
 * Linear interpolation
 * @type {TweenFunction}
 */
exports.linear = function (t, b, c, d) {
  return c * (t / d) + b;
};

/**
 * Wraps a tween method with the state it needs to animate a property.
 * On creation, assumes that property's current value for start values.
 * Must be ticked to progress toward completion.
 *
 * @param {!Object} target - The object owning the property we want to animate
 * @param {!string} propertyName - Must be a valid property on target
 * @param {!number} endValue - The desired final value of the property
 * @param {number} [duration] - How long the tween should take in milliseconds,
 *        default 600ms
 * @param {TweenFunction} [tweenFunction] - A tween function, default linear
 * @constructor
 */
exports.TweenValueTo = function (target, propertyName, endValue, duration,
    tweenFunction) {
  /**
   * Will be set to TRUE when tween is completed.
   * @type {boolean}
   */
  this.isFinished = false;

  /**
   * Will be set on our first tick.
   * @type {number}
   * @private
   */
  this.startTime_ = undefined;

  /**
   * @type {Object}
   */
  this.target = target;

  /**
   * @type {string}
   * @private
   */
  this.propertyName = propertyName;

  /**
   * @type {TweenFunction}
   * @private
   */
  this.tweenFunction_ = valueOr(tweenFunction, exports.linear);

  /**
   * @type {number}
   * @private
   */
  this.startValue_ = target[propertyName];

  /**
   * @type {number}
   * @private
   */
  this.deltaValue_ = endValue - this.startValue_;

  /**
   * Duration of tween in milliseconds
   * @type {number}
   * @private
   */
  this.duration_ = valueOr(duration, DEFAULT_TWEEN_DURATION);
};

/**
 * @param {RunLoop.clock} clock
 */
exports.TweenValueTo.prototype.tick = function (clock) {
  if (this.startTime_ === undefined) {
    this.startTime_ = clock.time;
  }

  var timeSinceStart = clock.time - this.startTime_;

  if (this.deltaValue_ !== 0) {
    this.target[this.propertyName] = this.tweenFunction_(
        timeSinceStart,
        this.startValue_,
        this.deltaValue_,
        this.duration_
    );
  }

  if (timeSinceStart >= this.duration_) {
    this.target[this.propertyName] = this.startValue_ + this.deltaValue_;
    this.isFinished = true;
  }
};
},{"../utils":235}],169:[function(require,module,exports){
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

var buildMarkup = require('./NetSimTabsComponent.html');
var NetSimRouterTab = require('./NetSimRouterTab');
var NetSimMyDeviceTab = require('./NetSimMyDeviceTab');
var NetSimDnsTab = require('./NetSimDnsTab');
var NetSimTabType = require('./netsimConstants').NetSimTabType;
var shouldShowTab = require('./netsimUtils').shouldShowTab;

/**
 * Wrapper component for tabs panel on the right side of the page.
 * @param {jQuery} rootDiv
 * @param {netsimLevelConfiguration} levelConfig
 * @param {Object} callbacks
 * @param {function} callbacks.chunkSizeChangeCallback
 * @param {function} callbacks.encodingChangeCallback
 * @param {function} callbacks.routerBandwidthChangeCallback
 * @param {function} callbacks.dnsModeChangeCallback
 * @param {function} callbacks.becomeDnsCallback
 * @constructor
 */
var NetSimTabsComponent = module.exports = function (rootDiv, levelConfig,
    callbacks) {
  /**
   * Component root, which we fill whenever we call render()
   * @type {jQuery}
   * @private
   */
  this.rootDiv_ = rootDiv;

  /**
   * @type {netsimLevelConfiguration}
   * @private
   */
  this.levelConfig_ = levelConfig;

  /**
   * @type {function}
   * @private
   */
  this.chunkSizeChangeCallback_ = callbacks.chunkSizeChangeCallback;

  /**
   * @type {function}
   * @private
   */
  this.encodingChangeCallback_ = callbacks.encodingChangeCallback;

  /**
   * @type {function}
   * @private
   */
  this.routerBandwidthChangeCallback_ = callbacks.routerBandwidthChangeCallback;

  /**
   * @type {function}
   * @private
   */
  this.dnsModeChangeCallback_ = callbacks.dnsModeChangeCallback;

  /**
   * @type {function}
   * @private
   */
  this.becomeDnsCallback_ = callbacks.becomeDnsCallback;

  /**
   * @type {NetSimRouterTab}
   * @private
   */
  this.routerTab_ = null;

  /**
   * @type {NetSimMyDeviceTab}
   * @private
   */
  this.myDeviceTab_ = null;

  /**
   * @type {NetSimDnsTab}
   * @private
   */
  this.dnsTab_ = null;

  // Initial render
  this.render();
};

/**
 * Fill the root div with new elements reflecting the current state
 */
NetSimTabsComponent.prototype.render = function () {
  var rawMarkup = buildMarkup({
    level: this.levelConfig_
  });
  var jQueryWrap = $(rawMarkup);
  this.rootDiv_.html(jQueryWrap);
  this.rootDiv_.find('.netsim-tabs').tabs({
    active: this.levelConfig_.defaultTabIndex
  });

  if (shouldShowTab(this.levelConfig_, NetSimTabType.MY_DEVICE)) {
    this.myDeviceTab_ = new NetSimMyDeviceTab(
        this.rootDiv_.find('#tab_my_device'),
        this.levelConfig_,
        this.chunkSizeChangeCallback_,
        this.encodingChangeCallback_);
  }

  if (shouldShowTab(this.levelConfig_, NetSimTabType.ROUTER)) {
    this.routerTab_ = new NetSimRouterTab(
        this.rootDiv_.find('#tab_router'),
        this.levelConfig_,
        this.routerBandwidthChangeCallback_);
  }

  if (shouldShowTab(this.levelConfig_, NetSimTabType.DNS)) {
    this.dnsTab_ = new NetSimDnsTab(
        this.rootDiv_.find('#tab_dns'),
        this.levelConfig_,
        this.dnsModeChangeCallback_,
        this.becomeDnsCallback_);
  }
};

/** @param {number} newChunkSize */
NetSimTabsComponent.prototype.setChunkSize = function (newChunkSize) {
  if (this.myDeviceTab_) {
    this.myDeviceTab_.setChunkSize(newChunkSize);
  }
};

/** @param {EncodingType[]} newEncodings */
NetSimTabsComponent.prototype.setEncodings = function (newEncodings) {
  if (this.myDeviceTab_) {
    this.myDeviceTab_.setEncodings(newEncodings);
  }
};

/** @param {number} newBandwidth in bits/second */
NetSimTabsComponent.prototype.setRouterBandwidth = function (newBandwidth) {
  if (this.routerTab_) {
    this.routerTab_.setBandwidth(newBandwidth);
  }
};

/** @param {string} newDnsMode */
NetSimTabsComponent.prototype.setDnsMode = function (newDnsMode) {
  if (this.dnsTab_) {
    this.dnsTab_.setDnsMode(newDnsMode);
  }
};

/** @param {boolean} isDnsNode */
NetSimTabsComponent.prototype.setIsDnsNode = function (isDnsNode) {
  if (this.dnsTab_) {
    this.dnsTab_.setIsDnsNode(isDnsNode);
  }
};

/** @param {Array} tableContents */
NetSimTabsComponent.prototype.setDnsTableContents = function (tableContents) {
  if (this.dnsTab_) {
    this.dnsTab_.setDnsTableContents(tableContents);
  }
};

/** @param {Array} logData */
NetSimTabsComponent.prototype.setRouterLogData = function (logData) {
  if (this.routerTab_) {
    this.routerTab_.setRouterLogData(logData);
  }
};

},{"./NetSimDnsTab":131,"./NetSimMyDeviceTab":148,"./NetSimRouterTab":160,"./NetSimTabsComponent.html":168,"./netsimConstants":181,"./netsimUtils":183}],168:[function(require,module,exports){
module.exports= (function() {
  var t = function anonymous(locals, filters, escape) {
escape = escape || function (html){
  return String(html)
    .replace(/&(?!\w+;)/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
};
var buf = [];
with (locals || {}) { (function(){ 
 buf.push('');1;
  var i18n = require('../../locale/current/netsim');

  var shouldShowTab = require('./netsimUtils').shouldShowTab;
  var NetSimTabType = require('./netsimConstants').NetSimTabType;

  var showInstructions = shouldShowTab(level, NetSimTabType.INSTRUCTIONS);
  var showMyDevice = shouldShowTab(level, NetSimTabType.MY_DEVICE);
  var showRouter = shouldShowTab(level, NetSimTabType.ROUTER);
  var showDns = shouldShowTab(level, NetSimTabType.DNS);

  var instructionsContent = level.instructions || '';
; buf.push('\n<div class="netsim-tabs">\n  <ul>\n    ');16; if (showInstructions) { ; buf.push('\n    <li><a href="#tab_instructions">', escape((17,  i18n.instructions() )), '</a></li>\n    ');18; } ; buf.push('\n    ');19; if (showMyDevice) { ; buf.push('\n      <li><a href="#tab_my_device">', escape((20,  i18n.myDevice() )), '</a></li>\n    ');21; } ; buf.push('\n    ');22; if (showRouter) { ; buf.push('\n      <li><a href="#tab_router">', escape((23,  i18n.router() )), '</a></li>\n    ');24; } ; buf.push('\n    ');25; if (showDns) { ; buf.push('\n      <li><a href="#tab_dns">', escape((26,  i18n.dns() )), '</a></li>\n    ');27; } ; buf.push('\n  </ul>\n  ');29; if (showInstructions) { ; buf.push('\n    <div id="tab_instructions"><p>', escape((30,  instructionsContent )), '</p></div>\n  ');31; } ; buf.push('\n  ');32; if (showMyDevice) { ; buf.push('\n    <div id="tab_my_device"></div>\n  ');34; } ; buf.push('\n  ');35; if (showRouter) { ; buf.push('\n    <div id="tab_router"></div>\n  ');37; } ; buf.push('\n  ');38; if (showDns) { ; buf.push('\n    <div id="tab_dns"></div>\n  ');40; } ; buf.push('\n</div>'); })();
} 
return buf.join('');
};
  return function(locals) {
    return t(locals, require("ejs").filters);
  }
}());
},{"../../locale/current/netsim":245,"./netsimConstants":181,"./netsimUtils":183,"ejs":256}],166:[function(require,module,exports){
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

require('../utils'); // For Function.prototype.inherits()
var markup = require('./NetSimStatusPanel.html');
var NetSimPanel = require('./NetSimPanel.js');

/**
 * Generator and controller for connection status panel
 * in left column, displayed while connected.
 * @param {jQuery} rootDiv
 * @param {function} disconnectCallback - method to call when disconnect button
 *        is clicked.
 * @constructor
 * @augments NetSimPanel
 */
var NetSimStatusPanel = module.exports = function (rootDiv, disconnectCallback) {
  /**
   * @type {function}
   * @private
   */
  this.disconnectCallback_ = disconnectCallback;

  // Superclass constructor
  NetSimPanel.call(this, rootDiv, {
    className: 'netsim_status_panel',
    panelTitle: 'Status',
    beginMinimized: true
  });
};
NetSimStatusPanel.inherits(NetSimPanel);

/**
 * @param {Object} [data]
 * @param {boolean} [data.isConnected] - Whether the local client is connected
 *        to a remote node
 * @param {string} [data.statusString] - Used as the panel title.
 * @param {string} [data.remoteNodeName] - Display name of remote node.
 * @param {string} [data.myHostname] - Hostname of local node
 * @param {number} [data.myAddress] - Local node address assigned by router
 * @param {string} [data.shareLink] - URL for sharing private shard
 */
NetSimStatusPanel.prototype.render = function (data) {
  data = data || {};

  // Capture title before we render the wrapper panel.
  this.setPanelTitle(data.statusString);

  // Render boilerplate panel stuff
  NetSimStatusPanel.superPrototype.render.call(this);

  // Put our own content into the panel body
  var newMarkup = $(markup({
    remoteNodeName: data.remoteNodeName,
    myHostname: data.myHostname,
    myAddress: data.myAddress,
    shareLink: data.shareLink
  }));
  this.getBody().html(newMarkup);

  // Add a button to the panel header
  if (data.isConnected) {
    this.addButton('Disconnect', this.disconnectCallback_);
  }
};

},{"../utils":235,"./NetSimPanel.js":155,"./NetSimStatusPanel.html":165}],165:[function(require,module,exports){
module.exports= (function() {
  var t = function anonymous(locals, filters, escape) {
escape = escape || function (html){
  return String(html)
    .replace(/&(?!\w+;)/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
};
var buf = [];
with (locals || {}) { (function(){ 
 buf.push('');1; if (remoteNodeName) { ; buf.push('\n<p>Connected to ', escape((2,  remoteNodeName )), '</p>\n');3; } ; buf.push('\n\n');5; if (myHostname) { ; buf.push('\n<p>My hostname: ', escape((6,  myHostname )), '</p>\n');7; } ; buf.push('\n\n');9; if (myAddress) { ; buf.push('\n<p>My address: ', escape((10,  myAddress )), '</p>\n');11; } ; buf.push('\n\n');13; if (shareLink) { ; buf.push('\n<p><a href="', escape((14,  shareLink )), '">Share this private network.</a></p>\n');15; } ; buf.push('\n'); })();
} 
return buf.join('');
};
  return function(locals) {
    return t(locals, require("ejs").filters);
  }
}());
},{"ejs":256}],162:[function(require,module,exports){
/* jshint
 funcscope: true,
 newcap: true,
 nonew: true,
 shadow: false,
 unused: true,

 maxlen: 90,
 maxparams: 3,
 maxstatements: 200
 */
/* global $ */
'use strict';

require('../utils'); // For Function.prototype.inherits()
var i18n = require('../../locale/current/netsim');
var markup = require('./NetSimSendPanel.html');
var NetSimPanel = require('./NetSimPanel');
var NetSimPacketEditor = require('./NetSimPacketEditor');
var NetSimPacketSizeControl = require('./NetSimPacketSizeControl');
var Packet = require('./Packet');
var BITS_PER_BYTE = require('./netsimConstants').BITS_PER_BYTE;

/**
 * Generator and controller for message sending view.
 * @param {jQuery} rootDiv
 * @param {netsimLevelConfiguration} levelConfig
 * @param {NetSimConnection} connection
 * @constructor
 * @augments NetSimPanel
 */
var NetSimSendPanel = module.exports = function (rootDiv, levelConfig,
    connection) {

  /**
   * @type {netsimLevelConfiguration}
   * @private
   */
  this.levelConfig_ = levelConfig;

  /**
   * @type {packetHeaderSpec}
   * @private
   */
  this.packetSpec_ = levelConfig.clientInitialPacketHeader;

  /**
   * Connection that owns the router we will represent / manipulate
   * @type {NetSimConnection}
   * @private
   */
  this.connection_ = connection;
  this.connection_.statusChanges
      .register(this.onConnectionStatusChange_.bind(this));

  /**
   * List of controllers for packets currently being edited.
   * @type {NetSimPacketEditor[]}
   * @private
   */
  this.packets_ = [];

  /**
   * Our local node's address, zero until assigned by a router.
   * @type {number}
   * @private
   */
  this.fromAddress_ = 0;

  /**
   * Maximum packet length configurable by slider.
   * @type {number}
   * @private
   */
  this.maxPacketSize_ = levelConfig.defaultPacketSizeLimit;

  /**
   * Byte-size used for formatting binary and for interpreting it
   * to decimal or ASCII.
   * @type {number}
   * @private
   */
  this.chunkSize_ = BITS_PER_BYTE;

  /**
   * What encodings are currently selected and displayed in each
   * packet and packet editor.
   * @type {EncodingType[]}
   * @private
   */
  this.enabledEncodings_ = levelConfig.defaultEnabledEncodings;

  /**
   * Reference to parent div of packet editor list, for adding and
   * removing packet editors.
   * @type {jQuery}
   * @private
   */
  this.packetsDiv_ = null;

  /**
   * @type {NetSimPacketSizeControl}
   * @private
   */
  this.packetSizeControl_ = null;
  
  NetSimPanel.call(this, rootDiv, {
    className: 'netsim-send-panel',
    panelTitle: i18n.sendAMessage()
  });
};
NetSimSendPanel.inherits(NetSimPanel);

/** Replace contents of our root element with our own markup. */
NetSimSendPanel.prototype.render = function () {
  // Render boilerplate panel stuff
  NetSimSendPanel.superPrototype.render.call(this);

  // Put our own content into the panel body
  var newMarkup = $(markup({
    level: this.levelConfig_
  }));
  this.getBody().html(newMarkup);

  // Add packet size slider control
  if (this.levelConfig_.showPacketSizeControl) {
    this.packetSizeControl_ = new NetSimPacketSizeControl(
        this.rootDiv_.find('.packet_size'),
        this.packetSizeChangeCallback_.bind(this),
        {
          minimumPacketSize: Packet.Encoder.getHeaderLength(this.packetSpec_),
          sliderStepValue: 1
        });
    this.packetSizeControl_.setPacketSize(this.maxPacketSize_);
  }

  // Bind useful elements and add handlers
  this.packetsDiv_ = this.getBody().find('.send-widget-packets');
  this.getBody()
      .find('#add_packet_button')
      .click(this.addPacket_.bind(this));
  this.getBody()
      .find('#send_button')
      .click(this.onSendButtonPress_.bind(this));

  // Note: At some point, we might want to replace this with something
  // that nicely re-renders the contents of this.packets_... for now,
  // we only call render for set-up, so it's okay.
  this.resetPackets_();
};

/**
 * Add a new, blank packet to the set of packets being edited.
 * @private
 */
NetSimSendPanel.prototype.addPacket_ = function () {
  var newPacketCount = this.packets_.length + 1;

  // Update the total packet count on all existing packets
  this.packets_.forEach(function (packetEditor) {
    packetEditor.setPacketCount(newPacketCount);
  });

  // Copy the to address of the previous packet, for convenience.
  // TODO: Do we need to lock the toAddress for all of these packets together?
  var newPacketToAddress = 0;
  if (this.packets_.length > 0) {
    newPacketToAddress = this.packets_[this.packets_.length - 1].toAddress;
  }

  // Create a new packet
  var newPacket = new NetSimPacketEditor({
    packetSpec: this.packetSpec_,
    toAddress: newPacketToAddress,
    fromAddress: this.fromAddress_,
    packetIndex: newPacketCount,
    packetCount: newPacketCount,
    maxPacketSize: this.maxPacketSize_,
    chunkSize: this.chunkSize_,
    enabledEncodings: this.enabledEncodings_,
    removePacketCallback: this.removePacket_.bind(this)
  });

  // Attach the new packet to this SendPanel
  newPacket.getRoot().appendTo(this.packetsDiv_);
  newPacket.getRoot().hide().slideDown('fast');
  this.packets_.push(newPacket);
};

/**
 * Remove a packet from the send panel, and adjust other packets for
 * consistency.
 * @param {NetSimPacketEditor} packet
 * @private
 */
NetSimSendPanel.prototype.removePacket_ = function (packet) {
  // Remove from DOM
  packet.getRoot()
      .slideUp('fast', function() { $(this).remove(); });

  // Remove from internal collection
  this.packets_ = this.packets_.filter(function (packetEditor) {
    return packetEditor !== packet;
  });

  // Adjust numbering of remaining packets
  var packetCount = this.packets_.length;
  var packetIndex;
  for (var i = 0; i < packetCount; i++) {
    packetIndex = i + 1;
    this.packets_[i].setPacketIndex(packetIndex);
    this.packets_[i].setPacketCount(packetCount);
  }
};

/**
 * Remove all packet editors from the panel.
 * @private
 */
NetSimSendPanel.prototype.resetPackets_ = function () {
  this.packetsDiv_.empty();
  this.packets_.length = 0;
  this.addPacket_();
};

/**
 * Handler for connection status changes.  Can update configuration and
 * trigger a update of this view.
 * @private
 */
NetSimSendPanel.prototype.onConnectionStatusChange_ = function () {
  this.fromAddress_ = 0;
  if (this.connection_.myNode && this.connection_.myNode.myWire) {
    this.fromAddress_ = this.connection_.myNode.myWire.localAddress;
  }

  this.packets_.forEach(function (packetEditor) {
    packetEditor.setFromAddress(this.fromAddress_);
  }.bind(this));
};

/** Send message to connected remote */
NetSimSendPanel.prototype.onSendButtonPress_ = function () {
  // Make sure to perform packet truncation here.
  var packetBinaries = this.packets_.map(function (packetEditor) {
    return packetEditor.getPacketBinary().substr(0, this.maxPacketSize_);
  }.bind(this));

  var myNode = this.connection_.myNode;
  if (myNode && packetBinaries.length > 0) {
    this.disableEverything();
    myNode.sendMessages(packetBinaries, function () {
      this.resetPackets_();
      this.enableEverything();
    }.bind(this));
  }
};

/** Disable all controls in this panel, usually during network activity. */
NetSimSendPanel.prototype.disableEverything = function () {
  this.getBody().find('input, textarea').prop('disabled', true);
};

/** Enable all controls in this panel, usually after network activity. */
NetSimSendPanel.prototype.enableEverything = function () {
  this.getBody().find('input, textarea').prop('disabled', false);
};

/**
 * Show or hide parts of the send UI based on the currently selected encoding
 * mode.
 * @param {EncodingType[]} newEncodings
 */
NetSimSendPanel.prototype.setEncodings = function (newEncodings) {
  this.enabledEncodings_ = newEncodings;
  this.packets_.forEach(function (packetEditor) {
    packetEditor.setEncodings(newEncodings);
  });
};

/**
 * Change how data is interpreted and formatted by this component, triggering
 * an update of all input fields.
 * @param {number} newChunkSize
 */
NetSimSendPanel.prototype.setChunkSize = function (newChunkSize) {
  this.chunkSize_ = newChunkSize;
  this.packets_.forEach(function (packetEditor) {
    packetEditor.setChunkSize(newChunkSize);
  });
};

/**
 * Callback passed down into packet size control, called when packet size
 * is changed by the user.
 * @param {number} newPacketSize
 * @private
 */
NetSimSendPanel.prototype.packetSizeChangeCallback_ = function (newPacketSize) {
  this.maxPacketSize_ = newPacketSize;
  this.packets_.forEach(function (packetEditor){
    packetEditor.setMaxPacketSize(newPacketSize);
  });
};

},{"../../locale/current/netsim":245,"../utils":235,"./NetSimPacketEditor":151,"./NetSimPacketSizeControl":153,"./NetSimPanel":155,"./NetSimSendPanel.html":161,"./Packet":175,"./netsimConstants":181}],161:[function(require,module,exports){
module.exports= (function() {
  var t = function anonymous(locals, filters, escape) {
escape = escape || function (html){
  return String(html)
    .replace(/&(?!\w+;)/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
};
var buf = [];
with (locals || {}) { (function(){ 
 buf.push('');1; var i18n = require('../../locale/current/netsim'); ; buf.push('\n<div class="send-widget-packets"></div>\n<div class="send_widget_footer">\n  <div class="right-side-controls">\n    ');5; if (level.showAddPacketButton) { ; buf.push('\n      <span class="netsim-button" id="add_packet_button">', escape((6,  i18n.addPacket() )), '</span>\n    ');7; } ; buf.push('\n    <span class="netsim-button" id="send_button">', escape((8,  i18n.send() )), '</span>\n  </div>\n  <div class="packet_size"></div>\n</div>\n'); })();
} 
return buf.join('');
};
  return function(locals) {
    return t(locals, require("ejs").filters);
  }
}());
},{"../../locale/current/netsim":245,"ejs":256}],160:[function(require,module,exports){
/* jshint
 funcscope: true,
 newcap: true,
 nonew: true,
 shadow: false,
 unused: true,

 maxlen: 90,
 maxparams: 3,
 maxstatements: 200
 */
/* global $ */
'use strict';

var markup = require('./NetSimRouterTab.html');
var NetSimBandwidthControl = require('./NetSimBandwidthControl');
var NetSimRouterLogTable = require('./NetSimRouterLogTable');

/**
 * Generator and controller for router information view.
 * @param {jQuery} rootDiv - Parent element for this component.
 * @param {netsimLevelConfiguration} levelConfig
 * @param {function} bandwidthChangeCallback
 * @constructor
 */
var NetSimRouterTab = module.exports = function (rootDiv, levelConfig,
    bandwidthChangeCallback) {
  /**
   * Component root, which we fill whenever we call render()
   * @type {jQuery}
   * @private
   */
  this.rootDiv_ = rootDiv;

  /**
   * @type {netsimLevelConfiguration}
   * @private
   */
  this.levelConfig_ = levelConfig;

  /**
   * @type {function}
   * @private
   */
  this.bandwidthChangeCallback_ = bandwidthChangeCallback;

  /**
   * @type {NetSimRouterLogTable}
   * @private
   */
  this.routerLogTable_ = null;

  /**
   * @type {NetSimBandwidthControl}
   * @private
   */
  this.bandwidthControl_ = null;

  // Initial render
  this.render();
};

/**
 * Fill the root div with new elements reflecting the current state.
 */
NetSimRouterTab.prototype.render = function () {
  var renderedMarkup = $(markup({
    level: this.levelConfig_
  }));
  this.rootDiv_.html(renderedMarkup);
  this.routerLogTable_ = new NetSimRouterLogTable(
      this.rootDiv_.find('.router_log_table'), this.levelConfig_);
  if (this.levelConfig_.showRouterBandwidthControl) {
    this.bandwidthControl_ = new NetSimBandwidthControl(
        this.rootDiv_.find('.bandwidth-control'), this.bandwidthChangeCallback_);
  }
};

/**
 * @param {Array} logData
 */
NetSimRouterTab.prototype.setRouterLogData = function (logData) {
  this.routerLogTable_.setRouterLogData(logData);
};

/**
 * @param {number} newBandwidth in bits/second
 */
NetSimRouterTab.prototype.setBandwidth = function (newBandwidth) {
  if (this.bandwidthControl_) {
    this.bandwidthControl_.setBandwidth(newBandwidth);
  }
};

},{"./NetSimBandwidthControl":121,"./NetSimRouterLogTable":157,"./NetSimRouterTab.html":159}],159:[function(require,module,exports){
module.exports= (function() {
  var t = function anonymous(locals, filters, escape) {
escape = escape || function (html){
  return String(html)
    .replace(/&(?!\w+;)/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
};
var buf = [];
with (locals || {}) { (function(){ 
 buf.push('<div class="netsim-router-tab">\n  ');2; if (level.showRouterBandwidthControl) { ; buf.push('\n    <div class="bandwidth-control"></div>\n  ');4; } ; buf.push('\n  <div class="router_log_table"></div>\n</div>\n'); })();
} 
return buf.join('');
};
  return function(locals) {
    return t(locals, require("ejs").filters);
  }
}());
},{"ejs":256}],157:[function(require,module,exports){
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

var markup = require('./NetSimRouterLogTable.html');

/**
 * Generator and controller for DNS network lookup table component.
 * Shows different amounts of information depending on the DNS mode.
 *
 * @param {jQuery} rootDiv
 * @param {netsimLevelConfiguration} levelConfig
 * @constructor
 */
var NetSimRouterLogTable = module.exports = function (rootDiv, levelConfig) {
  /**
   * Component root, which we fill whenever we call render()
   * @type {jQuery}
   * @private
   */
  this.rootDiv_ = rootDiv;

  /**
   * @type {netsimLevelConfiguration}
   * @private
   */
  this.levelConfig_ = levelConfig;

  /**
   * @type {Array}
   * @private
   */
  this.routerLogData_ = [];

  this.render();
};

/**
 * Fill the root div with new elements reflecting the current state
 */
NetSimRouterLogTable.prototype.render = function () {
  var renderedMarkup = $(markup({
    level: this.levelConfig_,
    tableData: this.routerLogData_
  }));
  this.rootDiv_.html(renderedMarkup);
};

/**
 * @param {Array} logData
 */
NetSimRouterLogTable.prototype.setRouterLogData = function (logData) {
  this.routerLogData_ = logData;
  this.render();
};

},{"./NetSimRouterLogTable.html":156}],156:[function(require,module,exports){
module.exports= (function() {
  var t = function anonymous(locals, filters, escape) {
escape = escape || function (html){
  return String(html)
    .replace(/&(?!\w+;)/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
};
var buf = [];
with (locals || {}) { (function(){ 
 buf.push('');1;
  var i18n = require('../../locale/current/netsim');
  var netsimConstants = require('./netsimConstants');
  var Packet = require('./Packet');

  /** @type {Packet.HeaderType[]} */
  var headerFields = level.routerExpectsPacketHeader.map(function (headerField) {
    return headerField.key;
  });

  var showToAddress = headerFields.indexOf(Packet.HeaderType.TO_ADDRESS) > -1;
  var showFromAddress = headerFields.indexOf(Packet.HeaderType.FROM_ADDRESS) > -1;
  var showPacketInfo = headerFields.indexOf(Packet.HeaderType.PACKET_INDEX) > -1 &&
      headerFields.indexOf(Packet.HeaderType.PACKET_COUNT) > -1;
; buf.push('\n<div class="netsim-router-log">\n  <h1>Router Traffic</h1>\n  <table>\n    <thead>\n    <tr>\n      ');21; if (showToAddress) { ; buf.push('\n        <th nowrap>', escape((22,  i18n.to() )), '</th>\n      ');23; } ; buf.push('\n      ');24; if (showFromAddress) { ; buf.push('\n        <th nowrap>', escape((25,  i18n.from() )), '</th>\n      ');26; } ; buf.push('\n      ');27; if (showPacketInfo) { ; buf.push('\n        <th nowrap>', escape((28,  i18n.packetInfo() )), '</th>\n      ');29; } ; buf.push('\n      <th nowrap>', escape((30,  i18n.message() )), '</th>\n      <th nowrap>', escape((31,  i18n.bits() )), '</th>\n    </tr>\n    </thead>\n    <tbody>\n    ');35;
    // Sort: Most recent first
    tableData.sort(function (a, b) {
      return a.timestamp > b.timestamp ? -1 : 1;
    });

    // Create rows
    tableData.forEach(function (logEntry) {
      var rowClasses = [];
    ; buf.push('\n    <tr class="', escape((45,  rowClasses.join(' ') )), '">\n      ');46; if (showToAddress) { ; buf.push('\n        <td nowrap>', escape((47,  logEntry.getHeaderField(Packet.HeaderType.TO_ADDRESS) )), '</td>\n      ');48; } ; buf.push('\n      ');49; if (showFromAddress) { ; buf.push('\n        <td nowrap>', escape((50,  logEntry.getHeaderField(Packet.HeaderType.FROM_ADDRESS) )), '</td>\n      ');51; } ; buf.push('\n      ');52; if (showPacketInfo) { ; buf.push('\n        <td nowrap>', escape((53,  i18n.xOfYPackets({
            x: logEntry.getHeaderField(Packet.HeaderType.PACKET_INDEX),
            y: logEntry.getHeaderField(Packet.HeaderType.PACKET_COUNT)
          }) )), '</td>\n      ');57; }; buf.push('\n      <td>', escape((58,  logEntry.getMessageAscii() )), '</td>\n      <td nowrap>', escape((59,  logEntry.binary.length )), '</td>\n    </tr>\n    ');61;
    });
    ; buf.push('\n    </tbody>\n  </table>\n</div>'); })();
} 
return buf.join('');
};
  return function(locals) {
    return t(locals, require("ejs").filters);
  }
}());
},{"../../locale/current/netsim":245,"./Packet":175,"./netsimConstants":181,"ejs":256}],153:[function(require,module,exports){
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

var markup = require('./NetSimPacketSizeControl.html');
var i18n = require('../../locale/current/netsim');

/**
 * @type {number}
 * @const
 */
var SLIDER_INFINITY_VALUE = 1025;

/**
 * Generator and controller for packet size slider/selector
 * @param {jQuery} rootDiv
 * @param {function} packetSizeChangeCallback
 * @param {Object} options
 * @param {number} options.minimumPacketSize
 * @param {number} options.sliderStepValue
 * @constructor
 */
var NetSimPacketSizeControl = module.exports = function (rootDiv,
    packetSizeChangeCallback, options) {
  /**
   * Component root, which we fill whenever we call render()
   * @type {jQuery}
   * @private
   */
  this.rootDiv_ = rootDiv;

  /**
   * @type {function}
   * @private
   */
  this.packetSizeChangeCallback_ = packetSizeChangeCallback;

  /**
   * @type {number}
   * @private
   */
  this.minimumPacketSize_ = options.minimumPacketSize;

  /**
   * @type {number}
   * @private
   */
  this.sliderStepValue_ = options.sliderStepValue;

  /**
   * Internal state
   * @type {number}
   * @private
   */
  this.maxPacketSize_ = Infinity;

  this.render();
};

/**
 * Fill the root div with new elements reflecting the current state
 */
NetSimPacketSizeControl.prototype.render = function () {
  var renderedMarkup = $(markup({
    minValue: this.minimumPacketSize_,
    maxValue: i18n.unlimited()
  }));
  this.rootDiv_.html(renderedMarkup);
  this.rootDiv_.find('.packet-size-slider').slider({
    value: this.maxPacketSize_,
    min: this.minimumPacketSize_,
    max: SLIDER_INFINITY_VALUE,
    step: this.sliderStepValue_,
    slide: this.onPacketSizeChange_.bind(this)
  });
  this.setPacketSize(this.maxPacketSize_);
};

/**
 * @param {number} packetSize - up to Infinity
 * @returns {number} a value the slider can handle
 * @private
 */
NetSimPacketSizeControl.prototype.packetSizeToSliderValue_ = function (packetSize) {
  if (packetSize === Infinity) {
    return SLIDER_INFINITY_VALUE;
  }
  return packetSize;
};

/**
 * @param {number} sliderValue - value from the slider control
 * @returns {number} the packet size it maps to, up to Infinity
 * @private
 */
NetSimPacketSizeControl.prototype.sliderValueToPacketSize_ = function (sliderValue) {
  if (sliderValue === SLIDER_INFINITY_VALUE) {
    return Infinity;
  }
  return sliderValue;
};

/**
 * Change handler for jQueryUI slider control.
 * @param {Event} event
 * @param {Object} ui
 * @param {jQuery} ui.handle - The jQuery object representing the handle that
 *        was changed.
 * @param {number} ui.value - The current value of the slider.
 * @private
 */
NetSimPacketSizeControl.prototype.onPacketSizeChange_ = function (event, ui) {
  var newPacketSize = this.sliderValueToPacketSize_(ui.value);
  this.setPacketSize(newPacketSize);
  this.packetSizeChangeCallback_(newPacketSize);
};

/**
 * Update the slider and its label to display the provided value.
 * @param {number} newPacketSize
 */
NetSimPacketSizeControl.prototype.setPacketSize = function (newPacketSize) {
  var rootDiv = this.rootDiv_;
  this.maxPacketSize_ = newPacketSize;
  rootDiv.find('.packet-size-slider').slider('option', 'value',
      this.packetSizeToSliderValue_(newPacketSize));
  rootDiv.find('.packet_size_value').text(this.getPacketSizeText(newPacketSize));
};

/**
 * Get localized packet size description for the given packet size.
 * @param {number} packetSize
 * @returns {string}
 */
NetSimPacketSizeControl.prototype.getPacketSizeText = function (packetSize) {
  if (packetSize === Infinity) {
    return i18n.unlimited();
  }
  return i18n.numBitsPerPacket({ x: packetSize });
};

},{"../../locale/current/netsim":245,"./NetSimPacketSizeControl.html":152}],152:[function(require,module,exports){
module.exports= (function() {
  var t = function anonymous(locals, filters, escape) {
escape = escape || function (html){
  return String(html)
    .replace(/&(?!\w+;)/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
};
var buf = [];
with (locals || {}) { (function(){ 
 buf.push('');1;
  var i18n = require('../../locale/current/netsim');
; buf.push('\n<div class="netsim_packet_size_control">\n  <div class="slider-inline-wrap">\n    <div class="packet-size-slider"></div>\n    <div class="slider-labels">\n      <div class="max-value">', escape((8,  maxValue )), '</div>\n      <div class="min-value">', escape((9,  minValue )), '</div>\n      <div class="current-value">\n        <label for="packet-size-slider"><span class="packet_size_value"></span></label>\n      </div>\n    </div>\n  </div>\n</div>\n'); })();
} 
return buf.join('');
};
  return function(locals) {
    return t(locals, require("ejs").filters);
  }
}());
},{"../../locale/current/netsim":245,"ejs":256}],151:[function(require,module,exports){
/* jshint
 funcscope: true,
 newcap: true,
 nonew: true,
 shadow: false,
 unused: true,

 maxlen: 90,
 maxparams: 3,
 maxstatements: 200
 */
/* global $ */
'use strict';

require('../utils'); // For Function.prototype.inherits()
var netsimMsg = require('../../locale/current/netsim');
var markup = require('./NetSimPacketEditor.html');
var KeyCodes = require('../constants').KeyCodes;
var NetSimEncodingControl = require('./NetSimEncodingControl');
var Packet = require('./Packet');
var dataConverters = require('./dataConverters');
var netsimConstants = require('./netsimConstants');

var EncodingType = netsimConstants.EncodingType;
var BITS_PER_BYTE = netsimConstants.BITS_PER_BYTE;

var minifyBinary = dataConverters.minifyBinary;
var formatBinary = dataConverters.formatBinary;
var formatHex = dataConverters.formatHex;
var alignDecimal = dataConverters.alignDecimal;
var binaryToInt = dataConverters.binaryToInt;
var intToBinary = dataConverters.intToBinary;
var hexToInt = dataConverters.hexToInt;
var intToHex = dataConverters.intToHex;
var hexToBinary = dataConverters.hexToBinary;
var binaryToHex = dataConverters.binaryToHex;
var decimalToBinary = dataConverters.decimalToBinary;
var binaryToDecimal = dataConverters.binaryToDecimal;
var asciiToBinary = dataConverters.asciiToBinary;
var binaryToAscii = dataConverters.binaryToAscii;

/**
 * Generator and controller for message sending view.
 * @param {Object} initialConfig
 * @param {packetHeaderSpec} packetSpec
 * @param {number} [initialConfig.toAddress]
 * @param {number} [initialConfig.fromAddress]
 * @param {number} [initialConfig.packetIndex]
 * @param {number} [initialConfig.packetCount]
 * @param {string} [initialConfig.message]
 * @param {number} [initialConfig.maxPacketSize]
 * @param {number} [initialConfig.chunkSize]
 * @param {EncodingType[]} [initialConfig.enabledEncodings]
 * @param {function} initialConfig.removePacketCallback
 * @constructor
 */
var NetSimPacketEditor = module.exports = function (initialConfig) {

  /**
   * @type {jQuery}
   * @private
   */
  this.rootDiv_ = $('<div>').addClass('netsim-packet');

  /**
   * @type {packetHeaderSpec}
   * @private
   */
  this.packetSpec_ = initialConfig.packetSpec;

  /** @type {number} */
  this.toAddress = initialConfig.toAddress || 0;
  
  /** @type {number} */
  this.fromAddress = initialConfig.fromAddress || 0;
  
  /** @type {number} */
  this.packetIndex = initialConfig.packetIndex !== undefined ?
      initialConfig.packetIndex : 1;
  
  /** @type {number} */
  this.packetCount = initialConfig.packetCount !== undefined ?
      initialConfig.packetCount : 1;

  /**
   * Binary string of message body, live-interpreted to other values.
   * @type {string}
   */
  this.message = initialConfig.message || '';

  /**
   * Maximum packet length configurable by slider.
   * @type {Number}
   * @private
   */
  this.maxPacketSize_ = initialConfig.maxPacketSize || Infinity;

  /**
   * Bits per chunk/byte for parsing and formatting purposes.
   * @type {number}
   * @private
   */
  this.currentChunkSize_ = initialConfig.chunkSize || BITS_PER_BYTE;

  /**
   * Which encodings should be visible in the editor.
   * @type {EncodingType[]}
   * @private
   */
  this.enabledEncodings_ = initialConfig.enabledEncodings || [];

  /**
   * Method to call in order to remove this packet from its parent.
   * Function should take this PacketEditor as an argument.
   * @type {function}
   * @private
   */
  this.removePacketCallback_ = initialConfig.removePacketCallback;

  /**
   * @type {jQuery}
   * @private
   */
  this.removePacketButton_ = null;

  /**
   * @type {jQuery}
   * @private
   */
  this.bitCounter_ = null;
  
  this.render();
};

/**
 * Return root div, for hooking up to a parent element.
 * @returns {jQuery}
 */
NetSimPacketEditor.prototype.getRoot = function () {
  return this.rootDiv_;
};

/** Replace contents of our root element with our own markup. */
NetSimPacketEditor.prototype.render = function () {
  var newMarkup = $(markup({
    packetSpec: this.packetSpec_
  }));
  this.rootDiv_.html(newMarkup);
  this.bindElements_();
  this.updateFields_();
  this.removePacketButton_.toggle(this.packetCount > 1);
  NetSimEncodingControl.hideRowsByEncoding(this.rootDiv_, this.enabledEncodings_);
};

/**
 * Focus event handler.  If the target element has a 'watermark' class then
 * it contains text we intend to clear before any editing occurs.  This
 * handler clears that text and removes the class.
 * @param focusEvent
 */
var removeWatermark = function (focusEvent) {
  var target = $(focusEvent.target);
  if (target.hasClass('watermark')) {
    target.val('');
    target.removeClass('watermark');
  }
};

/**
 * Creates a keyPress handler that allows only the given characters to be
 * typed into a text field.
 * @param {RegExp} whitelistRegex
 * @return {function} appropriate to pass to .keypress()
 */
var makeKeypressHandlerWithWhitelist = function (whitelistRegex) {
  /**
   * A keyPress handler that blocks all visible characters except those
   * matching the whitelist.  Passes through invisible characters (backspace,
   * delete) and control combinations (copy, paste).
   *
   * @param keyEvent
   * @returns {boolean} - Whether to propagate this event.  Should return
   *          FALSE if we handle the event and don't want to pass it on, TRUE
   *          if we are not handling the event.
   */
  return function (keyEvent) {

    // Don't block control combinations (copy, paste, etc.)
    if (keyEvent.metaKey || keyEvent.ctrlKey) {
      return true;
    }

    // Don't block invisible characters; we want to allow backspace, delete, etc.
    if (keyEvent.which < KeyCodes.SPACE || keyEvent.which >= KeyCodes.DELETE) {
      return true;
    }

    // At this point, if the character doesn't match, we should block it.
    var key = String.fromCharCode(keyEvent.which);
    if (!whitelistRegex.test(key)) {
      keyEvent.preventDefault();
      return false;
    }
  };
};

/**
 * Generate a jQuery-appropriate keyup handler for a text field.
 * Grabs the new value of the text field, runs it through the provided
 * converter function, sets the result on the SendWidget's internal state
 * and triggers a field update on the widget that skips the field being edited.
 *
 * Similar to makeBlurHandler, but does not update the field currently
 * being edited.
 *
 * @param {string} fieldName - name of internal state field that the text
 *        field should update.
 * @param {function} converterFunction - Takes the text field's value and
 *        converts it to a format appropriate to the internal state field.
 * @returns {function} that can be passed to $.keyup()
 */
NetSimPacketEditor.prototype.makeKeyupHandler = function (fieldName, converterFunction) {
  return function (jqueryEvent) {
    var newValue = converterFunction(jqueryEvent.target.value);
    if (!isNaN(newValue)) {
      this[fieldName] = newValue;
      this.updateFields_(jqueryEvent.target);
    }
  }.bind(this);
};

/**
 * Generate a jQuery-appropriate blur handler for a text field.
 * Grabs the new value of the text field, runs it through the provided
 * converter function, sets the result on the SendWidget's internal state
 * and triggers a full field update of the widget (including the field that was
 * just edited).
 *
 * Similar to makeKeyupHandler, but also updates the field that was
 * just edited.
 *
 * @param {string} fieldName - name of internal state field that the text
 *        field should update.
 * @param {function} converterFunction - Takes the text field's value and
 *        converts it to a format appropriate to the internal state field.
 * @returns {function} that can be passed to $.blur()
 */
NetSimPacketEditor.prototype.makeBlurHandler = function (fieldName, converterFunction) {
  return function (jqueryEvent) {
    var newValue = converterFunction(jqueryEvent.target.value);
    if (isNaN(newValue)) {
      newValue = converterFunction('0');
    }
    this[fieldName] = newValue;
    this.updateFields_();
  }.bind(this);
};

/**
 * Specification for an encoding row in the editor, which designates character
 * whitelists to limit typing in certain fields, and rules for intepreting the
 * field from binary.
 * @typedef {Object} rowType
 * @property {EncodingType} typeName
 * @property {RegExp} shortNumberAllowedCharacters - Whitelist of characters
 *           that may be typed into a header field.
 * @property {function} shortNumberConversion - How to convert from binary
 *           to a header value in this row when the binary is updated.
 * @property {RegExp} messageAllowedCharacters - Whitelist of characters
 *           that may be typed into the message field.
 * @property {function} messageConversion - How to convert from binary to
 *           the message value in this row when the binary is updated.
 */

/**
 * Get relevant elements from the page and bind them to local variables.
 * @private
 */
NetSimPacketEditor.prototype.bindElements_ = function () {
  var rootDiv = this.rootDiv_;

  var shortNumberFields = [
    Packet.HeaderType.TO_ADDRESS,
    Packet.HeaderType.FROM_ADDRESS,
    Packet.HeaderType.PACKET_INDEX,
    Packet.HeaderType.PACKET_COUNT
  ];

  /** @type {rowType[]} */
  var rowTypes = [
    {
      typeName: EncodingType.BINARY,
      shortNumberAllowedCharacters: /[01]/,
      shortNumberConversion: binaryToInt,
      messageAllowedCharacters: /[01\s]/,
      messageConversion: minifyBinary
    },
    {
      typeName: EncodingType.HEXADECIMAL,
      shortNumberAllowedCharacters: /[0-9a-f]/i,
      shortNumberConversion: hexToInt,
      messageAllowedCharacters: /[0-9a-f\s]/i,
      messageConversion: hexToBinary
    },
    {
      typeName: EncodingType.DECIMAL,
      shortNumberAllowedCharacters: /[0-9]/,
      shortNumberConversion: parseInt,
      messageAllowedCharacters: /[0-9\s]/,
      messageConversion: function (decimalString) {
        return decimalToBinary(decimalString, this.currentChunkSize_);
      }.bind(this)
    },
    {
      typeName: EncodingType.ASCII,
      shortNumberAllowedCharacters: /[0-9]/,
      shortNumberConversion: parseInt,
      messageAllowedCharacters: /./,
      messageConversion: function (asciiString) {
        return asciiToBinary(asciiString, this.currentChunkSize_);
      }.bind(this)
    }
  ];

  rowTypes.forEach(function (rowType) {
    var tr = rootDiv.find('tr.' + rowType.typeName);
    var rowUIKey = rowType.typeName + 'UI';
    this[rowUIKey] = {};
    var rowFields = this[rowUIKey];

    // We attach focus (sometimes) to clear the field watermark, if present
    // We attach keypress to block certain characters
    // We attach keyup to live-update the widget as the user types
    // We attach blur to reformat the edited field when the user leaves it,
    //    and to catch non-keyup cases like copy/paste.

    shortNumberFields.forEach(function (fieldName) {
      rowFields[fieldName] = tr.find('input.' + fieldName);
      rowFields[fieldName].keypress(
          makeKeypressHandlerWithWhitelist(rowType.shortNumberAllowedCharacters));
      rowFields[fieldName].keyup(
          this.makeKeyupHandler(fieldName, rowType.shortNumberConversion));
      rowFields[fieldName].blur(
          this.makeBlurHandler(fieldName, rowType.shortNumberConversion));
    }, this);

    rowFields.message = tr.find('textarea.message');
    rowFields.message.focus(removeWatermark);
    rowFields.message.keypress(
        makeKeypressHandlerWithWhitelist(rowType.messageAllowedCharacters));
    rowFields.message.keyup(
        this.makeKeyupHandler('message', rowType.messageConversion));
    rowFields.message.blur(
        this.makeBlurHandler('message', rowType.messageConversion));
  }, this);

  this.removePacketButton_ = rootDiv.find('.remove-packet-button');
  this.removePacketButton_.click(this.onRemovePacketButtonClick_.bind(this));
  this.bitCounter_ = rootDiv.find('.bit-counter');
};

/**
 * Update send widget display
 * @param {HTMLElement} [skipElement] - A field to skip while updating,
 *        because we don't want to transform content out from under the
 *        user's cursor.
 * @private
 */
NetSimPacketEditor.prototype.updateFields_ = function (skipElement) {
  var chunkSize = this.currentChunkSize_;
  var liveFields = [];

  [
    Packet.HeaderType.TO_ADDRESS,
    Packet.HeaderType.FROM_ADDRESS,
    Packet.HeaderType.PACKET_INDEX,
    Packet.HeaderType.PACKET_COUNT
  ].forEach(function (fieldName) {
        liveFields.push({
          inputElement: this.binaryUI[fieldName],
          newValue: intToBinary(this[fieldName], 4)
        });

        liveFields.push({
          inputElement: this.hexadecimalUI[fieldName],
          newValue: intToHex(this[fieldName], 1)
        });

        liveFields.push({
          inputElement: this.decimalUI[fieldName],
          newValue: this[fieldName].toString(10)
        });

        liveFields.push({
          inputElement: this.asciiUI[fieldName],
          newValue: this[fieldName].toString(10)
        });
      }, this);

  liveFields.push({
    inputElement: this.binaryUI.message,
    newValue: formatBinary(this.message, chunkSize),
    watermark: netsimMsg.binary()
  });

  liveFields.push({
    inputElement: this.hexadecimalUI.message,
    newValue: formatHex(binaryToHex(this.message), chunkSize),
    watermark: netsimMsg.hexadecimal()
  });

  liveFields.push({
    inputElement: this.decimalUI.message,
    newValue: alignDecimal(binaryToDecimal(this.message, chunkSize)),
    watermark: netsimMsg.decimal()
  });

  liveFields.push({
    inputElement: this.asciiUI.message,
    newValue: binaryToAscii(this.message, chunkSize),
    watermark: netsimMsg.ascii()
  });

  liveFields.forEach(function (field) {
    if (field.inputElement[0] !== skipElement) {
      if (field.watermark && field.newValue === '') {
        field.inputElement.val(field.watermark);
        field.inputElement.addClass('watermark');
      } else {
        field.inputElement.val(field.newValue);
        field.inputElement.removeClass('watermark');
      }
    }
  });

  this.updateBitCounter();
};

/**
 * Produces a single binary string in the current packet format, based
 * on the current state of the widget (content of its internal fields).
 * @returns {string} - binary representation of packet
 * @private
 */
NetSimPacketEditor.prototype.getPacketBinary = function () {
  var encoder = new Packet.Encoder(this.packetSpec_);
  return encoder.concatenateBinary(
      encoder.makeBinaryHeaders({
        toAddress: this.toAddress,
        fromAddress: this.fromAddress,
        packetIndex: this.packetIndex,
        packetCount: this.packetCount
      }),
      this.message);
};

/** @param {number} fromAddress */
NetSimPacketEditor.prototype.setFromAddress = function (fromAddress) {
  this.fromAddress = fromAddress;
  this.updateFields_();
};

/** @param {number} packetIndex */
NetSimPacketEditor.prototype.setPacketIndex = function (packetIndex) {
  this.packetIndex = packetIndex;
  this.updateFields_();
};

/** @param {number} packetCount */
NetSimPacketEditor.prototype.setPacketCount = function (packetCount) {
  this.packetCount = packetCount;
  this.removePacketButton_.toggle(packetCount > 1);
  this.updateFields_();
};

/** @param {number} maxPacketSize */
NetSimPacketEditor.prototype.setMaxPacketSize = function (maxPacketSize) {
  this.maxPacketSize_ = maxPacketSize;
  this.updateBitCounter();
};

/**
 * Show or hide parts of the send UI based on the currently selected encoding
 * mode.
 * @param {EncodingType[]} newEncodings
 */
NetSimPacketEditor.prototype.setEncodings = function (newEncodings) {
  this.enabledEncodings_ = newEncodings;
  NetSimEncodingControl.hideRowsByEncoding(this.rootDiv_, newEncodings);
};

/**
 * Change how data is interpreted and formatted by this component, triggering
 * an update of all input fields.
 * @param {number} newChunkSize
 */
NetSimPacketEditor.prototype.setChunkSize = function (newChunkSize) {
  this.currentChunkSize_ = newChunkSize;
  this.updateFields_();
};

/**
 * Update the visual state of the bit counter to reflect the current
 * message binary length and maximum packet size.
 */
NetSimPacketEditor.prototype.updateBitCounter = function () {
  var size = this.getPacketBinary().length;
  var maxSize = this.maxPacketSize_ === Infinity ?
      netsimMsg.infinity() : this.maxPacketSize_;
  this.bitCounter_.html(netsimMsg.bitCounter({
    x: size,
    y: maxSize
  }));

  this.bitCounter_.toggleClass('oversized', size > this.maxPacketSize_);
};

/**
 * Handler for the "Remove Packet" button. Calls handler provided by
 * parent, passing self, so that parent can remove this packet.
 * @private
 */
NetSimPacketEditor.prototype.onRemovePacketButtonClick_ = function () {
  this.removePacketCallback_(this);
};

},{"../../locale/current/netsim":245,"../constants":50,"../utils":235,"./NetSimEncodingControl":135,"./NetSimPacketEditor.html":150,"./Packet":175,"./dataConverters":177,"./netsimConstants":181}],150:[function(require,module,exports){
module.exports= (function() {
  var t = function anonymous(locals, filters, escape) {
escape = escape || function (html){
  return String(html)
    .replace(/&(?!\w+;)/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
};
var buf = [];
with (locals || {}) { (function(){ 
 buf.push('');1;
  var i18n = require('../../locale/current/netsim');
  var netsimConstants = require('./netsimConstants');
  var EncodingType = netsimConstants.EncodingType;
  var Packet = require('./Packet');
  var PacketUIColumnType = netsimConstants.PacketUIColumnType;
  var netsimUtils = require('./netsimUtils');
  var getEncodingLabel = netsimUtils.getEncodingLabel;
  var forEachEnumValue = netsimUtils.forEachEnumValue;

  /** @type {Packet.HeaderType[]} */
  var headerFields = packetSpec.map(function (headerField) {
    return headerField.key;
  });

  var showToAddress = headerFields.indexOf(Packet.HeaderType.TO_ADDRESS) > -1;
  var showFromAddress = headerFields.indexOf(Packet.HeaderType.FROM_ADDRESS) > -1;
  var showPacketInfo = headerFields.indexOf(Packet.HeaderType.PACKET_INDEX) > -1 &&
      headerFields.indexOf(Packet.HeaderType.PACKET_COUNT) > -1;

/**
 * @param {EncodingType} encodingType
 */
  function editorRow(encodingType) {
    ; buf.push('\n      <tr class="', escape((26,  encodingType )), '">\n        <th nowrap class="', escape((27,  PacketUIColumnType.ENCODING_LABEL )), '">', escape((27,  getEncodingLabel(encodingType) )), '</th>\n        ');28; if (showToAddress) { ; buf.push('\n        <td nowrap class="', escape((29,  PacketUIColumnType.TO_ADDRESS )), '"><input type="text" class="', escape((29,  Packet.HeaderType.TO_ADDRESS )), '" /></td>\n        ');30; } ; buf.push('\n        ');31; if (showFromAddress) { ; buf.push('\n        <td nowrap class="', escape((32,  PacketUIColumnType.FROM_ADDRESS )), '"><input type="text" readonly class="', escape((32,  Packet.HeaderType.FROM_ADDRESS )), '" /></td>\n        ');33; } ; buf.push('\n        ');34; if (showPacketInfo) { ; buf.push('\n        <td nowrap class="', escape((35,  PacketUIColumnType.PACKET_INFO )), '"><input type="text" readonly class="', escape((35,  Packet.HeaderType.PACKET_INDEX )), '" />', escape((35,  i18n._of_() )), '<input type="text" readonly class="', escape((35,  Packet.HeaderType.PACKET_COUNT )), '" /></td>\n        ');36; } ; buf.push('\n        <td class="', escape((37,  PacketUIColumnType.MESSAGE )), '"><div><textarea class="message"></textarea></div></td>\n      </tr>\n    ');39;
  }
; buf.push('\n<table>\n  <thead>\n  <tr>\n    <th nowrap class="', escape((45,  PacketUIColumnType.ENCODING_LABEL )), '"></th>\n    ');46; if (showToAddress) { ; buf.push('\n      <th nowrap class="', escape((47,  PacketUIColumnType.TO_ADDRESS )), '">', escape((47,  i18n.to() )), '</th>\n    ');48; } ; buf.push('\n    ');49; if (showFromAddress) { ; buf.push('\n      <th nowrap class="', escape((50,  PacketUIColumnType.FROM_ADDRESS )), '">', escape((50,  i18n.from() )), '</th>\n    ');51; } ; buf.push('\n    ');52; if (showPacketInfo) { ; buf.push('\n      <th nowrap class="', escape((53,  PacketUIColumnType.PACKET_INFO )), '">', escape((53,  i18n.packet() )), '</th>\n    ');54; } ; buf.push('\n    <th class="', escape((55,  PacketUIColumnType.MESSAGE )), '">\n      ', escape((56,  i18n.message() )), '\n      <div class="packet-controls">\n        <span class="netsim-button remove-packet-button" title="', escape((58,  i18n.removePacket() )), '"><i class="fa fa-times"></i></span>\n      </div>\n    </th>\n  </tr>\n  </thead>\n  <tbody>\n  ');64;
    forEachEnumValue(EncodingType, function (encodingType) {
      editorRow(encodingType);
    });
  ; buf.push('\n  </tbody>\n</table>\n<div class="bit-counter"></div>\n'); })();
} 
return buf.join('');
};
  return function(locals) {
    return t(locals, require("ejs").filters);
  }
}());
},{"../../locale/current/netsim":245,"./Packet":175,"./netsimConstants":181,"./netsimUtils":183,"ejs":256}],148:[function(require,module,exports){
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

var markup = require('./NetSimMyDeviceTab.html');
var NetSimChunkSizeControl = require('./NetSimChunkSizeControl');
var NetSimEncodingControl = require('./NetSimEncodingControl');

/**
 * Generator and controller for "My Device" tab.
 * @param {jQuery} rootDiv
 * @param {netsimLevelConfiguration} levelConfig
 * @param {function} chunkSizeChangeCallback
 * @param {function} encodingChangeCallback
 * @constructor
 */
var NetSimMyDeviceTab = module.exports = function (rootDiv, levelConfig,
    chunkSizeChangeCallback, encodingChangeCallback) {
  /**
   * Component root, which we fill whenever we call render()
   * @type {jQuery}
   * @private
   */
  this.rootDiv_ = rootDiv;

  /**
   * @type {netsimLevelConfiguration}
   * @private
   */
  this.levelConfig_ = levelConfig;

  /**
   * @type {function}
   * @private
   */
  this.chunkSizeChangeCallback_ = chunkSizeChangeCallback;

  /**
   * @type {function}
   * @private
   */
  this.encodingChangeCallback_ = encodingChangeCallback;

  /**
   * @type {NetSimChunkSizeControl}
   * @private
   */
  this.chunkSizeControl_ = null;

  /**
   * @type {NetSimEncodingControl}
   * @private
   */
  this.encodingControl_ = null;

  this.render();
};

/**
 * Fill the root div with new elements reflecting the current state
 */
NetSimMyDeviceTab.prototype.render = function () {
  var renderedMarkup = $(markup({}));
  this.rootDiv_.html(renderedMarkup);
  this.chunkSizeControl_ = new NetSimChunkSizeControl(
      this.rootDiv_.find('.chunk_size'),
      this.chunkSizeChangeCallback_);

  if (this.levelConfig_.showEncodingControls.length > 0) {
    this.encodingControl_ = new NetSimEncodingControl(
        this.rootDiv_.find('.encoding'),
        this.levelConfig_,
        this.encodingChangeCallback_);
  }
};

/**
 * Update the slider and its label to display the provided value.
 * @param {number} newChunkSize
 */
NetSimMyDeviceTab.prototype.setChunkSize = function (newChunkSize) {
  this.chunkSizeControl_.setChunkSize(newChunkSize);
};

/**
 * @param {EncodingType[]} newEncodings
 */
NetSimMyDeviceTab.prototype.setEncodings = function (newEncodings) {
  if (this.encodingControl_) {
    this.encodingControl_.setEncodings(newEncodings);
  }
  this.chunkSizeControl_.setEncodings(newEncodings);
};
},{"./NetSimChunkSizeControl":123,"./NetSimEncodingControl":135,"./NetSimMyDeviceTab.html":147}],147:[function(require,module,exports){
module.exports= (function() {
  var t = function anonymous(locals, filters, escape) {
escape = escape || function (html){
  return String(html)
    .replace(/&(?!\w+;)/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
};
var buf = [];
with (locals || {}) { (function(){ 
 buf.push('<div class="netsim-my-device-tab">\n  <div class="encoding"></div>\n  <div class="chunk_size"></div>\n</div>\n'); })();
} 
return buf.join('');
};
  return function(locals) {
    return t(locals, require("ejs").filters);
  }
}());
},{"ejs":256}],144:[function(require,module,exports){
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

require('../utils'); // For Function.prototype.inherits()
var i18n = require('../../locale/current/netsim');
var markup = require('./NetSimLogPanel.html');
var packetMarkup = require('./NetSimLogPacket.html');
var NetSimPanel = require('./NetSimPanel');
var NetSimEncodingControl = require('./NetSimEncodingControl');

/**
 * Generator and controller for message log.
 * @param {jQuery} rootDiv
 * @param {Object} options
 * @param {string} options.logTitle
 * @param {boolean} [options.isMinimized] defaults to FALSE
 * @param {packetHeaderSpec} options.packetSpec
 * @constructor
 * @augments NetSimPanel
 */
var NetSimLogPanel = module.exports = function (rootDiv, options) {
  /**
   * @type {packetHeaderSpec}
   * @private
   */
  this.packetSpec_ = options.packetSpec;

  /**
   * List of controllers for currently displayed packets.
   * @type {Array.<NetSimLogPacket>}
   * @private
   */
  this.packets_ = [];

  /**
   * A message encoding (display) setting.
   * @type {string}
   * @private
   */
  this.currentEncodings_ = [];

  /**
   * Current chunk size (bytesize) for interpreting binary in the log.
   * @type {number}
   * @private
   */
  this.currentChunkSize_ = 8;

  // Initial render
  NetSimPanel.call(this, rootDiv, {
    className: 'netsim-log-panel',
    panelTitle: options.logTitle,
    beginMinimized: options.isMinimized
  });
};
NetSimLogPanel.inherits(NetSimPanel);

NetSimLogPanel.prototype.render = function () {
  // Create boilerplate panel markup
  NetSimLogPanel.superPrototype.render.call(this);

  // Add our own content markup
  var newMarkup = $(markup({}));
  this.getBody().html(newMarkup);

  // Add a clear button to the panel header
  this.addButton(i18n.clear(), this.onClearButtonPress_.bind(this));

  // Bind reference to scrollArea for use when logging.
  this.scrollArea_ = this.getBody().find('.scroll_area');
};

/**
 * Remove all packets from the log, resetting its state.
 * @private
 */
NetSimLogPanel.prototype.onClearButtonPress_ = function () {
  this.scrollArea_.empty();
  this.packets_.length = 0;
};

/**
 * Put a message into the log.
 */
NetSimLogPanel.prototype.log = function (packetBinary) {
  var scrollArea = this.scrollArea_;
  var wasScrolledToEnd =
      scrollArea[0].scrollHeight - scrollArea[0].scrollTop <=
      scrollArea.outerHeight();

  var newPacket = new NetSimLogPacket(packetBinary, {
    packetSpec: this.packetSpec_,
    encodings: this.currentEncodings_,
    chunkSize: this.currentChunkSize_
  });
  newPacket.getRoot().appendTo(this.scrollArea_);
  this.packets_.push(newPacket);

  // Auto-scroll
  if (wasScrolledToEnd) {
    scrollArea.scrollTop(scrollArea[0].scrollHeight);
  }
};

/**
 * Show or hide parts of the send UI based on the currently selected encoding
 * mode.
 * @param {EncodingType[]} newEncodings
 */
NetSimLogPanel.prototype.setEncodings = function (newEncodings) {
  this.currentEncodings_ = newEncodings;
  this.packets_.forEach(function (packet) {
    packet.setEncodings(newEncodings);
  });
};

/**
 * Change how binary input in interpreted and formatted in the log.
 * @param {number} newChunkSize
 */
NetSimLogPanel.prototype.setChunkSize = function (newChunkSize) {
  this.currentChunkSize_ = newChunkSize;
  this.packets_.forEach(function (packet) {
    packet.setChunkSize(newChunkSize);
  });
};

/**
 * A component/controller for display of an individual packet in the log.
 * @param {string} packetBinary - raw packet data
 * @param {Object} options
 * @param {packetHeaderSpec} options.packetSpec
 * @param {EncodingType[]} options.encodings - which display style to use initially
 * @param {number} options.chunkSize - (or bytesize) to use when interpreting and
 *        formatting the data.
 * @constructor
 */
var NetSimLogPacket = function (packetBinary, options) {
  /**
   * @type {string}
   * @private
   */
  this.packetBinary_ = packetBinary;

  /**
   * @type {packetHeaderSpec}
   * @private
   */
  this.packetSpec_ = options.packetSpec;

  /**
   * @type {EncodingType[]}
   * @private
   */
  this.encodings_ = options.encodings;

  /**
   * @type {number}
   * @private
   */
  this.chunkSize_ = options.chunkSize;

  /**
   * Wrapper div that we create once, and fill repeatedly with render()
   * @type {jQuery}
   * @private
   */
  this.rootDiv_ = $('<div>').addClass('packet');

  // Initial content population
  this.render();
};

/**
 * Re-render div contents to represent the packet in a different way.
 */
NetSimLogPacket.prototype.render = function () {
  var rawMarkup = packetMarkup({
    packetBinary: this.packetBinary_,
    packetSpec: this.packetSpec_,
    chunkSize: this.chunkSize_
  });
  var jQueryWrap = $(rawMarkup);
  NetSimEncodingControl.hideRowsByEncoding(jQueryWrap, this.encodings_);
  this.rootDiv_.html(jQueryWrap);
};

/**
 * Return root div, for hooking up to a parent element.
 * @returns {jQuery}
 */
NetSimLogPacket.prototype.getRoot = function () {
  return this.rootDiv_;
};

/**
 * Change encoding-display setting and re-render packet contents accordingly.
 * @param {EncodingType[]} newEncodings
 */
NetSimLogPacket.prototype.setEncodings = function (newEncodings) {
  this.encodings_ = newEncodings;
  this.render();
};

/**
 * Change chunk size for interpreting data and re-render packet contents
 * accordingly.
 * @param {number} newChunkSize
 */
NetSimLogPacket.prototype.setChunkSize = function (newChunkSize) {
  this.chunkSize_ = newChunkSize;
  this.render();
};

},{"../../locale/current/netsim":245,"../utils":235,"./NetSimEncodingControl":135,"./NetSimLogPacket.html":142,"./NetSimLogPanel.html":143,"./NetSimPanel":155}],155:[function(require,module,exports){
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

var markup = require('./NetSimPanel.html');

/**
 * Generator and controller for a NetSim Panel, a single section on the
 * page which may be collapsible.
 * @param {jQuery} rootDiv - Element within which the panel is recreated
 *        every time render() is called.  Will wipe out contents of this
 *        element, but not the element itself.
 * @param {Object} [options]
 * @param {string} [options.className] - an additional class to be appended to
 *        the panel's root (one layer inside rootDiv) for style rules.
 *        Defaults to no class, so only the 'netsim-panel' class will be used.
 * @param {string} [options.panelTitle] - Localized initial panel title.
 *        Defaults to empty string.
 * @param {boolean} [options.beginMinimized] - Whether this panel should be
 *        minimized (closed) when it is initially created.  Defaults to FALSE.
 * @constructor
 */
var NetSimPanel = module.exports = function (rootDiv, options) {
  /**
   * Unique instance ID for this panel, in case we have several
   * of them on a page.
   * @type {number}
   * @private
   */
  this.instanceID_ = NetSimPanel.uniqueIDCounter;
  NetSimPanel.uniqueIDCounter++;

  /**
   * Component root, which we fill whenever we call render()
   * @type {jQuery}
   * @private
   */
  this.rootDiv_ = rootDiv;

  /**
   * An additional className to be appended to the panel's root (one layer
   * inside rootDiv), for style rules.
   * @type {string}
   * @private
   */
  this.className_ = options.className || '';

  /**
   * Panel title, displayed in header.
   * @type {string}
   * @private
   */
  this.panelTitle_ = options.panelTitle || '';

  /**
   * Whether the component is minimized, for consistent
   * state across re-renders.
   * @type {boolean}
   * @private
   */
  this.isMinimized_ = options.beginMinimized !== undefined ?
      options.beginMinimized : false;

  // Initial render
  this.render();
};

/**
 * Static counter used to generate/uniquely identify different instances
 * of this log widget on the page.
 * @type {number}
 */
NetSimPanel.uniqueIDCounter = 0;

/**
 * Rebuild the panel contents inside of the rootDiv
 */
NetSimPanel.prototype.render = function () {
  var newMarkup = $(markup({
    instanceID: this.instanceID_,
    className: this.className_,
    panelTitle: this.panelTitle_

  }));
  this.rootDiv_.html(newMarkup);

  this.rootDiv_.find('.minimizer').click(this.onMinimizerClick_.bind(this));

  this.setMinimized(this.isMinimized_);
};

/**
 * Set panel title.
 * @param {string} newTitle - Localized panel title.
 */
NetSimPanel.prototype.setPanelTitle = function (newTitle) {
  this.panelTitle_ = newTitle;
};

/**
 * Toggle whether this panel is minimized.
 * @private
 */
NetSimPanel.prototype.onMinimizerClick_ = function () {
  this.setMinimized(!this.isMinimized_);
};

/**
 * @param {boolean} becomeMinimized
 */
NetSimPanel.prototype.setMinimized = function (becomeMinimized) {
  var panelDiv = this.rootDiv_.find('.netsim-panel');
  var minimizer = panelDiv.find('.minimizer');
  if (becomeMinimized) {
    panelDiv.addClass('minimized');
    minimizer.find('.fa')
        .addClass('fa-plus-square')
        .removeClass('fa-minus-square');
  } else {
    panelDiv.removeClass('minimized');
    minimizer.find('.fa')
        .addClass('fa-minus-square')
        .removeClass('fa-plus-square');
  }
  this.isMinimized_ = becomeMinimized;
};

/**
 * Add a button to the right end of the panel header.
 * @param {string} buttonText
 * @param {function} pressCallback
 */
NetSimPanel.prototype.addButton = function(buttonText, pressCallback) {
  $('<span>')
      .addClass('netsim-button')
      .html(buttonText)
      .click(pressCallback)
      .appendTo(this.rootDiv_.find('.panel_controls'));
};

/**
 * @returns {jQuery} the body Div of the panel, for panel content.
 */
NetSimPanel.prototype.getBody = function () {
  return this.rootDiv_.find('.panel-body');
};

},{"./NetSimPanel.html":154}],154:[function(require,module,exports){
module.exports= (function() {
  var t = function anonymous(locals, filters, escape) {
escape = escape || function (html){
  return String(html)
    .replace(/&(?!\w+;)/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
};
var buf = [];
with (locals || {}) { (function(){ 
 buf.push('<div id="netsim_panel_', escape((1,  instanceID )), '"\n     class="netsim-panel ', escape((2,  className )), '">\n  <h1>\n    <span class="minimizer">\n      <i class="fa fa-minus-square"></i>\n      ', escape((6,  panelTitle )), '\n    </span>\n    <div class="panel_controls">\n    </div>\n  </h1>\n  <div class="panel-body">\n  </div>\n</div>\n'); })();
} 
return buf.join('');
};
  return function(locals) {
    return t(locals, require("ejs").filters);
  }
}());
},{"ejs":256}],143:[function(require,module,exports){
module.exports= (function() {
  var t = function anonymous(locals, filters, escape) {
escape = escape || function (html){
  return String(html)
    .replace(/&(?!\w+;)/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
};
var buf = [];
with (locals || {}) { (function(){ 
 buf.push('<div class="log_body">\n  <div class="scroll_area">\n  </div>\n</div>\n'); })();
} 
return buf.join('');
};
  return function(locals) {
    return t(locals, require("ejs").filters);
  }
}());
},{"ejs":256}],142:[function(require,module,exports){
module.exports= (function() {
  var t = function anonymous(locals, filters, escape) {
escape = escape || function (html){
  return String(html)
    .replace(/&(?!\w+;)/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
};
var buf = [];
with (locals || {}) { (function(){ 
 buf.push('');1;
  var netsimConstants = require('./netsimConstants');
  var dataConverters = require('./dataConverters');
  var i18n = require('../../locale/current/netsim');
  var getEncodingLabel = require('./netsimUtils').getEncodingLabel;
  var Packet = require('./Packet');

  var EncodingType = netsimConstants.EncodingType;
  var PacketUIColumnType = netsimConstants.PacketUIColumnType;

  var formatBinary = dataConverters.formatBinary;
  var formatHex = dataConverters.formatHex;
  var alignDecimal = dataConverters.alignDecimal;
  var binaryToInt = dataConverters.binaryToInt;
  var binaryToHex = dataConverters.binaryToHex;
  var binaryToDecimal = dataConverters.binaryToDecimal;
  var binaryToAscii = dataConverters.binaryToAscii;

  /** @type {Packet} */
  var packet = new Packet(packetSpec, packetBinary);

  /** @type {Packet.HeaderType[]} */
  var headerFields = packetSpec.map(function (headerField) {
    return headerField.key;
  });

  var showToAddress = headerFields.indexOf(Packet.HeaderType.TO_ADDRESS) > -1;
  var showFromAddress = headerFields.indexOf(Packet.HeaderType.FROM_ADDRESS) > -1;
  var showPacketInfo = headerFields.indexOf(Packet.HeaderType.PACKET_INDEX) > -1 &&
      headerFields.indexOf(Packet.HeaderType.PACKET_COUNT) > -1;

/**
 * @param {EncodingType} encodingType
 * @param {string} toAddress
 * @param {string} fromAddress
 * @param {string} packetInfo
 * @param {string} message
 */
  function logRow(encodingType, toAddress, fromAddress, packetInfo, message) {
    ; buf.push('\n      <tr class="', escape((41,  encodingType )), '">\n        <th nowrap class="', escape((42,  PacketUIColumnType.ENCODING_LABEL )), '">', escape((42,  getEncodingLabel(encodingType) )), '</th>\n        ');43; if (showToAddress) { ; buf.push('\n          <td nowrap class="', escape((44,  PacketUIColumnType.TO_ADDRESS )), '">', escape((44,  toAddress )), '</td>\n        ');45; } ; buf.push('\n        ');46; if (showFromAddress) { ; buf.push('\n          <td nowrap class="', escape((47,  PacketUIColumnType.FROM_ADDRESS )), '">', escape((47,  fromAddress )), '</td>\n        ');48; } ; buf.push('\n        ');49; if (showPacketInfo) { ; buf.push('\n          <td nowrap class="', escape((50,  PacketUIColumnType.PACKET_INFO )), '">', escape((50,  packetInfo )), '</td>\n        ');51; } ; buf.push('\n        <td class="', escape((52,  PacketUIColumnType.MESSAGE )), '">', escape((52,  message )), '</td>\n      </tr>\n  ');54;
  }
 ; buf.push('\n<table>\n  <thead>\n    <tr>\n      <th nowrap class="', escape((60,  PacketUIColumnType.ENCODING_LABEL )), '"></th>\n      ');61; if (showToAddress) { ; buf.push('\n        <th nowrap class="', escape((62,  PacketUIColumnType.TO_ADDRESS )), '">', escape((62,  i18n.to() )), '</th>\n      ');63; } ; buf.push('\n      ');64; if (showFromAddress) { ; buf.push('\n        <th nowrap class="', escape((65,  PacketUIColumnType.FROM_ADDRESS )), '">', escape((65,  i18n.from() )), '</th>\n      ');66; } ; buf.push('\n      ');67; if (showPacketInfo) { ; buf.push('\n        <th nowrap class="', escape((68,  PacketUIColumnType.PACKET_INFO )), '">', escape((68,  i18n.packet() )), '</th>\n      ');69; } ; buf.push('\n      <th nowrap class="', escape((70,  PacketUIColumnType.MESSAGE )), '">', escape((70,  i18n.message() )), '</th>\n    </tr>\n  </thead>\n  <tbody>\n  ');74;
    var toAddress = showToAddress ? packet.getHeaderAsBinary(Packet.HeaderType.TO_ADDRESS) : '';
    var fromAddress = showFromAddress ? packet.getHeaderAsBinary(Packet.HeaderType.FROM_ADDRESS) : '';
    var packetIndex = showPacketInfo ? packet.getHeaderAsBinary(Packet.HeaderType.PACKET_INDEX) : '';
    var packetCount = showPacketInfo ? packet.getHeaderAsBinary(Packet.HeaderType.PACKET_COUNT) : '';
    var message = packet.getBodyAsBinary();

    logRow(EncodingType.ASCII,
        binaryToInt(toAddress),
        binaryToInt(fromAddress),
        i18n.xOfYPackets({
          x: binaryToInt(packetIndex),
          y: binaryToInt(packetCount)
        }),
        binaryToAscii(message, chunkSize));

    logRow(EncodingType.DECIMAL,
        binaryToInt(toAddress),
        binaryToInt(fromAddress),
        i18n.xOfYPackets({
          x: binaryToInt(packetIndex),
          y: binaryToInt(packetCount)
        }),
        alignDecimal(binaryToDecimal(message, chunkSize)));

    logRow(EncodingType.HEXADECIMAL,
        binaryToHex(toAddress),
        binaryToHex(fromAddress),
        i18n.xOfYPackets({
          x: binaryToHex(packetIndex),
          y: binaryToHex(packetCount)
        }),
        formatHex(binaryToHex(message), chunkSize));

    logRow(EncodingType.BINARY,
        formatBinary(toAddress, 4),
        formatBinary(fromAddress, 4),
        formatBinary(packetIndex, 4) + ' ' + formatBinary(packetCount, 4),
        formatBinary(message, chunkSize));
   ; buf.push('\n  </tbody>\n</table>'); })();
} 
return buf.join('');
};
  return function(locals) {
    return t(locals, require("ejs").filters);
  }
}());
},{"../../locale/current/netsim":245,"./Packet":175,"./dataConverters":177,"./netsimConstants":181,"./netsimUtils":183,"ejs":256}],139:[function(require,module,exports){
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

var utils = require('../utils');
var netsimNodeFactory = require('./netsimNodeFactory');
var NetSimLogger = require('./NetSimLogger');
var markup = require('./NetSimLobby.html');
var NodeType = require('./netsimConstants').NodeType;

var logger = new NetSimLogger(console, NetSimLogger.LogLevel.VERBOSE);

/**
 * Value of any option in the shard selector that does not
 * represent an actual shard - e.g. '-- PICK ONE --'
 * @type {string}
 * @const
 */
var SELECTOR_NONE_VALUE = 'none';

/**
 * Generator and controller for shard lobby/connection controls.
 *
 * @param {netsimLevelConfiguration} levelConfig
 * @param {NetSimConnection} connection - The shard connection that this
 *        lobby control will manipulate.
 * @param {DashboardUser} user - The current user, logged in or not.
 * @param {string} [shardID]
 * @constructor
 */
var NetSimLobby = module.exports = function (levelConfig, connection, user,
    shardID) {

  /**
   * @type {netsimLevelConfiguration}
   * @private
   */
  this.levelConfig_ = levelConfig;

  /**
   * Shard connection that this lobby control will manipulate.
   * @type {NetSimConnection}
   * @private
   */
  this.connection_ = connection;
  this.connection_.statusChanges.register(this.refresh_.bind(this));
  logger.info("NetSimLobby registered to connection statusChanges");
  this.connection_.shardChange.register(this.onShardChange_.bind(this));
  logger.info("NetSimLobby registered to connection shardChanges");

  /**
   * A reference to the currently connected shard.
   * @type {?NetSimShard}
   * @private
   */
  this.shard_ = null;

  /**
   * Current user, logged in or no.
   * @type {DashboardUser}
   * @private
   */
  this.user_ = user;

  /**
   * Query-driven shard ID to use.
   * @type {string}
   * @private
   */
  this.overrideShardID_ = shardID;

  /**
   * Which item in the lobby is currently selected
   * @type {number}
   * @private
   */
  this.selectedID_ = undefined;

  /**
   * Which listItem DOM element is currently selected
   * @type {*}
   * @private
   */
  this.selectedListItem_ = undefined;
};

/**
 * Generate a new NetSimLobby object, putting
 * its markup within the provided element and returning
 * the controller object.
 * @param {HTMLElement} element The container for the lobby markup
 * @param {netsimLevelConfiguration} levelConfig
 * @param {NetSimConnection} connection The connection manager to use
 * @param {DashboardUser} user The current user info
 * @param {string} [shardID] A particular shard ID to use, can be omitted which
 *        causes the system to look for user section shards, or generate a
 *        new one.
 * @return {NetSimLobby} A new controller for the generated lobby
 * @static
 */
NetSimLobby.createWithin = function (element, levelConfig, connection, user, shardID) {
  // Create a new NetSimLobby
  var controller = new NetSimLobby(levelConfig, connection, user, shardID);
  element.innerHTML = markup({
    level: levelConfig
  });
  controller.bindElements_();
  controller.refresh_();
  return controller;
};

/**
 * Grab the DOM elements related to this control -once-
 * and bind them to member variables.
 * Also attach method handlers.
 */
NetSimLobby.prototype.bindElements_ = function () {
  // Root
  this.openRoot_ = $('#netsim_lobby_open');

  // Open
  this.displayNameView_ = this.openRoot_.find('#display_name_view');
  this.shardView_ = this.openRoot_.find('#shard_view');

  // Open -> display_name_view
  this.nameInput_ = this.displayNameView_.find('#netsim_lobby_name');
  this.setNameButton_ = this.displayNameView_.find('#netsim_lobby_set_name_button');
  this.setNameButton_.click(this.setNameButtonClick_.bind(this));

  // Open -> shard_view
  this.shardSelector_ = this.shardView_.find('#netsim_shard_select');
  this.shardSelector_.change(this.onShardSelectorChange_.bind(this));
  this.notConnectedNote_ = this.shardView_.find('#netsim_not_connected_note');
  this.notConnectedNote_.hide();
  this.addRouterButton_ = this.shardView_.find('#netsim_lobby_add_router');
  this.addRouterButton_.click(this.addRouterButtonClick_.bind(this));
  this.lobbyList_ = this.shardView_.find('#netsim_lobby_list');
  this.connectButton_ = this.shardView_.find('#netsim_lobby_connect');
  this.connectButton_.click(this.connectButtonClick_.bind(this));

  // Collections
  this.shardLinks_ = $('.shardLink');

  // Initialization
  this.shardLinks_.hide();
  if (this.user_.isSignedIn) {
    this.nameInput_.val(this.user_.name);
    this.refreshShardList_();
  }
};

/**
 * Called whenever the connection notifies us that we've connected to,
 * or disconnected from, a shard.
 * @param {?NetSimShard} newShard - null if disconnected.
 * @private
 */
NetSimLobby.prototype.onShardChange_= function (newShard) {
  this.shard_ = newShard;
  if (this.shard_ !== null) {
    this.shard_.nodeTable.tableChange
        .register(this.onNodeTableChange_.bind(this));
    logger.info("NetSimLobby registered to nodeTable tableChange");
  }
};

/**
 * Called whenever a change is detected in the nodes table - which should
 * trigger a refresh of the lobby listing
 * @param {!Array} rows
 * @private
 */
NetSimLobby.prototype.onNodeTableChange_ = function (rows) {
  // Refresh lobby listing.
  var nodes = netsimNodeFactory.nodesFromRows(this.shard_, rows);
  this.refreshLobbyList_(nodes);
};

NetSimLobby.prototype.setNameButtonClick_ = function () {
  this.nameInput_.prop('disabled', true);
  this.setNameButton_.hide();
  this.shardSelector_.attr('disabled', false);
  this.refreshShardList_();
};

/** Handler for picking a new shard from the dropdown. */
NetSimLobby.prototype.onShardSelectorChange_ = function () {
  var newShardID = this.shardSelector_.val();

  // Might need to disconnect (async) first.
  if (this.connection_.isConnectedToShard()) {
    this.connection_.disconnectFromShard(
        this.selectShard_.bind(this, newShardID));
  } else {
    // We were already disconnected, we're fine.
    this.selectShard_(newShardID);
  }
};

/**
 * Change the shard selector's selected shard and connect to it.
 */
NetSimLobby.prototype.selectShard_ = function (shardID) {
  this.shardSelector_.val(shardID);
  this.nameInput_.disabled = false;
  if (shardID !== SELECTOR_NONE_VALUE) {
    this.nameInput_.disabled = true;
    this.connection_.connectToShard(shardID, this.nameInput_.val());
  }
};

/** Handler for clicking the "Add Router" button. */
NetSimLobby.prototype.addRouterButtonClick_ = function () {
  this.connection_.addRouterToLobby();
};

/** Handler for clicking the "Connect" button. */
NetSimLobby.prototype.connectButtonClick_ = function () {
  if (!this.selectedID_) {
    return;
  }

  this.connection_.connectToRouter(this.selectedID_);
};

/** Handler for clicking the "disconnect" button. */
NetSimLobby.prototype.disconnectButtonClick_ = function () {
  this.connection_.disconnectFromRouter();
};

/**
 * Make an async request against the dashboard API to
 * reload and populate the user sections list.
 */
NetSimLobby.prototype.refreshShardList_ = function () {
  var self = this;
  // TODO (bbuchanan) : Use unique level ID when generating shard ID
  var levelID = 'demo';
  var shardSelector = this.shardSelector_;

  if (this.overrideShardID_ !== undefined) {
    this.useShard(this.overrideShardID_);
    return;
  }

  if (!this.user_.isSignedIn) {
    this.useRandomShard();
    return;
  }

  this.getUserSections_(function (data) {
    if (0 === data.length) {
      this.useRandomShard();
      return;
    }

    $(shardSelector).empty();

    if (data.length > 1) {
      // If we have more than one section, require the user
      // to pick one.
      $('<option>')
          .val(SELECTOR_NONE_VALUE)
          .html('-- PICK ONE --')
          .appendTo(shardSelector);
    }

    // Add all shards to the dropdown
    data.forEach(function (section) {
      // TODO (bbuchanan) : Put teacher names in sections
      $('<option>')
          .val('netsim_' + levelID + '_' + section.id)
          .html(section.name)
          .appendTo(shardSelector);
    });

    self.onShardSelectorChange_();
  }.bind(this));
};

/** Generates a new random shard ID and immediately selects it. */
NetSimLobby.prototype.useRandomShard = function () {
  this.useShard('netsim_' + utils.createUuid());
};

/**
 * Forces the shard selector to contain only the given option,
 * and immediately selects that option.
 * @param {!string} shardID - unique shard identifier
 */
NetSimLobby.prototype.useShard = function (shardID) {
  this.shardSelector_.empty();

  $('<option>')
      .val(shardID)
      .html('My Private Network')
      .appendTo(this.shardSelector_);

  this.shardLinks_
      .attr('href', this.buildShareLink(shardID))
      .show();

  this.onShardSelectorChange_();
};

NetSimLobby.prototype.buildShareLink = function (shardID) {
  var baseLocation = document.location.protocol + '//' +
      document.location.host + document.location.pathname;
  return baseLocation + '?s=' + shardID;
};

/**
 * Show preconnect controls (name, shard-select) and actual lobby listing.
 * @private
 */
NetSimLobby.prototype.refresh_ = function () {
  if (this.connection_.isConnectedToRouter()) {
    return;
  }

  this.openRoot_.show();

  // Do we have a name yet?
  if (this.nameInput_.val() === '') {
    this.nameInput_.prop('disabled', false);
    this.setNameButton_.show();

    this.shardView_.hide();
    return;
  }

  // We have a name
  this.nameInput_.prop('disabled', true);
  this.setNameButton_.hide();
  this.shardView_.show();

  // Do we have a shard yet?
  if (!this.connection_.isConnectedToShard()) {
    this.shardSelector_.val(SELECTOR_NONE_VALUE);
    this.notConnectedNote_.show();
    this.addRouterButton_.hide();
    this.lobbyList_.hide();
    this.connectButton_.hide();
    return;
  }

  // We have a shard
  this.notConnectedNote_.hide();
  this.addRouterButton_.show();
  this.lobbyList_.show();
  this.connectButton_.show();
  this.connection_.getAllNodes(function (lobbyData) {
    this.refreshLobbyList_(lobbyData);
  }.bind(this));
};

/**
 * Reload the lobby listing of nodes.
 * @param {!Array.<NetSimClientNode>} lobbyData
 * @private
 */
NetSimLobby.prototype.refreshLobbyList_ = function (lobbyData) {
  this.lobbyList_.empty();

  // TODO: Filter based on level configuration
  var filteredLobbyData = lobbyData.filter(function (simNode) {
    var showClients = this.levelConfig_.showClientsInLobby;
    var showRouters = this.levelConfig_.showRoutersInLobby;
    var nodeType = simNode.getNodeType();
    return (nodeType === NodeType.CLIENT && showClients) ||
        (nodeType === NodeType.ROUTER && showRouters);
  }.bind(this));

  filteredLobbyData.sort(function (a, b) {
    // TODO (bbuchanan): Make this sort localization-friendly.
    if (a.getDisplayName() > b.getDisplayName()) {
      return 1;
    }
    return -1;
  });

  this.selectedListItem_ = undefined;
  filteredLobbyData.forEach(function (simNode) {
    var item = $('<li>').html(
        simNode.getDisplayName() + ' : ' +
        simNode.getStatus() + ' ' +
        simNode.getStatusDetail());

    // Style rows by row type.
    if (simNode.getNodeType() === NodeType.ROUTER) {
      item.addClass('router-row');
    } else {
      item.addClass('user-row');
      if (simNode.entityID === this.connection_.myNode.entityID) {
        item.addClass('own-row');
      }
    }

    // Preserve selected item across refresh.
    if (simNode.entityID === this.selectedID_) {
      item.addClass('selected-row');
      this.selectedListItem_ = item;
    }

    item.click(this.onRowClick_.bind(this, item, simNode));
    item.appendTo(this.lobbyList_);
  }.bind(this));

  this.onSelectionChange();
};

/**
 * @param {*} connectionTarget - Lobby row for clicked item
 * @private
 */
NetSimLobby.prototype.onRowClick_ = function (listItem, connectionTarget) {
  // Can't select user rows (for now)
  if (NodeType.CLIENT === connectionTarget.getNodeType()) {
    return;
  }

  var oldSelectedID = this.selectedID_;
  var oldSelectedListItem = this.selectedListItem_;

  // Deselect old row
  if (oldSelectedListItem) {
    oldSelectedListItem.removeClass('selected-row');
  }
  this.selectedID_ = undefined;
  this.selectedListItem_ = undefined;

  // If we clicked on a different row, select the new row
  if (connectionTarget.entityID !== oldSelectedID) {
    this.selectedID_ = connectionTarget.entityID;
    this.selectedListItem_ = listItem;
    this.selectedListItem_.addClass('selected-row');
  }

  this.onSelectionChange();
};

/** Handler for selecting/deselcting a row in the lobby listing. */
NetSimLobby.prototype.onSelectionChange = function () {
  this.connectButton_.attr('disabled', (this.selectedListItem_ === undefined));
};

/**
 * Send a request to dashboard and retrieve a JSON array listing the
 * sections this user belongs to.
 * @param callback
 * @private
 */
NetSimLobby.prototype.getUserSections_ = function (callback) {
  var memberSectionsRequest = $.ajax({
    dataType: 'json',
    url: '/v2/sections/membership'
  });

  var ownedSectionsRequest = $.ajax({
    dataType: 'json',
    url: '/v2/sections'
  });

  $.when(memberSectionsRequest, ownedSectionsRequest).done(function (result1, result2) {
    var memberSectionData = result1[0];
    var ownedSectionData = result2[0];
    callback(memberSectionData.concat(ownedSectionData));
  });
};

},{"../utils":235,"./NetSimLobby.html":138,"./NetSimLogger":145,"./netsimConstants":181,"./netsimNodeFactory":182}],182:[function(require,module,exports){
/* jshint
 funcscope: true,
 newcap: true,
 nonew: true,
 shadow: false,
 unused: true,

 maxlen: 90,
 maxparams: 3,
 maxstatements: 200
 */
'use strict';

var netsimConstants = require('./netsimConstants');
var NetSimClientNode = require('./NetSimClientNode');
var NetSimRouterNode = require('./NetSimRouterNode');

var NodeType = netsimConstants.NodeType;

var netsimNodeFactory = module.exports;

/**
 * Given a set of rows from the node table on a shard, gives back a set of node
 * controllers (of appropriate types).
 * @param {!NetSimShard} shard
 * @param {!Array.<Object>} nodeRows
 * @throws when a row doesn't have a mappable node type.
 * @return {Array.<NetSimNode>} nodes for the rows
 */
netsimNodeFactory.nodesFromRows = function (shard, nodeRows) {
  return nodeRows.map(function (row) {
    if (row.type === NodeType.CLIENT) {
      return new NetSimClientNode(shard, row);
    } else if (row.type == NodeType.ROUTER) {
      return new NetSimRouterNode(shard, row);
    }
    // Oops!  We probably shouldn't ever get here.
    throw new Error("Unable to map row to node.");
  });
};

},{"./NetSimClientNode":124,"./NetSimRouterNode":158,"./netsimConstants":181}],138:[function(require,module,exports){
module.exports= (function() {
  var t = function anonymous(locals, filters, escape) {
escape = escape || function (html){
  return String(html)
    .replace(/&(?!\w+;)/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
};
var buf = [];
with (locals || {}) { (function(){ 
 buf.push('<div id="netsim_lobby_open" class="netsim-panel netsim-lobby">\n  <h1>Lobby</h1>\n  <div class="panel-body">\n    <div id="display_name_view">\n      <label for="netsim_lobby_name">My Name:</label>\n      <input id="netsim_lobby_name" type="text" />\n      <input id="netsim_lobby_set_name_button" type="button" value="Set Name" />\n    </div>\n    <div id="shard_view">\n      <label for="netsim_shard_select">My Section:</label>\n      <select id="netsim_shard_select"></select>\n      <span id="netsim_not_connected_note">You are not connected. Select a class section from the list to connect.</span>\n      <a class="shardLink" href="#">Share this private network</a>\n      ');14; if (level.showAddRouterButton) { ; buf.push('\n        <input type="button" id="netsim_lobby_add_router" value="Add Router" />\n      ');16; } ; buf.push('\n      <ul id="netsim_lobby_list"></ul>\n      <input type="button" id="netsim_lobby_connect" value="Connect" />\n    </div>\n  </div>\n</div>\n'); })();
} 
return buf.join('');
};
  return function(locals) {
    return t(locals, require("ejs").filters);
  }
}());
},{"ejs":256}],135:[function(require,module,exports){
/* jshint
 funcscope: true,
 newcap: true,
 nonew: true,
 shadow: false,
 unused: true,

 maxlen: 90,
 maxparams: 3,
 maxstatements: 200
 */
/* global $ */
'use strict';

var markup = require('./NetSimEncodingControl.html');
var EncodingType = require('./netsimConstants').EncodingType;

/**
 * Generator and controller for message encoding selector: A dropdown that
 * controls whether messages are displayed in some combination of binary, hex,
 * decimal, ascii, etc.
 * @param {jQuery} rootDiv
 * @param {netsimLevelConfiguration} levelConfig
 * @param {function} changeEncodingCallback
 * @constructor
 */
var NetSimEncodingControl = module.exports = function (rootDiv, levelConfig,
    changeEncodingCallback) {
  /**
   * Component root, which we fill whenever we call render()
   * @type {jQuery}
   * @private
   */
  this.rootDiv_ = rootDiv;

  /**
   * @type {netsimLevelConfiguration}
   * @private
   */
  this.levelConfig_ = levelConfig;

  /**
   * @type {function}
   * @private
   */
  this.changeEncodingCallback_ = changeEncodingCallback;

  /**
   * @type {jQuery}
   * @private
   */
  this.checkboxes_ = null;

  // Initial render
  this.render();
};

/**
 * Fill the root div with new elements reflecting the current state
 */
NetSimEncodingControl.prototype.render = function () {
  var renderedMarkup = $(markup({
    level: this.levelConfig_
  }));
  this.rootDiv_.html(renderedMarkup);
  this.checkboxes_ = this.rootDiv_.find(
      'input[type="checkbox"][name="encoding_checkboxes"]');
  this.checkboxes_.change(this.onCheckboxesChange_.bind(this));
};

/**
 * Send new selected encodings to registered callback on change.
 * @private
 */
NetSimEncodingControl.prototype.onCheckboxesChange_ = function () {
  var selectedEncodings = [];
  this.checkboxes_.filter(':checked').each(function (i, element) {
    selectedEncodings.push(element.value);
  });
  this.changeEncodingCallback_(selectedEncodings);
};

/**
 * Change selector value to the new provided value.
 * @param {EncodingType[]} newEncodings
 */
NetSimEncodingControl.prototype.setEncodings = function (newEncodings) {
  this.checkboxes_.each(function (i, element) {
    $(element).attr('checked', (newEncodings.indexOf(element.value) > -1));
  });
};

/**
 * Generate a jQuery selector string that will get all rows that
 * have ANY of the provided classes.
 * @param {EncodingType[]} encodings
 * @returns {string}
 */
var makeEncodingRowSelector = function (encodings) {
  return encodings.map(function (className) {
    return 'tr.' + className;
  }).join(', ');
};

/**
 * Static helper, shows/hides rows under provided element according to the given
 * encoding setting.
 * @param {jQuery} rootElement - root of elements to show/hide
 * @param {EncodingType[]} encodings - a message encoding setting
 */
NetSimEncodingControl.hideRowsByEncoding = function (rootElement, encodings) {
  var hiddenEncodings = [];
  for (var key in EncodingType) {
    if (EncodingType.hasOwnProperty(key) &&
        encodings.indexOf(EncodingType[key]) === -1) {
      hiddenEncodings.push(EncodingType[key]);
    }
  }
  rootElement.find(makeEncodingRowSelector(encodings)).show();
  rootElement.find(makeEncodingRowSelector(hiddenEncodings)).hide();
};

},{"./NetSimEncodingControl.html":134,"./netsimConstants":181}],134:[function(require,module,exports){
module.exports= (function() {
  var t = function anonymous(locals, filters, escape) {
escape = escape || function (html){
  return String(html)
    .replace(/&(?!\w+;)/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
};
var buf = [];
with (locals || {}) { (function(){ 
 buf.push('');1;
  var EncodingType = require('./netsimConstants').EncodingType;
  var i18n = require('../../locale/current/netsim');

  /**
   * @param {EncodingType} encodingType
   * @param {string} encodingLabel
   */
  function makeCheckbox(encodingType, encodingLabel) {
    var divClasses = ['encoding_checkboxes_' + encodingType];
    if (level.showEncodingControls.indexOf(encodingType) === -1) {
      divClasses.push('hidden-control');
    }
    ; buf.push('\n    <div class="', escape((15,  divClasses.join(' ') )), '">\n      <input type="checkbox"\n             name="encoding_checkboxes"\n             id="encoding_checkboxes_', escape((18,  encodingType )), '"\n             value="', escape((19,  encodingType )), '"\n          />\n      <label for="encoding_checkboxes_', escape((21,  encodingType )), '">', escape((21,  encodingLabel )), '</label>\n    </div>\n    ');23;
  }
; buf.push('\n<div class="netsim-encoding-selector">\n  <h1>', escape((27,  i18n.encoding() )), '</h1>\n  ');28; makeCheckbox(EncodingType.ASCII, i18n.ascii()); ; buf.push('\n  ');29; makeCheckbox(EncodingType.DECIMAL, i18n.decimal()); ; buf.push('\n  ');30; makeCheckbox(EncodingType.HEXADECIMAL, i18n.hexadecimal()); ; buf.push('\n  ');31; makeCheckbox(EncodingType.BINARY, i18n.binary()); ; buf.push('\n  ');32; makeCheckbox(EncodingType.A_AND_B, i18n.a_and_b()); ; buf.push('\n</div>'); })();
} 
return buf.join('');
};
  return function(locals) {
    return t(locals, require("ejs").filters);
  }
}());
},{"../../locale/current/netsim":245,"./netsimConstants":181,"ejs":256}],131:[function(require,module,exports){
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
 * @param {netsimLevelConfiguration} levelConfig
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
   * @type {netsimLevelConfiguration}
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
  this.rootDiv_.find('.dns_manual_control').toggle(newDnsMode === DnsMode.MANUAL);
  this.rootDiv_.find('.dns-notes').toggle(newDnsMode !== DnsMode.NONE);
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

},{"./NetSimDnsManualControl":127,"./NetSimDnsModeControl":129,"./NetSimDnsTab.html":130,"./NetSimDnsTable":133,"./netsimConstants":181}],133:[function(require,module,exports){
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

var markup = require('./NetSimDnsTable.html');
var DnsMode = require('./netsimConstants').DnsMode;

/**
 * Generator and controller for DNS network lookup table component.
 * Shows different amounts of information depending on the DNS mode.
 *
 * @param {jQuery} rootDiv
 * @constructor
 */
var NetSimDnsTable = module.exports = function (rootDiv) {
  /**
   * Component root, which we fill whenever we call render()
   * @type {jQuery}
   * @private
   */
  this.rootDiv_ = rootDiv;

  /**
   * @type {DnsMode}
   * @private
   */
  this.dnsMode_ = DnsMode.NONE;

  /**
   * @type {Array}
   * @private
   */
  this.addressTableData_ = [];

  this.render();
};

/**
 * Fill the root div with new elements reflecting the current state
 */
NetSimDnsTable.prototype.render = function () {
  var renderedMarkup = $(markup({
    dnsMode: this.dnsMode_,
    tableData: this.addressTableData_
  }));
  this.rootDiv_.html(renderedMarkup);
};

/**
 * @param {DnsMode} newDnsMode
 */
NetSimDnsTable.prototype.setDnsMode = function (newDnsMode) {
  this.dnsMode_ = newDnsMode;
  this.render();
};

/**
 * @param {Array} tableContents
 */
NetSimDnsTable.prototype.setDnsTableContents = function (tableContents) {
  this.addressTableData_ = tableContents;
  this.render();
};

},{"./NetSimDnsTable.html":132,"./netsimConstants":181}],132:[function(require,module,exports){
module.exports= (function() {
  var t = function anonymous(locals, filters, escape) {
escape = escape || function (html){
  return String(html)
    .replace(/&(?!\w+;)/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
};
var buf = [];
with (locals || {}) { (function(){ 
 buf.push('');1;
var DnsMode = require('./netsimConstants').DnsMode;
; buf.push('\n<div class="netsim-dns-table">\n  <h1>My Network</h1>\n  <table>\n    <thead>\n    <tr>\n      <th>Hostname</th>\n      <th>Address</th>\n    </tr>\n    </thead>\n    <tbody>\n    ');14;
    tableData.forEach(function (row) {
      var displayHostname = row.hostname;
      var displayAddress = '';
      var rowClasses = [];

      if (dnsMode === DnsMode.NONE || row.isDnsNode || row.isLocal) {
        displayAddress = row.address;
      }

      if (row.isLocal) {
        displayHostname += " (Me)";
        rowClasses.push('local-node');
      }

      if (row.isDnsNode && dnsMode !== DnsMode.NONE) {
        displayHostname += " (DNS)";
        rowClasses.push('dns-node');
      }
      ; buf.push('\n        <tr class="', escape((34,  rowClasses.join(' ') )), '">\n          <td>', escape((35,  displayHostname )), '</td>\n          <td>', escape((36,  displayAddress )), '</td>\n        </tr>\n      ');38;
    });
    ; buf.push('\n    </tbody>\n  </table>\n</div>'); })();
} 
return buf.join('');
};
  return function(locals) {
    return t(locals, require("ejs").filters);
  }
}());
},{"./netsimConstants":181,"ejs":256}],130:[function(require,module,exports){
module.exports= (function() {
  var t = function anonymous(locals, filters, escape) {
escape = escape || function (html){
  return String(html)
    .replace(/&(?!\w+;)/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
};
var buf = [];
with (locals || {}) { (function(){ 
 buf.push('<div class="netsim-dns-tab">\n  ');2; if (level.showDnsModeControl) { ; buf.push('\n  <div class="dns_mode"></div>\n  ');4; } ; buf.push('\n  <div class="dns_manual_control"></div>\n  <div class="dns_table"></div>\n  <div class="dns-notes">\n    <h1>Notes</h1>\n    <div>\n      <textarea></textarea>\n    </div>\n  </div>\n</div>\n'); })();
} 
return buf.join('');
};
  return function(locals) {
    return t(locals, require("ejs").filters);
  }
}());
},{"ejs":256}],129:[function(require,module,exports){
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

var markup = require('./NetSimDnsModeControl.html');
var DnsMode = require('./netsimConstants').DnsMode;

/**
 * Generator and controller for DNS mode selector
 * @param {jQuery} rootDiv
 * @param {function} dnsModeChangeCallback
 * @constructor
 */
var NetSimDnsModeControl = module.exports = function (rootDiv,
    dnsModeChangeCallback) {
  /**
   * Component root, which we fill whenever we call render()
   * @type {jQuery}
   * @private
   */
  this.rootDiv_ = rootDiv;

  /**
   * @type {function}
   * @private
   */
  this.dnsModeChangeCallback_ = dnsModeChangeCallback;

  /**
   * Set of all DNS mode radio buttons
   * @type {jQuery}
   * @private
   */
  this.dnsModeRadios_ = null;

  /**
   * Internal state: Current DNS mode.
   * @type {DnsMode}
   * @private
   */
  this.currentDnsMode_ = DnsMode.NONE;

  this.render();
};

/**
 * Fill the root div with new elements reflecting the current state
 */
NetSimDnsModeControl.prototype.render = function () {
  var renderedMarkup = $(markup({}));
  this.rootDiv_.html(renderedMarkup);

  this.dnsModeRadios_ = this.rootDiv_.find('input[type="radio"][name="dns_mode"]');
  this.dnsModeRadios_.change(this.onDnsModeChange_.bind(this));
  this.setDnsMode(this.currentDnsMode_);
};

/**
 * Handler for a new radio button being selected.
 * @private
 */
NetSimDnsModeControl.prototype.onDnsModeChange_ = function () {
  var newDnsMode = this.dnsModeRadios_.filter(':checked').val();
  this.dnsModeChangeCallback_(newDnsMode);
};

/**
 * @param {DnsMode} newDnsMode
 */
NetSimDnsModeControl.prototype.setDnsMode = function (newDnsMode) {
  this.currentDnsMode_ = newDnsMode;
  this.dnsModeRadios_
      .filter('[value="' + newDnsMode + '"]')
      .prop('checked', true);
};

},{"./NetSimDnsModeControl.html":128,"./netsimConstants":181}],128:[function(require,module,exports){
module.exports= (function() {
  var t = function anonymous(locals, filters, escape) {
escape = escape || function (html){
  return String(html)
    .replace(/&(?!\w+;)/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
};
var buf = [];
with (locals || {}) { (function(){ 
 buf.push('');1;
  var DnsMode = require('./netsimConstants').DnsMode;
  var i18n = require('../../locale/current/netsim');

  /**
   * @param {exports.DnsMode} mode
   * @param {string} label
   */
  function makeRadio(mode, label) {
    ; buf.push('\n    <div class="dns_mode_', escape((11,  mode )), '">\n      <input id="dns_mode_', escape((12,  mode )), '"\n                   type="radio"\n                   name="dns_mode"\n                   value="', escape((15,  mode )), '" />\n      <label for="dns_mode_', escape((16,  mode )), '">', escape((16,  label )), '</label>\n    </div>\n    ');18;
  }
; buf.push('\n<div class="dns-mode-control">\n  <h1>', escape((22,  i18n.dnsMode() )), '</h1>\n  ');23; makeRadio(DnsMode.NONE, i18n.dnsMode_NONE()); ; buf.push('\n  ');24; makeRadio(DnsMode.MANUAL, i18n.dnsMode_MANUAL()); ; buf.push('\n  ');25; makeRadio(DnsMode.AUTOMATIC, i18n.dnsMode_AUTOMATIC()); ; buf.push('\n</div>\n'); })();
} 
return buf.join('');
};
  return function(locals) {
    return t(locals, require("ejs").filters);
  }
}());
},{"../../locale/current/netsim":245,"./netsimConstants":181,"ejs":256}],127:[function(require,module,exports){
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

var markup = require('./NetSimDnsManualControl.html');

/**
 * Generator and controller for DNS mode selector
 * @param {jQuery} rootDiv
 * @param {function} becomeDnsCallback
 * @constructor
 */
var NetSimDnsManualControl = module.exports = function (rootDiv,
    becomeDnsCallback) {
  /**
   * Component root, which we fill whenever we call render()
   * @type {jQuery}
   * @private
   */
  this.rootDiv_ = rootDiv;

  /**
   * @type {function}
   * @private
   */
  this.becomeDnsCallback_ = becomeDnsCallback;

  this.render();
};

/**
 * Fill the root div with new elements reflecting the current state
 */
NetSimDnsManualControl.prototype.render = function () {
  var renderedMarkup = $(markup({}));
  this.rootDiv_.html(renderedMarkup);
  this.rootDiv_.find('input[type="button"]').click(
      this.onBecomeDnsButtonClick_.bind(this));
};

/**
 * Handler for button click.
 * @private
 */
NetSimDnsManualControl.prototype.onBecomeDnsButtonClick_ = function () {
  this.becomeDnsCallback_();
};

/**
 * @param {boolean} isDnsNode
 */
NetSimDnsManualControl.prototype.setIsDnsNode = function (isDnsNode) {
  this.rootDiv_.find('input[type="button"]').attr('disabled', isDnsNode);
};

},{"./NetSimDnsManualControl.html":126}],126:[function(require,module,exports){
module.exports= (function() {
  var t = function anonymous(locals, filters, escape) {
escape = escape || function (html){
  return String(html)
    .replace(/&(?!\w+;)/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
};
var buf = [];
with (locals || {}) { (function(){ 
 buf.push('<div class="netsim_dns_manual_control">\n  <h1>Manual Control</h1>\n  <input id="become_dns_button" type="button" value="Take over as DNS" />\n</div>'); })();
} 
return buf.join('');
};
  return function(locals) {
    return t(locals, require("ejs").filters);
  }
}());
},{"ejs":256}],125:[function(require,module,exports){
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

var NodeType = require('./netsimConstants').NodeType;
var NetSimLogger = require('./NetSimLogger');
var NetSimClientNode = require('./NetSimClientNode');
var NetSimRouterNode = require('./NetSimRouterNode');
var NetSimLocalClientNode = require('./NetSimLocalClientNode');
var ObservableEvent = require('../ObservableEvent');
var NetSimShard = require('./NetSimShard');
var NetSimShardCleaner = require('./NetSimShardCleaner');

var logger = NetSimLogger.getSingleton();

/**
 * A connection to a NetSim shard
 * @param {Object} options
 * @param {!Window} options.window - reference to browser window, passed
 *        in instead of accessed globally to be test-friendly.
 * @param {!netsimLevelConfiguration} options.levelConfig
 * @param {!NetSimLogPanel} options.sentLog - Widget to post sent messages to
 * @param {!NetSimLogPanel} options.receivedLog - Widget to post received
 *        messages to
 * @param {boolean} [options.enableCleanup] default TRUE
 * @constructor
 */
var NetSimConnection = module.exports = function (options) {
  /**
   * Display name for user on local end of connection, to be uploaded to others.
   * @type {string}
   * @private
   */
  this.displayName_ = '';

  /**
   * @type {netsimLevelConfiguration}
   * @private
   */
  this.levelConfig_ = options.levelConfig || {};

  /**
   * @type {NetSimLogPanel}
   * @private
   */
  this.sentLog_ = options.sentLog;

  /**
   * @type {NetSimLogPanel}
   * @private
   */
  this.receivedLog_ = options.receivedLog;

  /**
   * Accessor object for select simulation shard's tables, where an shard
   * is a group of tables shared by a group of users, allowing them to observe
   * a common network state.
   *
   * See en.wikipedia.org/wiki/Instance_dungeon for a popular example of this
   * concept.
   *
   * @type {NetSimShard}
   * @private
   */
  this.shard_ = null;

  /**
   * Whether to instantiate a shard cleaner
   * @type {boolean}
   * @private
   */
  this.enableCleanup_ = options.enableCleanup !== undefined ?
      options.enableCleanup : true;

  /**
   *
   * @type {NetSimShardCleaner}
   * @private
   */
  this.shardCleaner_ = null;

  /**
   * The local client's node representation within the shard.
   * @type {NetSimClientNode}
   */
  this.myNode = null;

  /**
   * Event: Connected to, or disconnected from, a shard.
   * Specifically, added or removed our client node from the shard's node table.
   * @type {ObservableEvent}
   */
  this.shardChange = new ObservableEvent();

  /**
   * Allows others to subscribe to connection status changes.
   * args: none
   * Notifies on:
   * - Connect to shard
   * - Disconnect from shard
   * - Connect to router
   * - Got address from router
   * - Disconnect from router
   * @type {ObservableEvent}
   */
  this.statusChanges = new ObservableEvent();

  // Bind to onBeforeUnload event to attempt graceful disconnect
  options.window.addEventListener('beforeunload', this.onBeforeUnload_.bind(this));
};

/**
 * Attach own handlers to run loop events.
 * @param {RunLoop} runLoop
 */
NetSimConnection.prototype.attachToRunLoop = function (runLoop) {
  runLoop.tick.register(this.tick.bind(this));
};

/** @param {!RunLoop.Clock} clock */
NetSimConnection.prototype.tick = function (clock) {
  if (this.myNode) {
    this.myNode.tick(clock);
    this.shard_.tick(clock);
    this.shardCleaner_.tick(clock);
  }
};

/** @returns {NetSimLogger} */
NetSimConnection.prototype.getLogger = function () {
  return logger;
};

/**
 * Before-unload handler, used to try and disconnect gracefully when
 * navigating away instead of just letting our record time out.
 * @private
 */
NetSimConnection.prototype.onBeforeUnload_ = function () {
  if (this.isConnectedToShard()) {
    this.disconnectFromShard();
  }
};

/**
 * Establishes a new connection to a netsim shard, closing the old one
 * if present.
 * @param {!string} shardID
 * @param {!string} displayName
 */
NetSimConnection.prototype.connectToShard = function (shardID, displayName) {
  if (this.isConnectedToShard()) {
    logger.warn("Auto-closing previous connection...");
    this.disconnectFromShard(this.connectToShard.bind(this, shardID, displayName));
    return;
  }

  this.shard_ = new NetSimShard(shardID);
  if (this.enableCleanup_) {
    this.shardCleaner_ = new NetSimShardCleaner(this.shard_);
  }
  this.createMyClientNode_(displayName);
};

/**
 * Ends the connection to the netsim shard.
 * @param {NodeStyleCallback} [onComplete]
 */
NetSimConnection.prototype.disconnectFromShard = function (onComplete) {
  onComplete = onComplete || function () {};

  if (!this.isConnectedToShard()) {
    logger.warn("Redundant disconnect call.");
    onComplete(null, null);
    return;
  }

  if (this.isConnectedToRouter()) {
    this.disconnectFromRouter();
  }

  this.myNode.stopSimulation();
  this.myNode.destroy(function (err, result) {
    if (err) {
      onComplete(err, result);
      return;
    }

    this.myNode = null;
    this.shardChange.notifyObservers(null, null);
    this.statusChanges.notifyObservers();
    onComplete(err, result);
  }.bind(this));
};

/**
 * Given a lobby table has already been configured, connects to that table
 * by inserting a row for ourselves into that table and saving the row ID.
 * @param {!string} displayName
 * @private
 */
NetSimConnection.prototype.createMyClientNode_ = function (displayName) {
  NetSimLocalClientNode.create(this.shard_, function (err, node) {
    if (err !== null) {
      logger.error("Failed to create client node; " + err.message);
      return;
    }

    this.myNode = node;
    this.myNode.setDisplayName(displayName);
    this.myNode.setLostConnectionCallback(this.disconnectFromShard.bind(this));
    this.myNode.initializeSimulation(this.levelConfig_, this.sentLog_, this.receivedLog_);
    this.myNode.update(function (/*err, result*/) {
      this.shardChange.notifyObservers(this.shard_, this.myNode);
      this.statusChanges.notifyObservers();
    }.bind(this));
  }.bind(this));
};

/**
 * Whether we are currently connected to a netsim shard
 * @returns {boolean}
 */
NetSimConnection.prototype.isConnectedToShard = function () {
  return (null !== this.myNode);
};

/**
 * Gets all rows in the lobby and passes them to callback.  Callback will
 * get an empty array if we were unable to get lobby data.
 * TODO: Remove this, get rows from the table and use the netsimUtils methods
 * instead.
 * @param callback
 */
NetSimConnection.prototype.getAllNodes = function (callback) {
  if (!this.isConnectedToShard()) {
    logger.warn("Can't get lobby rows, not connected to shard.");
    callback([]);
    return;
  }

  var self = this;
  this.shard_.nodeTable.readAll(function (err, rows) {
    if (err !== null) {
      logger.warn("Lobby data request failed, using empty list.");
      callback([]);
      return;
    }

    var nodes = rows.map(function (row) {
      if (row.type === NodeType.CLIENT) {
        return new NetSimClientNode(self.shard_, row);
      } else if (row.type === NodeType.ROUTER) {
        return new NetSimRouterNode(self.shard_, row);
      }
    }).filter(function (node) {
      return node !== undefined;
    });

    callback(nodes);
  });
};

/** Adds a row to the lobby for a new router node. */
NetSimConnection.prototype.addRouterToLobby = function () {
  NetSimRouterNode.create(this.shard_, function (err, router) {
    router.bandwidth = this.levelConfig_.defaultRouterBandwidth;
    router.dnsMode = this.levelConfig_.defaultDnsMode;
    router.update(function () {
      this.statusChanges.notifyObservers();
    }.bind(this));
  }.bind(this));
};

/**
 * Whether our client node is connected to a router node.
 * @returns {boolean}
 */
NetSimConnection.prototype.isConnectedToRouter = function () {
  return this.myNode && this.myNode.myRouter;
};

/**
 * Establish a connection between the local client and the given
 * simulated router.
 * @param {number} routerID
 */
NetSimConnection.prototype.connectToRouter = function (routerID) {
  if (this.isConnectedToRouter()) {
    logger.warn("Auto-disconnecting from previous router.");
    this.disconnectFromRouter();
  }

  var self = this;
  NetSimRouterNode.get(routerID, this.shard_, function (err, router) {
    if (err !== null) {
      logger.warn('Failed to find router with ID ' + routerID + '; ' + err.message);
      return;
    }

    self.myNode.connectToRouter(router, function (err) {
      if (err) {
        logger.warn('Failed to connect to ' + router.getDisplayName() + '; ' +
            err.message);
      }
      self.statusChanges.notifyObservers();
    });
  });
};

/**
 * Disconnects our client node from the currently connected router node.
 * Destroys the shared wire.
 */
NetSimConnection.prototype.disconnectFromRouter = function () {
  if (!this.isConnectedToRouter()) {
    logger.warn("Cannot disconnect: Not connected.");
    return;
  }

  var self = this;
  this.myNode.disconnectRemote(function () {
    self.statusChanges.notifyObservers();
  });
};
},{"../ObservableEvent":1,"./NetSimClientNode":124,"./NetSimLocalClientNode":140,"./NetSimLogger":145,"./NetSimRouterNode":158,"./NetSimShard":163,"./NetSimShardCleaner":164,"./netsimConstants":181}],164:[function(require,module,exports){
/* jshint
 funcscope: true,
 newcap: true,
 nonew: true,
 shadow: false,
 unused: true,

 maxlen: 90,
 maxparams: 3,
 maxstatements: 200
 */
'use strict';

var utils = require('../utils');
var commands = require('../commands');
var Command = commands.Command;
var CommandSequence = commands.CommandSequence;
var NetSimEntity = require('./NetSimEntity');
var NetSimHeartbeat = require('./NetSimHeartbeat');
var NetSimNode = require('./NetSimNode');
var NetSimWire = require('./NetSimWire');
var NetSimMessage = require('./NetSimMessage');
var NetSimLogEntry = require('./NetSimLogEntry');
var NetSimLogger = require('./NetSimLogger');

var logger = NetSimLogger.getSingleton();

/**
 * Minimum delay between attempts to start a cleaning job.
 * @type {number}
 * @const
 */
var CLEANING_RETRY_INTERVAL_MS = 120000; // 2 minutes

/**
 * Minimum delay before the next cleaning job is started after
 * a cleaning job has finished successfully.
 * @type {number}
 * @const
 */
var CLEANING_SUCCESS_INTERVAL_MS = 600000; // 10 minutes

/**
 * How old a heartbeat can be without being cleaned up.
 * @type {number}
 * @const
 */
var HEARTBEAT_TIMEOUT_MS = 60000; // 1 minute

/**
 * Special heartbeat type that acts as a cleaning lock across the shard
 * for the NetSimShardCleaner module.
 *
 * @param {!NetSimShard} shard
 * @param {*} row
 * @constructor
 * @augments NetSimHeartbeat
 */
var CleaningHeartbeat = function (shard, row) {
  row = row !== undefined ? row : {};
  NetSimHeartbeat.call(this, shard, row);

  /**
   * @type {number}
   * @private
   * @override
   */
  this.nodeID_ = 0;
};
CleaningHeartbeat.inherits(NetSimHeartbeat);

/**
 * Static creation method for a CleaningHeartbeat.
 * @param {!NetSimShard} shard
 * @param {!NodeStyleCallback} onComplete - Callback that is passed the new
 *        CleaningHeartbeat object.
 */
CleaningHeartbeat.create = function (shard, onComplete) {
  NetSimEntity.create(CleaningHeartbeat, shard, onComplete);
};

/**
 * Static getter for all non-expired cleaning locks on the shard.
 * @param {!NetSimShard} shard
 * @param {!NodeStyleCallback} onComplete - callback that receives an array of the non-
 *        expired cleaning locks.
 */
CleaningHeartbeat.getAllCurrent = function (shard, onComplete) {
  shard.heartbeatTable.readAll(function (err, rows) {
    if (err) {
      onComplete(err, null);
      return;
    }

    var heartbeats = rows
        .filter(function (row) {
          return row.cleaner === true &&
              Date.now() - row.time < HEARTBEAT_TIMEOUT_MS;
        })
        .map(function (row) {
          return new CleaningHeartbeat(shard, row);
        });
    onComplete(null, heartbeats);
  });
};

/**
 * CleaningHeartbeat row has an extra field to indicate its special type.
 * @returns {*}
 * @private
 * @override
 */
CleaningHeartbeat.prototype.buildRow_ = function () {
  return utils.extend(
      CleaningHeartbeat.superPrototype.buildRow_.call(this),
      { cleaner: true }
  );
};

/**
 * Special subsystem that performs periodic cleanup on the shard tables.
 *
 * Every once in a while, a client will invoke the cleaning routine, which
 * begins by attempting to get a cleaning lock on the shard.  If lock is
 * obtained we can be sure that no other client is trying to clean the shard
 * right now, and we proceed to clean the tables of expired rows.
 *
 * @param {!NetSimShard} shard
 * @constructor
 */
var NetSimShardCleaner = module.exports = function (shard) {

  /**
   * Shard we intend to keep clean.
   * @type {NetSimShard}
   * @private
   */
  this.shard_ = shard;

  /**
   * Local timestamp (milliseconds) of when we next intend to
   * kick off a cleaning routine.
   * @type {number}
   * @private
   */
  this.nextAttemptTime_ = Date.now();

  /**
   * A special heartbeat that acts as our cleaning lock on the shard
   * and prevents other clients from cleaning at the same time.
   * @type {CleaningHeartbeat}
   * @private
   */
  this.heartbeat_ = null;
};

/**
 * Check whether enough time has passed since our last cleaning
 * attempt, and if so try to start a cleaning routine.
 * @param {RunLoop.Clock} clock
 */
NetSimShardCleaner.prototype.tick = function (clock) {
  if (Date.now() >= this.nextAttemptTime_) {
    this.nextAttemptTime_ = Date.now() + CLEANING_RETRY_INTERVAL_MS;
    this.cleanShard();
  }

  if (this.heartbeat_) {
    this.heartbeat_.tick(clock);
  }

  if (this.steps_){
    this.steps_.tick(clock);
    if (this.steps_.isFinished()){
      this.steps_ = undefined;
    }
  }
};

/**
 * Attempt to begin a cleaning routine.
 */
NetSimShardCleaner.prototype.cleanShard = function () {
  this.getCleaningLock(function (err) {
    if (err) {
      logger.warn(err.message);
      return;
    }

    this.steps_ = new CommandSequence([
      new CacheTable(this, 'heartbeat', this.shard_.heartbeatTable),
      new CleanHeartbeats(this),

      new CacheTable(this, 'heartbeat', this.shard_.heartbeatTable),
      new CacheTable(this, 'node', this.shard_.nodeTable),
      new CleanNodes(this),

      new CacheTable(this, 'node', this.shard_.nodeTable),
      new CacheTable(this, 'wire', this.shard_.wireTable),
      new CleanWires(this),

      new CacheTable(this, 'message', this.shard_.messageTable),
      new CleanMessages(this),

      new CacheTable(this, 'log', this.shard_.logTable),
      new CleanLogs(this),

      new ReleaseCleaningLock(this)
    ]);
    this.steps_.begin();
  }.bind(this));
};

/**
 * Whether this cleaner currently has the only permission to clean
 * shard tables.
 * @returns {boolean}
 */
NetSimShardCleaner.prototype.hasCleaningLock = function () {
  return this.heartbeat_ !== null;
};

/**
 * Attempt to acquire a cleaning lock by creating a CleaningHeartbeat
 * of our own, that does not collide with any existing CleaningHeartbeats.
 * @param {!NodeStyleCallback} onComplete - called when operation completes.
 */
NetSimShardCleaner.prototype.getCleaningLock = function (onComplete) {
  CleaningHeartbeat.create(this.shard_, function (err, heartbeat) {
    if (err) {
      onComplete(err, null);
      return;
    }

    // We made a heartbeat - now check to make sure there wasn't already
    // another one.
    CleaningHeartbeat.getAllCurrent(this.shard_, function (err, heartbeats) {
      if (err || heartbeats.length > 1) {
        // Someone else is already cleaning, back out and try again later.
        heartbeat.destroy(function () {
          onComplete(new Error('Failed to acquire cleaning lock'), null);
        });
        return;
      }

      // Success, we have cleaning lock.
      this.heartbeat_ = heartbeat;
      logger.info("Cleaning lock acquired");
      onComplete(null, null);
    }.bind(this));
  }.bind(this));
};

/**
 * Remove and destroy this cleaner's CleaningHeartbeat, giving another
 * client the chance to acquire a lock.
 * @param {!NodeStyleCallback} onComplete - called when operation completes, with
 *        boolean "success" argument.
 */
NetSimShardCleaner.prototype.releaseCleaningLock = function (onComplete) {
  this.heartbeat_.destroy(function (err) {
    this.heartbeat_ = null;
    this.nextAttemptTime_ = Date.now() + CLEANING_SUCCESS_INTERVAL_MS;
    logger.info("Cleaning lock released");
    onComplete(err, null);
  }.bind(this));
};

/**
 * Sets key-value pair on cleaner's table cache.
 * @param {!string} key - usually table's name.
 * @param {!Array} rows - usually table data.
 */
NetSimShardCleaner.prototype.cacheTable = function (key, rows) {
  if (this.tableCache === undefined) {
    this.tableCache = {};
  }
  this.tableCache[key] = rows;
};

/**
 * Look up value for key in cleaner's table cache.
 * @param {!string} key - usually table's name.
 * @returns {Array} table's cached data.
 */
NetSimShardCleaner.prototype.getTableCache = function (key) {
  return this.tableCache[key];
};

/**
 * Get shard that cleaner is operating on.
 * @returns {NetSimShard}
 */
NetSimShardCleaner.prototype.getShard = function () {
  return this.shard_;
};

/**
 * Command that asynchronously fetches all rows for the given table
 * and stores them in the cleaner's tableCache for the given key.
 *
 * @param {!NetSimShardCleaner} cleaner
 * @param {!string} key
 * @param {!NetSimTable} table
 * @constructor
 * @augments Command
 */
var CacheTable = function (cleaner, key, table) {
  Command.call(this);

  /**
   * @type {NetSimShardCleaner}
   * @private
   */
  this.cleaner_ = cleaner;

  /**
   * @type {string}
   * @private
   */
  this.key_ = key;

  /**
   * @type {!NetSimTable}
   * @private
   */
  this.table_ = table;
};
CacheTable.inherits(Command);

/**
 * Trigger asynchronous readAll request on table.
 * @private
 */
CacheTable.prototype.onBegin_ = function () {
  this.table_.readAll(function (err, rows) {
    this.cleaner_.cacheTable(this.key_, rows);
    this.succeed();
  }.bind(this));
};

/**
 * Command that calls destroy() on the provided entity.
 *
 * @param {!NetSimEntity} entity
 * @constructor
 * @augments Command
 */
var DestroyEntity = function (entity) {
  Command.call(this);

  /**
   * @type {!NetSimEntity}
   * @private
   */
  this.entity_ = entity;
};
DestroyEntity.inherits(Command);

/**
 * Call destory() on stored entity.
 * @private
 */
DestroyEntity.prototype.onBegin_ = function () {
  this.entity_.destroy(function (err) {
    if (err) {
      this.fail();
      return;
    }
    logger.info("Deleted entity");
    this.succeed();
  }.bind(this));
};

/**
 * Command that tells cleaner to release its cleaning lock.
 *
 * @param {!NetSimShardCleaner} cleaner
 * @constructor
 * @augments Command
 */
var ReleaseCleaningLock = function (cleaner) {
  Command.call(this);

  /**
   * @type {!NetSimShardCleaner}
   * @private
   */
  this.cleaner_ = cleaner;
};
ReleaseCleaningLock.inherits(Command);

/**
 * Tell cleaner to release its cleaning lock.
 * @private
 */
ReleaseCleaningLock.prototype.onBegin_ = function () {
  this.cleaner_.releaseCleaningLock(function (success) {
    if (success) {
      this.succeed();
    } else {
      this.fail();
    }
  }.bind(this));
};

/**
 * Command that scans cleaner's heartbeat table cache for expired heartbeats,
 * and deletes them one at a time.
 *
 * @param {!NetSimShardCleaner} cleaner
 * @constructor
 * @augments CommandSequence
 */
var CleanHeartbeats = function (cleaner) {
  CommandSequence.call(this);

  /**
   * @type {!NetSimShardCleaner}
   * @private
   */
  this.cleaner_ = cleaner;
};
CleanHeartbeats.inherits(CommandSequence);

/**
 * @private
 * @override
 */
CleanHeartbeats.prototype.onBegin_ = function () {
  var heartbeatRows = this.cleaner_.getTableCache('heartbeat');
  this.commandList_ = heartbeatRows.filter(function (row) {
    return Date.now() - row.time > HEARTBEAT_TIMEOUT_MS;
  }).map(function (row) {
    return new DestroyEntity(new NetSimHeartbeat(this.cleaner_.getShard(), row));
  }.bind(this));
  CommandSequence.prototype.onBegin_.call(this);
};

/**
 * Command that scans cleaner's node table cache, and then deletes all
 * nodes that don't have matching heartbeats in the heartbeat table cache.
 *
 * @param {!NetSimShardCleaner} cleaner
 * @constructor
 * @augments CommandSequence
 */
var CleanNodes = function (cleaner) {
  CommandSequence.call(this);

  /**
   * @type {!NetSimShardCleaner}
   * @private
   */
  this.cleaner_ = cleaner;
};
CleanNodes.inherits(CommandSequence);

/**
 * @private
 * @override
 */
CleanNodes.prototype.onBegin_ = function () {
  var heartbeatRows = this.cleaner_.getTableCache('heartbeat');
  var nodeRows = this.cleaner_.getTableCache('node');
  this.commandList_ = nodeRows.filter(function (row) {
    return heartbeatRows.every(function (heartbeat) {
      return heartbeat.nodeID !== row.id;
    });
  }).map(function (row) {
    return new DestroyEntity(new NetSimNode(this.cleaner_.getShard(), row));
  }.bind(this));
  CommandSequence.prototype.onBegin_.call(this);
};

/**
 * Command that scans cleaner's Wires table cache, and deletes any wires
 * that are associated with nodes that aren't in the node table cache.
 *
 * @param {!NetSimShardCleaner} cleaner
 * @constructor
 * @augments CommandSequence
 */
var CleanWires = function (cleaner) {
  CommandSequence.call(this);

  /**
   * @type {!NetSimShardCleaner}
   * @private
   */
  this.cleaner_ = cleaner;
};
CleanWires.inherits(CommandSequence);

/**
 * @private
 * @override
 */
CleanWires.prototype.onBegin_ = function () {
  var nodeRows = this.cleaner_.getTableCache('node');
  var wireRows = this.cleaner_.getTableCache('wire');
  this.commandList_ = wireRows.filter(function (wireRow) {
    return !(nodeRows.some(function (nodeRow) {
      return nodeRow.id === wireRow.localNodeID;
    }) && nodeRows.some(function (nodeRow) {
      return nodeRow.id === wireRow.remoteNodeID;
    }));
  }).map(function (row) {
    return new DestroyEntity(new NetSimWire(this.cleaner_.getShard(), row));
  }.bind(this));
  CommandSequence.prototype.onBegin_.call(this);
};

/**
 * Command that scans the cleaner's message table cache, and deletes any
 * messages in transit to nodes that no longer exist in the node table cache.
 *
 * @param {!NetSimShardCleaner} cleaner
 * @constructor
 * @augments CommandSequence
 */
var CleanMessages = function (cleaner) {
  CommandSequence.call(this);

  /**
   * @type {!NetSimShardCleaner}
   * @private
   */
  this.cleaner_ = cleaner;
};
CleanMessages.inherits(CommandSequence);

/**
 * @private
 * @override
 */
CleanMessages.prototype.onBegin_ = function () {
  var nodeRows = this.cleaner_.getTableCache('node');
  var messageRows = this.cleaner_.getTableCache('message');
  this.commandList_ = messageRows.filter(function (messageRow) {
    return nodeRows.every(function (nodeRow) {
      return nodeRow.id !== messageRow.toNodeID;
    });
  }).map(function (row) {
    return new DestroyEntity(new NetSimMessage(this.cleaner_.getShard(), row));
  }.bind(this));
  CommandSequence.prototype.onBegin_.call(this);
};

/**
 *
 * @param cleaner
 * @constructor
 * @augments CommandSequence
 */
var CleanLogs = function (cleaner) {
  CommandSequence.call(this);
  this.cleaner_ = cleaner;
};
CleanLogs.inherits(CommandSequence);

/**
 *
 * @private
 * @override
 */
CleanLogs.prototype.onBegin_ = function () {
  var nodeRows = this.cleaner_.getTableCache('node');
  var logRows = this.cleaner_.getTableCache('log');
  this.commandList_ = logRows.filter(function (logRow) {
    return nodeRows.every(function (nodeRow) {
      return nodeRow.id !== logRow.nodeID;
    });
  }).map(function (row) {
    return new DestroyEntity(new NetSimLogEntry(this.cleaner_.getShard(), row));
  }.bind(this));
  CommandSequence.prototype.onBegin_.call(this);
};

},{"../commands":49,"../utils":235,"./NetSimEntity":136,"./NetSimHeartbeat":137,"./NetSimLogEntry":141,"./NetSimLogger":145,"./NetSimMessage":146,"./NetSimNode":149,"./NetSimWire":174}],163:[function(require,module,exports){
/* jshint
 funcscope: true,
 newcap: true,
 nonew: true,
 shadow: false,
 unused: true,

 maxlen: 90,
 maxparams: 3,
 maxstatements: 200
 */
/* global window */
'use strict';

var SharedTable = require('../clientApi').SharedTable;
var NetSimTable = require('./NetSimTable');

/**
 * App key, unique to netsim, used for connecting with the storage API.
 * @type {string}
 * @readonly
 */
// TODO (bbuchanan): remove once we can store ids for each app? (userid:1 apppid:42)
var CHANNEL_PUBLIC_KEY = 'HQJ8GCCMGP7Yh8MrtDusIA==';
// Ugly null-guards so we can load this file in tests.
if (window &&
    window.location &&
    window.location.hostname &&
    window.location.hostname.split('.')[0] === 'localhost') {
  CHANNEL_PUBLIC_KEY = 'JGW2rHUp_UCMW_fQmRf6iQ==';
}

/**
 * A shard is an isolated, complete simulation state shared by a subset of
 * users.  It's made of a set of storage tables set apart by a particular
 * shard ID in their names.  We use shards to allow students to interact only
 * with their particular class while still storing all NetSim tables under
 * the same App ID.
 *
 * @param {!string} shardID
 * @constructor
 */
var NetSimShard = module.exports = function (shardID) {
  /** @type {NetSimTable} */
  this.nodeTable = new NetSimTable(
      new SharedTable(CHANNEL_PUBLIC_KEY, shardID + '_n'));

  /** @type {NetSimTable} */
  this.wireTable = new NetSimTable(
      new SharedTable(CHANNEL_PUBLIC_KEY, shardID + '_w'));

  /** @type {NetSimTable} */
  this.messageTable = new NetSimTable(
      new SharedTable(CHANNEL_PUBLIC_KEY, shardID + '_m'));
  this.messageTable.setPollingInterval(3000);

  /** @type {NetSimTable} */
  this.logTable = new NetSimTable(
      new SharedTable(CHANNEL_PUBLIC_KEY, shardID + '_l'));
  this.logTable.setPollingInterval(10000);

  /** @type {NetSimTable} */
  this.heartbeatTable = new NetSimTable(
      new SharedTable(CHANNEL_PUBLIC_KEY, shardID + '_h'));
};

/**
 * This tick allows our tables to poll the server for changes.
 * @param {!RunLoop.Clock} clock
 */
NetSimShard.prototype.tick = function (clock) {
  // TODO (bbuchanan): Eventaully, these polling events should just be
  //                   backup for the notification system.
  this.nodeTable.tick(clock);
  this.wireTable.tick(clock);
  this.messageTable.tick(clock);
  this.logTable.tick(clock);
};

},{"../clientApi":47,"./NetSimTable":167}],167:[function(require,module,exports){
/* jshint
 funcscope: true,
 newcap: true,
 nonew: true,
 shadow: false,
 unused: true,

 maxlen: 90,
 maxparams: 3,
 maxstatements: 200
 */
'use strict';

var _ = require('../utils').getLodash();
var ObservableEvent = require('../ObservableEvent');

/**
 * Maximum time (in milliseconds) that tables should wait between full cache
 * updates from the server.
 * @type {number}
 */
var DEFAULT_POLLING_DELAY_MS = 5000;

/**
 * Wraps the app storage table API in an object with local
 * cacheing and callbacks, which provides a notification API to the rest
 * of the NetSim code.
 * @param {!SharedTable} storageTable - The remote storage table to wrap.
 * @constructor
 */
var NetSimTable = module.exports = function (storageTable) {
  /**
   * Actual API to the remote shared table.
   * @type {SharedTable}
   * @private
   */
  this.remoteTable_ = storageTable;


  /**
   * Event that fires when full table updates indicate a change,
   * when rows are added, or when rows are removed, or when rows change.
   * @type {ObservableEvent}
   */
  this.tableChange = new ObservableEvent();

  /**
   * Store table contents locally, so we can detect when changes occur.
   * @type {Object}
   * @private
   */
  this.cache_ = {};

  /**
   * Unix timestamp for last time this table's cache contents were fully
   * updated.  Used to determine when to poll the server for changes.
   * @type {number}
   * @private
   */
  this.lastFullUpdateTime_ = 0;

  /**
   * Minimum time (in milliseconds) to wait between pulling full table contents
   * from remote storage.
   * @type {number}
   * @private
   */
  this.pollingInterval_ = DEFAULT_POLLING_DELAY_MS;
};

/**
 * @param {!NodeStyleCallback} callback
 */
NetSimTable.prototype.readAll = function (callback) {
  this.remoteTable_.readAll(function (err, data) {
    callback(err, data);
    if (err === null) {
      this.fullCacheUpdate_(data);
    }
  }.bind(this));
};

/**
 * @param {!number} id
 * @param {!NodeStyleCallback} callback
 */
NetSimTable.prototype.read = function (id, callback) {
  this.remoteTable_.read(id, function (err, data) {
    callback(err, data);
    if (err === null) {
      this.updateCacheRow_(id, data);
    }
  }.bind(this));
};

/**
 * @param {Object} value
 * @param {!NodeStyleCallback} callback
 */
NetSimTable.prototype.create = function (value, callback) {
  this.remoteTable_.create(value, function (err, data) {
    callback(err, data);
    if (err === null) {
      this.addRowToCache_(data);
    }
  }.bind(this));
};

/**
 * @param {!number} id
 * @param {Object} value
 * @param {!NodeStyleCallback} callback
 */
NetSimTable.prototype.update = function (id, value, callback) {
  this.remoteTable_.update(id, value, function (err, success) {
    callback(err, success);
    if (err === null) {
      this.updateCacheRow_(id, value);
    }
  }.bind(this));
};

/**
 * @param {!number} id
 * @param {!NodeStyleCallback} callback
 */
NetSimTable.prototype.delete = function (id, callback) {
  this.remoteTable_.delete(id, function (err, success) {
    callback(err, success);
    if (err === null) {
      this.removeRowFromCache_(id);
    }
  }.bind(this));
};

/**
 * @param {Array} allRows
 * @private
 */
NetSimTable.prototype.fullCacheUpdate_ = function (allRows) {
  // Rebuild entire cache
  var newCache = allRows.reduce(function (prev, currentRow) {
    prev[currentRow.id] = currentRow;
    return prev;
  }, {});

  // Check for changes, if anything changed notify all observers on table.
  if (!_.isEqual(this.cache_, newCache)) {
    this.cache_ = newCache;
    this.tableChange.notifyObservers(this.arrayFromCache_());
  }

  this.lastFullUpdateTime_ = Date.now();
};

/**
 * @param {!Object} row
 * @param {!number} row.id
 * @private
 */
NetSimTable.prototype.addRowToCache_ = function (row) {
  this.cache_[row.id] = row;
  this.tableChange.notifyObservers(this.arrayFromCache_());
};

/**
 * @param {!number} id
 * @private
 */
NetSimTable.prototype.removeRowFromCache_ = function (id) {
  if (this.cache_[id] !== undefined) {
    delete this.cache_[id];
    this.tableChange.notifyObservers(this.arrayFromCache_());
  }
};

/**
 * @param {!number} id
 * @param {!Object} row
 * @private
 */
NetSimTable.prototype.updateCacheRow_ = function (id, row) {
  var oldRow = this.cache_[id];
  var newRow = row;

  // Manually apply ID which should be present in row.
  newRow.id = id;

  if (!_.isEqual(oldRow, newRow)) {
    this.cache_[id] = newRow;
    this.tableChange.notifyObservers(this.arrayFromCache_());
  }
};

/**
 * @returns {Array}
 * @private
 */
NetSimTable.prototype.arrayFromCache_ = function () {
  var result = [];
  for (var k in this.cache_) {
    if (this.cache_.hasOwnProperty(k)) {
      result.push(this.cache_[k]);
    }
  }
  return result;
};

/**
 * Changes how often this table fetches a full table update from the
 * server.
 * @param {number} intervalMs - milliseconds of delay between updates.
 */
NetSimTable.prototype.setPollingInterval = function (intervalMs) {
  this.pollingInterval_ = intervalMs;
};

/** Polls server for updates, if it's been long enough. */
NetSimTable.prototype.tick = function () {
  var now = Date.now();
  if (now - this.lastFullUpdateTime_ > this.pollingInterval_) {
    this.lastFullUpdateTime_ = now;
    this.readAll(function () {});
  }
};

},{"../ObservableEvent":1,"../utils":235}],158:[function(require,module,exports){
/* jshint
 funcscope: true,
 newcap: true,
 nonew: true,
 shadow: false,
 unused: true,

 maxlen: 90,
 maxparams: 3,
 maxstatements: 200
 */
'use strict';

var utils = require('../utils');
var i18n = require('../../locale/current/netsim');
var netsimConstants = require('./netsimConstants');
var netsimUtils = require('./netsimUtils');
var NetSimNode = require('./NetSimNode');
var NetSimEntity = require('./NetSimEntity');
var NetSimLogEntry = require('./NetSimLogEntry');
var NetSimLogger = require('./NetSimLogger');
var NetSimWire = require('./NetSimWire');
var NetSimMessage = require('./NetSimMessage');
var NetSimHeartbeat = require('./NetSimHeartbeat');
var ObservableEvent = require('../ObservableEvent');
var Packet = require('./Packet');
var dataConverters = require('./dataConverters');

var _ = utils.getLodash();

var serializeNumber = netsimUtils.serializeNumber;
var deserializeNumber = netsimUtils.deserializeNumber;

var intToBinary = dataConverters.intToBinary;
var asciiToBinary = dataConverters.asciiToBinary;

var DnsMode = netsimConstants.DnsMode;
var NodeType = netsimConstants.NodeType;
var BITS_PER_BYTE = netsimConstants.BITS_PER_BYTE;
var BITS_PER_NIBBLE = netsimConstants.BITS_PER_NIBBLE;

var logger = NetSimLogger.getSingleton();

/**
 * @type {number}
 * @readonly
 */
var MAX_CLIENT_CONNECTIONS = 6;

/**
 * Conveniently, a router's address in its local network is always zero.
 * @type {number}
 * @readonly
 */
var ROUTER_LOCAL_ADDRESS = 0;

/**
 * Address that can only be used for the auto-dns node.
 * May eventually be replaced with a dynamically assigned address.
 * @type {number}
 * @readonly
 */
var AUTO_DNS_RESERVED_ADDRESS = 15;

/**
 * Hostname assigned to the automatic dns 'node' in the local network.
 * There will only be one of these, so it can be simple.
 * @type {string}
 * @readonly
 */
var AUTO_DNS_HOSTNAME = 'dns';

/**
 * Value the auto-DNS will return instead of an address when it can't
 * locate a node with the given hostname in the local network.
 * @type {string}
 * @readonly
 */
var AUTO_DNS_NOT_FOUND = 'NOT_FOUND';

/**
 * Client model of simulated router
 *
 * Represents the client's view of a given router, provides methods for
 *   letting the client interact with the router, and wraps the client's
 *   work doing part of the router simulation.
 *
 * A router -exists- when it has a row in the lobby table of type 'router'
 * A router is connected to a user when a 'user' row exists in the lobby
 *   table that has a status 'Connected to {router ID} by wires {X, Y}'.
 * A router will also share a wire (simplex) or wires (duplex) with each user,
 *   which appear in the wire table.
 *
 * @param {!NetSimShard} shard
 * @param {Object} [routerRow] - Lobby row for this router.
 * @constructor
 * @augments NetSimNode
 */
var NetSimRouterNode = module.exports = function (shard, row) {
  row = row !== undefined ? row : {};
  NetSimNode.call(this, shard, row);

  /**
   * Sets current DNS mode for the router's local network.
   * This value is manipulated by all clients.
   * @type {DnsMode}
   * @private
   */
  this.dnsMode = utils.valueOr(row.dnsMode, DnsMode.NONE);

  /**
   * Sets current DNS node ID for the router's local network.
   * This value is manipulated by all clients.
   * @type {number}
   * @private
   */
  this.dnsNodeID = row.dnsNodeID;

  /**
   * Speed at which messages are processed, in bits per second.
   * @type {number}
   */
  this.bandwidth = utils.valueOr(deserializeNumber(row.bandwidth), Infinity);

  /**
   * Determines a subset of connection and message events that this
   * router will respond to, only managing events from the given node ID,
   * to avoid conflicting with other clients also simulating this router.
   *
   * Not persisted on server.
   *
   * @type {number}
   * @private
   */
  this.simulateForSender_ = undefined;

  /**
   * Local cache of the last tick time in the local simulation.
   * Allows us to schedule/timestamp events that don't happen inside the
   * tick event.
   * @type {number}
   * @private
   */
  this.simulationTime_ = 0;

  /**
   * Packet format specification this router will use to parse, route, and log
   * packets that it receives.  Set on router that is simulated by client.
   *
   * Not persisted on server.
   *
   * @type {packetHeaderSpec}
   * @private
   */
  this.packetSpec_ = [];

  /**
   * If ticked, tells the network that this router is being used.
   *
   * Not persisted on server (though the heartbeat does its own persisting)
   *
   * @type {NetSimHeartbeat}
   * @private
   */
  this.heartbeat_ = null;

  /**
   * Local cache of our remote row, used to decide whether our state has
   * changed.
   * 
   * Not persisted to server.
   * 
   * @type {Object}
   * @private
   */
  this.stateCache_ = {};
  
  /**
   * Event others can observe, which we fire when our own remote row changes.
   * 
   * @type {ObservableEvent}
   */
  this.stateChange = new ObservableEvent();

  /**
   * Local cache of wires attached to this router, used for detecting and
   * broadcasting relevant changes.
   *
   * Not persisted on server.
   *
   * @type {Array}
   * @private
   */
  this.myWireRowCache_ = [];

  /**
   * Event others can observe, which we fire when the router's set of wires
   * changes indicating a change in the local network.
   *
   * @type {ObservableEvent}
   */
  this.wiresChange = new ObservableEvent();

  /**
   * Local cache of log rows associated with this router, used for detecting
   * and broadcasting relevant changes.
   * 
   * @type {Array}
   * @private
   */
  this.myLogRowCache_ = [];
  
  /**
   * Event others can observe, which we fire when the router's log content
   * changes.
   * 
   * @type {ObservableEvent}
   */
  this.logChange = new ObservableEvent();

  /**
   * Whether router is in the middle of work.  Keeps router from picking up
   * its own change notifications or interrupting its own processes.
   * @type {boolean}
   * @private
   */
  this.isRouterProcessing_ = false;

  /**
   * Local cache of message rows that need to be processed by (any simulation
   * of) the router.  Used for tracking router memory, throughput, etc.
   * @type {messageRow[]}
   * @private
   */
  this.routerQueueCache_ = [];

  /**
   * Set of scheduled 'routing events'
   * @type {Object[]}
   * @private
   */
  this.localRoutingSchedule_ = [];

  /**
   * @type {boolean}
   * @private
   */
  this.isAutoDnsProcessing_ = false;

  /**
   * Local cache of message rows that need to be processed by (any simulation
   * of) the auto-DNS. Used for stats and limiting.
   * @type {messageRow[]}
   * @private
   */
  this.autoDnsQueue_ = [];
};
NetSimRouterNode.inherits(NetSimNode);

/**
 * Static async creation method. See NetSimEntity.create().
 * @param {!NetSimShard} shard
 * @param {!NodeStyleCallback} onComplete - Method that will be given the
 *        created entity, or null if entity creation failed.
 */
NetSimRouterNode.create = function (shard, onComplete) {
  NetSimEntity.create(NetSimRouterNode, shard, function (err, router) {
    if (err !== null) {
      onComplete(err, null);
      return;
    }

    NetSimHeartbeat.getOrCreate(shard, router.entityID, function (err, heartbeat) {
      if (err !== null) {
        onComplete(err, null);
        return;
      }

      // Set router heartbeat to double normal interval, since we expect
      // at least two clients to help keep it alive.
      router.heartbeat_ = heartbeat;
      router.heartbeat_.setBeatInterval(12000);

      // Always try and update router immediately, to set its DisplayName
      // correctly.
      router.update(function (err) {
        onComplete(err, router);
      });
    });
  });
};

/**
 * Static async retrieval method.  See NetSimEntity.get().
 * @param {!number} routerID - The row ID for the entity you'd like to find.
 * @param {!NetSimShard} shard
 * @param {!NodeStyleCallback} onComplete - Method that will be given the
 *        found entity, or null if entity search failed.
 */
NetSimRouterNode.get = function (routerID, shard, onComplete) {
  NetSimEntity.get(NetSimRouterNode, routerID, shard, function (err, router) {
    if (err !== null) {
      onComplete(err, null);
      return;
    }

    NetSimHeartbeat.getOrCreate(shard, routerID, function (err, heartbeat) {
      if (err !== null) {
        onComplete(err, null);
        return;
      }

      // Set router heartbeat to double normal interval, since we expect
      // at least two clients to help keep it alive.
      router.heartbeat_ = heartbeat;
      router.heartbeat_.setBeatInterval(12000);

      onComplete(null, router);
    });
  });
};

/**
 * @readonly
 * @enum {string}
 */
NetSimRouterNode.RouterStatus = {
  INITIALIZING: 'Initializing',
  READY: 'Ready',
  FULL: 'Full'
};
var RouterStatus = NetSimRouterNode.RouterStatus;

/**
 * @typedef {Object} routerRow
 * @property {number} bandwidth - Router max transmission/processing rate
 *           in bits/second
 * @property {DnsMode} dnsMode - Current DNS mode for the local network
 * @property {number} dnsNodeID - Entity ID of the current DNS node in the
 *           local network.
 */

/**
 * Build table row for this node.
 * @returns {routerRow}
 * @private
 * @override
 */
NetSimRouterNode.prototype.buildRow_ = function () {
  return utils.extend(
      NetSimRouterNode.superPrototype.buildRow_.call(this),
      {
        bandwidth: serializeNumber(this.bandwidth),
        dnsMode: this.dnsMode,
        dnsNodeID: this.dnsNodeID
      }
  );
};

/**
 * Load state from remoteRow into local model, then notify anything observing
 * us that we've changed.
 * @param {routerRow} remoteRow
 * @private
 */
NetSimRouterNode.prototype.onMyStateChange_ = function (remoteRow) {
  this.bandwidth = deserializeNumber(remoteRow.bandwidth);
  this.dnsMode = remoteRow.dnsMode;
  this.dnsNodeID = remoteRow.dnsNodeID;
  this.stateChange.notifyObservers(this);
};

/**
 * Ticks heartbeat, telling the network that router is in use.
 * @param {RunLoop.Clock} clock
 */
NetSimRouterNode.prototype.tick = function (clock) {
  this.simulationTime_ = clock.time;
  this.heartbeat_.tick(clock);
  this.routeOverdueMessages_.call(this, clock);
  if (this.dnsMode === DnsMode.AUTOMATIC) {
    this.tickAutoDns_(clock);
  }
};

/**
 * This name is a bit of a misnomer, but it's memorable; we actually route
 * all messages that are DUE or OVERDUE.
 * @param {RunLoop.Clock} clock
 * @private
 */
NetSimRouterNode.prototype.routeOverdueMessages_ = function (clock) {
  if (this.isRouterProcessing_) {
    return;
  }

  // Separate out messages whose scheduled time has arrived or is past.
  // Flag them so we can remove them later.
  var readyScheduleItems = [];
  this.localRoutingSchedule_.forEach(function (item) {
    if (clock.time >= item.processingCompleteTime) {
      item.beingRouted = true;
      readyScheduleItems.push(item);
    }
  });

  // If no messages are ready, we're done.
  if (readyScheduleItems.length === 0) {
    return;
  }

  // Process the messages that are ready for routing
  var readyMessages = readyScheduleItems.map(function (item) {
    return new NetSimMessage(this.shard_, item.row);
  }.bind(this));

  this.isRouterProcessing_ = true;
  this.routeMessages_(readyMessages, function () {

    // When done, remove the schedule entries that we flagged earlier
    this.localRoutingSchedule_ = this.localRoutingSchedule_.filter(function (item) {
      return !item.beingRouted;
    });
    this.isRouterProcessing_ = false;

  }.bind(this));
};

/**
 * Examine the queue for anything that should be handled by the local
 * simulation, that hasn't been added to the schedule yet.  Schedule it after
 * everything that appears before it in the router queue.
 */
NetSimRouterNode.prototype.scheduleNewPackets = function () {
  var row, belongsToLocalSim, notScheduled;
  for (var i = 0; i < this.routerQueueCache_.length; i++) {
    row = this.routerQueueCache_[i];
    belongsToLocalSim = this.localSimulationOwnsMessageRow_(row);
    notScheduled = !this.isScheduled(row);

    if (belongsToLocalSim && notScheduled) {
      // Add up send times of all packets in queue up to this one, and including
      // this one, to get its send time.
      var sendTime = this.routerQueueCache_
          .slice(0, i + 1)
          .reduce(function (prev, cur) {
            return prev + this.calculateProcessingDurationForMessage_(cur);
          }.bind(this), this.simulationTime_);
      this.scheduleRouting(row, sendTime);
    }
  }
};

/**
 * @param {messageRow} row
 * @param {number} sendTime
 */
NetSimRouterNode.prototype.scheduleRouting = function (row, sendTime) {
  this.localRoutingSchedule_.push({
    row: row,
    processingCompleteTime: sendTime,
    beingRouted: false
  });
};

/**
 * @param {messageRow} messageRow
 * @returns {boolean} TRUE if the given row is represented in the local simulation
 *          routing schedule.
 */
NetSimRouterNode.prototype.isScheduled = function (messageRow) {
  return _.find(this.localRoutingSchedule_, function (entry) {
    return entry.row.id === messageRow.id;
  }) !== undefined;
};

/**
 * Lets the auto-DNS part of the router simulation handle its requests.
 * For now, auto-DNS can do "batch" processing, no throughput limits.
 * @private
 */
NetSimRouterNode.prototype.tickAutoDns_ = function () {
  if (this.isAutoDnsProcessing_) {
    return;
  }

  // Filter DNS queue down to requests the local simulation should handle.
  var localSimDnsRequests = this.autoDnsQueue_
      .filter(this.localSimulationOwnsMessageRow_.bind(this))
      .map(function (row) {
        return new NetSimMessage(this.shard_, row);
      }.bind(this));

  // If there's nothing we can process, we're done.
  if (localSimDnsRequests.length === 0) {
    return;
  }

  // Process DNS requests
  this.isAutoDnsProcessing_ = true;
  this.processAutoDnsRequests_(localSimDnsRequests, function () {
    this.isAutoDnsProcessing_ = false;
  }.bind(this));
};

/**
 * Updates router status and lastPing time in lobby table - both keepAlive
 * and making sure router's connection count is valid.
 * @param {NodeStyleCallback} [onComplete] - Optional success/failure callback
 */
NetSimRouterNode.prototype.update = function (onComplete) {
  onComplete = onComplete || function () {};

  var self = this;
  this.countConnections(function (err, count) {
    self.status_ = count >= MAX_CLIENT_CONNECTIONS ?
        RouterStatus.FULL : RouterStatus.READY;
    self.statusDetail_ = '(' + count + '/' + MAX_CLIENT_CONNECTIONS + ')';
    NetSimRouterNode.superPrototype.update.call(self, onComplete);
  });
};

/** @inheritdoc */
NetSimRouterNode.prototype.getDisplayName = function () {
  return i18n.routerX({
    x: this.entityID
  });
};

/**
 * Get node's hostname, a modified version of its display name.
 * @returns {string}
 * @override
 */
NetSimRouterNode.prototype.getHostname = function () {
  // Use regex to strip anything that's not a word-character or a digit
  // from the node's display name.  For routers, we don't append the node ID
  // because it's already part of the display name.
  return this.getDisplayName().replace(/[^\w\d]/g, '').toLowerCase();
};

/** @inheritdoc */
NetSimRouterNode.prototype.getNodeType = function () {
  return NodeType.ROUTER;
};

/**
 * Makes sure that the given specification contains the fields that this
 * router needs to do its job.
 * @param {packetHeaderSpec} packetSpec
 * @private
 */
NetSimRouterNode.prototype.validatePacketSpec_ = function (packetSpec) {
  // Require TO_ADDRESS for routing
  if (!packetSpec.some(function (headerField) {
        return headerField.key === Packet.HeaderType.TO_ADDRESS;
      })) {
    logger.error("Packet specification does not have a toAddress field.");
  }

  // Require FROM_ADDRESS for auto-DNS tasks
  if (!packetSpec.some(function (headerField) {
        return headerField.key === Packet.HeaderType.FROM_ADDRESS;
      })) {
    logger.error("Packet specification does not have a fromAddress field.");
  }
};

/**
 * Puts this router controller into a mode where it will only
 * simulate for connection and messages -from- the given node.
 * @param {!number} nodeID
 * @param {packetHeaderSpec} packetSpec
 */
NetSimRouterNode.prototype.initializeSimulation = function (nodeID, packetSpec) {
  this.simulateForSender_ = nodeID;
  this.packetSpec_ = packetSpec;
  this.validatePacketSpec_(packetSpec);

  if (nodeID !== undefined) {
    var nodeChangeEvent = this.shard_.nodeTable.tableChange;
    var nodeChangeHandler = this.onNodeTableChange_.bind(this);
    this.nodeChangeKey_ = nodeChangeEvent.register(nodeChangeHandler);
    logger.info("Router registered for nodeTable tableChange");
    
    var wireChangeEvent = this.shard_.wireTable.tableChange;
    var wireChangeHandler = this.onWireTableChange_.bind(this);
    this.wireChangeKey_ = wireChangeEvent.register(wireChangeHandler);
    logger.info("Router registered for wireTable tableChange");

    var logChangeEvent = this.shard_.logTable.tableChange;
    var logChangeHandler = this.onLogTableChange_.bind(this);
    this.logChangeKey_ = logChangeEvent.register(logChangeHandler);
    logger.info("Router registered for logTable tableChange");

    var newMessageEvent = this.shard_.messageTable.tableChange;
    var newMessageHandler = this.onMessageTableChange_.bind(this);
    this.newMessageEventKey_ = newMessageEvent.register(newMessageHandler);
    logger.info("Router registered for messageTable tableChange");
  }
};

/**
 * Gives the simulating node a chance to unregister from anything it
 * was observing.
 */
NetSimRouterNode.prototype.stopSimulation = function () {
  if (this.nodeChangeKey_ !== undefined) {
    var nodeChangeEvent = this.shard_.messageTable.tableChange;
    nodeChangeEvent.unregister(this.nodeChangeKey_);
    this.nodeChangeKey_ = undefined;
    logger.info("Router unregistered from nodeTable tableChange");
  }
  
  if (this.wireChangeKey_ !== undefined) {
    var wireChangeEvent = this.shard_.messageTable.tableChange;
    wireChangeEvent.unregister(this.wireChangeKey_);
    this.wireChangeKey_ = undefined;
    logger.info("Router unregistered from wireTable tableChange");
  }

  if (this.logChangeKey_ !== undefined) {
    var logChangeEvent = this.shard_.messageTable.tableChange;
    logChangeEvent.unregister(this.logChangeKey_);
    this.logChangeKey_ = undefined;
    logger.info("Router unregistered from logTable tableChange");
  }

  if (this.newMessageEventKey_ !== undefined) {
    var newMessageEvent = this.shard_.messageTable.tableChange;
    newMessageEvent.unregister(this.newMessageEventKey_);
    this.newMessageEventKey_ = undefined;
    logger.info("Router unregistered from messageTable tableChange");
  }
};

/**
 * Puts the router into the given DNS mode, triggers a remote update,
 * and creates/destroys the network's automatic DNS node.
 * @param {DnsMode} newDnsMode
 */
NetSimRouterNode.prototype.setDnsMode = function (newDnsMode) {
  if (this.dnsMode === newDnsMode) {
    return;
  }

  if (this.dnsMode === DnsMode.NONE) {
    this.dnsNodeID = undefined;
  } else if (this.dnsMode === DnsMode.AUTOMATIC) {
    this.dnsNodeID = AUTO_DNS_RESERVED_ADDRESS;
  }

  this.dnsMode = newDnsMode;
  this.update();
};

/**
 * @param {number} newBandwidth in bits per second
 */
NetSimRouterNode.prototype.setBandwidth = function (newBandwidth) {
  if (this.bandwidth === newBandwidth) {
    return;
  }

  this.bandwidth = newBandwidth;
  this.update();
};

/**
 * Query the wires table and pass the callback a list of wire table rows,
 * where all of the rows are wires attached to this router.
 * @param {NodeStyleCallback} onComplete which accepts an Array of NetSimWire.
 */
NetSimRouterNode.prototype.getConnections = function (onComplete) {
  onComplete = onComplete || function () {};

  var shard = this.shard_;
  var routerID = this.entityID;
  this.shard_.wireTable.readAll(function (err, rows) {
    if (err) {
      onComplete(err, []);
      return;
    }

    var myWires = rows
        .map(function (row) {
          return new NetSimWire(shard, row);
        })
        .filter(function (wire){
          return wire.remoteNodeID === routerID;
        });

    onComplete(null, myWires);
  });
};

/**
 * Query the wires table and pass the callback the total number of wires
 * connected to this router.
 * @param {NodeStyleCallback} onComplete which accepts a number.
 */
NetSimRouterNode.prototype.countConnections = function (onComplete) {
  onComplete = onComplete || function () {};

  this.getConnections(function (err, wires) {
    onComplete(err, wires.length);
  });
};

NetSimRouterNode.prototype.log = function (packet) {
  NetSimLogEntry.create(
      this.shard_,
      this.entityID,
      packet,
      function () {});
};

/**
 * @param {Array} haystack
 * @param {*} needle
 * @returns {boolean} TRUE if needle found in haystack
 */
var contains = function (haystack, needle) {
  return haystack.some(function (element) {
    return element === needle;
  });
};

/**
 * Called when another node establishes a connection to this one, giving this
 * node a chance to reject the connection.
 *
 * The router checks against its connection limit, and rejects the connection
 * if its limit is now exceeded.
 *
 * @param {!NetSimNode} otherNode attempting to connect to this one
 * @param {!NodeStyleCallback} onComplete response method - should call with TRUE
 *        if connection is allowed, FALSE if connection is rejected.
 */
NetSimRouterNode.prototype.acceptConnection = function (otherNode, onComplete) {
  var self = this;
  this.countConnections(function (err, count) {
    if (err) {
      onComplete(err, false);
      return;
    }

    if (count > MAX_CLIENT_CONNECTIONS) {
      onComplete(new Error("Too many connections"), false);
      return;
    }

    // Trigger an update, which will correct our connection count
    self.update(function (err) {
      onComplete(err, err === null);
    });
  });
};

/**
 * Assign a new address for hostname on wire, calling onComplete
 * when done.
 * @param {!NetSimWire} wire that lacks addresses or hostnames
 * @param {string} hostname of requesting node
 * @param {NodeStyleCallback} [onComplete]
 */
NetSimRouterNode.prototype.requestAddress = function (wire, hostname, onComplete) {
  onComplete = onComplete || function () {};

  // General strategy: Create a list of existing remote addresses, pick a
  // new one, and assign it to the provided wire.
  var self = this;
  this.getConnections(function (err, wires) {
    if (err) {
      onComplete(err);
      return;
    }

    var addressList = wires.filter(function (wire) {
      return wire.localAddress !== undefined;
    }).map(function (wire) {
      return wire.localAddress;
    });

    // Find the lowest unused integer address starting at 2
    // Non-optimal, but should be okay since our address list should not exceed 10.
    var newAddress = 1;
    while (contains(addressList, newAddress)) {
      newAddress++;
    }

    wire.localAddress = newAddress;
    wire.localHostname = hostname;
    wire.remoteAddress = ROUTER_LOCAL_ADDRESS;
    wire.remoteHostname = self.getHostname();
    wire.update(onComplete);
    // TODO: Fix possibility of two routers getting addresses by verifying
    //       after updating the wire.
  });
};

/**
 * @returns {Array} A list of remote nodes connected to this router, including
 *          their hostname, address, whether they are the local node, and
 *          whether they are the current DNS node for the network.
 */
NetSimRouterNode.prototype.getAddressTable = function () {
  var addressTable = this.myWireRowCache_.map(function (row) {
    return {
      hostname: row.localHostname,
      address: row.localAddress,
      isLocal: (row.localNodeID === this.simulateForSender_),
      isDnsNode: (row.localNodeID === this.dnsNodeID)
    };
  }.bind(this));

  // Special case: In auto-dns mode we add the DNS entry to the address table
  if (this.dnsMode === DnsMode.AUTOMATIC) {
    addressTable.push({
      hostname: AUTO_DNS_HOSTNAME,
      address: AUTO_DNS_RESERVED_ADDRESS,
      isLocal: false,
      isDnsNode: true
    });
  }

  return addressTable;
};

/**
 * Given a node ID, finds the local network address of that node.  Cannot
 * be used to find the address of the router or auto-dns node (since their
 * node IDs are not unique).  Will return undefined if the node ID is not
 * found.
 *
 * @param {number} nodeID
 * @returns {number|undefined}
 * @private
 */
NetSimRouterNode.prototype.getAddressForNodeID_ = function (nodeID) {
  var wireRow = _.find(this.myWireRowCache_, function (row) {
    return row.localNodeID === nodeID;
  });

  if (wireRow !== undefined) {
    return wireRow.localAddress;
  }
  return undefined;
};

/**
 * Given a hostname, finds the local network address of the node with that
 * hostname.  Will return undefined if no node with that hostname is found.
 *
 * @param {string} hostname
 * @returns {number|undefined}
 * @private
 */
NetSimRouterNode.prototype.getAddressForHostname_ = function (hostname) {
  if (hostname === this.getHostname()) {
    return ROUTER_LOCAL_ADDRESS;
  }

  if (this.dnsMode === DnsMode.AUTOMATIC && hostname === AUTO_DNS_HOSTNAME) {
    return AUTO_DNS_RESERVED_ADDRESS;
  }

  var wireRow = _.find(this.myWireRowCache_, function (row) {
    return row.localHostname === hostname;
  });

  if (wireRow !== undefined) {
    return wireRow.localAddress;
  }
  return undefined;
};

/**
 * Given a local network address, finds the node ID of the node at that
 * address.  Will return undefined if no node is found at the given address.
 *
 * @param {number} address
 * @returns {number|undefined}
 * @private
 */
NetSimRouterNode.prototype.getNodeIDForAddress_ = function (address) {
  if (address === ROUTER_LOCAL_ADDRESS) {
    return this.entityID;
  }

  if (this.dnsMode === DnsMode.AUTOMATIC &&
      address === AUTO_DNS_RESERVED_ADDRESS) {
    return this.entityID;
  }

  var wireRow = _.find(this.myWireRowCache_, function (row) {
    return row.localAddress === address;
  });

  if (wireRow !== undefined) {
    return wireRow.localNodeID;
  }
  return undefined;
};

/**
 * When the node table changes, we check whether our own row has changed
 * and propagate those changes as appropriate.
 * @param rows
 * @private
 * @throws
 */
NetSimRouterNode.prototype.onNodeTableChange_ = function (rows) {
  var myRow = _.find(rows, function (row) {
    return row.id === this.entityID;
  }.bind(this));

  if (myRow === undefined) {
    throw new Error("Unable to find router node in node table listing.");
  }

  if (!_.isEqual(this.stateCache_, myRow)) {
    this.stateCache_ = myRow;
    logger.info("Router state changed.");
    this.onMyStateChange_(myRow);
  }
};

/**
 * When the wires table changes, we may have a new connection or have lost
 * a connection.  Propagate updates about our connections
 * @param rows
 * @private
 */
NetSimRouterNode.prototype.onWireTableChange_ = function (rows) {
  var myWireRows = rows.filter(function (row) {
    return row.remoteNodeID === this.entityID;
  }.bind(this));

  if (!_.isEqual(this.myWireRowCache_, myWireRows)) {
    this.myWireRowCache_ = myWireRows;
    this.wiresChange.notifyObservers();
  }
};

/**
 * When the logs table changes, we may have a new connection or have lost
 * a connection.  Propagate updates about our connections
 * @param rows
 * @private
 */
NetSimRouterNode.prototype.onLogTableChange_ = function (rows) {
  var myLogRows = rows.filter(function (row) {
    return row.nodeID === this.entityID;
  }.bind(this));

  if (!_.isEqual(this.myLogRowCache_, myLogRows)) {
    this.myLogRowCache_ = myLogRows;
    logger.info("Router logs changed.");
    this.logChange.notifyObservers();
  }
};

/**
 * Get list of log entries in this router's memory.
 * @returns {NetSimLogEntry[]}
 */
NetSimRouterNode.prototype.getLog = function () {
  return this.myLogRowCache_.map(function (row) {
    return new NetSimLogEntry(this.shard_, row, this.packetSpec_);
  }.bind(this));
};

/**
 * When the message table changes, we might have a new message to handle.
 * Check for and handle unhandled messages.
 * @param {messageRow[]} rows
 * @private
 * @throws if this method is called on a non-simulating router.
 */
NetSimRouterNode.prototype.onMessageTableChange_ = function (rows) {
  if (!this.simulateForSender_) {
    // What?  Only simulating routers should be hooked up to message notifications.
    throw new Error("Non-simulating router got message table change notifiction");
  }

  this.updateRouterQueue_(rows);

  if (this.dnsMode === DnsMode.AUTOMATIC) {
    this.updateAutoDnsQueue_(rows);
  }
};


/**
 * Updates our cache of all messages that are going to the router (regardless
 * of which simulation will handle them), so we can use it for stats and rate
 * limiting.
 * @param {messageRow[]} rows - message table rows
 */
NetSimRouterNode.prototype.updateRouterQueue_ = function (rows) {
  var newQueue = rows.filter(this.isMessageToRouter_.bind(this));
  if (_.isEqual(this.routerQueueCache_, newQueue)) {
    return;
  }

  this.routerQueueCache_ = newQueue;
  // TODO: Drop packets that exceed queue memory (IF not already processing?)
  this.scheduleNewPackets();
  // Propagate notification of queue change (for stats, etc)
};

/**
 * @param {messageRow} messageRow
 * @returns {boolean} TRUE if this message is destined for the router (not the
 *          auto-DNS part though!) and FALSE if destined anywhere else.
 * @private
 */
NetSimRouterNode.prototype.isMessageToRouter_ = function (messageRow) {
  if (this.dnsMode === DnsMode.AUTOMATIC && this.isMessageToAutoDns_(messageRow)) {
    return false;
  }

  return messageRow.toNodeID === this.entityID;
};

NetSimRouterNode.prototype.routeMessages_ = function (messages, onComplete) {
  if (messages.length === 0) {
    onComplete(null);
    return;
  }

  this.routeMessage_(messages[0], function (err, result) {
    if (err) {
      onComplete(err, result);
      return;
    }

    this.routeMessages_(messages.slice(1), onComplete);
  }.bind(this));
};

/**
 *
 * @param {NetSimMessage} message
 * @param {!NodeStyleCallback} onComplete
 * @private
 */
NetSimRouterNode.prototype.routeMessage_ = function (message, onComplete) {
  logger.info("Destroying message...");
  message.destroy(function (err, result) {
    if (err) {
      onComplete(err, result);
      return;
    }

    logger.info("Message destroyed.");

    this.forwardMessageToRecipient_(message, onComplete);
  }.bind(this));
};

/**
 * Read the given message to find its destination address, try and map that
 * address to one of our connections, and send the message payload to
 * the new address.
 *
 * @param {NetSimMessage} message
 * @param {!NodeStyleCallback} onComplete
 * @private
 */
NetSimRouterNode.prototype.forwardMessageToRecipient_ = function (message, onComplete) {
  logger.info("Forwarding message...");
  var toAddress;
  var routerNodeID = this.entityID;

  // Find a connection to route this message to.
  try {
    var packet = new Packet(this.packetSpec_, message.payload);
    toAddress = packet.getHeaderAsInt(Packet.HeaderType.TO_ADDRESS);
  } catch (error) {
    logger.warn("Packet not readable by router");
    this.log(message.payload);
    onComplete(null);
    return;
  }

  if (toAddress === ROUTER_LOCAL_ADDRESS) {
    // This packet has reached its destination, it's done.
    logger.warn("Packet stopped at router.");
    this.log(message.payload);
    onComplete(null);
    return;
  }

  var destinationNodeID = this.getNodeIDForAddress_(toAddress);
  if (destinationNodeID === undefined) {
    logger.warn("Destination address not in local network");
    this.log(message.payload);
    onComplete(null);
    return;
  }

  // TODO: Handle bad state where more than one wire matches dest address?

  // Create a new message with a new payload.
  NetSimMessage.send(
      this.shard_,
      routerNodeID,
      destinationNodeID,
      message.payload,
      function (err, result) {
        this.log(message.payload);
        onComplete(err, result);
      }.bind(this)
  );
};

/**
 * @param {messageRow} messageRow
 * @returns {boolean} TRUE if the given row should be operated on by the local
 *          simulation, FALSE if another user's simulation should handle it.
 * @private
 */
NetSimRouterNode.prototype.localSimulationOwnsMessageRow_ = function (messageRow) {
  // Local simulation can't handle anything if it's not initialized.
  if (!this.simulateForSender_) {
    return false;
  }

  var packet, fromAddress, toAddress, simulateForAddress;
  var routerNodeID = this.entityID;

  // One extra responsibility in auto-DNS mode: Should handle messages from the
  // auto-DNS to the router IF they are addressed to the local client.
  if (this.dnsMode === DnsMode.AUTOMATIC) {

    // Gather address info to confirm this packet's destination
    packet = new Packet(this.packetSpec_, messageRow.payload);
    fromAddress = packet.getHeaderAsInt(Packet.HeaderType.FROM_ADDRESS);
    toAddress = packet.getHeaderAsInt(Packet.HeaderType.TO_ADDRESS);
    simulateForAddress = this.getAddressForNodeID_(this.simulateForSender_);

    var isOnRouterLoopback = messageRow.fromNodeID === routerNodeID &&
        messageRow.toNodeID === routerNodeID;

    var isBetweenLocalAndDns = (
        fromAddress === simulateForAddress &&
        toAddress === AUTO_DNS_RESERVED_ADDRESS
        ) || (
        fromAddress === AUTO_DNS_RESERVED_ADDRESS &&
        toAddress === simulateForAddress
        );

    if (isOnRouterLoopback && isBetweenLocalAndDns) {
      return true;
    }
  }

  // Local simulation of router normally handles only the messages from the
  // local client to the router.
  return messageRow.fromNodeID === this.simulateForSender_ &&
      messageRow.toNodeID === routerNodeID;
};

/**
 * @param {NetSimMessage} message
 * @returns {number} time required to process this message, in milliseconds.
 * @private
 */
NetSimRouterNode.prototype.calculateProcessingDurationForMessage_ = function (message) {
  if (this.bandwidth === Infinity) {
    return 0;
  }
  return message.payload.length * 1000 / this.bandwidth;
};

/**
 * Update queue of all auto-dns messages, which can be used for stats or limiting.
 * @param {messageRow[]} rows
 * @private
 */
NetSimRouterNode.prototype.updateAutoDnsQueue_ = function (rows) {
  var newQueue = rows.filter(this.isMessageToAutoDns_.bind(this));
  if (_.isEqual(this.autoDnsQueue_, newQueue)) {
    return;
  }

  this.autoDnsQueue_ = newQueue;
  // Propagate notification of queue change?
  // Work will proceed on next tick
};

/**
 *
 * @param {messageRow} messageRow
 */
NetSimRouterNode.prototype.isMessageToAutoDns_ = function (messageRow) {
  var packet, toAddress;
  try {
    packet = new Packet(this.packetSpec_, messageRow.payload);
    toAddress = packet.getHeaderAsInt(Packet.HeaderType.TO_ADDRESS);
  } catch (error) {
    logger.warn("Packet not readable by auto-DNS: " + error);
    return false;
  }

  // Messages to the auto-dns are both to and from the router node, and
  // addressed to the DNS.
  return messageRow.toNodeID === this.entityID &&
      messageRow.fromNodeID === this.entityID &&
      toAddress === AUTO_DNS_RESERVED_ADDRESS;
};

/**
 * Batch-process DNS requests, generating responses wherever possible.
 * @param {NetSimMessage[]} messages
 * @param {!NodeStyleCallback} onComplete
 * @private
 */
NetSimRouterNode.prototype.processAutoDnsRequests_ = function (messages, onComplete) {
  // 1. Remove the requests from the wire
  NetSimEntity.destroyEntities(messages, function (err, result) {
    if (err) {
      onComplete(err, result);
      return;
    }

    // 2. Generate all responses, asynchronously.
    this.generateDnsResponses_(messages, onComplete);
  }.bind(this));
};

/**
 * @param {NetSimMessage[]} messages
 * @param {!NodeStyleCallback} onComplete
 * @private
 */
NetSimRouterNode.prototype.generateDnsResponses_ = function (messages, onComplete) {
  if (messages.length === 0) {
    onComplete(null);
    return;
  }

  // Process head
  this.generateDnsResponse_(messages[0], function (err, result) {
    if (err) {
      onComplete(err, result);
      return;
    }

    // Process tail
    this.generateDnsResponses_(messages.slice(1), onComplete);
  }.bind(this));
};

/**
 * @param {NetSimMessage} message
 * @param {!NodeStyleCallback} onComplete
 * @private
 */
NetSimRouterNode.prototype.generateDnsResponse_ = function (message, onComplete) {
  var packet, fromAddress, query, responseHeaders, responseBody, responseBinary;
  var routerNodeID = this.entityID;
  var autoDnsNodeID = this.entityID;

  // Extract message contents
  try {
    packet = new Packet(this.packetSpec_, message.payload);
    fromAddress = packet.getHeaderAsInt(Packet.HeaderType.FROM_ADDRESS);
    query = packet.getBodyAsAscii(BITS_PER_BYTE);
  } catch (error) {
    // Malformed packet, ignore
    onComplete(error);
    return;
  }

  // Check that the query is well-formed
  // Regex match "GET [hostnames...]"
  // Then below, we'll split the hostnames on whitespace to process them.
  var requestMatch = query.match(/GET\s+(\S.*)/);
  if (requestMatch !== null) {
    // Good request, look up all addresses and build up response
    // Skipping first match, which is the full regex
    var responses = requestMatch[1].split(/\s+/).map(function (queryHostname) {
      var address = this.getAddressForHostname_(queryHostname);
      return queryHostname + ':' + utils.valueOr(address, AUTO_DNS_NOT_FOUND);
    }.bind(this));
    responseBody = responses.join(' ');
  } else {
    // Malformed request, send back instructions
    responseBody = i18n.autoDnsUsageMessage();
  }

  responseHeaders = {
    fromAddress: intToBinary(AUTO_DNS_RESERVED_ADDRESS, BITS_PER_NIBBLE),
    toAddress: intToBinary(fromAddress, BITS_PER_NIBBLE),
    packetIndex: intToBinary(1, BITS_PER_NIBBLE),
    packetCount: intToBinary(1, BITS_PER_NIBBLE)
  };

  responseBinary = packet.encoder.concatenateBinary(
      responseHeaders,
      asciiToBinary(responseBody, BITS_PER_BYTE));

  NetSimMessage.send(
      this.shard_,
      autoDnsNodeID,
      routerNodeID,
      responseBinary,
      onComplete);
};

},{"../../locale/current/netsim":245,"../ObservableEvent":1,"../utils":235,"./NetSimEntity":136,"./NetSimHeartbeat":137,"./NetSimLogEntry":141,"./NetSimLogger":145,"./NetSimMessage":146,"./NetSimNode":149,"./NetSimWire":174,"./Packet":175,"./dataConverters":177,"./netsimConstants":181,"./netsimUtils":183}],183:[function(require,module,exports){
/* jshint
 funcscope: true,
 newcap: true,
 nonew: true,
 shadow: false,
 unused: true,

 maxlen: 90,
 maxparams: 3,
 maxstatements: 200
 */
/* global $ */
'use strict';

var _ = require('../utils').getLodash();
var i18n = require('../../locale/current/netsim');
var netsimConstants = require('./netsimConstants');

var EncodingType = netsimConstants.EncodingType;

/**
 * Make a new SVG element, appropriately namespaced, wrapped in a jQuery
 * object for (semi-)easy manipulation.
 * @param {string} type - the tagname for the svg element.
 * @returns {jQuery}
 */
exports.jQuerySvgElement = function (type) {
  var newElement = $(document.createElementNS('http://www.w3.org/2000/svg', type));

  /**
   * Override addClass since jQuery addClass doesn't work on svg.
   * @param {string} className
   */
  newElement.addClass = function (className) {
    var oldClasses = newElement.attr('class');
    if (!oldClasses) {
      newElement.attr('class', className);
    } else if (!oldClasses.split(/\s+/g).some(function (existingClass) {
          return existingClass === className;
        })) {
      newElement.attr('class', oldClasses + ' ' + className);
    }
    // Return element for chaining
    return newElement;
  };

  return newElement;
};

/**
 * Checks configuration against tab type to decide whether tab
 * of type should be shown.
 * @param {netsimLevelConfiguration} levelConfig
 * @param {NetSimTabType} tabType
 */
exports.shouldShowTab = function (levelConfig, tabType) {
  return levelConfig.showTabs.indexOf(tabType) > -1;
};

/**
 * Get the localized string for the given encoding type.
 * @param {EncodingType} encodingType
 * @returns {string} localized encoding name
 */
exports.getEncodingLabel = function (encodingType) {
  if (encodingType === EncodingType.ASCII) {
    return i18n.ascii();
  } else if (encodingType === EncodingType.DECIMAL) {
    return i18n.decimal();
  } else if (encodingType === EncodingType.HEXADECIMAL) {
    return i18n.hex();
  } else if (encodingType === EncodingType.BINARY) {
    return i18n.binary();
  } else if (encodingType === EncodingType.A_AND_B) {
    return i18n.a_and_b();
  }
  return '';
};

/**
 * @param {Object} enumObj - Technically any object, but should be used with
 *        an enum like those found in netsimConstants
 * @param {function} func - A function to call for each value in the enum,
 *        which gets passed the enum value.
 */
exports.forEachEnumValue = function (enumObj, func) {
  for (var enumKey in enumObj) {
    if (enumObj.hasOwnProperty(enumKey)) {
      func(enumObj[enumKey]);
    }
  }
};

/**
 * Rules used by serializeNumber and deserializeNumber to map unsupported
 * JavaScript values into JSON and back.
 * @type {{jsVal: number, jsonVal: string}[]}
 * @readonly
 */
var NUMBER_SERIALIZATION_RULES = [
  { jsVal: Infinity, jsonVal: 'Infinity' },
  { jsVal: -Infinity, jsonVal: '-Infinity' },
  { jsVal: NaN, jsonVal: 'NaN' },
  { jsVal: undefined, jsonVal: 'undefined' }
];

/**
 * Checks that the provided value is actually the special value NaN, unlike
 * standard isNaN which returns true for anything that's not a number.
 * @param {*} val - any value
 * @returns {boolean}
 */
var isExactlyNaN = function (val) {
  // NaN is the only value in JavaScript that is not exactly equal to itself.
  // Therefore, if val !== val, then val must be NaN.
  return val !== val;
};

/**
 * Because JSON doesn't support the values Infinity, NaN, or undefined, you can
 * use this method to store those values in JSON as strings.
 * @param {number|NaN} num
 * @returns {number|string}
 */
exports.serializeNumber = function (num) {
  var applicableRule = _.find(NUMBER_SERIALIZATION_RULES, function (rule) {
    return rule.jsVal === num || (isExactlyNaN(rule.jsVal) && isExactlyNaN(num));
  });
  return applicableRule ? applicableRule.jsonVal : num;
};

/**
 * Because JSON doesn't support the values Infinity, NaN, or undefined, you can
 * use this method to retrieve a value from JSON that is either a number or one
 * of those values.
 * @param {number|string} storedNum
 * @returns {number|NaN}
 */
exports.deserializeNumber = function (storedNum) {
  var applicableRule = _.find(NUMBER_SERIALIZATION_RULES, function (rule) {
    return rule.jsonVal === storedNum;
  });
  return applicableRule ? applicableRule.jsVal : storedNum;
};

/**
 * @param {netsimLevelConfiguration} levelConfig
 * @returns {netsimLevelConfiguration} same thing, but with certain values
 *          converted or cleaned.
 * @private
 */
exports.scrubLevelConfiguration_ = function (levelConfig) {
  var scrubbedLevel = _.clone(levelConfig, true);

  // Read string "Infinity" as Infinity
  scrubbedLevel.defaultPacketSizeLimit = exports.deserializeNumber(
      scrubbedLevel.defaultPacketSizeLimit);

  // Read string "Infinity" as Infinity
  scrubbedLevel.defaultRouterBandwidth = exports.deserializeNumber(
      scrubbedLevel.defaultRouterBandwidth);

  return scrubbedLevel;
};

},{"../../locale/current/netsim":245,"../utils":235,"./netsimConstants":181}],141:[function(require,module,exports){
/* jshint
 funcscope: true,
 newcap: true,
 nonew: true,
 shadow: false,
 unused: true,

 maxlen: 90,
 maxparams: 5,
 maxstatements: 200
 */
'use strict';

require('../utils');
var NetSimEntity = require('./NetSimEntity');
var Packet = require('./Packet');
var dataConverters = require('./dataConverters');
var formatBinary = dataConverters.formatBinary;

/**
 * @type {number}
 * @const
 */
var BITS_PER_BYTE = 8;

/**
 * Entry in shared log for a node on the network.
 *
 * Once created, should not be modified until/unless a cleanup process
 * removes it.
 *
 * @param {!NetSimShard} shard - The shard where this log entry lives.
 * @param {Object} [row] - A row out of the log table on the
 *        shard.  If provided, will initialize this log with the given
 *        data.  If not, this log will initialize to default values.
 * @param {packetHeaderSpec} [packetSpec] - Packet layout spec used to
 *        interpret the contents of the logged packet
 * @constructor
 * @augments NetSimEntity
 */
var NetSimLogEntry = module.exports = function (shard, row, packetSpec) {
  row = row !== undefined ? row : {};
  NetSimEntity.call(this, shard, row);

  /**
   * Node ID of the node that owns this log entry (e.g. a router node)
   * @type {number}
   */
  this.nodeID = row.nodeID;

  /**
   * Binary content of the log entry.  Defaults to empty string.
   * @type {string}
   */
  this.binary = (row.binary !== undefined) ? row.binary : '';

  /**
   * @type {Packet}
   * @private
   */
  this.packet_ = new Packet(packetSpec ? packetSpec : [], this.binary);

  /**
   * Unix timestamp (local) of log creation time.
   * @type {number}
   */
  this.timestamp = (row.timestamp !== undefined) ? row.timestamp : Date.now();
};
NetSimLogEntry.inherits(NetSimEntity);

/**
 * Helper that gets the log table for the configured instance.
 * @returns {NetSimTable}
 */
NetSimLogEntry.prototype.getTable_ = function () {
  return this.shard_.logTable;
};

/** Build own row for the log table  */
NetSimLogEntry.prototype.buildRow_ = function () {
  return {
    nodeID: this.nodeID,
    binary: this.binary,
    timestamp: this.timestamp
  };
};

/**
 * Static async creation method.  Creates a new message on the given shard,
 * and then calls the callback with a success boolean.
 * @param {!NetSimShard} shard
 * @param {!number} nodeID - associated node's row ID
 * @param {!string} binary - log contents
 * @param {!NodeStyleCallback} onComplete (success)
 */
NetSimLogEntry.create = function (shard, nodeID, binary, onComplete) {
  var entity = new NetSimLogEntry(shard);
  entity.nodeID = nodeID;
  entity.binary = binary;
  entity.timestamp = Date.now();
  entity.getTable_().create(entity.buildRow_(), function (err, result) {
    if (err !== null) {
      onComplete(err, null);
      return;
    }
    onComplete(err, new NetSimLogEntry(shard, result));
  });
};

/**
 * Get requested packet header field as a number.  Returns empty string
 * if the requested field is not in the current packet format.
 * @param {Packet.HeaderType} field
 * @returns {number|string}
 */
NetSimLogEntry.prototype.getHeaderField = function (field) {
  try {
    return this.packet_.getHeaderAsInt(field);
  } catch (e) {
    return '';
  }
};

/** Get packet message as binary. */
NetSimLogEntry.prototype.getMessageBinary = function () {
  return formatBinary(this.packet_.getBodyAsBinary(), BITS_PER_BYTE);
};

/** Get packet message as ASCII */
NetSimLogEntry.prototype.getMessageAscii = function () {
  return this.packet_.getBodyAsAscii(BITS_PER_BYTE);
};
},{"../utils":235,"./NetSimEntity":136,"./Packet":175,"./dataConverters":177}],175:[function(require,module,exports){
/* jshint
 funcscope: true,
 newcap: true,
 nonew: true,
 shadow: false,
 unused: true,

 maxlen: 90,
 maxparams: 3,
 maxstatements: 200
 */
'use strict';

var minifyBinary = require('./dataConverters').minifyBinary;
var dataConverters = require('./dataConverters');

/**
 * Single packet header field type
 * @typedef {Object} packetHeaderField
 * @property {Packet.HeaderType} key - Used to identify the field, for parsing.
 * @property {number} bits - How long (in bits) the field is.
 */

/**
 * Packet header specification type
 * Note: Always assumes variable-length body following the header.
 * @typedef {packetHeaderField[]} packetHeaderSpec
 */

/**
 * Wraps binary packet content with the format information required to
 * interpret it.
 * @param {packetHeaderSpec} formatSpec
 * @param {string} binary
 * @constructor
 */
var Packet = module.exports = function (formatSpec, binary) {
  validateSpec(formatSpec);

  /** @type {Packet.Encoder} */
  this.encoder = new Packet.Encoder(formatSpec);

  /** @type {string} of binary content */
  this.binary = binary;
};

/**
 * Possible packet header fields.  Values to this enum become keys
 * that can be used when defining a level configuration.  They also correspond
 * to class names that get applied to fields representing data in that column.
 * @enum {string}
 * @readonly
 */
Packet.HeaderType = {
  TO_ADDRESS: 'toAddress',
  FROM_ADDRESS: 'fromAddress',
  PACKET_INDEX: 'packetIndex',
  PACKET_COUNT: 'packetCount'
};

/**
 * @param {Packet.HeaderType} headerType
 * @returns {string} of binary content
 */
Packet.prototype.getHeaderAsBinary = function (headerType) {
  return this.encoder.getHeader(headerType, this.binary);
};

/**
 * @param {Packet.HeaderType} headerType
 * @returns {number}
 */
Packet.prototype.getHeaderAsInt = function (headerType) {
  return this.encoder.getHeaderAsInt(headerType, this.binary);
};

/**
 * @returns {string} binary content
 */
Packet.prototype.getBodyAsBinary = function () {
  return this.encoder.getBody(this.binary);
};

/**
 * @param {number} bitsPerChar
 * @returns {string} ascii content
 */
Packet.prototype.getBodyAsAscii = function (bitsPerChar) {
  return this.encoder.getBodyAsAscii(this.binary, bitsPerChar);
};

/**
 * Verify that a given format specification describes a valid format that
 * can be used by the Packet.Encoder object.
 * @param {packetHeaderSpec} formatSpec
 */
var validateSpec = function (formatSpec) {
  var keyCache = {};

  for (var i = 0; i < formatSpec.length; i++) {

    if (!formatSpec[i].hasOwnProperty('key')) {
      throw new Error("Invalid packet format: Each field must have a key.");
    }

    if (!formatSpec[i].hasOwnProperty('bits')) {
      throw new Error("Invalid packet format: Each field must have a length.");
    }

    if (keyCache.hasOwnProperty(formatSpec[i].key)) {
      throw new Error("Invalid packet format: Field keys must be unique.");
    } else {
      keyCache[formatSpec[i].key] = 'used';
    }

    if (formatSpec[i].bits === Infinity) {
      throw new Error("Invalid packet format: Infinity field length not allowed.");
    }
  }
};

/**
 * Given a particular packet format, can convert a set of fields down
 * into a binary string matching the specification, or extract fields
 * on demand from a binary string.
 * @param {packetHeaderSpec} formatSpec - Specification of packet format, an
 *        ordered set of objects in the form {key:string, bits:number} where
 *        key is the field name you'll use to retrieve the information, and
 *        bits is the length of the field.
 * @constructor
 */
Packet.Encoder = function (formatSpec) {
  validateSpec(formatSpec);

  /** @type {packetHeaderSpec} */
  this.formatSpec_ = formatSpec;
};

/**
 * Retrieve requested header field by key from the provided binary blob.
 *
 * @param {Packet.HeaderType} key - which header to retrieve
 * @param {string} binary for entire packet
 * @returns {string} binary string value for header field
 * @throws when requested key is not in the configured packet spec
 */
Packet.Encoder.prototype.getHeader = function (key, binary) {
  var ruleIndex = 0, binaryIndex = 0;

  // Strip whitespace so we don't worry about being passed formatted binary
  binary = minifyBinary(binary);

  while (this.formatSpec_[ruleIndex].key !== key) {
    binaryIndex += this.formatSpec_[ruleIndex].bits;
    ruleIndex++;

    if (ruleIndex >= this.formatSpec_.length) {
      // Didn't find key
      throw new Error('Key "' + key + '" not found in packet spec.');
    }
  }

  // Read value
  var bits = binary.slice(binaryIndex, binaryIndex + this.formatSpec_[ruleIndex].bits);

  // Right-pad with zeroes to desired size
  if (this.formatSpec_[ruleIndex].bits !== Infinity) {
    while (bits.length < this.formatSpec_[ruleIndex].bits) {
      bits += '0';
    }
  }

  return bits;
};

/**
 * @param {Packet.HeaderType} key - field name
 * @param {string} binary - entire packet as a binary string
 * @returns {number} - requested field, interpreted as an int.
 */
Packet.Encoder.prototype.getHeaderAsInt = function (key, binary) {
  return dataConverters.binaryToInt(this.getHeader(key, binary));
};

/**
 * Skip over headers given in spec and return remainder of binary which
 * must be the message body.
 * @param {string} binary - entire packet as a binary string
 * @returns {string} packet body binary string
 */
Packet.Encoder.prototype.getBody = function (binary) {
  return minifyBinary(binary)
      .slice(Packet.Encoder.getHeaderLength(this.formatSpec_));
};

/**
 * @param {packetHeaderSpec} formatSpec
 * @returns {number} How many bits the header takes up
 */
Packet.Encoder.getHeaderLength = function (formatSpec) {
  return formatSpec.reduce(function (prev, cur) {
    return prev + cur.bits;
  }, 0);
};

/**
 * Skip over headers given in spec, and return remainder of packet interpreted
 * to ascii with the given character width.
 * @param {string} binary - entire packet as a binary string
 * @param {number} bitsPerChar - bits to represent as a single character,
 *        recommended to use 8 for normal ASCII.
 */
Packet.Encoder.prototype.getBodyAsAscii = function (binary, bitsPerChar) {
  return dataConverters.binaryToAscii(this.getBody(binary), bitsPerChar);
};

/**
 * Given a "headers" object where the values are numbers, returns a corresponding
 * "headers" object where the values have all been converted to binary
 * representations at the appropriate width.  Only header fields that appear in
 * the configured packet header format will be converted and passed through to
 * output.
 * @param {Object} headers - with number values
 */
Packet.Encoder.prototype.makeBinaryHeaders = function (headers) {
  var binaryHeaders = {};
  this.formatSpec_.forEach(function (headerField){
    if (headers.hasOwnProperty(headerField.key)) {
      binaryHeaders[headerField.key] = dataConverters.intToBinary(
          headers[headerField.key], headerField.bits);
    }
  });
  return binaryHeaders;
};

/**
 * Takes a set of binary headers and a binary body, and generates a complete
 * packet binary matching the configured packet spec in terms of header width
 * and ordering.
 *
 * @param {Object} binaryHeaders - hash containing packet headers in binary, where
 *        the hash keys correspond to the "key" values in the packet spec, and
 *        the hash values are binary strings.
 * @param {string} body - binary string of the unlimited-length body of the
 *        packet, which will be placed after the packet headers.
 *
 * @returns {string} binary string of provided data, conforming to configured
 *          packet format.
 */
Packet.Encoder.prototype.concatenateBinary = function (binaryHeaders, body) {
  var parts = [];

  this.formatSpec_.forEach(function (fieldSpec) {
    // Get header value from provided headers, if it exists.
    // If not, we'll start with an empty string and pad it to the correct
    // length, below.
    var fieldBits = binaryHeaders.hasOwnProperty(fieldSpec.key) ?
        binaryHeaders[fieldSpec.key] : '';

    // Right-truncate to the desired size
    fieldBits = fieldBits.slice(0, fieldSpec.bits);

    // Left-pad to desired size
    fieldBits = dataConverters.zeroPadLeft(fieldBits, fieldSpec.bits);

    parts.push(fieldBits);
  });

  parts.push(body);

  return parts.join('');
};

},{"./dataConverters":177}],177:[function(require,module,exports){
/* jshint
 funcscope: true,
 newcap: true,
 nonew: true,
 shadow: false,
 unused: true,

 maxlen: 90,
 maxparams: 3,
 maxstatements: 200
 */
'use strict';

require('../utils'); // For String.prototype.repeat polyfill

/**
 * Converts a binary string into its most compact string representation.
 * @param {string} binaryString that may contain whitespace
 * @returns {string} binary string with no whitespace
 */
exports.minifyBinary = function (binaryString) {
  return binaryString.replace(/[^01]/g, '');
};

/**
 * Converts a binary string to a formatted representation, with chunks of
 * a set size separated by a space.
 * @param {string} binaryString - may be unformatted already
 * @param {number} chunkSize - how many bits per format chunk
 * @returns {string} pretty formatted binary string
 */
exports.formatBinary = function (binaryString, chunkSize) {
  if (chunkSize <= 0) {
    throw new RangeError("Parameter chunkSize must be greater than zero");
  }

  var binary = exports.minifyBinary(binaryString);

  var chunks = [];
  for (var i = 0; i < binary.length; i += chunkSize) {
    chunks.push(binary.substr(i, chunkSize));
  }

  return chunks.join(' ');
};

/**
 * Converts a hexadecimal string into its most compact string representation.
 * Strips whitespace and non-hex characters, and coerces letters to uppercase.
 * @param {string} hexString
 * @returns {string}
 */
exports.minifyHex = function (hexString) {
  return hexString.replace(/[^0-9A-F]/gi, '').toUpperCase();
};

/**
 * Reduces all whitespace to single characters and strips non-digits.
 * @param decimalString
 */
exports.minifyDecimal = function (decimalString) {
  return decimalString.replace(/(^\s+|\s+$|[^0-9\s])/g, '').replace(/\s+/g, ' ');
};

/**
 * Converts a hex string to a formatted representation, with chunks of
 * a set size separated by a space.
 * @param {string} hexString
 * @param {number} chunkSize - in bits!
 * @returns {string} formatted hex
 */
exports.formatHex = function (hexString, chunkSize) {
  if (chunkSize <= 0) {
    throw new RangeError("Parameter chunkSize must be greater than zero");
  }

  // Don't format hex when the chunkSize doesn't align with hex characters.
  if (chunkSize % 4 !== 0) {
    return hexString;
  }

  var hexChunkSize = chunkSize / 4;
  var hex = exports.minifyHex(hexString);

  var chunks = [];
  for (var i = 0; i < hex.length; i += hexChunkSize) {
    chunks.push(hex.substr(i, hexChunkSize));
  }

  return chunks.join(' ');
};

/**
 * Takes a set of whitespace-separated numbers and pads the spacing between
 * them to the width of the widest number, so that they line up when they
 * wrap.
 * @param {string} decimalString
 * @returns {string} aligned decimal string
 */
exports.alignDecimal = function (decimalString) {
  if (decimalString.replace(/\D/g, '') === '') {
    return '';
  }

  var numbers = exports.minifyDecimal(decimalString).split(/\s+/);

  // Find the length of the longest number
  var mostDigits = numbers.reduce(function(prev, cur) {
    if (cur.length > prev) {
      return cur.length;
    }
    return prev;
  }, 0);

  var zeroPadding = '0'.repeat(mostDigits);

  return numbers.map(function (numString) {
    // Left-pad each number with non-breaking spaces up to max width.
    return (zeroPadding + numString).slice(-mostDigits);
  }).join(' ');
};

/**
 * Interprets a binary string as a single number, and returns that number.
 * @param {string} binaryString
 * @returns {number}
 */
exports.binaryToInt = function (binaryString) {
  return parseInt(exports.minifyBinary(binaryString), 2);
};

exports.zeroPadLeft = function (string, desiredWidth) {
  var padding = '0'.repeat(desiredWidth);
  return (padding + string).slice(-desiredWidth);
};

exports.zeroPadRight = function (string, desiredWidth) {
  var padding = '0'.repeat(desiredWidth);
  return (string + padding).substr(0, desiredWidth);
};

var intToString = function (int, base, width) {
  if (width <= 0) {
    throw new RangeError("Output width must be greater than zero");
  }
  return exports.zeroPadLeft(int.toString(base), width);
};

/**
 * Converts a number to a binary string representation with the given width.
 * @param {number} int - number to convert
 * @param {number} width - number of bits to use
 * @returns {string} - binary representation with length of "width"
 */
exports.intToBinary = function (int, width) {
  return intToString(int, 2, width);
};

/**
 * Interprets a hex string as a single number, and returns that number.
 * @param hexadecimalString
 * @returns {Number}
 */
exports.hexToInt = function (hexadecimalString) {
  return parseInt(exports.minifyHex(hexadecimalString), 16);
};

/**
 * Converts a number to a hexadecimal string representation with the given
 * width.
 * @param {number} int - number to convert
 * @param {number} width - number of characters to use
 * @returns {string} - hex representation with length of "width"
 */
exports.intToHex = function (int, width) {
  return intToString(int, 16, width).toUpperCase();
};

/**
 * Converts a hex string to a binary string, by mapping each hex character
 * to four bits of binary.
 * @param {string} hexadecimalString
 * @returns {string} binary representation.
 */
exports.hexToBinary = function (hexadecimalString) {
  var uglyHex = exports.minifyHex(hexadecimalString);
  var binary = '';

  for (var i = 0; i < uglyHex.length; i++) {
    binary += exports.intToBinary(exports.hexToInt(uglyHex.substr(i, 1)), 4);
  }

  return binary;
};

/**
 * Converts a binary string to a hex string, mapping each four bits into
 * a hex character and right-padding with zeroes to round out the binary length.
 * @param {string} binaryString
 * @returns {string}
 */
exports.binaryToHex = function (binaryString) {
  var currentNibble;
  var nibbleWidth = 4;
  var chars = [];
  var uglyBinary = exports.minifyBinary(binaryString);
  for (var i = 0; i < uglyBinary.length; i += nibbleWidth) {
    currentNibble = exports.zeroPadRight(uglyBinary.substr(i, nibbleWidth), nibbleWidth);
    chars.push(exports.intToHex(exports.binaryToInt(currentNibble), 1));
  }
  return chars.join('');
};

/**
 * Converts a string set of numbers to a binary representation of those numbers
 * using the given byte-size.
 * @param {string} decimalString - A set of numbers separated by whitespace.
 * @param {number} byteSize - How many bits to use to represent each number.
 * @returns {string} Binary representation.
 */
exports.decimalToBinary = function (decimalString, byteSize) {
  // Special case: No numbers
  if (decimalString.replace(/\D/g, '') === '') {
    return '';
  }

  return exports.minifyDecimal(decimalString)
      .split(/\s+/)
      .map(function (numString) {
        return exports.intToBinary(parseInt(numString, 10), byteSize);
      })
      .join('');
};

/**
 * Converts binary to a string of decimal numbers separated by whitespace.
 * @param {string} binaryString
 * @param {number} byteSize - How many bits to read for each number
 * @returns {string} decimal numbers
 */
exports.binaryToDecimal = function (binaryString, byteSize) {
  var currentByte;
  var numbers = [];
  var binary = exports.minifyBinary(binaryString);
  for (var i = 0; i < binary.length; i += byteSize) {
    currentByte = exports.zeroPadRight(binary.substr(i, byteSize), byteSize);
    numbers.push(exports.binaryToInt(currentByte));
  }
  return numbers.join(' ');
};

/**
 * Converts ascii to binary, using the given bytesize for each character.
 * Overflow is ignored (left-trimmed); recommend using a bytesize of 8 in
 * most circumstances.
 * @param {string} asciiString
 * @param {number} byteSize
 * @returns {string}
 */
exports.asciiToBinary = function (asciiString, byteSize) {
  var bytes = [];
  for (var i = 0; i < asciiString.length; i++) {
    bytes.push(exports.intToBinary(asciiString.charCodeAt(i), byteSize));
  }
  return bytes.join('');
};

/**
 * Converts binary to an ascii string, using the given bytesize for each
 * character.  If the binary is not divisible by bytesize, the final character
 * is right-padded.
 * @param {string} binaryString
 * @param {number} byteSize
 * @returns {string} ASCII string
 */
exports.binaryToAscii = function (binaryString, byteSize) {
  if (byteSize <= 0) {
    throw new RangeError("Parameter byteSize must be greater than zero");
  }

  var currentByte;
  var chars = [];
  var binary = exports.minifyBinary(binaryString);
  for (var i = 0; i < binary.length; i += byteSize) {
    currentByte = exports.zeroPadRight(binary.substr(i, byteSize), byteSize);
    chars.push(String.fromCharCode(exports.binaryToInt(currentByte)));
  }
  return chars.join('');
};

},{"../utils":235}],140:[function(require,module,exports){
/* jshint
 funcscope: true,
 newcap: true,
 nonew: true,
 shadow: false,
 unused: true,

 maxlen: 90,
 maxparams: 3,
 maxstatements: 200
 */
'use strict';

require('../utils');
var NetSimClientNode = require('./NetSimClientNode');
var NetSimEntity = require('./NetSimEntity');
var NetSimMessage = require('./NetSimMessage');
var NetSimHeartbeat = require('./NetSimHeartbeat');
var NetSimLogger = require('./NetSimLogger');
var ObservableEvent = require('../ObservableEvent');

var logger = NetSimLogger.getSingleton();

/**
 * Client model of node being simulated on the local client.
 *
 * Provides special access for manipulating the locally-owned client node in
 * ways that you aren't allowed to manipulate other client nodes.
 *
 * @param {!NetSimShard} shard
 * @param {Object} [clientRow] - Lobby row for this router.
 * @constructor
 * @augments NetSimClientNode
 */
var NetSimLocalClientNode = module.exports = function (shard, clientRow) {
  NetSimClientNode.call(this, shard, clientRow);

  // TODO (bbuchanan): Consider:
  //      Do we benefit from inheritance here?  Would it be cleaner to make this
  //      not-an-entity that manipulates a stock NetSimClientNode?  Will another
  //      developer find it easy to understand how this class works?

  /**
   * Client nodes can only have one wire at a time.
   * @type {NetSimWire}
   */
  this.myWire = null;

  /**
   * Client nodes can be connected to a router, which they will
   * help to simulate.
   * @type {NetSimRouterNode}
   */
  this.myRouter = null;

  /**
   * @type {netsimLevelConfiguration}
   * @private
   */
  this.levelConfig_ = {};

  /**
   * Widget where we will post sent messages.
   * @type {NetSimLogPanel}
   * @private
   */
  this.sentLog_ = null;

  /**
   * Widget where we will post received messages
   * @type {NetSimLogPanel}
   * @private
   */
  this.receivedLog_ = null;

  /**
   * Tells the network that we're alive
   * @type {NetSimHeartbeat}
   * @private
   */
  this.heartbeat_ = null;

  /**
   * Change event others can observe, which we will fire when we
   * connect to a router or disconnect from a router.
   * @type {ObservableEvent}
   */
  this.routerChange = new ObservableEvent();

  /**
   * Callback for when something indicates that this node has been
   * disconnected from the instance.
   * @type {function}
   * @private
   */
  this.onNodeLostConnection_ = undefined;
};
NetSimLocalClientNode.inherits(NetSimClientNode);

/**
 * Static async creation method. See NetSimEntity.create().
 * @param {!NetSimShard} shard
 * @param {!NodeStyleCallback} onComplete - Method that will be given the
 *        created entity, or null if entity creation failed.
 */
NetSimLocalClientNode.create = function (shard, onComplete) {
  NetSimEntity.create(NetSimLocalClientNode, shard, function (err, node) {
    if (err !== null) {
      onComplete(err, node);
      return;
    }

    // Give our newly-created local node a heartbeat
    NetSimHeartbeat.getOrCreate(shard, node.entityID, function (err, heartbeat) {
      if (err !== null) {
        onComplete(err, null);
        return;
      }

      // Attach a heartbeat failure (heart attack?) callback to
      // detect and respond to a disconnect.
      node.heartbeat_ = heartbeat;
      node.heartbeat_.setFailureCallback(node.onFailedHeartbeat_.bind(node));

      onComplete(null, node);
    });
  });
};

/** @inheritdoc */
NetSimLocalClientNode.prototype.getStatus = function () {
  return this.status_ ? this.status_ : 'Online';
};

/** Set node's display name.  Does not trigger an update! */
NetSimLocalClientNode.prototype.setDisplayName = function (displayName) {
  this.displayName_ = displayName;
};

/**
 * Configure this node controller to actively simulate, and to post sent and
 * received messages to the given log widgets.
 * @param {!netsimLevelConfiguration} levelConfig
 * @param {!NetSimLogPanel} sentLog
 * @param {!NetSimLogPanel} receivedLog
 */
NetSimLocalClientNode.prototype.initializeSimulation = function (levelConfig,
    sentLog, receivedLog) {
  this.levelConfig_ = levelConfig;
  this.sentLog_ = sentLog;
  this.receivedLog_ = receivedLog;

  // Subscribe to message table changes
  var newMessageEvent = this.shard_.messageTable.tableChange;
  var newMessageHandler = this.onMessageTableChange_.bind(this);
  this.newMessageEventKey_ = newMessageEvent.register(newMessageHandler);
  logger.info("Local node registered for messageTable tableChange");
};

/**
 * Gives the simulating node a chance to unregister from anything it was
 * observing.
 */
NetSimLocalClientNode.prototype.stopSimulation = function () {
  if (this.newMessageEventKey_ !== undefined) {
    var newMessageEvent = this.shard_.messageTable.tableChange;
    newMessageEvent.unregister(this.newMessageEventKey_);
    this.newMessageEventKey_ = undefined;
    logger.info("Local node registered for messageTable tableChange");
  }
};

/**
 * Our own client must send a regular heartbeat to broadcast its presence on
 * the shard.
 * @param {!RunLoop.Clock} clock
 */
NetSimLocalClientNode.prototype.tick = function (clock) {
  this.heartbeat_.tick(clock);
  if (this.myRouter) {
    this.myRouter.tick(clock);
  }
};

/**
 * Handler for a heartbeat update failure.  Propagates the failure up through
 * our own "lost connection" callback.
 * @private
 */
NetSimLocalClientNode.prototype.onFailedHeartbeat_ = function () {
  logger.error("Heartbeat failed.");
  if (this.onNodeLostConnection_ !== undefined) {
    this.onNodeLostConnection_();
  }
};

/**
 * Give this node an action to take if it detects that it is no longer part
 * of the shard.
 * @param {function} onNodeLostConnection
 * @throws if set would clobber a previously-set callback.
 */
NetSimLocalClientNode.prototype.setLostConnectionCallback = function (
    onNodeLostConnection) {
  if (this.onNodeLostConnection_ !== undefined &&
      onNodeLostConnection !== undefined) {
    throw new Error('Node already has a lost connection callback.');
  }
  this.onNodeLostConnection_ = onNodeLostConnection;
};

/**
 * If a client update fails, should attempt an automatic reconnect.
 * @param {NodeStyleCallback} [onComplete]
 */
NetSimLocalClientNode.prototype.update = function (onComplete) {
  onComplete = onComplete || function () {};

  var self = this;
  NetSimLocalClientNode.superPrototype.update.call(this, function (err, result) {
    if (err !== null) {
      logger.error("Update failed.");
      if (self.onNodeLostConnection_ !== undefined) {
        self.onNodeLostConnection_();
      }
    }
    onComplete(err, result);
  });
};

/**
 * Connect to a remote node.
 * @param {NetSimNode} otherNode
 * @param {!NodeStyleCallback} onComplete
 * @override
 */
NetSimLocalClientNode.prototype.connectToNode = function (otherNode, onComplete) {
  NetSimLocalClientNode.superPrototype.connectToNode.call(this, otherNode,
      function (err, wire) {
        if (!err) {
          this.myWire = wire;
        }
        onComplete(err, wire);
      }.bind(this));
};

/**
 * @param {!NetSimRouterNode} router
 * @param {NodeStyleCallback} onComplete
 */
NetSimLocalClientNode.prototype.connectToRouter = function (router, onComplete) {
  onComplete = onComplete || function () {};

  this.connectToNode(router, function (err, wire) {
    if (err) {
      onComplete(err);
      return;
    }

    this.myRouter = router;
    this.myRouter.initializeSimulation(this.entityID,
        this.levelConfig_.routerExpectsPacketHeader);

    router.requestAddress(wire, this.getHostname(), function (err) {
      if (err) {
        wire.destroy(function () {
          onComplete(err);
        });
        this.myWire = null;
        return;
      }

      this.myRouter = router;
      this.routerChange.notifyObservers(this.myWire, this.myRouter);

      this.status_ = "Connected to " + router.getDisplayName() +
          " with address " + wire.localAddress;
      this.update(onComplete);
    }.bind(this));
  }.bind(this));
};

/**
 * @param {NodeStyleCallback} [onComplete]
 */
NetSimLocalClientNode.prototype.disconnectRemote = function (onComplete) {
  onComplete = onComplete || function () {};

  var self = this;
  this.myWire.destroy(function (err) {
    if (err) {
      onComplete(err);
      return;
    }

    self.myWire = null;
    // Trigger an immediate router update so its connection count is correct.
    self.myRouter.update(onComplete);
    self.myRouter.stopSimulation();
    self.myRouter = null;
    self.routerChange.notifyObservers(null, null);
  });
};

/**
 * Put a message on our outgoing wire, to whatever we are connected to
 * at the moment.
 * @param {string} payload
 * @param {!NodeStyleCallback} onComplete
 */
NetSimLocalClientNode.prototype.sendMessage = function (payload, onComplete) {
  if (!this.myWire) {
    onComplete(new Error('Cannot send message; not connected.'));
    return;
  }

  var localNodeID = this.myWire.localNodeID;
  var remoteNodeID = this.myWire.remoteNodeID;
  var self = this;
  NetSimMessage.send(this.shard_, localNodeID, remoteNodeID, payload,
      function (err) {
        if (err) {
          logger.error('Failed to send message; ' + err.message + ': ' +
              JSON.stringify(payload));
          onComplete(err);
          return;
        }

        logger.info('Local node sent message');
        if (self.sentLog_) {
          self.sentLog_.log(payload);
        }
        onComplete(null);
      }
  );
};

/**
 * Sequentially puts a list of messages onto the outgoing wire, to whatever
 * we are connected to at the moment.
 * @param {string[]} payloads
 * @param {!NodeStyleCallback} onComplete
 */
NetSimLocalClientNode.prototype.sendMessages = function (payloads, onComplete) {
  if (payloads.length === 0) {
    onComplete(null);
    return;
  }

  this.sendMessage(payloads[0], function (err, result) {
    if (err !== null) {
      onComplete(err, result);
      return;
    }

    this.sendMessages(payloads.slice(1), onComplete);
  }.bind(this));
};

/**
 * Listens for changes to the message table.  Detects and handles messages
 * sent to this node.
 * @param {Array} rows
 * @private
 */
NetSimLocalClientNode.prototype.onMessageTableChange_ = function (rows) {
  if (this.isProcessingMessages_) {
    // We're already in this method, getting called recursively because
    // we are making changes to the table.  Ignore this call.
    return;
  }

  var messages = rows
      .map(function (row) {
        return new NetSimMessage(this.shard_, row);
      }.bind(this))
      .filter(function (message) {
        return message.toNodeID === this.entityID;
      }.bind(this));

  if (messages.length === 0) {
    // No messages for us, no work to do
    return;
  }

  // Setup (sync): Set processing flag
  logger.info("Local node received " + messages.length + " messages");
  this.isProcessingMessages_ = true;

  // Step 1 (async): Pull all our messages out of storage
  NetSimEntity.destroyEntities(messages, function (err) {
    if (err) {
      logger.error('Error pulling message off the wire: ' + err.message);
      this.isProcessingMessages_ = false;
      return;
    }

    // Step 2 (sync): Handle all messages
    messages.forEach(function (message) {
      this.handleMessage_(message);
    }, this);

    // Cleanup (sync): Clear processing flag
    logger.info("Local node finished processing " + messages.length + " messages");
    this.isProcessingMessages_ = false;
  }.bind(this));
};

/**
 * Post message to 'received' log.
 * @param {!NetSimMessage} message
 * @private
 */
NetSimLocalClientNode.prototype.handleMessage_ = function (message) {
  // TODO: How much validation should we do here?
  if (this.receivedLog_) {
    this.receivedLog_.log(message.payload);
  }
};
},{"../ObservableEvent":1,"../utils":235,"./NetSimClientNode":124,"./NetSimEntity":136,"./NetSimHeartbeat":137,"./NetSimLogger":145,"./NetSimMessage":146}],146:[function(require,module,exports){
/* jshint
 funcscope: true,
 newcap: true,
 nonew: true,
 shadow: false,
 unused: true,

 maxlen: 90,
 maxparams: 5,
 maxstatements: 200
 */
'use strict';

require('../utils');
var NetSimEntity = require('./NetSimEntity');

/**
 * Local controller for a message that is 'on the wire'
 *
 * Doesn't actually have any association with the wire - one could,
 * theoretically, send a message from any node in the simulation to any other
 * node in the simulation.
 *
 * Any message that exists in the table is 'in transit' to a node.  Nodes
 * should remove messages as soon as they receive them.
 *
 * @param {!NetSimShard} shard - The shard where this wire lives.
 * @param {Object} [messageRow] - A row out of the _message table on the
 *        shard.  If provided, will initialize this message with the given
 *        data.  If not, this message will initialize to default values.
 * @constructor
 * @augments NetSimEntity
 */
var NetSimMessage = module.exports = function (shard, messageRow) {
  messageRow = messageRow !== undefined ? messageRow : {};
  NetSimEntity.call(this, shard, messageRow);

  /**
   * Node ID that this message is 'in transit' from.
   * @type {number}
   */
  this.fromNodeID = messageRow.fromNodeID;

  /**
   * Node ID that this message is 'in transit' to.
   * @type {number}
   */
  this.toNodeID = messageRow.toNodeID;

  /**
   * All other message content, including the 'packets' students will send.
   * @type {*}
   */
  this.payload = messageRow.payload;
};
NetSimMessage.inherits(NetSimEntity);

/**
 * Static async creation method.  Creates a new message on the given shard,
 * and then calls the callback with a success boolean.
 * @param {!NetSimShard} shard
 * @param {!number} fromNodeID - sender node ID
 * @param {!number} toNodeID - destination node ID
 * @param {*} payload - message content
 * @param {!NodeStyleCallback} onComplete (success)
 */
NetSimMessage.send = function (shard, fromNodeID, toNodeID, payload, onComplete) {
  var entity = new NetSimMessage(shard);
  entity.fromNodeID = fromNodeID;
  entity.toNodeID = toNodeID;
  entity.payload = payload;
  entity.getTable_().create(entity.buildRow_(), onComplete);
};

/**
 * Helper that gets the wires table for the configured instance.
 * @returns {NetSimTable}
 */
NetSimMessage.prototype.getTable_ = function () {
  return this.shard_.messageTable;
};

/**
 * @typedef {Object} messageRow
 * @property {number} fromNodeID - this message in-flight-from node
 * @property {number} toNodeID - this message in-flight-to node
 * @property {string} payload - binary message content, all of which can be
 *           exposed to the student.  May contain headers of its own.
 */

/**
 * Build own row for the message table
 * @returns {messageRow}
 */
NetSimMessage.prototype.buildRow_ = function () {
  return {
    fromNodeID: this.fromNodeID,
    toNodeID: this.toNodeID,
    payload: this.payload
  };
};

},{"../utils":235,"./NetSimEntity":136}],145:[function(require,module,exports){
/* jshint
 funcscope: true,
 newcap: true,
 nonew: true,
 shadow: false,
 unused: true,

 maxlen: 90,
 maxparams: 3,
 maxstatements: 200
 */
'use strict';

/**
 * Logging API to control log levels and support different browsers
 * @constructor
 * @param {Console} window console API
 * @param {LogLevel} verbosity
 */
var NetSimLogger = module.exports = function (outputConsole, verbosity /*=VERBOSE*/) {
  /**
   * @type {Console}
   * @private
   */
  this.outputConsole_ = outputConsole;

  /**
   * Always mapped to console.log, or no-op if not available.
   * @type {Function}
   * @private
   */
  this.log_ = function () {};

  /**
   * If configured for info logging, gets mapped to console.info,
   * falls back to console.log, or no-op.
   * @type {Function}
   */
  this.info = function () {};

  /**
   * If configured for warning logging, gets mapped to console.warn,
   * falls back to console.log, or no-op.
   * @type {Function}
   */
  this.warn = function () {};

  /**
   * If configured for error logging, gets mapped to console.error,
   * falls back to console.log, or no-op.
   * @type {Function}
   */
  this.error = function () {};

  this.setVerbosity((undefined === verbosity) ?
      LogLevel.VERBOSE : verbosity);
};

/**
 * Log verbosity levels enum.
 * @readonly
 * @enum {number}
 */
var LogLevel = {
  NONE: 0,
  ERROR: 1,
  WARN: 2,
  INFO: 3,
  VERBOSE: 4
};
NetSimLogger.LogLevel = LogLevel;

/**
 * Global singleton
 * @type {NetSimLogger}
 */
var singletonInstance;

/**
 * Static getter/lazy-creator for the global singleton instance.
 * @returns {NetSimLogger}
 */
NetSimLogger.getSingleton = function () {
  if (singletonInstance === undefined) {
    singletonInstance = new NetSimLogger(console, LogLevel.VERBOSE);
  }
  return singletonInstance;
};

/**
 * Binds internal function calls according to given verbosity level.
 * @param verbosity
 */
NetSimLogger.prototype.setVerbosity = function (verbosity) {
  // Note: We don't call this.outputConsole_.log.bind here, because in IE9 the
  // console's logging methods do not inherit from Function.

  this.log_ = (this.outputConsole_ && this.outputConsole_.log) ?
      Function.prototype.bind.call(this.outputConsole_.log, this.outputConsole_) :
      function () {};

  if (verbosity >= LogLevel.INFO) {
    this.info = (this.outputConsole_ && this.outputConsole_.info) ?
        Function.prototype.bind.call(this.outputConsole_.info, this.outputConsole_) :
        this.log_;
  } else {
    this.info = function () {};
  }

  if (verbosity >= LogLevel.WARN) {
    this.warn = (this.outputConsole_ && this.outputConsole_.warn) ?
        Function.prototype.bind.call(this.outputConsole_.warn, this.outputConsole_) :
        this.log_;
  } else {
    this.warn = function () {};
  }

  if (verbosity >= LogLevel.ERROR) {
    this.error = (this.outputConsole_ && this.outputConsole_.error) ?
        Function.prototype.bind.call(this.outputConsole_.error, this.outputConsole_) :
        this.log_;
  } else {
    this.error = function () {};
  }
};

/**
 * Writes to output, depending on log level
 * @param {*} message
 * @param {LogLevel} logLevel
 */
NetSimLogger.prototype.log = function (message, logLevel /*=INFO*/) {
  if (undefined === logLevel) {
    logLevel = LogLevel.INFO;
  }

  switch (logLevel) {
    case LogLevel.ERROR:
      this.error(message);
      break;
    case LogLevel.WARN:
      this.warn(message);
      break;
    case LogLevel.INFO:
      this.info(message);
      break;
    default:
      this.log_(message);
  }
};

},{}],137:[function(require,module,exports){
/* jshint
 funcscope: true,
 newcap: true,
 nonew: true,
 shadow: false,
 unused: true,

 maxlen: 90,
 maxparams: 3,
 maxstatements: 200
 */
'use strict';

require('../utils');
var NetSimEntity = require('./NetSimEntity');

/**
 * How often a heartbeat is sent, in milliseconds
 * Six seconds, against the one-minute timeout over in NetSimShardCleaner,
 * gives a heartbeat at least nine chances to update before it gets cleaned up.
 * @type {number}
 * @const
 */
var DEFAULT_HEARTBEAT_INTERVAL_MS = 6000;

/**
 * Sends regular heartbeat messages to the heartbeat table on the given
 * shard, for the given node.
 * @param {!NetSimShard} shard
 * @param {*} row
 * @constructor
 * @augments NetSimEntity
 */
var NetSimHeartbeat = module.exports = function (shard, row) {
  // TODO (bbuchanan): Consider:
  //      Will this scale?  Can we move the heartbeat system to an in-memory
  //      store on the server - or even better, hook into whatever our
  //      notification service uses to read presence on a channel?
  
  row = row !== undefined ? row : {};
  NetSimEntity.call(this, shard, row);

  /** @type {number} Row ID in node table */
  this.nodeID = row.nodeID;

  /**
   * @type {number} unix timestamp (ms)
   * @private
   */
  this.time_ = row.time !== undefined ? row.time : Date.now();

  /**
   * @type {number} How often heartbeat is sent, in milliseconds
   * @private
   */
  this.intervalMs_ = DEFAULT_HEARTBEAT_INTERVAL_MS;

  /**
   * A heartbeat can be given a recovery action to take if it fails to
   * update its remote row.
   * @type {function}
   * @private
   */
  this.onFailedHeartbeat_ = undefined;
};
NetSimHeartbeat.inherits(NetSimEntity);

/**
 * Static async creation method.  See NetSimEntity.create().
 * @param {!NetSimShard} shard
 * @param {!NodeStyleCallback} onComplete - Method that will be given the
 *        created entity, or null if entity creation failed.
 */
NetSimHeartbeat.create = function (shard, onComplete) {
  NetSimEntity.create(NetSimHeartbeat, shard, onComplete);
};

/**
 * Static "upsert" of heartbeat
 * @param {!NetSimShard} shard
 * @param {!number} nodeID
 * @param {!NodeStyleCallback} onComplete
 */
NetSimHeartbeat.getOrCreate = function (shard, nodeID, onComplete) {
  // TODO (bbuchanan): Extend storage API to support an upsert operation, and
  //      use that here.  Would be even better if our backend storage supported
  //      it (like mongodb).
  shard.heartbeatTable.readAll(function (err, rows) {
    var nodeRows = rows
        .filter(function (row) {
          return row.nodeID == nodeID;
        })
        .sort(function (a, b) {
          return a.time < b.time ? 1 : -1;
        });

    if (nodeRows.length > 0) {
      onComplete(null, new NetSimHeartbeat(shard, nodeRows[0]));
    } else {
      NetSimHeartbeat.create(shard, function (err, newHeartbeat) {
        if (err !== null) {
          onComplete(err, null);
          return;
        }

        newHeartbeat.nodeID = nodeID;
        newHeartbeat.update(function (err) {
          if (err !== null) {
            // Failed to fully create heartbeat
            newHeartbeat.destroy();
            onComplete(err, null);
            return;
          }
          onComplete(null, newHeartbeat);
        });
      });
    }
  });
};

/**
 * Helper that gets the wires table for the configured shard.
 * @returns {NetSimTable}
 * @override
 */
NetSimHeartbeat.prototype.getTable_ = function () {
  return this.shard_.heartbeatTable;
};

/**
 * Build own row for the wire table
 * @override
 */
NetSimHeartbeat.prototype.buildRow_ = function () {
  return {
    nodeID: this.nodeID,
    time: this.time_
  };
};

/**
 * Change how often this heartbeat attempts to update its remote storage
 * self.  Default value is 6 seconds.  Warning! If set too high, this
 * heartbeat may be seen as expired by another client and get cleaned up!
 *
 * @param {number} intervalMs - time between udpates, in milliseconds
 */
NetSimHeartbeat.prototype.setBeatInterval = function (intervalMs) {
  this.intervalMs_ = intervalMs;
};

/**
 * Set a handler to call if this heartbeat is unable to update its remote
 * storage representation.  Can be used to go into a recovery mode,
 * acknowledge disconnect, and/or attempt an auto-reconnect.
 * @param {function} onFailedHeartbeat
 * @throws if set would clobber a previously-set callback
 */
NetSimHeartbeat.prototype.setFailureCallback = function (onFailedHeartbeat) {
  if (this.onFailedHeartbeat_ !== undefined && onFailedHeartbeat !== undefined) {
    throw new Error("Heartbeat already has a failure callback.");
  }
  this.onFailedHeartbeat_ = onFailedHeartbeat;
};

/**
 * Updates own row on regular interval, as long as something's making
 * it tick.
 */
NetSimHeartbeat.prototype.tick = function () {
  if (Date.now() - this.time_ > this.intervalMs_) {
    this.time_ = Date.now();
    this.update(function (err) {
      if (err !== null) {
        // A failed heartbeat update may indicate that we've been disconnected
        // or kicked from the shard.  We may want to take action.
        if (this.onFailedHeartbeat_ !== undefined) {
          this.onFailedHeartbeat_();
        }
      }
    }.bind(this));
  }
};

},{"../utils":235,"./NetSimEntity":136}],124:[function(require,module,exports){
/* jshint
 funcscope: true,
 newcap: true,
 nonew: true,
 shadow: false,
 unused: true,

 maxlen: 90,
 maxparams: 3,
 maxstatements: 200
 */
'use strict';

require('../utils');
var NodeType = require('./netsimConstants').NodeType;
var NetSimNode = require('./NetSimNode');

/**
 * Client model of simulated node
 *
 * Represents the client's view of a node that is controlled by a user client,
 * either by our own client or somebody else's.  Is a NetSimEntity, meaning
 * it wraps a row in the node table and provides functionality around it.
 *
 * You may be looking for NetSimLocalClientNode if you're trying to manipulate
 * your local client node.
 *
 * @param {!NetSimShard} shard
 * @param {Object} [clientRow] - Lobby row for this router.
 * @constructor
 * @augments NetSimNode
 */
var NetSimClientNode = module.exports = function (shard, clientRow) {
  NetSimNode.call(this, shard, clientRow);
};
NetSimClientNode.inherits(NetSimNode);

/** @inheritdoc */
NetSimClientNode.prototype.getNodeType = function () {
  return NodeType.CLIENT;
};

/** @inheritdoc */
NetSimClientNode.prototype.getStatus = function () {
  return this.status_ ? this.status_ : 'Online';
};

},{"../utils":235,"./NetSimNode":149,"./netsimConstants":181}],149:[function(require,module,exports){
/* jshint
 funcscope: true,
 newcap: true,
 nonew: true,
 shadow: false,
 unused: true,

 maxlen: 90,
 maxparams: 3,
 maxstatements: 200
 */
'use strict';

require('../utils');
var NetSimEntity = require('./NetSimEntity');
var NetSimWire = require('./NetSimWire');

/**
 * Client model of simulated network entity, which lives
 * in a shard table.
 *
 * Wraps the entity row with helper methods for examining and maintaining
 * the entity state in shared storage.
 *
 * @param {!NetSimShard} shard
 * @param {Object} [nodeRow] JSON row from table.
 * @constructor
 * @augments NetSimEntity
 */
var NetSimNode = module.exports = function (shard, nodeRow) {
  nodeRow = nodeRow !== undefined ? nodeRow : {};
  NetSimEntity.call(this, shard, nodeRow);

  /**
   * @type {string}
   * @private
   */
  this.displayName_ = nodeRow.name;

  /**
   * @type {string}
   * @private
   */
  this.status_ = nodeRow.status;

  /**
   * @type {string}
   * @private
   */
  this.statusDetail_ = nodeRow.statusDetail;
};
NetSimNode.inherits(NetSimEntity);

/**
 * Get shared table for nodes
 * @returns {SharedTable}
 * @private
 */
NetSimNode.prototype.getTable_= function () {
  return this.shard_.nodeTable;
};

/** Build table row for this node */
NetSimNode.prototype.buildRow_ = function () {
  return {
    type: this.getNodeType(),
    name: this.getDisplayName(),
    status: this.getStatus(),
    statusDetail: this.getStatusDetail()
  };
};

/**
 * Get node's display name, which is stored in table.
 * @returns {string}
 */
NetSimNode.prototype.getDisplayName = function () {
  return this.displayName_ ? this.displayName_ : '[New Node]';
};

/**
 * Get node's hostname, a modified version of its display name.
 * @returns {string}
 */
NetSimNode.prototype.getHostname = function () {
  // Strip everything that's not a word-character or a digit from the display
  // name, then append the node ID so that hostnames are more likely to
  // be unique.
  return this.getDisplayName().replace(/[^\w\d]/g, '').toLowerCase() +
      this.entityID;
};

/**
 * Get node's type.
 * @returns {NodeType}
 */
NetSimNode.prototype.getNodeType = function () {
  throw new Error('getNodeType method is not implemented');
};

/**
 * Get node's status, usually a string enum value.
 * @returns {string}
 */
NetSimNode.prototype.getStatus = function () {
  return this.status_;
};

/**
 * Get node's additional status info, usually display-only
 * status info.
 * @returns {string}
 */
NetSimNode.prototype.getStatusDetail = function () {
  return this.statusDetail_ ? this.statusDetail_ : '';
};

/**
 * Establish a connection between this node and another node,
 * by creating a wire between them, and verifying that the remote node
 * can accept the connection.
 * When finished, calls onComplete({the new wire})
 * On failure, calls onComplete(null)
 * @param {!NetSimNode} otherNode
 * @param {NodeStyleCallback} [onComplete]
 */
NetSimNode.prototype.connectToNode = function (otherNode, onComplete) {
  onComplete = onComplete || function () {};

  var self = this;
  NetSimWire.create(this.shard_, this.entityID, otherNode.entityID, function (err, wire) {
    if (err) {
      onComplete(err, null);
      return;
    }

    otherNode.acceptConnection(self, function (err, isAccepted) {
      if (err || !isAccepted) {
        wire.destroy(function () {
          onComplete(new Error('Connection rejected.'), null);
        });
        return;
      }

      onComplete(null, wire);
    });
  });
};

/**
 * Called when another node establishes a connection to this one, giving this
 * node a chance to reject the connection.
 * @param {!NetSimNode} otherNode attempting to connect to this one
 * @param {!NodeStyleCallback} onComplete response method - should call with TRUE
 *        if connection is allowed, FALSE if connection is rejected.
 */
NetSimNode.prototype.acceptConnection = function (otherNode, onComplete) {
  onComplete(null, true);
};
},{"../utils":235,"./NetSimEntity":136,"./NetSimWire":174}],174:[function(require,module,exports){
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

require('../utils');
var NetSimEntity = require('./NetSimEntity');

/**
 * Local controller for a simulated connection between nodes,
 * which is stored in the wire table on the shard.  The controller can
 * be initialized with the JSON row from the table, effectively wrapping that
 * data in helpful methods.
 *
 * @param {!NetSimShard} shard - The shard where this wire lives.
 * @param {Object} [wireRow] - A row out of the _wire table on the shard.
 *        If provided, will initialize this wire with the given data.  If not,
 *        this wire will initialize to default values.
 * @constructor
 * @augments NetSimEntity
 */
var NetSimWire = module.exports = function (shard, wireRow) {
  wireRow = wireRow !== undefined ? wireRow : {};
  NetSimEntity.call(this, shard, wireRow);

  /**
   * Connected node row IDs within the _lobby table
   * @type {number}
   */
  this.localNodeID = wireRow.localNodeID;
  this.remoteNodeID = wireRow.remoteNodeID;

  /**
   * Assigned local addresses for the ends of this wire.
   * When connected to a router, remoteAddress is always 1.
   * @type {number}
   */
  this.localAddress = wireRow.localAddress;
  this.remoteAddress = wireRow.remoteAddress;

  /**
   * Display hostnames for the ends of this wire.
   * Generally, each endpoint should set its own hostname.
   * @type {string}
   */
  this.localHostname = wireRow.localHostname;
  this.remoteHostname = wireRow.remoteHostname;
};
NetSimWire.inherits(NetSimEntity);

/**
 * Static async creation method.  See NetSimEntity.create().
 * @param {!NetSimShard} shard
 * @param {!number} localNodeID
 * @param {!number} remoteNodeID
 * @param {!NodeStyleCallback} onComplete - Method that will be given the
 *        created entity, or null if entity creation failed.
 */
NetSimWire.create = function (shard, localNodeID, remoteNodeID, onComplete) {
  var entity = new NetSimWire(shard);
  entity.localNodeID = localNodeID;
  entity.remoteNodeID = remoteNodeID;
  entity.getTable_().create(entity.buildRow_(), function (err, row) {
    if (err !== null) {
      onComplete(err, null);
      return;
    }
    onComplete(null, new NetSimWire(shard, row));
  });
};

/**
 * Helper that gets the wires table for the configured shard.
 * @returns {NetSimTable}
 */
NetSimWire.prototype.getTable_ = function () {
  return this.shard_.wireTable;
};

/** Build own row for the wire table  */
NetSimWire.prototype.buildRow_ = function () {
  return {
    localNodeID: this.localNodeID,
    remoteNodeID: this.remoteNodeID,
    localAddress: this.localAddress,
    remoteAddress: this.remoteAddress,
    localHostname: this.localHostname,
    remoteHostname: this.remoteHostname
  };
};

},{"../utils":235,"./NetSimEntity":136}],136:[function(require,module,exports){
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

/**
 * Client model of simulated network entity, which lives in a shard table.
 *
 * Wraps the entity row with helper methods for examining and maintaining
 * the entity state in shared storage.
 *
 * @param {!NetSimShard} shard
 * @param {Object} [entityRow] JSON row from table.
 * @constructor
 */
var NetSimEntity = module.exports = function (shard, entityRow) {
  if (entityRow === undefined) {
    entityRow = {};
  }

  /**
   * @type {NetSimShard}
   * @protected
   */
  this.shard_ = shard;

  /**
   * Node's row ID within the _lobby table.  Unique within instance.
   * @type {number}
   */
  this.entityID = entityRow.id;
};

/**
 * Static async creation method.  Creates a new entity on the given shard,
 * and then calls the callback with a local controller for the new entity.
 * @param {!function} EntityType - The constructor for the entity type you want
 *        to create.
 * @param {!NetSimShard} shard
 * @param {!NodeStyleCallback} onComplete - Method that will be given the
 *        created entity, or null if entity creation failed.
 */
NetSimEntity.create = function (EntityType, shard, onComplete) {
  var entity = new EntityType(shard);
  entity.getTable_().create(entity.buildRow_(), function (err, row) {
    if (err === null) {
      onComplete(null, new EntityType(shard, row));
    } else {
      onComplete(err, null);
    }
  });
};

/**
 * Static async retrieval method.  Searches for a new entity on the given
 * shard, and then calls the callback with a local controller for the
 * found entity.
 * @param {!function} EntityType - The constructor for the entity type you want
 *        to find.
 * @param {!number} entityID - The row ID for the entity you'd like to find.
 * @param {!NetSimShard} shard
 * @param {!NodeStyleCallback} onComplete - Method that will be given the
 *        found entity, or null if entity search failed.
 */
NetSimEntity.get = function (EntityType, entityID, shard, onComplete) {
  var entity = new EntityType(shard);
  entity.getTable_().read(entityID, function (err, row) {
    var newEntity = null;
    if (!err) {
      newEntity = new EntityType(shard, row);
    }
    onComplete(err, newEntity);
  });
};

/**
 * Push entity state into remote storage.
 * @param {NodeStyleCallback} [onComplete] - Optional completion callback.
 */
NetSimEntity.prototype.update = function (onComplete) {
  onComplete = onComplete || function () {};

  this.getTable_().update(this.entityID, this.buildRow_(), onComplete);
};

/**
 * Remove entity from remote storage.
 * @param {NodeStyleCallback} [onComplete] - Optional completion callback
 */
NetSimEntity.prototype.destroy = function (onComplete) {
  onComplete = onComplete || function () {};

  this.getTable_().delete(this.entityID, onComplete);
};

/** Get storage table for this entity type. */
NetSimEntity.prototype.getTable_ = function () {
  // This method should be implemented by a child class.
  throw new Error('Method getTable_ is not implemented.');
};

/** Construct table row for this entity. */
NetSimEntity.prototype.buildRow_ = function () {
  return {};
};

/**
 * Destroys all provided entities (from remote storage) asynchronously, and
 * calls onComplete when all entities have been destroyed and/or an error occurs.
 * @param {NetSimEntity[]} entities
 * @param {!NodeStyleCallback} onComplete
 */
NetSimEntity.destroyEntities = function (entities, onComplete) {
  if (entities.length === 0) {
    onComplete(null, true);
    return;
  }

  entities[0].destroy(function (err, result) {
    if (err) {
      onComplete(err, result);
      return;
    }

    NetSimEntity.destroyEntities(entities.slice(1), onComplete);
  }.bind(this));
};

},{}],123:[function(require,module,exports){
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

var markup = require('./NetSimChunkSizeControl.html');
var EncodingType = require('./netsimConstants').EncodingType;

/**
 * Generator and controller for chunk size slider/selector
 * @param {jQuery} rootDiv
 * @param {function} chunkSizeChangeCallback
 * @constructor
 */
var NetSimChunkSizeControl = module.exports = function (rootDiv,
    chunkSizeChangeCallback) {
  /**
   * Component root, which we fill whenever we call render()
   * @type {jQuery}
   * @private
   */
  this.rootDiv_ = rootDiv;

  /**
   * @type {function}
   * @private
   */
  this.chunkSizeChangeCallback_ = chunkSizeChangeCallback;

  /**
   * Internal state
   * @type {number}
   * @private
   */
  this.currentChunkSize_ = 8;

  /**
   * Fill in the blank: "8 bits per _"
   * @type {Array.<String>}
   * @private
   */
  this.currentUnits_ = ['byte'];

  this.render();
};

/**
 * Fill the root div with new elements reflecting the current state
 */
NetSimChunkSizeControl.prototype.render = function () {
  var renderedMarkup = $(markup({}));
  this.rootDiv_.html(renderedMarkup);
  this.rootDiv_.find('.chunk_size_slider').slider({
    value: this.currentChunkSize_,
    min: 1,
    max: 32,
    step: 1,
    slide: this.onChunkSizeChange_.bind(this)
  });
  this.setChunkSize(this.currentChunkSize_);
};

/**
 * Change handler for jQueryUI slider control.
 * @param {Event} event
 * @param {Object} ui
 * @param {jQuery} ui.handle - The jQuery object representing the handle that
 *        was changed.
 * @param {number} ui.value - The current value of the slider.
 * @private
 */
NetSimChunkSizeControl.prototype.onChunkSizeChange_ = function (event, ui) {
  var newChunkSize = ui.value;
  this.setChunkSize(newChunkSize);
  this.chunkSizeChangeCallback_(newChunkSize);
};

/**
 * Update the slider and its label to display the provided value.
 * @param {number} newChunkSize
 */
NetSimChunkSizeControl.prototype.setChunkSize = function (newChunkSize) {
  var rootDiv = this.rootDiv_;
  this.currentChunkSize_ = newChunkSize;
  rootDiv.find('.chunk_size_slider').slider('option', 'value', newChunkSize);
  rootDiv.find('.chunk_size_value').html(newChunkSize);
};

/**
 * @param {EncodingType[]} newEncodings
 */
NetSimChunkSizeControl.prototype.setEncodings = function (newEncodings) {
  this.currentUnits_.length = 0;

  if (newEncodings.indexOf(EncodingType.ASCII) > -1) {
    this.currentUnits_.push('character'); // TODO: localize
  }

  if (newEncodings.indexOf(EncodingType.DECIMAL) > -1) {
    this.currentUnits_.push('number'); // TODO: localize
  }

  if (this.currentUnits_.length === 0){
    this.currentUnits_.push('byte'); // TODO: localize
  }

  this.rootDiv_.find('.unit_label').html(this.currentUnits_.join('/'));
};

},{"./NetSimChunkSizeControl.html":122,"./netsimConstants":181}],181:[function(require,module,exports){
/* jshint
 funcscope: true,
 newcap: true,
 nonew: true,
 shadow: false,
 unused: true,

 maxlen: 90,
 maxstatements: 200
 */
/* global exports */
'use strict';

/**
 * @type {number}
 * @const
 */
exports.BITS_PER_NIBBLE = 4;

/**
 * @type {number}
 * @const
 */
exports.BITS_PER_BYTE = 8;

/**
 * Types of nodes that can show up in the simulation.
 * @enum {string}
 */
exports.NodeType = {
  CLIENT: 'client',
  ROUTER: 'router'
};

/**
 * DNS modes for the simulator.  Only applies in variant 3, when connecting
 * to a router.
 * @enum {string}
 */
exports.DnsMode = {
  /** There is no DNS node.  Everyone can see every other node's address. */
  NONE: 'none',

  /** One user acts as the DNS node at a time.  Everyone can see their own
   *  address and the DNS node's address, but nothing else. */
  MANUAL: 'manual',

  /** An automatic DNS node is added to the simulation.  Nodes are automatically
   *  registered with the DNS on connection. */
  AUTOMATIC: 'automatic'
};

/**
 * Encodings that can be used to interpret and display binary messages in
 * the simulator.
 * Map to class-names that can be applied to related table rows.
 * @enum {string}
 */
exports.EncodingType = {
  /** Renders each chunk of bits (using variable chunksize) in ascii */
  ASCII: 'ascii',

  /** Renders each chunk of bits (using variable chunksize) in decimal */
  DECIMAL: 'decimal',

  /** Renders each binary nibble as a hex character. */
  HEXADECIMAL: 'hexadecimal',

  /** All packet data is actually stored and moved around in binary, so
   *  the 'binary' encoding just represents access to that raw data. */
  BINARY: 'binary',

  /** An encoding used early in the lessons to show that binary isn't always
   *  1s and 0s.  Just like binary, but replaces 1/0 with A/B. */
  A_AND_B: 'a_and_b'
};

/**
 * Enumeration of tabs for level configuration
 * @enum {string}
 */
exports.NetSimTabType = {
  INSTRUCTIONS: 'instructions',
  MY_DEVICE: 'my_device',
  ROUTER: 'router',
  DNS: 'dns'
};

/**
 * Column types that can be used any time a packet is displayed on the page.
 * Related to Packet.HeaderType, but different because this includes columns
 * that aren't part of the header, and groups the packetInfo together.
 * Map to class-names that can be applied to related table cells.
 * @enum {string}
 */
exports.PacketUIColumnType = {
  ENCODING_LABEL: 'encodingLabel',
  TO_ADDRESS: 'toAddress',
  FROM_ADDRESS: 'fromAddress',
  PACKET_INFO: 'packetInfo',
  MESSAGE: 'message'
};

},{}],122:[function(require,module,exports){
module.exports= (function() {
  var t = function anonymous(locals, filters, escape) {
escape = escape || function (html){
  return String(html)
    .replace(/&(?!\w+;)/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
};
var buf = [];
with (locals || {}) { (function(){ 
 buf.push('<div class="netsim_chunk_size_control">\n  <label for="chunk_size_slider"><span class="chunk_size_value"></span> bits per <span class="unit_label"></span></label>\n  <div class="chunk_size_slider"></div>\n</div>\n'); })();
} 
return buf.join('');
};
  return function(locals) {
    return t(locals, require("ejs").filters);
  }
}());
},{"ejs":256}],121:[function(require,module,exports){
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

var markup = require('./NetSimBandwidthControl.html');
var i18n = require('../../locale/current/netsim');

/**
 * Min value of 2 is 2^2 or 4bps
 * @type {number}
 * @const
 */
var SLIDER_MIN_VALUE = 2;

/**
 * Slider value is used as the exponent,
 * so max value of 18 here is actually 2^18 or 256Kbps
 * Since the top value is treated as Infinity, that means the max values are:
 *   ---64Kbps----128Kbps----Infinity-|
 * @type {number}
 * @const
 */
var SLIDER_MAX_VALUE = 18;

/**
 * @type {number}
 * @const
 */
var BITS_PER_KILOBIT = 1024;

/**
 * @type {number}
 * @const
 */
var BITS_PER_MEGABIT = 1024 * BITS_PER_KILOBIT;

/**
 * @type {number}
 * @const
 */
var BITS_PER_GIGABIT = 1024 * BITS_PER_MEGABIT;

/**
 * Generator and controller for packet size slider/selector
 * @param {jQuery} rootDiv
 * @param {function} bandwidthChangeCallback
 * @constructor
 */
var NetSimBandwidthControl = module.exports = function (rootDiv,
    bandwidthChangeCallback) {
  /**
   * Component root, which we fill whenever we call render()
   * @type {jQuery}
   * @private
   */
  this.rootDiv_ = rootDiv;

  /**
   * @type {function}
   * @private
   */
  this.bandwidthChangeCallback_ = bandwidthChangeCallback;

  /**
   * Internal state
   * @type {number}
   * @private
   */
  this.bandwidth_ = this.sliderValueToBandwidth_(SLIDER_MAX_VALUE);

  this.render();
};

/**
 * Fill the root div with new elements reflecting the current state
 */
NetSimBandwidthControl.prototype.render = function () {
  var renderedMarkup = $(markup({
    minValue: this.getDisplayBandwidth_(this.sliderValueToBandwidth_(SLIDER_MIN_VALUE)),
    maxValue: this.getDisplayBandwidth_(this.sliderValueToBandwidth_(SLIDER_MAX_VALUE))
  }));
  this.rootDiv_.html(renderedMarkup);
  this.rootDiv_.find('.slider').slider({
    value: this.bandwidthToSliderValue_(this.bandwidth_),
    min: SLIDER_MIN_VALUE,
    max: SLIDER_MAX_VALUE,
    step: 1,
    slide: this.onSliderValueChange_.bind(this)
  });
  this.setLabel_(this.bandwidth_);
};

NetSimBandwidthControl.prototype.bandwidthToSliderValue_ = function (bandwidth) {
  if (bandwidth === Infinity) {
    return SLIDER_MAX_VALUE;
  }
  return Math.floor(Math.log(bandwidth) / Math.LN2);
};

NetSimBandwidthControl.prototype.sliderValueToBandwidth_ = function (sliderValue) {
  if (sliderValue === SLIDER_MAX_VALUE) {
    return Infinity;
  }
  return Math.pow(2, sliderValue);
};

/**
 * Change handler for jQueryUI slider control.
 * @param {Event} event
 * @param {Object} ui
 * @param {jQuery} ui.handle - The jQuery object representing the handle that
 *        was changed.
 * @param {number} ui.value - The current value of the slider.
 * @private
 */
NetSimBandwidthControl.prototype.onSliderValueChange_ = function (event, ui) {
  var newPacketSize = this.sliderValueToBandwidth_(ui.value);
  this.setLabel_(newPacketSize);
  this.bandwidthChangeCallback_(newPacketSize);
};

/**
 * Update the slider and its label to display the provided value.
 * @param {number} newBandwidth
 */
NetSimBandwidthControl.prototype.setBandwidth = function (newBandwidth) {
  if (this.bandwidth_ === newBandwidth) {
    return;
  }

  this.bandwidth_ = newBandwidth;
  var sliderValue = this.bandwidthToSliderValue_(newBandwidth);
  this.rootDiv_.find('.slider').slider('option', 'value', sliderValue);
  this.setLabel_(newBandwidth);
};

/**
 * @param {number} newBandwidth
 * @private
 */
NetSimBandwidthControl.prototype.setLabel_ = function (newBandwidth) {
  this.rootDiv_.find('.packet_size_value').text(this.getDisplayBandwidth_(newBandwidth));
};

/**
 * @param {number} bandwidth in bits per second
 * @returns {string} localized, shortened and rounded representation: e.g. 2Kbps
 */
NetSimBandwidthControl.prototype.getDisplayBandwidth_ = function (bandwidth) {
  if (bandwidth === Infinity) {
    return i18n.unlimited();
  }

  var gbps = Math.floor(bandwidth / BITS_PER_GIGABIT);
  if (gbps > 0) {
    return i18n.x_Gbps({ x: gbps });
  }

  var mbps = Math.floor(bandwidth / BITS_PER_MEGABIT);
  if (mbps > 0) {
    return i18n.x_Mbps({ x: mbps });
  }

  var kbps = Math.floor(bandwidth / BITS_PER_KILOBIT);
  if (kbps > 0) {
    return i18n.x_Kbps({ x: kbps });
  }

  return i18n.x_bps({ x: bandwidth });
};

},{"../../locale/current/netsim":245,"./NetSimBandwidthControl.html":120}],120:[function(require,module,exports){
module.exports= (function() {
  var t = function anonymous(locals, filters, escape) {
escape = escape || function (html){
  return String(html)
    .replace(/&(?!\w+;)/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
};
var buf = [];
with (locals || {}) { (function(){ 
 buf.push('');1;
var i18n = require('../../locale/current/netsim');
; buf.push('\n<div class="netsim-bandwidth-control netsim-slider">\n  <div class="slider-inline-wrap">\n    <div class="slider"></div>\n    <div class="slider-labels">\n      <div class="max-value">', escape((8,  maxValue )), '</div>\n      <div class="min-value">', escape((9,  minValue )), '</div>\n      <div class="current-value">\n        <label for="packet-size-slider"><span class="packet_size_value"></span></label>\n      </div>\n    </div>\n  </div>\n</div>\n'); })();
} 
return buf.join('');
};
  return function(locals) {
    return t(locals, require("ejs").filters);
  }
}());
},{"../../locale/current/netsim":245,"ejs":256}],245:[function(require,module,exports){
/*netsim*/ module.exports = window.blockly.appLocale;
},{}],119:[function(require,module,exports){
/**
 * @fileoverview Interface to dashboard user data API.
 */

/* jshint
 funcscope: true,
 newcap: true,
 nonew: true,
 shadow: false,
 unused: true,

 maxlen: 90,
 maxparams: 3,
 maxstatements: 200
 */
/* global $ */
'use strict';

// TODO (bbuchanan): This whole file should go away when we have a shared
//                   Javascript User object that can be available on page load.

/**
 * Represents a Dashboard user account - could be a teacher, a student, etc.
 * @constructor
 */
var DashboardUser = module.exports = function () {
  /**
   * Indicates whether the async call has completed yet.
   * @type {boolean}
   */
  this.isReady = false;

  /**
   * Queue of callbacks to hit when this object gets initialized.
   * @type {Array[Function]}
   * @private
   */
  this.whenReadyCallbacks_ = [];

  /**
   * User ID
   * @type {number}
   */
  this.id = undefined;

  /**
   * User display name
   * @type {string}
   */
  this.name = "";
};

/**
 * @type {DashboardUser}
 * @private
 * @static
 */
DashboardUser.currentUser_ = null;

/**
 * Kick of an asynchronous request for the current user's data, and immediately
 * pass back a placeholder object that has a whenReady method others can
 * use to guarantee the data is present.
 *
 * @return {DashboardUser} that doesn't have its data yet, but will soon.
 */
DashboardUser.getCurrentUser = function () {
  if (!DashboardUser.currentUser_) {
    DashboardUser.currentUser_ = new DashboardUser();
    $.ajax({
      url: '/v2/user',
      type: 'get',
      dataType: 'json',
      success: function (data /*, textStatus, jqXHR*/) {
        DashboardUser.currentUser_.initialize(data);
      },
      error: function (/*jqXHR, textStatus, errorThrown*/) {
        DashboardUser.currentUser_.initialize({
          isSignedIn: false
        });
      }
    });
  }
  return DashboardUser.currentUser_;
};

/**
 * Load data into user from async request, when ready.
 * @param data
 */
DashboardUser.prototype.initialize = function (data) {
  this.id = data.id;
  this.name = data.name;
  this.isSignedIn = data.isSignedIn !== false;
  this.isReady = true;

  // Call any queued callbacks
  this.whenReadyCallbacks_.forEach(function (callback) {
    callback(this);
  }.bind(this));
  this.whenReadyCallbacks_.length = 0;
};

/**
 * Provide code to be called when this object is ready to use
 * Possible for it to be called immediately.
 * @param {!function} callback
 */
DashboardUser.prototype.whenReady = function (callback) {
  if (this.isReady) {
    callback(this);
  } else {
    this.whenReadyCallbacks_.push(callback);
  }
};
},{}],49:[function(require,module,exports){
/* jshint
 funcscope: true,
 newcap: true,
 nonew: true,
 shadow: false,
 unused: true,

 maxlen: 90,
 maxparams: 3,
 maxstatements: 200
 */
'use strict';

require('./utils');

var commands = module.exports;

/**
 * @enum {int}
 */
var commandState = {
  NOT_STARTED: 0,
  WORKING: 1,
  SUCCESS: 2,
  FAILURE: 3
};

/**
 * A command is an operation that can be constructed with parameters now,
 * triggered later, and completed even later than that.
 *
 * Similar to a promise or a deferred, commands are useful for non-blocking
 * operations that need to take place with a particular relationship to time
 * or to one another - asynchronous calls that should happen in order, events
 * that should be triggered on a timeline, etc.  Instead of nesting callbacks
 * N-layers-deep, create a queue of commands to run.
 *
 * You'll usually want to define commands for your own unique needs.  A child
 * command should always call the Command constructor from its own constructor,
 * it will almost always need to override onBegin_, and it may want to override
 * tick and onEnd_.  Commands can call success() or fail() on themselves, or
 * wait for others to do so; usage is up to you.
 *
 * @constructor
 */
var Command = commands.Command = function () {
  /**
   * @type {commandState}
   * @private
   */
  this.status_ = commandState.NOT_STARTED;
};

/**
 * Whether the command has started working.
 * @returns {boolean}
 */
Command.prototype.isStarted = function () {
  return this.status_ !== commandState.NOT_STARTED;
};

/**
 * Whether the command has succeeded or failed, and is
 * finished with its work.
 * @returns {boolean}
 */
Command.prototype.isFinished = function () {
  return this.succeeded() || this.failed();
};

/**
 * Whether the command has finished with its work and reported success.
 * @returns {boolean}
 */
Command.prototype.succeeded = function () {
  return this.status_ === commandState.SUCCESS;
};

/**
 * Whether the command has finished with its work and reported failure.
 * @returns {boolean}
 */
Command.prototype.failed = function () {
  return this.status_ === commandState.FAILURE;
};

/**
 * Tells the command to start working.
 */
Command.prototype.begin = function () {
  this.status_ = commandState.WORKING;
  this.onBegin_();
};

/**
 * Called to mark that the command is done with its work and has
 * succeeded.  Might be called by the command itself, or by an external
 * controller.
 * @throws if called before begin()
 */
Command.prototype.succeed = function () {
  if (!this.isStarted()) {
    throw new Error("Command cannot succeed before it begins.");
  }
  this.status_ = commandState.SUCCESS;
  this.onEnd_();
};

/**
 * Called to mark that the command is done with its work and has
 * failed.  Might be called by the command itself, or by an external
 * controller.
 * @throws if called before begin()
 */
Command.prototype.fail = function () {
  if (!this.isStarted()) {
    throw new Error("Command cannot fail before it begins.");
  }
  this.status_ = commandState.FAILURE;
  this.onEnd_();
};

/**
 * Stub to be implemented by descendant classes, of operations to perform
 * when the command begins.
 * @private
 */
Command.prototype.onBegin_ = function () {};

/**
 * Stub to be implemented by descendant classes, of operations to perform
 * on tick.
 * @param {RunLoop.Clock} clock - Time information passed into all tick methods.
 */
Command.prototype.tick = function (/*clock*/) {};

/**
 * Stub to be implemented by descendant classes, of operations to perform
 * when the command either succeeds or fails.
 * @private
 */
Command.prototype.onEnd_ = function () {};

/**
 * A CommandSequence is constructed with a list of commands to be executed
 * in order, either until a command fails or the end of the list is reached.
 * Each command will be started on the first tick where the previous command
 * is found to be successful: If a command succeeds between ticks, the next
 * command will start on the next tick, but if a command succeeds _during_
 * a tick (in its tick() or onBegin_() methods) then the next command may
 * begin immediately.
 *
 * The CommandSequence is itself a command which succeeds after all of the
 * commands it contains have succeeded, or fails if any of the commands it
 * contains have failed.  CommandSequences may thus be nested, and it is
 * often useful for a custom command to inherit from CommandSequence or to
 * contain a CommandSequence.
 *
 * @param {Array.<Command>} commandList - List of commands to be executed
 *        in order, provided each command succeeds.
 * @constructor
 */
var CommandSequence = commands.CommandSequence = function (commandList) {
  Command.call(this);

  /**
   * @type {Array.<Command>}
   * @private
   */
  this.commandList_ = commandList;

  /**
   * @type {number}
   * @private
   */
  this.currentCommandIndex_ = 0;
};
CommandSequence.inherits(Command);

/**
 * @private
 */
CommandSequence.prototype.onBegin_ = function () {
  this.currentCommandIndex_ = 0;

  // Empty sequence succeeds immediately
  if (this.commandList_.length === 0) {
    this.succeed();
  }
};

/**
 * @returns {Command}
 */
CommandSequence.prototype.currentCommand = function () {
  return this.commandList_[this.currentCommandIndex_];
};

/**
 * @param {RunLoop.Clock} clock
 */
CommandSequence.prototype.tick = function (clock) {
  while (this.isStarted() && !this.isFinished() && this.currentCommand()) {
    if (!this.currentCommand().isStarted()) {
      this.currentCommand().begin();
    } else {
      this.currentCommand().tick(clock);
    }

    if (this.currentCommand().succeeded()) {
      this.currentCommandIndex_++;
      if (this.currentCommand() === undefined) {
        this.succeed();
      }
    } else if (this.currentCommand().failed()) {
      this.fail();
    } else {
      // Let the current command work
      break;
    }
  }
};

},{"./utils":235}],47:[function(require,module,exports){
/**
 * Code.org Apps
 *
 * Copyright 2015 Code.org
 * http://code.org/
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @fileoverview Interface to application storage API on pegasus/dashboard
 */

/* jshint
 funcscope: true,
 newcap: true,
 nonew: true,
 shadow: false,
 unused: true,

 maxlen: 90,
 maxparams: 4,
 maxstatements: 200
 */
/* global $ */
/* global JSON */
'use strict';

require('./utils');

/**
 * A node-style callback method, that accepts two parameters: err and result.
 * See article on Node error conventions here:
 * https://docs.nodejitsu.com/articles/errors/what-are-the-error-conventions
 *
 * @callback NodeStyleCallback
 * @param {?Error} err - An error object, or null if no error occurred.
 * @param {*} result - Callback result, of any type depending on the
 *        method being invoked.
 */

/** 
 * Namespace for the client API for accessing channels, tables and properties.
 */
var clientApi = module.exports;

var ApiRequestHelper = function (baseUrl) {
  this.apiBaseUrl_ = baseUrl;
};

/**
 * @param {!string} localUrl - API endpoint relative to API base URL.
 * @param {!NodeStyleCallback} callback
 */
ApiRequestHelper.prototype.get = function (localUrl, callback) {
  $.ajax({
    url: this.apiBaseUrl_ + localUrl,
    type: 'get',
    dataType: 'json'
  }).done(function (data /*, textStatus, jqXHR*/) {
    callback(null, data);
  }).fail(function (jqXHR, textStatus, errorThrown) {
    callback(
        new Error('textStatus: ' + textStatus + '; errorThrown: ' + errorThrown),
        null);
  });
};

/**
 * @param {!string} localUrl - API endpoint relative to API base URL.
 * @param {Object} data
 * @param {!NodeStyleCallback} callback
 */
ApiRequestHelper.prototype.post = function (localUrl, data, callback) {
  $.ajax({
    url: this.apiBaseUrl_ + localUrl,
    type: 'post',
    contentType: 'application/json; charset=utf-8',
    data: JSON.stringify(data)
  }).done(function (/*data, textStatus, jqXHR*/) {
    callback(null, null);
  }).fail(function (jqXHR, textStatus, errorThrown) {
    callback(
        new Error('textStatus: ' + textStatus + '; errorThrown: ' + errorThrown),
        null);
  });
};

/**
 * @param {!string} localUrl - API endpoint relative to API base URL.
 * @param {Object} data
 * @param {!NodeStyleCallback} callback
 */
ApiRequestHelper.prototype.postToGet = function (localUrl, data, callback) {
  $.ajax({
    url: this.apiBaseUrl_ + localUrl,
    type: 'post',
    contentType: 'application/json; charset=utf-8',
    data: JSON.stringify(data)
  }).done(function (data /*, textStatus, jqXHR*/) {
    callback(null, data);
  }).fail(function (jqXHR, textStatus, errorThrown) {
    callback(
        new Error('textStatus: ' + textStatus + '; errorThrown: ' + errorThrown),
        null);
  });
};

/**
 * @param {!string} localUrl - API endpoint relative to API base URL.
 * @param {!NodeStyleCallback} callback
 */
ApiRequestHelper.prototype.delete = function (localUrl, callback) {
  $.ajax({
    url: this.apiBaseUrl_ + localUrl,
    type: 'delete'
  }).done(function (/*data, textStatus, jqXHR*/) {
    callback(null, null);
  }).fail(function (jqXHR, textStatus, errorThrown) {
    callback(
        new Error('textStatus: ' + textStatus + '; errorThrown: ' + errorThrown),
        null);
  });
};

/**
 * API for accessing channel resources on the server.
 * @constructor
 */
clientApi.Channel = function () {
  this.requestHelper_ = new ApiRequestHelper('/v3/channels');
};

/**
 * @param {!NodeStyleCallback} callback
 */
clientApi.Channel.prototype.readAll = function (callback) {
  this.requestHelper_.get('', callback);
};

/**
 * @param {!string} id - unique app GUID
 * @param {!NodeStyleCallback} callback
 */
clientApi.Channel.prototype.read = function (id, callback) {
  this.requestHelper_.get('/' + id, callback);
};

/**
 * @param {!Object} value
 * @param {!NodeStyleCallback} callback
 */
clientApi.Channel.prototype.create = function (value, callback) {
  this.requestHelper_.postToGet('', value, callback);
};

/**
 * @param {!string} id
 * @param {!Object} value
 * @param {!NodeStyleCallback} callback
 */
clientApi.Channel.prototype.update = function (id, value, callback) {
  this.requestHelper_.post('/' + id, value, callback);
};

/**
 * @param {!string} id
 * @param {!NodeStyleCallback} callback
 */
clientApi.Channel.prototype.delete = function (id, callback) {
  this.requestHelper_.delete('/' + id, callback);
};

/**
 * Channel-specific Shared Storage Table
 * Data stored in this table can by modified and retrieved by all users of
 * a particular channel, but is not shared between channels.
 * Only real difference with parent class Channel is that these
 * tables deal in numeric row IDs, not string GUIDs.  Implementation
 * shouldn't care though.
 * @constructor
 * @augments clientApi.Channel
 */
clientApi.SharedTable = function (channel_publickey, table_name) {
  clientApi.Channel.call(this);
  /** Shared tables just use a different base URL */
  this.requestHelper_ = new ApiRequestHelper('/v3/shared-tables/' +
      channel_publickey + '/' + table_name);
};
clientApi.SharedTable.inherits(clientApi.Channel);

/**
 * Channel-specific User Storage Table
 * Data stored in this table can only be modified and retrieved by a particular
 * user of a channel.
 * @constructor
 * @augments clientApi.Channel
 */
clientApi.UserTable = function (channel_publickey, table_name) {
  clientApi.Channel.call(this);
  /** User tables just use a different base URL */
  this.requestHelper_ = new ApiRequestHelper('/v3/user-tables/' +
      channel_publickey + '/' + table_name);
};
clientApi.UserTable.inherits(clientApi.Channel);

/**
 * API for interacting with app property bags on the server.
 * This property bag is shared between all users of the app.
 *
 * @param {!string} channel_publickey
 * @constructor
 */
clientApi.PropertyBag = function (channel_publickey) {
  this.requestHelper_ = new ApiRequestHelper('/v3/shared-properties/' +
      channel_publickey);
};

/**
 * @param {!NodeStyleCallback} callback
 */
clientApi.PropertyBag.prototype.readAll = function (callback) {
  this.requestHelper_.get('', callback);
};

/**
 * @param {string} key
 * @param {!NodeStyleCallback} callback
 */
clientApi.PropertyBag.prototype.read = function (key, callback) {
  this.requestHelper_.get('/' + key, callback);
};

/**
 * @param {string} key
 * @param {Object} value
 * @param {!NodeStyleCallback} callback
 */
clientApi.PropertyBag.prototype.set = function (key, value, callback) {
  this.requestHelper_.post('/' + key, value, callback);
};

/**
 * @param {string} key
 * @param {!NodeStyleCallback} callback
 */
clientApi.PropertyBag.prototype.delete = function (key, callback) {
  this.requestHelper_.delete('/' + key, callback);
};

/**
 * App-specific User-specific property bag
 * Only accessible to the current user of the particular app.
 * @param channel_publickey
 * @constructor
 * @augments clientApi.PropertyBag
 */
clientApi.UserPropertyBag = function (channel_publickey) {
  clientApi.PropertyBag.call(this, channel_publickey);
  /** User property bags just use a different base URL */
  this.requestHelper_ = new ApiRequestHelper('/v3/user-properties/' +
      channel_publickey);
};
clientApi.UserPropertyBag.inherits(clientApi.PropertyBag);

},{"./utils":235}],3:[function(require,module,exports){
/* jshint
 funcscope: true,
 newcap: true,
 nonew: true,
 shadow: false,
 unused: true,

 maxlen: 90,
 maxparams: 3,
 maxstatements: 200
 */
/* global window */
'use strict';

var ObservableEvent = require('./ObservableEvent');

// It is more accurate to use performance.now(), but we use Date.now()
// for compatibility with Safari and older browsers. This should only cause
// a small error in the deltaTime for the initial frame anyway.
// See Also:
// * https://developer.mozilla.org/en-US/docs/Web/API/window.requestAnimationFrame
// * https://developer.mozilla.org/en-US/docs/Web/API/Performance.now
var windowNow = (window.performance && window.performance.now) ?
    window.performance.now.bind(window.performance) : Date.now;

/**
 * Ticks per second on older browsers where we can't lock to the repaint event.
 * @type {number}
 * @const
 */
var FALLBACK_FPS = 30;

/**
 * Precalculated milliseconds per tick for fallback case
 * @type {number}
 * @const
 */
var FALLBACK_MS_PER_TICK = (1000 / FALLBACK_FPS);



/**
 * Simple run-loop manager
 * @constructor
 */
var RunLoop = module.exports = function () {

  /**
   * Whether the run-loop will continue running.
   * @type {boolean}
   */
  this.enabled = false;

  /**
   * Tracks current time and delta time for the loop.
   * Passed to observers when events fire.
   * @type {RunClock}
   */
  this.clock = new RunLoop.Clock();

  /**
   * Method that gets called over and over.
   * @type {Function}
   * @private
   */
  this.tick_ = this.buildTickMethod_();

  /**  @type {ObservableEvent} */
  this.tick = new ObservableEvent();

  /** @type {ObservableEvent} */
  this.render = new ObservableEvent();
};

/**
 * Simple tracking for time values
 * @constructor
 */
RunLoop.Clock = function () {
  /**
   * Time the current/most recent tick started, in ms.
   * Depending on browser this might be epoch time or time since load -
   *  therefore, don't use for absolute time!
   * @type {number}
   */
  this.time = windowNow();

  /**
   * Time in ms between the latest/current tick and the previous tick.
   * Precision dependent on browser capabilities.
   * @type {number}
   */
  this.deltaTime = 0;
};

RunLoop.prototype.buildTickMethod_ = function () {
  var tickMethod;
  var self = this;
  if (window.requestAnimationFrame) {
    tickMethod = function (hiResTimeStamp) {
      if (self.enabled) {
        self.clock.deltaTime = hiResTimeStamp - self.clock.time;
        self.clock.time = hiResTimeStamp;
        self.tick.notifyObservers(self.clock);
        self.render.notifyObservers(self.clock);
        requestAnimationFrame(tickMethod);
      }
    };
  } else {
    tickMethod = function () {
      if (self.enabled) {
        var curTime = windowNow();
        self.clock.deltaTime = curTime - self.clock.time;
        self.clock.time = curTime;
        self.tick.notifyObservers(self.clock);
        self.render.notifyObservers(self.clock);
        setTimeout(tickMethod, FALLBACK_MS_PER_TICK - self.clock.deltaTime);
      }
    };
  }
  return tickMethod;
};

/** Start the run loop (runs immediately) */
RunLoop.prototype.begin = function () {
  this.enabled = true;
  this.clock.time = windowNow();
  this.tick_(this.clock.time);
};

/**
 * Stop the run loop
 * If in the middle of a tick, will finish the current tick.
 * If called by an event between ticks, will prevent the next tick from firing.
 */
RunLoop.prototype.end = function () {
  this.enabled = false;
};

},{"./ObservableEvent":1}],1:[function(require,module,exports){
/* jshint
 funcscope: true,
 newcap: true,
 nonew: true,
 shadow: false,
 unused: true,

 maxlen: 90,
 maxparams: 3,
 maxstatements: 200
 */
'use strict';

/**
 * A subscription/notification atom, used to cleanly hook up callbacks
 * without attaching anything to the DOM or other global scope.
 * @constructor
 */
var ObservableEvent = module.exports = function () {
  /**
   * Objects observing this.
   * @type {Array}
   * @private
   */
  this.observerList_ = [];
};

/**
 * Subscribe a method to be called when notifyObservers is called.
 * @param {function} onNotify - method called when notifyObservers gets called.
 *        Will receive any arguments passed to notifyObservers.
 * @returns {Object} key - used to unregister from observable
 */
ObservableEvent.prototype.register = function (onNotify) {
  var key = {toCall:onNotify};
  Object.freeze(key);
  this.observerList_.push(key);
  return key;
};

/**
 * Unsubscribe from notifications.
 * @param {Object} keyObj - Key generated when registering
 * @returns {boolean} - Whether an unregistration actually occurred
 */
ObservableEvent.prototype.unregister = function (keyObj) {
  for (var i = 0; i < this.observerList_.length; i++) {
    if (keyObj === this.observerList_[i]) {
      this.observerList_.splice(i, 1);
      return true;
    }
  }
  return false;
};

/**
 * Call all methods subscribed to this ObservableEvent, passing through
 * any arguments.
 * @param {...} Any arguments, which are passed through to the observing
 *              functions.
 */
ObservableEvent.prototype.notifyObservers = function () {
  var args = Array.prototype.slice.call( arguments, 0 );
  this.observerList_.forEach(function (observer) {
    observer.toCall.apply(undefined, args);
  });
};
},{}]},{},[179]);
