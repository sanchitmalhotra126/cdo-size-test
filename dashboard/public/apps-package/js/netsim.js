require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({170:[function(require,module,exports){
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

},{"../StudioApp":4,"../appMain":5,"./levels":169,"./netsim":171,"./skins":174}],174:[function(require,module,exports){
var skinBase = require('../skins');

exports.load = function (assetUrl, id) {
  var skin = skinBase.load(assetUrl, id);
  return skin;
};

},{"../skins":178}],171:[function(require,module,exports){
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
  this.skin = null;
  this.level = null;
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
   * Current encoding mode; 'all' or 'binary' or 'ascii', etc.
   * @type {string}
   * @private
   */
  this.encodingMode_ = 'ascii';

  /**
   * Current chunk size (bytesize)
   * @type {number}
   * @private
   */
  this.chunkSize_ = 8;

  /**
   * Current dns mode.
   * Valid values 'none', 'manual', 'automatic'
   * TODO: Move these to an enum
   * @type {string}
   * @private
   */
  this.dnsMode_ = 'none';
};


/**
 *
 */
NetSim.prototype.injectStudioApp = function (studioApp) {
  this.studioApp_ = studioApp;
};

/**
 * Hook up input handlers to controls on the netsim page
 * @private
 */
NetSim.prototype.attachHandlers_ = function () {
};

/**
 * Called on page load.
 * @param {Object} config Requires the following members:
 *   skin: ???
 *   level: ???
 */
NetSim.prototype.init = function(config) {
  if (!this.studioApp_) {
    throw new Error("NetSim requires a StudioApp");
  }

  this.skin = config.skin;
  this.level = config.level;

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

  this.attachHandlers_();

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

/**
 * Initialization that can happen once we have a user name.
 * Could collapse this back into init if at some point we can guarantee that
 * user name is available on load.
 * @param {DashboardUser} user
 * @private
 */
NetSim.prototype.initWithUserName_ = function (user) {
  this.mainContainer_ = $('#netsim');

  this.receivedMessageLog_ = new NetSimLogPanel(
      $('#netsim_received'), 'Received Message Log', false);

  this.sentMessageLog_ = new NetSimLogPanel(
      $('#netsim_sent'), 'Sent Message Log', true);

  this.connection_ = new NetSimConnection(window, this.sentMessageLog_,
      this.receivedMessageLog_, this.shouldEnableCleanup());
  this.connection_.attachToRunLoop(this.runLoop_);
  this.connection_.statusChanges.register(this.refresh_.bind(this));
  this.connection_.shardChange.register(this.onShardChange_.bind(this));

  this.statusPanel_ = new NetSimStatusPanel($('#netsim_status'),
      this.connection_.disconnectFromRouter.bind(this.connection_));

  this.visualization_ = new NetSimVisualization($('svg'), this.runLoop_,
      this.connection_);

  var lobbyContainer = document.getElementById('netsim_lobby_container');
  this.lobbyControl_ = NetSimLobby.createWithin(lobbyContainer,
      this.connection_, user, this.getOverrideShardID());

  // Tab panel - contains instructions, my device, router, dns
  this.tabs_ = new NetSimTabsComponent(
      $('#netsim_tabs'),
      this.setChunkSize.bind(this),
      this.changeEncoding.bind(this),
      this.changeRemoteDnsMode.bind(this),
      this.becomeDnsNode.bind(this));

  this.sendWidget_ = new NetSimSendPanel($('#netsim_send'), this.connection_);

  this.changeEncoding(this.encodingMode_);
  this.setChunkSize(this.chunkSize_);
  this.setDnsMode(this.dnsMode_);
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
 * Propogates the change down into relevant child components, possibly
 * including the control that initiated the change; in that case, re-setting
 * the value should be a no-op and safe to do.
 *
 * @param {string} newEncoding
 */
NetSim.prototype.changeEncoding = function (newEncoding) {
  this.encodingMode_ = newEncoding;
  this.tabs_.setEncoding(newEncoding);
  this.receivedMessageLog_.setEncoding(newEncoding);
  this.sentMessageLog_.setEncoding(newEncoding);
  this.sendWidget_.setEncoding(newEncoding);
};

/**
 * Update chunk-size/bytesize setting across the whole app.
 *
 * Propogates the change down into relevant child components, possibly
 * including the control that initiated the change; in that case, re-setting
 * the value should be a no-op and safe to do.
 *
 * @param {number} newChunkSize
 */
NetSim.prototype.setChunkSize = function (newChunkSize) {
  this.chunkSize_ = newChunkSize;
  this.tabs_.setChunkSize(newChunkSize);
  this.receivedMessageLog_.setChunkSize(newChunkSize);
  this.sentMessageLog_.setChunkSize(newChunkSize);
  this.sendWidget_.setChunkSize(newChunkSize);
};

/**
 * Update DNS mode across the whole app.
 *
 * Propogates the change down into relevant child components, possibly
 * including the control that initiated the change; in that case, re-setting
 * the value should be a no-op and safe to do.
 *
 * @param {"none"|"manual"|"automatic"} newDnsMode
 */
NetSim.prototype.setDnsMode = function (newDnsMode) {
  this.dnsMode_ = newDnsMode;
  this.tabs_.setDnsMode(newDnsMode);
};

/**
 * Sets DNS mode across the whole simulation, propagating the change
 * to other clients.
 * @param {string} newDnsMode
 */
NetSim.prototype.changeRemoteDnsMode = function (newDnsMode) {
  this.setDnsMode(newDnsMode);
  if (this.myConnectedRouter_) {
    var router = this.myConnectedRouter_;
    router.dnsMode = newDnsMode;
    router.update();
  }
};

/**
 * @param {boolean} isDnsNode
 */
NetSim.prototype.setIsDnsNode = function (isDnsNode) {
  this.tabs_.setIsDnsNode(isDnsNode);
  if (this.myConnectedRouter_) {
    this.setDnsTableContents(this.myConnectedRouter_.getAddressTable());
  }
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
  this.tabs_.setDnsTableContents(tableContents);
};

/**
 * @param {Array} logData
 */
NetSim.prototype.setRouterLogData = function (logData) {
  this.tabs_.setRouterLogData(logData);
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
  clientStatus = 'Disconnected';
  if (this.connection_ && this.connection_.myNode) {
    clientStatus = 'In Lobby';
    myHostname = this.connection_.myNode.getHostname();
    if (this.connection_.myNode.myWire) {
      myAddress = this.connection_.myNode.myWire.localAddress;
    }
  }

  if (this.myConnectedRouter_) {
    isConnected = true;
    clientStatus = 'Connected';
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
    // Propagate change
    this.setDnsMode(router.dnsMode);

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

  this.setDnsMode(router.dnsMode);
  this.setIsDnsNode(router.dnsMode === 'manual' &&
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
},{"../RunLoop":3,"./DashboardUser":116,"./NetSimConnection":120,"./NetSimLobby":134,"./NetSimLogPanel":139,"./NetSimSendPanel":153,"./NetSimStatusPanel":157,"./NetSimTabsComponent":160,"./NetSimVisualization":161,"./controls.html":167,"./page.html":173}],173:[function(require,module,exports){
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
  var netsimMsg = require('../../locale/current/netsim');
; buf.push('\n\n<div id="rotateContainer" style="background-image: url(', escape((6,  assetUrl('media/mobile_tutorial_turnphone.png') )), ')">\n  <div id="rotateText">\n    <p>', escape((8,  msg.rotateText() )), '<br>', escape((8,  msg.orientationLock() )), '</p>\n  </div>\n</div>\n\n');12; var instructions = function() {; buf.push('  <div id="bubble" class="clearfix">\n    <table id="prompt-table">\n      <tr>\n        <td id="prompt-icon-cell">\n          <img id="prompt-icon"/>\n        </td>\n        <td id="prompt-cell">\n          <p id="prompt">\n          </p>\n        </td>\n      </tr>\n    </table>\n    <div id="ani-gif-preview-wrapper">\n      <div id="ani-gif-preview">\n        <img id="play-button" src="', escape((26,  assetUrl('media/play-circle.png') )), '"/>\n      </div>\n    </div>\n  </div>\n');30; };; buf.push('\n');31; // A spot for the server to inject some HTML for help content.
var helpArea = function(html) {; buf.push('  ');32; if (html) {; buf.push('    <div id="helpArea">\n      ', (33,  html ), '\n    </div>\n  ');35; }; buf.push('');35; };; buf.push('\n<div id="appcontainer">\n  <div id="netsim">\n    <div id="netsim_rightcol">\n      <div id="netsim_status"></div>\n      <div id="netsim_vizualization">\n        <svg version="1.1" width="300" height="300" xmlns="http://www.w3.org/2000/svg">\n\n          <filter id="backgroundBlur">\n            <feGaussianBlur in="SourceGraphic" stdDeviation="5" />\n            <feComponentTransfer>\n              <feFuncA slope="0.5" type="linear"></feFuncA>\n            </feComponentTransfer>\n          </filter>\n\n          <g id="centered_group" transform="translate(150,150)">\n            <g id="background_group" filter="url(#backgroundBlur)"></g>\n            <g id="foreground_group"></g>\n          </g>\n        </svg>\n      </div>\n      <div id="netsim_tabs"></div>\n    </div>\n    <div id="netsim_leftcol">\n      <div class="leftcol_disconnected">\n        <div id="netsim_lobby_container"></div>\n      </div>\n      <div class="leftcol_connected">\n        <div id="netsim_received"></div>\n        <div id="netsim_sent"></div>\n        <div id="netsim_send"></div>\n      </div>\n    </div>\n  </div>\n  <div id="footers" dir="', escape((69,  data.localeDirection )), '">\n    ');70; instructions() ; buf.push('\n    ');71; helpArea(data.helpHtml) ; buf.push('\n  </div>\n</div>\n\n<div class="clear"></div>\n'); })();
} 
return buf.join('');
};
  return function(locals) {
    return t(locals, require("ejs").filters);
  }
}());
},{"../../locale/current/common":229,"../../locale/current/netsim":234,"ejs":245}],169:[function(require,module,exports){
/*jshint multistr: true */

var msg = require('../../locale/current/netsim');

/*
 * Configuration for all levels.
 */
var levels = module.exports = {};

levels.netsim_demo = {
  'freePlay': true
};

},{"../../locale/current/netsim":234}],234:[function(require,module,exports){
/*netsim*/ module.exports = window.blockly.appLocale;
},{}],167:[function(require,module,exports){
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
},{"ejs":245}],161:[function(require,module,exports){
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
var NetSimWire = require('./NetSimWire');
var NetSimVizNode = require('./NetSimVizNode');
var NetSimVizWire = require('./NetSimVizWire');
var netsimUtils = require('./netsimUtils');
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
  var tableNodes = netsimUtils.nodesFromRows(this.shard_, rows);

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
    neighbors.push(vizEntity.localVizNode);
    neighbors.push(vizEntity.remoteVizNode);
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

},{"../utils":224,"./NetSimVizNode":163,"./NetSimVizWire":164,"./NetSimWire":165,"./netsimUtils":172,"./tweens":175}],164:[function(require,module,exports){
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

},{"../utils":224,"./NetSimVizEntity":162,"./NetSimVizNode":163,"./netsimUtils":172}],163:[function(require,module,exports){
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
var NetSimRouterNode = require('./NetSimRouterNode');
var tweens = require('./tweens');

/**
 * @param {NetSimNode} sourceNode
 * @constructor
 * @augments NetSimVizEntity
 */
var NetSimVizNode = module.exports = function (sourceNode) {
  NetSimVizEntity.call(this, sourceNode);

  // Give our root node a useful class
  var root = this.getRoot();
  root.addClass('viz-node');

  /**
   * @type {boolean}
   */
  this.isRouter = false;

  /**
   *
   * @type {jQuery}
   * @private
   */
  this.circle_ = jQuerySvgElement('circle')
      .attr('cx', 0)
      .attr('cy', 0)
      .attr('r', 37) /* Half of 75 */
      .appendTo(root);

  this.displayName_ = jQuerySvgElement('text')
      .attr('x', 0)
      .attr('y', 2)
      .css('text-anchor', 'middle')
      .appendTo(root);

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

  if (sourceNode.getNodeType() === NetSimRouterNode.getNodeType()) {
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
  this.tweens_ = [];
  if (isForeground) {
    this.tweenToScale(1, 600, tweens.easeOutElastic);
  } else {
    this.tweenToScale(0.5, 600, tweens.easeOutElastic);
  }
};

},{"../utils":224,"./NetSimRouterNode":149,"./NetSimVizEntity":162,"./netsimUtils":172,"./tweens":175}],162:[function(require,module,exports){
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
  this.tweens_ = [];
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

},{"./netsimUtils":172,"./tweens":175}],175:[function(require,module,exports){
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
},{"../utils":224}],160:[function(require,module,exports){
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

/**
 * Wrapper component for tabs panel on the right side of the page.
 * @param {jQuery} rootDiv
 * @param {function} chunkSizeChangeCallback
 * @param {function} encodingChangeCallback
 * @param {function} dnsModeChangeCallback
 * @param {function} becomeDnsCallback
 * @constructor
 */
var NetSimTabsComponent = module.exports = function (rootDiv,
    chunkSizeChangeCallback, encodingChangeCallback, dnsModeChangeCallback,
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
  this.chunkSizeChangeCallback_ = chunkSizeChangeCallback;

  /**
   * @type {function}
   * @private
   */
  this.encodingChangeCallback_ = encodingChangeCallback;

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
  var rawMarkup = buildMarkup({});
  var jQueryWrap = $(rawMarkup);
  this.rootDiv_.html(jQueryWrap);
  this.rootDiv_.find('.netsim_tabs').tabs();

  this.routerTab_ = new NetSimRouterTab(
      this.rootDiv_.find('#tab_router'));

  this.myDeviceTab_ = new NetSimMyDeviceTab(
      this.rootDiv_.find('#tab_my_device'),
      this.chunkSizeChangeCallback_,
      this.encodingChangeCallback_);

  this.dnsTab_ = new NetSimDnsTab(
      this.rootDiv_.find('#tab_dns'),
      this.dnsModeChangeCallback_,
      this.becomeDnsCallback_);
};

/**
 * @param {number} newChunkSize
 */
NetSimTabsComponent.prototype.setChunkSize = function (newChunkSize) {
  this.myDeviceTab_.setChunkSize(newChunkSize);
};

/**
 * @param {string} newEncoding
 */
NetSimTabsComponent.prototype.setEncoding = function (newEncoding) {
  this.myDeviceTab_.setEncoding(newEncoding);
};

/**
 * @param {string} newDnsMode
 */
NetSimTabsComponent.prototype.setDnsMode = function (newDnsMode) {
  this.dnsTab_.setDnsMode(newDnsMode);
};

/**
 * @param {boolean} isDnsNode
 */
NetSimTabsComponent.prototype.setIsDnsNode = function (isDnsNode) {
  this.dnsTab_.setIsDnsNode(isDnsNode);
};

/**
 * @param {Array} tableContents
 */
NetSimTabsComponent.prototype.setDnsTableContents = function (tableContents) {
  this.dnsTab_.setDnsTableContents(tableContents);
};

/**
 * @param {Array} logData
 */
NetSimTabsComponent.prototype.setRouterLogData = function (logData) {
  this.routerTab_.setRouterLogData(logData);
};

},{"./NetSimDnsTab":126,"./NetSimMyDeviceTab":143,"./NetSimRouterTab":151,"./NetSimTabsComponent.html":159}],159:[function(require,module,exports){
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
 buf.push('<div class="netsim_tabs">\n  <ul>\n    <li><a href="#tab_instructions">Instructions</a></li>\n    <li><a href="#tab_my_device">My Device</a></li>\n    <li><a href="#tab_router">Router</a></li>\n    <li><a href="#tab_dns">DNS</a></li>\n  </ul>\n  <div id="tab_instructions">\n    <p>In this activity, you and your group will still be acting as\n    nodes connected to a router.  But this time, the addresses of the\n    nodes are not visible to you.  Pick one member of your group to be\n    the DNS node.  To get the addresses of the other nodes, you must\n    send a message to the DNS node asking for the address of a particular\n    hostname.</p>\n    <p>If you are the DNS node: Go to the DNS tab and click "Take over\n    as DNS."</p>\n  </div>\n  <div id="tab_my_device"></div>\n  <div id="tab_router"></div>\n  <div id="tab_dns"></div>\n</div>'); })();
} 
return buf.join('');
};
  return function(locals) {
    return t(locals, require("ejs").filters);
  }
}());
},{"ejs":245}],157:[function(require,module,exports){
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

},{"../utils":224,"./NetSimPanel.js":146,"./NetSimStatusPanel.html":156}],156:[function(require,module,exports){
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
},{"ejs":245}],153:[function(require,module,exports){
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
var markup = require('./NetSimSendPanel.html');
var KeyCodes = require('../constants').KeyCodes;
var NetSimPanel = require('./NetSimPanel');
var NetSimEncodingControl = require('./NetSimEncodingControl');
var PacketEncoder = require('./PacketEncoder');
var dataConverters = require('./dataConverters');

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
 * @param {jQuery} rootDiv
 * @param {NetSimConnection} connection
 * @constructor
 * @augments NetSimPanel
 */
var NetSimSendPanel = module.exports = function (rootDiv, connection) {
  /**
   * Connection that owns the router we will represent / manipulate
   * @type {NetSimConnection}
   * @private
   */
  this.connection_ = connection;
  this.connection_.statusChanges
      .register(this.onConnectionStatusChange_.bind(this));

  /** @type {number} */
  this.toAddress = 0;
  /** @type {number} */
  this.fromAddress = 0;
  /** @type {number} */
  this.packetIndex = 1;
  /** @type {number} */
  this.packetCount = 1;
  /**
   * Binary string of message body, live-interpreted to other values.
   * @type {string}
   */
  this.message = '';

  /**
   * Bits per chunk/byte for parsing and formatting purposes.
   * @type {number}
   * @private
   */
  this.currentChunkSize_ = 8;
  
  NetSimPanel.call(this, rootDiv, {
    className: 'netsim_send_panel',
    panelTitle: 'Send a Message'
  });
};
NetSimSendPanel.inherits(NetSimPanel);

NetSimSendPanel.prototype.render = function () {
  // Render boilerplate panel stuff
  NetSimSendPanel.superPrototype.render.call(this);

  // Put our own content into the panel body
  var newMarkup = $(markup({}));
  this.getBody().html(newMarkup);

  this.bindElements_();
  this.updateFields_();
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
var whitelistCharacters = function (whitelistRegex) {
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
NetSimSendPanel.prototype.makeKeyupHandler = function (fieldName, converterFunction) {
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
NetSimSendPanel.prototype.makeBlurHandler = function (fieldName, converterFunction) {
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
 * Get relevant elements from the page and bind them to local variables.
 * @private
 */
NetSimSendPanel.prototype.bindElements_ = function () {
  var rootDiv = this.getBody();

  var shortNumberFields = [
    'toAddress',
    'fromAddress',
    'packetIndex',
    'packetCount'
  ];

  var rowTypes = [
    {
      typeName: 'binary',
      shortNumberAllowedCharacters: /[01]/,
      shortNumberConversion: binaryToInt,
      messageAllowedCharacters: /[01\s]/,
      messageConversion: minifyBinary
    },
    {
      typeName: 'hexadecimal',
      shortNumberAllowedCharacters: /[0-9a-f]/i,
      shortNumberConversion: hexToInt,
      messageAllowedCharacters: /[0-9a-f\s]/i,
      messageConversion: hexToBinary
    },
    {
      typeName: 'decimal',
      shortNumberAllowedCharacters: /[0-9]/,
      shortNumberConversion: parseInt,
      messageAllowedCharacters: /[0-9\s]/,
      messageConversion: function (decimalString) {
        return decimalToBinary(decimalString, this.currentChunkSize_);
      }.bind(this)
    },
    {
      typeName: 'ascii',
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
          whitelistCharacters(rowType.shortNumberAllowedCharacters));
      rowFields[fieldName].keyup(
          this.makeKeyupHandler(fieldName, rowType.shortNumberConversion));
      rowFields[fieldName].blur(
          this.makeBlurHandler(fieldName, rowType.shortNumberConversion));
    }, this);

    rowFields.message = tr.find('textarea.message');
    rowFields.message.focus(removeWatermark);
    rowFields.message.keypress(
        whitelistCharacters(rowType.messageAllowedCharacters));
    rowFields.message.keyup(
        this.makeKeyupHandler('message', rowType.messageConversion));
    rowFields.message.blur(
        this.makeBlurHandler('message', rowType.messageConversion));
  }, this);

  this.bitCounter = rootDiv.find('.bit_counter');

  this.sendButton_ = rootDiv.find('#send_button');
  this.sendButton_.click(this.onSendButtonPress_.bind(this));
};

/**
 * Handler for connection status changes.  Can update configuration and
 * trigger a update of this view.
 * @private
 */
NetSimSendPanel.prototype.onConnectionStatusChange_ = function () {
  if (this.connection_.myNode && this.connection_.myNode.myWire) {
    this.fromAddress = this.connection_.myNode.myWire.localAddress;
  } else {
    this.fromAddress = 0;
  }

  this.updateFields_();
};

/**
 * Update send widget display
 * @param {HTMLElement} [skipElement]
 * @private
 */
NetSimSendPanel.prototype.updateFields_ = function (skipElement) {
  var chunkSize = this.currentChunkSize_;
  var liveFields = [];

  [
    'toAddress',
    'fromAddress',
    'packetIndex',
    'packetCount'
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
    watermark: 'Binary'
  });

  liveFields.push({
    inputElement: this.hexadecimalUI.message,
    newValue: formatHex(binaryToHex(this.message), chunkSize),
    watermark: 'Hexadecimal'
  });

  liveFields.push({
    inputElement: this.decimalUI.message,
    newValue: alignDecimal(binaryToDecimal(this.message, chunkSize)),
    watermark: 'Decimal'
  });

  liveFields.push({
    inputElement: this.asciiUI.message,
    newValue: binaryToAscii(this.message, chunkSize),
    watermark: 'ASCII'
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

      // TODO: If textarea, scroll to bottom?
    }
  });

  var packetBinary = this.getPacketBinary_();
  this.bitCounter.html(packetBinary.length + '/Infinity bits');

  // TODO: Hide columns by configuration
  this.getBody().find('th.packetInfo, td.packetInfo').hide();
};

/** Send message to connected remote */
NetSimSendPanel.prototype.onSendButtonPress_ = function () {
  var myNode = this.connection_.myNode;
  if (myNode) {
    this.disableEverything();
    myNode.sendMessage(this.getPacketBinary_(), function () {
      var binaryTextarea = this.getBody()
          .find('tr.binary')
          .find('textarea');
      binaryTextarea.val('');
      binaryTextarea.blur();
      this.enableEverything();
    }.bind(this));
  }
};

NetSimSendPanel.prototype.disableEverything = function () {
  this.getBody().find('input, textarea').prop('disabled', true);
};

NetSimSendPanel.prototype.enableEverything = function () {
  this.getBody().find('input, textarea').prop('disabled', false);
};

/**
 * Produces a single binary string in the current packet format, based
 * on the current state of the widget (content of its internal fields).
 * @returns {string} - binary representation of packet
 * @private
 */
NetSimSendPanel.prototype.getPacketBinary_ = function () {
  var shortNumberFieldWidth = 4;
  return PacketEncoder.defaultPacketEncoder.createBinary({
    toAddress: intToBinary(this.toAddress, shortNumberFieldWidth),
    fromAddress: intToBinary(this.fromAddress, shortNumberFieldWidth),
    packetIndex: intToBinary(this.packetIndex, shortNumberFieldWidth),
    packetCount: intToBinary(this.packetCount, shortNumberFieldWidth),
    message: this.message
  });
};

/**
 * Show or hide parts of the send UI based on the currently selected encoding
 * mode.
 * @param {string} newEncoding
 */
NetSimSendPanel.prototype.setEncoding = function (newEncoding) {
  NetSimEncodingControl.hideRowsByEncoding(this.getBody(), newEncoding);
};

/**
 * Change how data is interpreted and formatted by this component, triggering
 * an update of all input fields.
 * @param {number} newChunkSize
 */
NetSimSendPanel.prototype.setChunkSize = function (newChunkSize) {
  this.currentChunkSize_ = newChunkSize;
  this.updateFields_();
};

},{"../constants":47,"../utils":224,"./NetSimEncodingControl":130,"./NetSimPanel":146,"./NetSimSendPanel.html":152,"./PacketEncoder":166,"./dataConverters":168}],152:[function(require,module,exports){
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
 buf.push('<div class="netsim_packet">\n  <table>\n    <thead>\n    <tr>\n      <th nowrap class="encodingLabel"></th>\n      <th nowrap class="toAddress">To</th>\n      <th nowrap class="fromAddress">From</th>\n      <th nowrap class="packetInfo">Packet</th>\n      <th class="message">Message</th>\n    </tr>\n    </thead>\n    <tbody>\n    <tr class="ascii">\n      <th nowrap class="encodingLabel">ASCII</th>\n      <td nowrap class="toAddress"><input type="text" class="toAddress" /></td>\n      <td nowrap class="fromAddress"><input type="text" readonly class="fromAddress" /></td>\n      <td nowrap class="packetInfo"><input type="text" readonly class="packetIndex" /> of <input type="text" readonly class="packetCount" /></td>\n      <td class="message"><div><textarea class="message"></textarea></div></td>\n    </tr>\n    <tr class="decimal">\n      <th nowrap class="encodingLabel">Decimal</th>\n      <td nowrap class="toAddress"><input type="text" class="toAddress" /></td>\n      <td nowrap class="fromAddress"><input type="text" readonly class="fromAddress" /></td>\n      <td nowrap class="packetInfo"><input type="text" readonly class="packetIndex" /> of <input type="text" readonly class="packetCount" /></td>\n      <td class="message"><div><textarea class="message"></textarea></div></td>\n    </tr>\n    <tr class="hexadecimal">\n      <th nowrap class="encodingLabel">Hex</th>\n      <td nowrap class="toAddress"><input type="text" class="toAddress" /></td>\n      <td nowrap class="fromAddress"><input type="text" readonly class="fromAddress" /></td>\n      <td nowrap class="packetInfo"><input type="text" readonly class="packetIndex" /> of <input type="text" readonly class="packetCount" /></td>\n      <td class="message"><div><textarea class="message"></textarea></div></td>\n    </tr>\n    <tr class="binary">\n      <th nowrap class="encodingLabel">Binary</th>\n      <td nowrap class="toAddress"><input type="text" class="toAddress" /></td>\n      <td nowrap class="fromAddress"><input type="text" readonly class="fromAddress" /></td>\n      <td nowrap class="packetInfo"><input type="text" readonly class="packetIndex" /> of <input type="text" readonly class="packetCount" /></td>\n      <td class="message"><div><textarea class="message"></textarea></div></td>\n    </tr>\n    </tbody>\n  </table>\n  <div class="bit_counter"></div>\n</div>\n<div class="send_widget_footer">\n  <!-- Packet size slider -->\n  <!-- Add packet button -->\n  <span class="netsim_button" id="send_button">Send</span>\n</div>\n'); })();
} 
return buf.join('');
};
  return function(locals) {
    return t(locals, require("ejs").filters);
  }
}());
},{"ejs":245}],151:[function(require,module,exports){
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
var NetSimRouterLogTable = require('./NetSimRouterLogTable');

/**
 * Generator and controller for router information view.
 * @param {jQuery} rootDiv - Parent element for this component.
 * @constructor
 */
var NetSimRouterTab = module.exports = function (rootDiv) {
  /**
   * Component root, which we fill whenever we call render()
   * @type {jQuery}
   * @private
   */
  this.rootDiv_ = rootDiv;

  /**
   * @type {NetSimRouterLogTable}
   * @private
   */
  this.routerLogTable_ = null;

  // Initial render
  this.render();
};

/**
 * Fill the root div with new elements reflecting the current state.
 */
NetSimRouterTab.prototype.render = function () {
  var renderedMarkup = $(markup({}));
  this.rootDiv_.html(renderedMarkup);
  this.routerLogTable_ = new NetSimRouterLogTable(
      this.rootDiv_.find('.router_log_table'));
};

/**
 * @param {Array} logData
 */
NetSimRouterTab.prototype.setRouterLogData = function (logData) {
  this.routerLogTable_.setRouterLogData(logData);
};

},{"./NetSimRouterLogTable":148,"./NetSimRouterTab.html":150}],150:[function(require,module,exports){
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
 buf.push('<div class="netsim_router_tab">\n  <div class="router_log_table"></div>\n</div>\n'); })();
} 
return buf.join('');
};
  return function(locals) {
    return t(locals, require("ejs").filters);
  }
}());
},{"ejs":245}],148:[function(require,module,exports){
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
 * @constructor
 */
var NetSimRouterLogTable = module.exports = function (rootDiv) {
  /**
   * Component root, which we fill whenever we call render()
   * @type {jQuery}
   * @private
   */
  this.rootDiv_ = rootDiv;

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

},{"./NetSimRouterLogTable.html":147}],147:[function(require,module,exports){
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
var NetSimRouterNode = require('./NetSimRouterNode');
var DnsMode = NetSimRouterNode.DnsMode;
; buf.push('\n<div class="netsim_router_log">\n  <h1>Router Traffic</h1>\n  <table>\n    <thead>\n    <tr>\n      <th nowrap>To</th>\n      <th nowrap>From</th>\n      <th nowrap>Message</th>\n      <th nowrap>Bits</th>\n    </tr>\n    </thead>\n    <tbody>\n    ');17;
    // Sort: Most recent first
    tableData.sort(function (a, b) {
      return a.timestamp > b.timestamp ? -1 : 1;
    });

    // Create rows
    tableData.forEach(function (logEntry) {
      var rowClasses = [];
    ; buf.push('\n    <tr class="', escape((27,  rowClasses.join(' ') )), '">\n      <td nowrap>', escape((28,  logEntry.getToAddress() )), '</td>\n      <td nowrap>', escape((29,  logEntry.getFromAddress() )), '</td>\n      <td>', escape((30,  logEntry.getMessageAscii() )), '</td>\n      <td nowrap>', escape((31,  logEntry.packet.length )), '</td>\n    </tr>\n    ');33;
    });
    ; buf.push('\n    </tbody>\n  </table>\n</div>'); })();
} 
return buf.join('');
};
  return function(locals) {
    return t(locals, require("ejs").filters);
  }
}());
},{"./NetSimRouterNode":149,"ejs":245}],143:[function(require,module,exports){
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
 * @param {function} chunkSizeChangeCallback
 * @param {function} encodingChangeCallback
 * @constructor
 */
var NetSimMyDeviceTab = module.exports = function (rootDiv,
    chunkSizeChangeCallback, encodingChangeCallback) {
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
  this.encodingControl_ = new NetSimEncodingControl(
      this.rootDiv_.find('.encoding'),
      this.encodingChangeCallback_);
};

/**
 * Update the slider and its label to display the provided value.
 * @param {number} newChunkSize
 */
NetSimMyDeviceTab.prototype.setChunkSize = function (newChunkSize) {
  this.chunkSizeControl_.setChunkSize(newChunkSize);
};

/**
 * @param {string} newEncoding
 */
NetSimMyDeviceTab.prototype.setEncoding = function (newEncoding) {
  this.encodingControl_.setEncoding(newEncoding);
  this.chunkSizeControl_.setEncoding(newEncoding);
};
},{"./NetSimChunkSizeControl":118,"./NetSimEncodingControl":130,"./NetSimMyDeviceTab.html":142}],142:[function(require,module,exports){
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
 buf.push('<div class="netsim_my_device_tab">\n  <div class="encoding"></div>\n  <div class="chunk_size"></div>\n</div>\n'); })();
} 
return buf.join('');
};
  return function(locals) {
    return t(locals, require("ejs").filters);
  }
}());
},{"ejs":245}],139:[function(require,module,exports){
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
var markup = require('./NetSimLogPanel.html');
var packetMarkup = require('./NetSimLogPacket.html');
var NetSimPanel = require('./NetSimPanel');
var NetSimEncodingControl = require('./NetSimEncodingControl');

/**
 * Generator and controller for message log.
 * @param {jQuery} rootDiv
 * @param {string} logTitle
 * @param {boolean} [isMinimized] defaults to FALSE
 * @constructor
 * @augments NetSimPanel
 */
var NetSimLogPanel = module.exports = function (rootDiv, logTitle, isMinimized) {
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
  this.currentEncoding_ = 'all';

  /**
   * Current chunk size (bytesize) for intepreting binary in the log.
   * @type {number}
   * @private
   */
  this.currentChunkSize_ = 8;

  // Initial render
  NetSimPanel.call(this, rootDiv, {
    className: 'netsim_log_panel',
    panelTitle: logTitle,
    beginMinimized: isMinimized
  });
};
NetSimLogPanel.inherits(NetSimPanel);

NetSimLogPanel.prototype.render = function () {
  // Create boilerplate panel markup
  NetSimLogPanel.superPrototype.render.call(this);

  // Add our own content markup
  var newMarkup = $(markup({
    logInstanceID: this.instanceID_,
    logTitle: this.logTitle_
  }));
  this.getBody().html(newMarkup);

  // Add a clear button to the panel header
  this.addButton('Clear', this.onClearButtonPress_.bind(this));

  // Bind reference to scrollArea for use when logging.
  this.scrollArea_ = this.getBody().find('.scroll_area');

  // TODO: Hide columns by configuration
  this.getBody().find('th.packetInfo, td.packetInfo').hide();
};

/**
 * Remove all packets from the log, resetting its state.
 * @private
 */
NetSimLogPanel.prototype.onClearButtonPress_ = function () {
  this.scrollArea_.empty();
  this.packets_ = [];
};

/**
 * Put a message into the log.
 */
NetSimLogPanel.prototype.log = function (packetBinary) {
  var scrollArea = this.scrollArea_;
  var wasScrolledToEnd =
      scrollArea[0].scrollHeight - scrollArea[0].scrollTop <=
      scrollArea.outerHeight();

  var newPacket = new NetSimLogPacket(packetBinary,
      this.currentEncoding_,
      this.currentChunkSize_);
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
 * @param {string} newEncoding
 */
NetSimLogPanel.prototype.setEncoding = function (newEncoding) {
  this.currentEncoding_ = newEncoding;
  this.packets_.forEach(function (packet) {
    packet.setEncoding(newEncoding);
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
 * @param {string} encoding - which display style to use initially
 * @param {number} chunkSize - (or bytesize) to use when interpreting and
 *        formatting the data.
 * @constructor
 */
var NetSimLogPacket = function (packetBinary, encoding, chunkSize) {
  /**
   * @type {string}
   * @private
   */
  this.packetBinary_ = packetBinary;

  /**
   * @type {string}
   * @private
   */
  this.encoding_ = encoding;

  /**
   * @type {number}
   * @private
   */
  this.chunkSize_ = chunkSize;

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
    chunkSize: this.chunkSize_
  });
  var jQueryWrap = $(rawMarkup);
  NetSimEncodingControl.hideRowsByEncoding(jQueryWrap, this.encoding_);
  // TODO: Hide columns by configuration
  jQueryWrap.find('th.packetInfo, td.packetInfo').hide();
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
 * @param {string} newEncoding
 */
NetSimLogPacket.prototype.setEncoding = function (newEncoding) {
  this.encoding_ = newEncoding;
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

},{"../utils":224,"./NetSimEncodingControl":130,"./NetSimLogPacket.html":137,"./NetSimLogPanel.html":138,"./NetSimPanel":146}],146:[function(require,module,exports){
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
 *        Defaults to no class, so only the 'netsim_panel' class will be used.
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
  var panelDiv = this.rootDiv_.find('.netsim_panel');
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
      .addClass('netsim_button')
      .html(buttonText)
      .click(pressCallback)
      .appendTo(this.rootDiv_.find('.panel_controls'));
};

/**
 * @returns {jQuery} the body Div of the panel, for panel content.
 */
NetSimPanel.prototype.getBody = function () {
  return this.rootDiv_.find('.panel_body');
};

},{"./NetSimPanel.html":145}],145:[function(require,module,exports){
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
 buf.push('<div id="netsim_panel_', escape((1,  instanceID )), '"\n     class="netsim_panel ', escape((2,  className )), '">\n  <h1>\n    <span class="minimizer">\n      <i class="fa fa-minus-square"></i>\n      ', escape((6,  panelTitle )), '\n    </span>\n    <div class="panel_controls">\n    </div>\n  </h1>\n  <div class="panel_body">\n  </div>\n</div>\n'); })();
} 
return buf.join('');
};
  return function(locals) {
    return t(locals, require("ejs").filters);
  }
}());
},{"ejs":245}],138:[function(require,module,exports){
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
},{"ejs":245}],137:[function(require,module,exports){
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

var PacketEncoder = require('./PacketEncoder');
var dataConverters = require('./dataConverters');
var formatBinary = dataConverters.formatBinary;
var formatHex = dataConverters.formatHex;
var alignDecimal = dataConverters.alignDecimal;
var binaryToInt = dataConverters.binaryToInt;
var binaryToHex = dataConverters.binaryToHex;
var binaryToDecimal = dataConverters.binaryToDecimal;
var binaryToAscii = dataConverters.binaryToAscii;

function getEncodingLabel(rowClass) {
  if (rowClass === 'ascii') {
    return 'ASCII';
  } else if (rowClass === 'decimal') {
    return 'Decimal';
  } else if (rowClass === 'hexadecimal') {
    return 'Hex';
  } else if (rowClass === 'binary') {
    return 'Binary';
  }
  return '';
}

function logRow(rowClass, toAddress, fromAddress, packetInfo, message) {
  ; buf.push('\n    <tr class="', escape((28,  rowClass )), '">\n      <th nowrap class="encodingLabel">', escape((29,  getEncodingLabel(rowClass) )), '</th>\n      <td nowrap class="toAddress">', escape((30,  toAddress )), '</td>\n      <td nowrap class="fromAddress">', escape((31,  fromAddress )), '</td>\n      <td nowrap class="packetInfo">', escape((32,  packetInfo )), '</td>\n      <td class="message">', escape((33,  message )), '</td>\n    </tr>\n');35;
}

 ; buf.push('\n<table>\n  <thead>\n    <tr>\n      <th nowrap class="encodingLabel"></th>\n      <th nowrap class="toAddress">To</th>\n      <th nowrap class="fromAddress">From</th>\n      <th nowrap class="packetInfo">Packet</th>\n      <th nowrap class="message">Message</th>\n    </tr>\n  </thead>\n  <tbody>\n  ');50;
    var toAddress = PacketEncoder.defaultPacketEncoder.getField('toAddress', packetBinary);
    var fromAddress = PacketEncoder.defaultPacketEncoder.getField('fromAddress', packetBinary);
    var packetIndex = PacketEncoder.defaultPacketEncoder.getField('packetIndex', packetBinary);
    var packetCount = PacketEncoder.defaultPacketEncoder.getField('packetCount', packetBinary);
    var message = PacketEncoder.defaultPacketEncoder.getField('message', packetBinary);

    logRow('ascii',
        binaryToInt(toAddress),
        binaryToInt(fromAddress),
        binaryToInt(packetIndex) + ' of ' + binaryToInt(packetCount),
        binaryToAscii(message, chunkSize));

    logRow('decimal',
        binaryToInt(toAddress),
        binaryToInt(fromAddress),
        binaryToInt(packetIndex) + ' of ' + binaryToInt(packetCount),
        alignDecimal(binaryToDecimal(message, chunkSize)));

    logRow('hexadecimal',
        binaryToHex(toAddress),
        binaryToHex(fromAddress),
        binaryToHex(packetIndex) + ' of ' + binaryToHex(packetCount),
        formatHex(binaryToHex(message), chunkSize));

    logRow('binary',
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
},{"./PacketEncoder":166,"./dataConverters":168,"ejs":245}],134:[function(require,module,exports){
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
'use strict';

var utils = require('../utils');
var netsimUtils = require('./netsimUtils');
var NetSimLogger = require('./NetSimLogger');
var NetSimClientNode = require('./NetSimClientNode');
var NetSimRouterNode = require('./NetSimRouterNode');
var markup = require('./NetSimLobby.html');

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
 * @param {NetSimConnection} connection - The shard connection that this
 *        lobby control will manipulate.
 * @param {DashboardUser} user - The current user, logged in or not.
 * @param {string} [shardID]
 * @constructor
 */
var NetSimLobby = module.exports = function (connection, user, shardID) {

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
 * @param {NetSimConnection} connection The connection manager to use
 * @param {DashboardUser} user The current user info
 * @param {string} [shardID] A particular shard ID to use, can be omitted which
 *        causes the system to look for user section shards, or generate a
 *        new one.
 * @return {NetSimLobby} A new controller for the generated lobby
 * @static
 */
NetSimLobby.createWithin = function (element, connection, user, shardID) {
  // Create a new NetSimLobby
  var controller = new NetSimLobby(connection, user, shardID);
  element.innerHTML = markup({});
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
  var nodes = netsimUtils.nodesFromRows(this.shard_, rows);
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
  });
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

NetSimLobby.prototype.refresh_ = function () {
  if (!this.connection_.isConnectedToRouter()) {
    this.refreshOpenLobby_();
  }
};

/**
 * Show preconnect controls (name, shard-select) and actual lobby listing.
 * @private
 */
NetSimLobby.prototype.refreshOpenLobby_ = function () {
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
    return simNode.getNodeType() === NetSimRouterNode.getNodeType();
  });

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
    if (simNode.getNodeType() === NetSimRouterNode.getNodeType()) {
      item.addClass('router_row');
    } else {
      item.addClass('user_row');
      if (simNode.entityID === this.connection_.myNode.entityID) {
        item.addClass('own_row');
      }
    }

    // Preserve selected item across refresh.
    if (simNode.entityID === this.selectedID_) {
      item.addClass('selected_row');
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
  if (NetSimClientNode.getNodeType() === connectionTarget.getNodeType()) {
    return;
  }

  var oldSelectedID = this.selectedID_;
  var oldSelectedListItem = this.selectedListItem_;

  // Deselect old row
  if (oldSelectedListItem) {
    oldSelectedListItem.removeClass('selected_row');
  }
  this.selectedID_ = undefined;
  this.selectedListItem_ = undefined;

  // If we clicked on a different row, select the new row
  if (connectionTarget.entityID !== oldSelectedID) {
    this.selectedID_ = connectionTarget.entityID;
    this.selectedListItem_ = listItem;
    this.selectedListItem_.addClass('selected_row');
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

},{"../utils":224,"./NetSimClientNode":119,"./NetSimLobby.html":133,"./NetSimLogger":140,"./NetSimRouterNode":149,"./netsimUtils":172}],172:[function(require,module,exports){
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

var NetSimClientNode = require('./NetSimClientNode');
var NetSimRouterNode = require('./NetSimRouterNode');

/**
 * Given a set of rows from the node table on a shard, gives back a set of node
 * controllers (of appropriate types).
 * @param {!NetSimShard} shard
 * @param {!Array.<Object>} rows
 * @throws when a row doesn't have a mappable node type.
 * @return {Array.<NetSimNode>} nodes for the rows
 */
exports.nodesFromRows = function (shard, rows) {
  return rows
      .map(function (row) {
        if (row.type === NetSimClientNode.getNodeType()) {
          return new NetSimClientNode(shard, row);
        } else if (row.type == NetSimRouterNode.getNodeType()) {
          return new NetSimRouterNode(shard, row);
        }
        // Oops!  We probably shouldn't ever get here.
        throw new Error("Unable to map row to node.");
      });
};

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
  };

  return newElement;
};

},{"./NetSimClientNode":119,"./NetSimRouterNode":149}],133:[function(require,module,exports){
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
 buf.push('<div id="netsim_lobby_open" class="netsim_panel netsim_lobby">\n  <h1>Lobby</h1>\n  <div class="panel_body">\n    <div id="display_name_view">\n      <label for="netsim_lobby_name">My Name:</label>\n      <input id="netsim_lobby_name" type="text" />\n      <input id="netsim_lobby_set_name_button" type="button" value="Set Name" />\n    </div>\n    <div id="shard_view">\n      <label for="netsim_shard_select">My Section:</label>\n      <select id="netsim_shard_select"></select>\n      <span id="netsim_not_connected_note">You are not connected. Select a class section from the list to connect.</span>\n      <a class="shardLink" href="#">Share this private network</a>\n      <input type="button" id="netsim_lobby_add_router" value="Add Router" />\n      <ul id="netsim_lobby_list"></ul>\n      <input type="button" id="netsim_lobby_connect" value="Connect" />\n    </div>\n  </div>\n</div>\n'); })();
} 
return buf.join('');
};
  return function(locals) {
    return t(locals, require("ejs").filters);
  }
}());
},{"ejs":245}],130:[function(require,module,exports){
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

/**
 * Generator and controller for message encoding selector: A dropdown that
 * controls whether messages are displayed in some combination of binary, hex,
 * decimal, ascii, etc.
 * @param {jQuery} rootDiv
 * @param {function} changeEncodingCallback
 * @constructor
 */
var NetSimEncodingControl = module.exports = function (rootDiv,
    changeEncodingCallback) {
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
  this.changeEncodingCallback_ = changeEncodingCallback;

  /**
   * @type {jQuery}
   * @private
   */
  this.select_ = null;

  // Initial render
  this.render();
};

/**
 * Fill the root div with new elements reflecting the current state
 */
NetSimEncodingControl.prototype.render = function () {
  var renderedMarkup = $(markup({}));
  this.rootDiv_.html(renderedMarkup);
  this.select_ = this.rootDiv_.find('select');
  this.select_.change(this.onSelectChange_.bind(this));

};

/**
 * Send new value to registered callback on change.
 * @private
 */
NetSimEncodingControl.prototype.onSelectChange_ = function () {
  this.changeEncodingCallback_(this.select_.val());
};

/**
 * Change selector value to the new provided value.
 * @param newEncoding
 */
NetSimEncodingControl.prototype.setEncoding = function (newEncoding) {
  this.select_.val(newEncoding);
};

/**
 * Static helper, shows/hides rows under provided element according to the given
 * encoding setting.
 * @param {jQuery} rootElement - root of elements to show/hide
 * @param {string} encoding - a message encoding setting
 */
NetSimEncodingControl.hideRowsByEncoding = function (rootElement, encoding) {
  if (encoding === 'all') {
    rootElement.find('tr.binary, tr.hexadecimal, tr.decimal, tr.ascii').show();
  } else if (encoding === 'binary') {
    rootElement.find('tr.binary').show();
    rootElement.find('tr.hexadecimal, tr.decimal, tr.ascii').hide();
  } else if (encoding === 'hexadecimal') {
    rootElement.find('tr.binary, tr.hexadecimal').show();
    rootElement.find('tr.decimal, tr.ascii').hide();
  } else if (encoding === 'decimal') {
    rootElement.find('tr.binary, tr.decimal').show();
    rootElement.find('tr.hexadecimal, tr.ascii').hide();
  } else if (encoding === 'ascii') {
    rootElement.find('tr.binary, tr.ascii').show();
    rootElement.find('tr.hexadecimal, tr.decimal').hide();
  }
};


},{"./NetSimEncodingControl.html":129}],129:[function(require,module,exports){
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
 buf.push('<div class="netsim_encoding_selector">\n  <label for="encoding_selector">Encoding:</label>\n  <select id="encoding_selector">\n    <option value="all" selected>All</option>\n    <option value="binary">Binary</option>\n    <option value="hexadecimal">Hexadecimal</option>\n    <option value="decimal">Decimal</option>\n    <option value="ascii">ASCII</option>\n  </select>\n</div>'); })();
} 
return buf.join('');
};
  return function(locals) {
    return t(locals, require("ejs").filters);
  }
}());
},{"ejs":245}],126:[function(require,module,exports){
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
var NetSimDnsModeControl = require('./NetSimDnsModeControl');
var NetSimDnsManualControl = require('./NetSimDnsManualControl');
var NetSimDnsTable = require('./NetSimDnsTable');

/**
 * Generator and controller for "My Device" tab.
 * @param {jQuery} rootDiv
 * @param {function} dnsModeChangeCallback
 * @param {function} becomeDnsCallback
 * @constructor
 */
var NetSimDnsTab = module.exports = function (rootDiv,
    dnsModeChangeCallback, becomeDnsCallback) {
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
  var renderedMarkup = $(markup({}));
  this.rootDiv_.html(renderedMarkup);
  this.dnsModeControl_ = new NetSimDnsModeControl(
      this.rootDiv_.find('.dns_mode'),
      this.dnsModeChangeCallback_);
  this.dnsManualControl_ = new NetSimDnsManualControl(
      this.rootDiv_.find('.dns_manual_control'),
      this.becomeDnsCallback_);
  this.dnsTable_ = new NetSimDnsTable(
      this.rootDiv_.find('.dns_table'));
};

/**
 * @param {string} newDnsMode
 */
NetSimDnsTab.prototype.setDnsMode = function (newDnsMode) {
  this.dnsModeControl_.setDnsMode(newDnsMode);
  this.dnsTable_.setDnsMode(newDnsMode);
  if (newDnsMode === 'manual') {
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

},{"./NetSimDnsManualControl":122,"./NetSimDnsModeControl":124,"./NetSimDnsTab.html":125,"./NetSimDnsTable":128}],128:[function(require,module,exports){
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
var NetSimRouterNode = require('./NetSimRouterNode');
var DnsMode = NetSimRouterNode.DnsMode;

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

},{"./NetSimDnsTable.html":127,"./NetSimRouterNode":149}],127:[function(require,module,exports){
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
var NetSimRouterNode = require('./NetSimRouterNode');
var DnsMode = NetSimRouterNode.DnsMode;
; buf.push('\n<div class="netsim_dns_table">\n  <h1>My Network</h1>\n  <table>\n    <thead>\n    <tr>\n      <th>Hostname</th>\n      <th>Address</th>\n    </tr>\n    </thead>\n    <tbody>\n    ');15;
    tableData.forEach(function (row) {
      var displayHostname = row.hostname;
      var displayAddress = '';
      var rowClasses = [];

      if (dnsMode === DnsMode.NONE || row.isDnsNode || row.isLocal) {
        displayAddress = row.address;
      }

      if (row.isLocal) {
        displayHostname += " (Me)";
        rowClasses.push('localNode');
      }

      if (row.isDnsNode && dnsMode !== DnsMode.NONE) {
        displayHostname += " (DNS)";
        rowClasses.push('dnsNode');
      }
      ; buf.push('\n        <tr class="', escape((35,  rowClasses.join(' ') )), '">\n          <td>', escape((36,  displayHostname )), '</td>\n          <td>', escape((37,  displayAddress )), '</td>\n        </tr>\n      ');39;
    });
    ; buf.push('\n    </tbody>\n  </table>\n</div>'); })();
} 
return buf.join('');
};
  return function(locals) {
    return t(locals, require("ejs").filters);
  }
}());
},{"./NetSimRouterNode":149,"ejs":245}],125:[function(require,module,exports){
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
 buf.push('<div class="netsim_dns_tab">\n  <div class="dns_mode"></div>\n  <div class="dns_manual_control"></div>\n  <div class="dns_table"></div>\n</div>\n'); })();
} 
return buf.join('');
};
  return function(locals) {
    return t(locals, require("ejs").filters);
  }
}());
},{"ejs":245}],124:[function(require,module,exports){
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
   * @type {string}
   * @private
   */
  this.currentDnsMode_ = 'none';

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
  var newDnsMode = this.dnsModeRadios_.siblings(':checked').val();
  this.dnsModeChangeCallback_(newDnsMode);
};

/**
 * @param {string} newDnsMode
 */
NetSimDnsModeControl.prototype.setDnsMode = function (newDnsMode) {
  this.currentDnsMode_ = newDnsMode;
  this.dnsModeRadios_
      .siblings('[value="' + newDnsMode + '"]')
      .prop('checked', true);
};

},{"./NetSimDnsModeControl.html":123}],123:[function(require,module,exports){
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
 buf.push('<div class="dns_mode_control">\n  <h1>DNS Mode</h1>\n  <input id="dns_mode_none" type="radio" name="dns_mode" value="none" /><label for="dns_mode_none">None</label>\n  <br/><input id="dns_mode_manual" type="radio" name="dns_mode" value="manual" /><label for="dns_mode_manual">Manual</label>\n  <br/><input id="dns_mode_automatic" type="radio" name="dns_mode" value="automatic" /><label for="dns_mode_automatic">Automatic</label>\n</div>'); })();
} 
return buf.join('');
};
  return function(locals) {
    return t(locals, require("ejs").filters);
  }
}());
},{"ejs":245}],122:[function(require,module,exports){
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

},{"./NetSimDnsManualControl.html":121}],121:[function(require,module,exports){
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
},{"ejs":245}],120:[function(require,module,exports){
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
 * @param {Window} thisWindow
 * @param {!NetSimLogPanel} sentLog - Widget to post sent messages to
 * @param {!NetSimLogPanel} receivedLog - Widget to post received messages to
 * @param {boolean} [enableCleanup] default TRUE
 * @constructor
 */
var NetSimConnection = module.exports = function (thisWindow, sentLog,
    receivedLog, enableCleanup) {
  /**
   * Display name for user on local end of connection, to be uploaded to others.
   * @type {string}
   * @private
   */
  this.displayName_ = '';

  /**
   * @type {NetSimLogPanel}
   * @private
   */
  this.sentLog_ = sentLog;

  /**
   * @type {NetSimLogPanel}
   * @private
   */
  this.receivedLog_ = receivedLog;

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
  this.enableCleanup_ = enableCleanup !== undefined ? enableCleanup : true;

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
  thisWindow.addEventListener('beforeunload', this.onBeforeUnload_.bind(this));
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
    this.myNode.initializeSimulation(this.sentLog_, this.receivedLog_);
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
      if (row.type === NetSimClientNode.getNodeType()) {
        return new NetSimClientNode(self.shard_, row);
      } else if (row.type === NetSimRouterNode.getNodeType()) {
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
  var self = this;
  NetSimRouterNode.create(this.shard_, function () {
    self.statusChanges.notifyObservers();
  });
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
},{"../ObservableEvent":1,"./NetSimClientNode":119,"./NetSimLocalClientNode":135,"./NetSimLogger":140,"./NetSimRouterNode":149,"./NetSimShard":154,"./NetSimShardCleaner":155}],155:[function(require,module,exports){
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
  logger.info('Begin CacheTable[' + this.key_ + ']');
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

  logger.info('Begin DestroyEntity[' + this.entity_.entityID + ']');
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
  logger.info('Begin ReleaseCleaningLock');
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
  logger.info('Begin CleanHeartbeats');
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
  logger.info('Begin CleanNodes');
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
  logger.info('Begin CleanWires');
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
  logger.info('Begin CleanMessages');
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
  logger.info('Begin CleanLogs');
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

},{"../commands":46,"../utils":224,"./NetSimEntity":131,"./NetSimHeartbeat":132,"./NetSimLogEntry":136,"./NetSimLogger":140,"./NetSimMessage":141,"./NetSimNode":144,"./NetSimWire":165}],154:[function(require,module,exports){
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

var SharedTable = require('../appsApi').SharedTable;
var NetSimTable = require('./NetSimTable');

/**
 * App key, unique to netsim, used for connecting with the storage API.
 * @type {string}
 * @readonly
 */
// TODO (bbuchanan): remove once we can store ids for each app? (userid:1 apppid:42)
var APP_PUBLIC_KEY = 'HQJ8GCCMGP7Yh8MrtDusIA==';
// Ugly null-guards so we can load this file in tests.
if (window &&
    window.location &&
    window.location.hostname &&
    window.location.hostname.split('.')[0] === 'localhost') {
  APP_PUBLIC_KEY = 'JGW2rHUp_UCMW_fQmRf6iQ==';
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
      new SharedTable(APP_PUBLIC_KEY, shardID + '_n'));

  /** @type {NetSimTable} */
  this.wireTable = new NetSimTable(
      new SharedTable(APP_PUBLIC_KEY, shardID + '_w'));

  /** @type {NetSimTable} */
  this.messageTable = new NetSimTable(
      new SharedTable(APP_PUBLIC_KEY, shardID + '_m'));
  this.messageTable.setPollingInterval(3000);

  /** @type {NetSimTable} */
  this.logTable = new NetSimTable(
      new SharedTable(APP_PUBLIC_KEY, shardID + '_l'));
  this.logTable.setPollingInterval(10000);

  /** @type {NetSimTable} */
  this.heartbeatTable = new NetSimTable(
      new SharedTable(APP_PUBLIC_KEY, shardID + '_h'));
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
},{"../appsApi":18,"./NetSimTable":158}],158:[function(require,module,exports){
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

},{"../ObservableEvent":1,"../utils":224}],149:[function(require,module,exports){
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
var _ = utils.getLodash();
var NetSimNode = require('./NetSimNode');
var NetSimEntity = require('./NetSimEntity');
var NetSimLogEntry = require('./NetSimLogEntry');
var NetSimLogger = require('./NetSimLogger');
var NetSimWire = require('./NetSimWire');
var NetSimMessage = require('./NetSimMessage');
var NetSimHeartbeat = require('./NetSimHeartbeat');
var ObservableEvent = require('../ObservableEvent');
var PacketEncoder = require('./PacketEncoder');
var dataConverters = require('./dataConverters');

var logger = new NetSimLogger(console, NetSimLogger.LogLevel.VERBOSE);

/**
 * @type {number}
 * @readonly
 */
var MAX_CLIENT_CONNECTIONS = 6;

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
  this.dnsMode = row.dnsMode !== undefined ?
      row.dnsMode : NetSimRouterNode.DnsMode.NONE;

  /**
   * Sets current DNS node ID for the router's local network.
   * This value is manipulated by all clients.
   * @type {number}
   * @private
   */
  this.dnsNodeID = row.dnsNodeID;

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
};
NetSimRouterNode.inherits(NetSimNode);

/**
 * @enum {string}
 */
var DnsMode = {
  NONE: 'none',
  MANUAL: 'manual',
  AUTOMATIC: 'automatic'
};
NetSimRouterNode.DnsMode = DnsMode;

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
 * Build table row for this node.
 * @private
 * @override
 */
NetSimRouterNode.prototype.buildRow_ = function () {
  return utils.extend(
      NetSimRouterNode.superPrototype.buildRow_.call(this),
      {
        dnsMode: this.dnsMode,
        dnsNodeID: this.dnsNodeID
      }
  );
};

/**
 * Ticks heartbeat, telling the network that router is in use.
 * @param {RunLoop.Clock} clock
 */
NetSimRouterNode.prototype.tick = function (clock) {
  this.heartbeat_.tick(clock);
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
  return "Router " + this.entityID;
};

/** @inheritdoc */
NetSimRouterNode.prototype.getNodeType = function () {
  return NetSimRouterNode.getNodeType();
};
NetSimRouterNode.getNodeType = function () {
  return 'router';
};

/**
 * Puts this router controller into a mode where it will only
 * simulate for connection and messages -from- the given node.
 * @param {!number} nodeID
 */
NetSimRouterNode.prototype.initializeSimulation = function (nodeID) {
  this.simulateForSender_ = nodeID;
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
    wire.remoteAddress = 0; // Always 0 for routers
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
  return this.myWireRowCache_.map(function (row) {
    return {
      hostname: row.localHostname,
      address: row.localAddress,
      isLocal: (row.localNodeID === this.simulateForSender_),
      isDnsNode: (row.localNodeID === this.dnsNodeID)
    };
  }.bind(this));
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

NetSimRouterNode.prototype.onMyStateChange_ = function (remoteRow) {
  this.dnsMode = remoteRow.dnsMode;
  this.dnsNodeID = remoteRow.dnsNodeID;
  this.stateChange.notifyObservers(this);
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
    logger.info("Router wires changed.");
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

NetSimRouterNode.prototype.getLog = function () {
  return this.myLogRowCache_.map(function (row) {
    return new NetSimLogEntry(this.shard_, row);
  }.bind(this));
};

/**
 * When the message table changes, we might have a new message to handle.
 * Check for and handle unhandled messages.
 * @param rows
 * @private
 */
NetSimRouterNode.prototype.onMessageTableChange_ = function (rows) {

  if (!this.simulateForSender_) {
    // Not configured to handle anything yet; don't process messages.
    return;
  }

  if (this.isProcessingMessages_) {
    // We're already in this method, getting called recursively because
    // we are making changes to the table.  Ignore this call.
    return;
  }

  var self = this;
  var messages = rows.map(function (row) {
    return new NetSimMessage(self.shard_, row);
  }).filter(function (message) {
    return message.fromNodeID === self.simulateForSender_ &&
        message.toNodeID === self.entityID;
  });

  // If any messages are for us, get our routing table and process messages.
  if (messages.length > 0) {
    this.isProcessingMessages_ = true;
    this.getConnections(function (err, wires) {
      messages.forEach(function (message) {

        // Pull the message off the wire, and hold it in-memory until we route it.
        // We'll create a new one with the same payload if we have to send it on.
        message.destroy(function (err) {
          if (err) {
            logger.error("Error pulling message off the wire for routing; " +
                err.message);
            return;
          }
          self.routeMessage_(message, wires);
        });

      });
      self.isProcessingMessages_ = false;
    });
  }
};

/**
 * Read the given message to find its destination address, try and map that
 * address to one of our connections, and send the message payload to
 * the new address.
 *
 * @param {NetSimMessage} message
 * @param {Array.<NetSimWire>} myWires
 * @private
 */
NetSimRouterNode.prototype.routeMessage_ = function (message, myWires) {
  var toAddress;

  // Find a connection to route this message to.
  try {
    toAddress = dataConverters.binaryToInt(
        PacketEncoder.defaultPacketEncoder.getField('toAddress', message.payload));
  } catch (error) {
    this.log(message.payload);
    return;
  }

  var destWires = myWires.filter(function (wire) {
    return wire.localAddress === toAddress;
  });
  if (destWires.length === 0) {
    // Destination address not in local network.
    this.log(message.payload);
    return;
  }

  // TODO: Handle bad state where more than one wire matches dest address?

  var destWire = destWires[0];

  // Create a new message with a new payload.
  NetSimMessage.send(
      this.shard_,
      destWire.remoteNodeID,
      destWire.localNodeID,
      message.payload,
      function () {
        this.log(message.payload);
      }.bind(this)
  );
};

},{"../ObservableEvent":1,"../utils":224,"./NetSimEntity":131,"./NetSimHeartbeat":132,"./NetSimLogEntry":136,"./NetSimLogger":140,"./NetSimMessage":141,"./NetSimNode":144,"./NetSimWire":165,"./PacketEncoder":166,"./dataConverters":168}],136:[function(require,module,exports){
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
var PacketEncoder = require('./PacketEncoder');
var dataConverters = require('./dataConverters');
var binaryToInt = dataConverters.binaryToInt;
var formatBinary = dataConverters.formatBinary;
var binaryToAscii = dataConverters.binaryToAscii;

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
 * @constructor
 * @augments NetSimEntity
 */
var NetSimLogEntry = module.exports = function (shard, row) {
  row = row !== undefined ? row : {};
  NetSimEntity.call(this, shard, row);

  /**
   * Node ID of the node that owns this log entry (e.g. a router node)
   * @type {number}
   */
  this.nodeID = row.nodeID;

  /**
   * Text of the log entry.  Defaults to empty string.
   * @type {string}
   */
  this.packet = (row.packet !== undefined) ? row.packet : '';

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
    packet: this.packet,
    timestamp: this.timestamp
  };
};

/**
 * Static async creation method.  Creates a new message on the given shard,
 * and then calls the callback with a success boolean.
 * @param {!NetSimShard} shard
 * @param {!number} nodeID - associated node's row ID
 * @param {!string} packet - log contents
 * @param {!NodeStyleCallback} onComplete (success)
 */
NetSimLogEntry.create = function (shard, nodeID, packet, onComplete) {
  var entity = new NetSimLogEntry(shard);
  entity.nodeID = nodeID;
  entity.packet = packet;
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
 * Get packet toAddress as integer.
 */
NetSimLogEntry.prototype.getToAddress = function () {
  return binaryToInt(
      PacketEncoder.defaultPacketEncoder.getField('toAddress', this.packet));
};

/**
 * Get packet fromAddress as integer.
 */
NetSimLogEntry.prototype.getFromAddress = function () {
  return binaryToInt(
      PacketEncoder.defaultPacketEncoder.getField('fromAddress', this.packet));
};

/**
 * Get packetIndex as integer.
 */
NetSimLogEntry.prototype.getPacketIndex = function () {
  return binaryToInt(
      PacketEncoder.defaultPacketEncoder.getField('packetIndex', this.packet));
};

/**
 * Get packetCount as integer.
 */
NetSimLogEntry.prototype.getPacketCount = function () {
  return binaryToInt(
      PacketEncoder.defaultPacketEncoder.getField('packetCount', this.packet));
};

/**
 * Get packet message as binary.
 */
NetSimLogEntry.prototype.getMessageBinary = function () {
  return formatBinary(
      PacketEncoder.defaultPacketEncoder.getField('message', this.packet),
      BITS_PER_BYTE);
};

NetSimLogEntry.prototype.getMessageAscii = function () {
  return binaryToAscii(
      PacketEncoder.defaultPacketEncoder.getField('message', this.packet),
      BITS_PER_BYTE);
};
},{"../utils":224,"./NetSimEntity":131,"./PacketEncoder":166,"./dataConverters":168}],166:[function(require,module,exports){
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

/**
 * Verify that a given format specification describes a valid format that
 * can be used by the PacketEncoder object.
 * @param {Array.<Object>} formatSpec
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

    if (formatSpec[i].bits === Infinity && i+1 < formatSpec.length) {
      throw new Error("Invalid packet format: Infinity field length is only " +
      "allowed in the last field.");
    }
  }
};

/**
 * Given a particular packet format, can convert a set of fields down
 * into a binary string matching the specification, or extract fields
 * on demand from a binary string.
 * @param {Array} formatSpec - Specification of packet format, an ordered set
 *        of objects in the form {key:string, bits:number} where key is the
 *        field name you'll use to retrieve the information, and bits is the
 *        length of the field.
 * @constructor
 */
var PacketEncoder = module.exports = function (formatSpec) {
  validateSpec(formatSpec);

  /**
   * @type {Array.<Object>}
   */
  this.formatSpec_ = formatSpec;
};

/**
 * @type {number}
 * @const
 */
var BITS_PER_PACKET_HEADER_FIELD = 4;

/**
 * Static, globally available packet encoder for final packet layout.
 * TODO (bbuchanan): Replace this with a changeable format we can pass around!
 * @type {PacketEncoder}
 */
PacketEncoder.defaultPacketEncoder = new PacketEncoder([
  { key: 'toAddress', bits: BITS_PER_PACKET_HEADER_FIELD },
  { key: 'fromAddress', bits: BITS_PER_PACKET_HEADER_FIELD },
  { key: 'packetIndex', bits: BITS_PER_PACKET_HEADER_FIELD },
  { key: 'packetCount', bits: BITS_PER_PACKET_HEADER_FIELD },
  { key: 'message', bits: Infinity }
]);

PacketEncoder.prototype.getField = function (key, binary) {
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

PacketEncoder.prototype.createBinary = function (data) {
  var result = '';

  // For each field
  for (var i = 0; i < this.formatSpec_.length; i++) {
    var fieldBits = '';

    // If the field exists in the data, grab it
    if (data.hasOwnProperty(this.formatSpec_[i].key)) {
      fieldBits = data[this.formatSpec_[i].key];
    }

    // Right-truncate to the desired size
    if (fieldBits.length > this.formatSpec_[i].bits) {
      fieldBits = fieldBits.slice(0, this.formatSpec_[i].bits);
    }

    // Left-pad data to desired size
    if (this.formatSpec_[i].bits !== Infinity) {
      while (fieldBits.length < this.formatSpec_[i].bits) {
        fieldBits = '0' + fieldBits;
      }
    }

    // Append field to result
    result += fieldBits;
  }
  return result;
};
},{"./dataConverters":168}],168:[function(require,module,exports){
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

var zeroPadLeft = function (string, desiredWidth) {
  var padding = '0'.repeat(desiredWidth);
  return (padding + string).slice(-desiredWidth);
};

var zeroPadRight = function (string, desiredWidth) {
  var padding = '0'.repeat(desiredWidth);
  return (string + padding).substr(0, desiredWidth);
};

var intToString = function (int, base, width) {
  if (width <= 0) {
    throw new RangeError("Output width must be greater than zero");
  }
  return zeroPadLeft(int.toString(base), width);
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
    currentNibble = zeroPadRight(uglyBinary.substr(i, nibbleWidth), nibbleWidth);
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
    currentByte = zeroPadRight(binary.substr(i, byteSize), byteSize);
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
    currentByte = zeroPadRight(binary.substr(i, byteSize), byteSize);
    chars.push(String.fromCharCode(exports.binaryToInt(currentByte)));
  }
  return chars.join('');
};

},{"../utils":224}],135:[function(require,module,exports){
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
 * @param {!NetSimLogPanel} sentLog
 * @param {!NetSimLogPanel} receivedLog
 */
NetSimLocalClientNode.prototype.initializeSimulation = function (sentLog,
    receivedLog) {
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
 * @param {!NetSimRouterNode} router
 * @param {NodeStyleCallback} onComplete
 */
NetSimLocalClientNode.prototype.connectToRouter = function (router, onComplete) {
  onComplete = onComplete || function () {};

  var self = this;
  this.connectToNode(router, function (err, wire) {
    if (err) {
      onComplete(err);
      return;
    }

    self.myWire = wire;
    self.myRouter = router;
    self.myRouter.initializeSimulation(self.entityID);

    router.requestAddress(wire, self.getHostname(), function (err) {
      if (err) {
        wire.destroy(function () {
          onComplete(err);
        });
        return;
      }

      self.myWire = wire;
      self.myRouter = router;
      self.routerChange.notifyObservers(self.myWire, self.myRouter);

      self.status_ = "Connected to " + router.getDisplayName() +
      " with address " + wire.localAddress;
      self.update(onComplete);
    });
  });
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

        logger.info('Local node sent message: ' + JSON.stringify(payload));
        if (self.sentLog_) {
          self.sentLog_.log(payload);
        }
        onComplete(null);
      }
  );
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

  var self = this;
  var messages = rows.map(function (row) {
    return new NetSimMessage(self.shard_, row);
  }).filter(function (message) {
    return message.toNodeID === self.entityID;
  });

  // If any messages are for us, get our routing table and process messages.
  if (messages.length > 0) {
    this.isProcessingMessages_ = true;
    messages.forEach(function (message) {

      // Pull the message off the wire, and hold it in-memory until we route it.
      // We'll create a new one with the same payload if we have to send it on.
      message.destroy(function (err) {
        if (err) {
          logger.error('Error pulling message off the wire: ' + err.message);
          return;
        }
        self.handleMessage_(message);
      });

    });
    this.isProcessingMessages_ = false;
  }
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
},{"../ObservableEvent":1,"../utils":224,"./NetSimClientNode":119,"./NetSimEntity":131,"./NetSimHeartbeat":132,"./NetSimLogger":140,"./NetSimMessage":141}],141:[function(require,module,exports){
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

/** Build own row for the message table  */
NetSimMessage.prototype.buildRow_ = function () {
  return {
    fromNodeID: this.fromNodeID,
    toNodeID: this.toNodeID,
    payload: this.payload
  };
};

},{"../utils":224,"./NetSimEntity":131}],140:[function(require,module,exports){
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

},{}],132:[function(require,module,exports){
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

},{"../utils":224,"./NetSimEntity":131}],119:[function(require,module,exports){
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
  return NetSimClientNode.getNodeType();
};
NetSimClientNode.getNodeType = function () {
  return 'user';
};

/** @inheritdoc */
NetSimClientNode.prototype.getStatus = function () {
  return this.status_ ? this.status_ : 'Online';
};

},{"../utils":224,"./NetSimNode":144}],144:[function(require,module,exports){
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
  return this.getDisplayName().replace(/[^\w\d]/g, '').toLowerCase() + this.entityID;
};

/**
 * Get node's type.
 * @returns {string}
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
},{"../utils":224,"./NetSimEntity":131,"./NetSimWire":165}],165:[function(require,module,exports){
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

},{"../utils":224,"./NetSimEntity":131}],131:[function(require,module,exports){
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

},{}],118:[function(require,module,exports){
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
 * @param {string} newEncoding
 */
NetSimChunkSizeControl.prototype.setEncoding = function (newEncoding) {
  if (newEncoding === 'all') {
    this.currentUnits_ = ['character', 'number'];
  } else if (newEncoding === 'ascii') {
    this.currentUnits_ = ['character'];
  } else if (newEncoding === 'decimal') {
    this.currentUnits_ = ['number'];
  } else {
    this.currentUnits_ = ['byte'];
  }
  this.rootDiv_.find('.unit_label').html(this.currentUnits_.join('/'));
};

},{"./NetSimChunkSizeControl.html":117}],117:[function(require,module,exports){
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
},{"ejs":245}],116:[function(require,module,exports){
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
  this.whenReadyCallbacks_ = [];
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
},{}],46:[function(require,module,exports){
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

},{"./utils":224}],18:[function(require,module,exports){
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

/** Namespace for app storage. */
var appsApi = module.exports;

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
 * API for master channel list on the server.
 * @constructor
 */
appsApi.AppsTable = function () {
  this.requestHelper_ = new ApiRequestHelper('/v3/channels');
};

/**
 * @param {!NodeStyleCallback} callback
 */
appsApi.AppsTable.prototype.readAll = function (callback) {
  this.requestHelper_.get('', callback);
};

/**
 * @param {!string} id - unique app GUID
 * @param {!NodeStyleCallback} callback
 */
appsApi.AppsTable.prototype.read = function (id, callback) {
  this.requestHelper_.get('/' + id, callback);
};

/**
 * @param {!Object} value
 * @param {!NodeStyleCallback} callback
 */
appsApi.AppsTable.prototype.create = function (value, callback) {
  this.requestHelper_.postToGet('', value, callback);
};

/**
 * @param {!string} id
 * @param {!Object} value
 * @param {!NodeStyleCallback} callback
 */
appsApi.AppsTable.prototype.update = function (id, value, callback) {
  this.requestHelper_.post('/' + id, value, callback);
};

/**
 * @param {!string} id
 * @param {!NodeStyleCallback} callback
 */
appsApi.AppsTable.prototype.delete = function (id, callback) {
  this.requestHelper_.delete('/' + id, callback);
};

/**
 * App-specific Shared Storage Table
 * Data stored in this table can by modified and retrieved by all users of
 * a particular app, but is not shared between apps.
 * Only real difference with parent class AppsTable is that these
 * tables deal in numeric row IDs, not string GUIDs.  Implementation
 * shouldn't care though.
 * @constructor
 * @augments appsApi.AppsTable
 */
appsApi.SharedTable = function (app_publickey, table_name) {
  appsApi.AppsTable.call(this);
  /** Shared tables just use a different base URL */
  this.requestHelper_ = new ApiRequestHelper('/v3/shared-tables/' +
      app_publickey + '/' + table_name);
};
appsApi.SharedTable.inherits(appsApi.AppsTable);

/**
 * App-specific User Storage Table
 * Data stored in this table can only be modified and retrieved by a particular
 * user of an app.
 * @constructor
 * @augments appsApi.AppsTable
 */
appsApi.UserTable = function (app_publickey, table_name) {
  appsApi.AppsTable.call(this);
  /** User tables just use a different base URL */
  this.requestHelper_ = new ApiRequestHelper('/v3/user-tables/' +
      app_publickey + '/' + table_name);
};
appsApi.UserTable.inherits(appsApi.AppsTable);

/**
 * API for interacting with app property bags on the server.
 * This property bag is shared between all users of the app.
 *
 * @param {!string} app_publickey
 * @constructor
 */
appsApi.PropertyBag = function (app_publickey) {
  this.requestHelper_ = new ApiRequestHelper('/v3/shared-properties/' +
      app_publickey);
};

/**
 * @param {!NodeStyleCallback} callback
 */
appsApi.PropertyBag.prototype.readAll = function (callback) {
  this.requestHelper_.get('', callback);
};

/**
 * @param {string} key
 * @param {!NodeStyleCallback} callback
 */
appsApi.PropertyBag.prototype.read = function (key, callback) {
  this.requestHelper_.get('/' + key, callback);
};

/**
 * @param {string} key
 * @param {Object} value
 * @param {!NodeStyleCallback} callback
 */
appsApi.PropertyBag.prototype.set = function (key, value, callback) {
  this.requestHelper_.post('/' + key, value, callback);
};

/**
 * @param {string} key
 * @param {!NodeStyleCallback} callback
 */
appsApi.PropertyBag.prototype.delete = function (key, callback) {
  this.requestHelper_.delete('/' + key, callback);
};

/**
 * App-specific User-specific property bag
 * Only accessible to the current user of the particular app.
 * @param app_publickey
 * @constructor
 * @augments appsApi.PropertyBag
 */
appsApi.UserPropertyBag = function (app_publickey) {
  appsApi.PropertyBag.call(this, app_publickey);
  /** User property bags just use a different base URL */
  this.requestHelper_ = new ApiRequestHelper('/v3/user-properties/' +
      app_publickey);
};
appsApi.UserPropertyBag.inherits(appsApi.PropertyBag);

},{"./utils":224}],3:[function(require,module,exports){
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
},{}]},{},[170]);
