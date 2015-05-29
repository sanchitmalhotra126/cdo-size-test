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

var NetSimLogEntry = require('./NetSimLogEntry');
var Packet = require('./Packet');
var markup = require('./NetSimRouterLogModal.html.ejs');
var netsimGlobals = require('./netsimGlobals');

/**
 * Generator and controller for contents of modal dialog that reveals
 * all router logs together, in a searchable/sortable/filterable manner.
 *
 * @param {jQuery} rootDiv
 * @constructor
 */
var NetSimRouterLogModal = module.exports = function (rootDiv) {
  /**
   * Component root, which we fill whenever we call render()
   * @type {jQuery}
   * @private
   */
  this.rootDiv_ = rootDiv;

  /**
   * @type {NetSimShard}
   * @private
   */
  this.shard_ = null;

  /**
   * @type {NetSimLogEntry[]}
   * @private
   */
  this.logEntries_ = [];

  /**
   * Tracking information for which events we're registered to, so we can
   * perform cleanup as needed.
   * @type {Object}
   * @private
   */
  this.eventKeys_ = {};

  /**
   * Sorting key, changed by user interaction, which determines which sort
   * we use on render.
   * @type {string}
   * @private
   */
  this.sortBy_ = 'timestamp';

  this.render();
};

function makeStringSorter(logEntryToSortString) {
  return function (logEntries) {
    var sortProxy = logEntries.map(function (entry, index) {
      return {
        index: index,
        sortValue: logEntryToSortString(entry)
      };
    });

    sortProxy.sort(function (a, b) {
      return a.sortValue.localeCompare(b.sortValue);
    });

    return sortProxy.map(function (proxy) {
      return logEntries[proxy.index];
    });
  };
}

NetSimRouterLogModal.sortOperations = {

  'timestamp': function (logEntries) {
    logEntries.sort(function (a, b) {
      return a.timestamp - b.timestamp;
    });
    return logEntries;
  },

  'logged-by': makeStringSorter(function (logEntry) {
    return logEntry.getOriginNode().getDisplayName();
  }),

  'status': makeStringSorter(function (logEntry) {
    return logEntry.getLocalizedStatus();
  }),

  'from-address': makeStringSorter(function (logEntry) {
    return logEntry.getHeaderField(Packet.HeaderType.FROM_ADDRESS);
  }),

  'to-address': makeStringSorter(function (logEntry) {
    return logEntry.getHeaderField(Packet.HeaderType.TO_ADDRESS);
  }),

  'packet-info': makeStringSorter(function (logEntry) {
    return logEntry.getLocalizedPacketInfo();
  }),

  'message': makeStringSorter(function (logEntry) {
    return logEntry.getMessageAscii();
  })

};

/**
 * Fill the root div with new elements reflecting the current state
 */
NetSimRouterLogModal.prototype.render = function () {

  // Sort before rendering
  var sortOperation = NetSimRouterLogModal.sortOperations[this.sortBy_];
  var sortedLogEntries = sortOperation(this.logEntries_);

  var renderedMarkup = $(markup({
    logEntries: sortedLogEntries,
    sortBy: this.sortBy_
  }));
  this.rootDiv_.html(renderedMarkup);

  this.rootDiv_.find('th').click(function (event) {
    this.onSortHeaderClick_($(event.target).attr('data-sort-key'));
  }.bind(this));
};

NetSimRouterLogModal.prototype.onSortHeaderClick_ = function (sortKey) {
  if (!sortKey) {
    return;
  }

  this.sortBy_ = sortKey;
  this.render();
};

/**
 * Give the log browser a reference to the shard, so that it can query the
 * log table.  Or, pass null when disconnecting from a shard.
 * @param {NetSimShard|null} newShard
 */
NetSimRouterLogModal.prototype.setShard = function (newShard) {

  if (this.eventKeys_.registeredWithShard) {
    this.eventKeys_.registeredWithShard.logTable.tableChange.unregister(
        this.eventKeys_.logTableChange);
    this.eventKeys_.registeredWithShard = null;
  }

  if (newShard) {
    this.eventKeys_.logTableChange = newShard.logTable.tableChange.register(
        this.onLogTableChange_.bind(this));
    this.eventKeys_.registeredWithShard = newShard;
  }

  this.shard_ = newShard;
};

/**
 * Handle log table changes.
 * @param {logEntryRow[]} logRows
 * @private
 */
NetSimRouterLogModal.prototype.onLogTableChange_ = function (logRows) {
  var headerSpec = netsimGlobals.getLevelConfig().routerExpectsPacketHeader;
  this.logEntries_ = logRows.map(function (row) {
    return new NetSimLogEntry(this.shard_, row, headerSpec);
  }, this);
  this.render();
};
