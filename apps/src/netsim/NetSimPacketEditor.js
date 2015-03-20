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
var PacketEncoder = require('./PacketEncoder');
var dataConverters = require('./dataConverters');
var netsimConstants = require('./netsimConstants');
var PacketHeaderType = netsimConstants.PacketHeaderType;
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
  var newMarkup = $(markup({}));
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
 * @property {string} typeName - Identifies encoding type for the row
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
    PacketHeaderType.TO_ADDRESS,
    PacketHeaderType.FROM_ADDRESS,
    PacketHeaderType.PACKET_INDEX,
    PacketHeaderType.PACKET_COUNT
  ];

  /** @type {rowType[]} */
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
    PacketHeaderType.TO_ADDRESS,
    PacketHeaderType.FROM_ADDRESS,
    PacketHeaderType.PACKET_INDEX,
    PacketHeaderType.PACKET_COUNT
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
  var encoder = new PacketEncoder(this.packetSpec_);
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
