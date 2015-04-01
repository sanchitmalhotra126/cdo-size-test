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
 * @property {boolean} showRouterMemoryControl - Whether students should be
 *           able to see and manipulate the slider that adjusts the router's
 *           maximum queue memory.
 *
 * @property {number} defaultRouterMemory - How much data the router packet
 *           queue is able to hold before it starts dropping packets, in bits.
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
  showRouterMemoryControl: true,
  defaultRouterMemory: Infinity,

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
