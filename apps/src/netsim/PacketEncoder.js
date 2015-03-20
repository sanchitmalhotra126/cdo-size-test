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
 * Single packet header field type
 * @typedef {Object} packetHeaderField
 *
 * @property {string} key - Used to identify the field, for parsing.
 *
 * @property {number} bits - How long (in bits) the field is.
 */

/**
 * Packet header specification type
 * Note: Always assumes variable-length body following the header.
 * @typedef {packetHeaderField[]} packetHeaderSpec
 */

/**
 * Verify that a given format specification describes a valid format that
 * can be used by the PacketEncoder object.
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
 * @param {packetHeaderSpec} formatSpec - Specification of packet format, an
 *        ordered set of objects in the form {key:string, bits:number} where
 *        key is the field name you'll use to retrieve the information, and
 *        bits is the length of the field.
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