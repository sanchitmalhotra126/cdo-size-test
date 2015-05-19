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
var NetSimFakeVizWire = require('./NetSimFakeVizWire');
var NetSimWire = require('./NetSimWire');
var NetSimVizNode = require('./NetSimVizNode');
var NetSimVizWire = require('./NetSimVizWire');
var netsimGlobals = require('./netsimGlobals');
var tweens = require('./tweens');
var NodeType = require('./netsimConstants').NodeType;

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
 * @param {NetSim} netsim - core app controller, provides access to change
 *        events and connection information.
 * @constructor
 */
var NetSimVisualization = module.exports = function (svgRoot, runLoop, netsim) {
  /**
   * @type {jQuery}
   * @private
   */
  this.svgRoot_ = svgRoot;

  /**
   * @type {NetSim}
   * @private
   */
  this.netsim_ = netsim;

  /**
   * The shard currently being represented.
   * We don't have a shard now, but we register with the connection manager
   * to find out when we have one.
   * @type {NetSimShard}
   * @private
   */
  this.shard_ = null;
  netsim.shardChange.register(this.onShardChange_.bind(this));

  /**
   * List of VizEntities, which are all the elements that will actually show up
   * in our visualization.
   * @type {Array.<NetSimVizElement>}
   * @private
   */
  this.elements_ = [];

  /**
   * Reference to the local node viz entity, the anchor for the visualization.
   * @type {NetSimVizNode}
   */
  this.localNode = null;

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
   * Event registration information
   * @type {Object}
   */
  this.eventKeys = {};

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
  this.elements_.forEach(function (entity) {
    entity.tick(clock);
  });

  // Tear out dead entities.
  this.elements_ = this.elements_.filter(function (entity) {
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
  this.elements_.forEach(function (entity) {
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
  this.shard_ = newShard;

  // If we were registered for shard events, unregister old handlers.
  if (this.eventKeys.registeredWithShard) {
    this.eventKeys.registeredWithShard.nodeTable.tableChange.unregister(
        this.eventKeys.nodeTable);
    this.eventKeys.registeredWithShard.wireTable.tableChange.unregister(
        this.eventKeys.wireTable);
    this.eventKeys.registeredWithShard = null;
  }

  // If we have a new shard, register new handlers.
  if (newShard) {
    this.eventKeys.nodeTable = newShard.nodeTable.tableChange.register(
        this.onNodeTableChange_.bind(this));
    this.eventKeys.wireTable = newShard.wireTable.tableChange.register(
        this.onWireTableChange_.bind(this));
    this.eventKeys.registeredWithShard = newShard;
  }
};

/**
 * Change which node we consider the 'local node' in the visualization.
 * We go through a special creation process for this node, so that it
 * looks and behaves differently.
 * @param {?NetSimLocalClientNode} newLocalNode - null if disconnected
 */
NetSimVisualization.prototype.setLocalNode = function (newLocalNode) {
  // Unregister old handlers
  if (this.eventKeys.registeredWithLocalNode) {
    this.eventKeys.registeredWithLocalNode.remoteChange.unregister(
        this.eventKeys.remoteChange);
    this.eventKeys.registeredWithLocalNode = null;
  }

  // Register new handlers
  if (newLocalNode) {
    this.eventKeys.remoteChange = newLocalNode.remoteChange.register(
        this.onRemoteChange_.bind(this));
    this.eventKeys.registeredWithLocalNode = newLocalNode;
  }

  // Create viznode for local node
  if (newLocalNode) {
    if (this.localNode) {
      this.localNode.configureFrom(newLocalNode);
    } else {
      this.localNode = new NetSimVizNode(newLocalNode);
      this.elements_.push(this.localNode);
      this.svgRoot_.find('#background-group').append(this.localNode.getRoot());
    }
    this.localNode.setIsLocalNode();
  } else {
    this.localNode.kill();
    this.localNode = null;
  }
  this.pullElementsToForeground();
};

/**
 * Called whenever the local node notifies that we've been connected to,
 * or disconnected from, a router.
 * @private
 */
NetSimVisualization.prototype.onRemoteChange_ = function () {
  this.pullElementsToForeground();
  this.distributeForegroundNodes();
};

/**
 * Find a particular VizEntity in the visualization, by type and ID.
 * @param {function} entityType - constructor of entity we're looking for
 * @param {number} entityID - ID, with corresponds to NetSimEntity.entityID
 * @returns {NetSimVizEntity} or undefined if not found
 */
NetSimVisualization.prototype.getEntityByID = function (entityType, entityID) {
  return _.find(this.elements_, function (entity) {
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
  return this.elements_.filter(function (entity) {
    return entity instanceof NetSimVizWire &&
        (
        (entity.localVizNode === vizNode) ||
        (vizNode.isRouter && entity.remoteVizNode === vizNode)
        );
  });
};

/**
 * Gets the set of FakeVizWires directly attached to the given VizNode (in
 * either direction).
 * @param {NetSimVizNode} vizNode
 * @returns {NetSimFakeVizWire[]} the attached fake wires
 */
NetSimVisualization.prototype.getFakeWiresAttachedToNode = function (vizNode) {
  return this.elements_.filter(function (entity) {
    return entity instanceof NetSimFakeVizWire &&
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
    newVizNode.setDnsMode(this.netsim_.getDnsMode());
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
    var newVizWire = new NetSimVizWire(wire, this.getEntityByID.bind(this));
    newVizWire.setEncodings(this.netsim_.getEncodings());
    return newVizWire;
  }.bind(this));

  // In broadcast mode we hide the real wires and router, and overlay a set
  // of fake wires showing everybody connected to everybody else.
  if (netsimGlobals.getLevelConfig().broadcastMode) {
    this.updateBroadcastModeWires_();
  }

  // Since the wires table determines simulated connectivity, we trigger a
  // recalculation of which nodes are in the local network (should be in the
  // foreground) and then re-layout the foreground nodes.
  this.pullElementsToForeground();
  this.distributeForegroundNodes();
};

/**
 * Based on new connectivity information, recalculate which 'fake' connections
 * we need to display to show all nodes in a 'room' having direct wires to
 * one another.
 * @private
 */
NetSimVisualization.prototype.updateBroadcastModeWires_ = function () {
  // Kill all fake wires
  this.elements_.forEach(function (vizElement) {
    if (vizElement instanceof NetSimFakeVizWire) {
      vizElement.kill();
    }
  }, this);

  // Generate new wires where they don't already exist
  var connections = this.generateBroadcastModeConnections_();
  connections.forEach(function (connectedPair) {
    var newFakeWire = new NetSimFakeVizWire(connectedPair,
        this.getEntityByID.bind(this));
    this.addVizEntity_(newFakeWire);
  }, this);
};

/**
 * Using the cached node and wire data, generates the set of all node pairs (A,B)
 * on the shard such that both A and B are client nodes, and A is reachable
 * from B.
 * @returns {Array.<{nodeA:{number}, nodeB:{number}}>}
 * @private
 */
NetSimVisualization.prototype.generateBroadcastModeConnections_ = function () {
  var nodeRows = this.shard_.nodeTable.readAllCached();
  var wireRows = this.shard_.wireTable.readAllCached();
  var nodeCount = nodeRows.length;

  // Generate a reverse mapping for lookups
  var nodeIDToIndex = {};
  for (var matrixIndex = 0; matrixIndex < nodeCount; matrixIndex++) {
    nodeIDToIndex[nodeRows[matrixIndex].id] = matrixIndex;
  }

  // Generate empty graph matrix initialized with no connections.
  var graph = new Array(nodeCount);
  for (var x = 0; x < nodeCount; x++) {
    graph[x] = new Array(nodeCount);
    for (var y = 0; y < nodeCount; y++) {
      graph[x][y] = false;
    }
  }

  // Apply real connections (wires) to the graph matrix
  wireRows.forEach(function (wireRow) {
    var localNodeIndex = nodeIDToIndex[wireRow.localNodeID];
    var remoteNodeIndex = nodeIDToIndex[wireRow.remoteNodeID];
    if (localNodeIndex !== undefined && remoteNodeIndex !== undefined) {
      graph[localNodeIndex][remoteNodeIndex] = true;
      graph[remoteNodeIndex][localNodeIndex] = true;
    }
  });

  // Use simple Floyd-Warshall to complete the transitive closure graph
  for (var k = 0; k < nodeCount; k++) {
    for (var i = 0; i < nodeCount; i++) {
      for (var j = 0; j < nodeCount; j++) {
        if (graph[i][k] && graph[k][j]) {
          graph[i][j] = true;
        }
      }
    }
  }

  // Now, generate unique pairs doing lookup on our transitive closure graph
  var connections = [];
  for (var from = 0; from < nodeCount - 1; from++) {
    for (var to = from + 1; to < nodeCount; to++) {
      // leave router connections out of this list
      var clientToClient = (nodeRows[from].type === NodeType.CLIENT &&
          nodeRows[to].type === NodeType.CLIENT);
      // Must be reachable
      var reachable = graph[from][to];
      if (clientToClient && reachable) {
        connections.push({
          nodeA: nodeRows[from].id,
          nodeB: nodeRows[to].id
        });
      }
    }
  }
  return connections;
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
  this.elements_.forEach(function (vizEntity) {
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
 * @param {NetSimVizElement} vizElement
 * @private
 */
NetSimVisualization.prototype.addVizEntity_ = function (vizElement) {
  this.elements_.push(vizElement);
  this.svgRoot_.find('#background-group').prepend(vizElement.getRoot());
};

/**
 * If we do need a DOM change, detach the entity and reattach it to the new
 * layer. Special rule (for now): Prepend wires so that they show up behind
 * nodes.  Will need a better solution for this if/when the viz gets more
 * complex.
 * @param {NetSimVizElement} vizElement
 * @param {jQuery} newParent
 */
var moveVizEntityToGroup = function (vizElement, newParent) {
  vizElement.getRoot().detach();
  if (vizElement instanceof NetSimVizWire ||
      vizElement instanceof NetSimFakeVizWire) {
    vizElement.getRoot().prependTo(newParent);
  } else {
    vizElement.getRoot().appendTo(newParent);
  }
};

/**
 * Recalculate which nodes should be in the foreground layer by doing a full
 * traversal starting with the local node.  In short, everything reachable
 * from the local node belongs in the foreground.
 */
NetSimVisualization.prototype.pullElementsToForeground = function () {
  // Begin by marking all entities background (unvisited)
  this.elements_.forEach(function (vizElement) {
    vizElement.visited = false;
  });

  if (this.netsim_.isConnectedToRemote()) {
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
    var currentVizElement;
    while (toExplore.length > 0) {
      currentVizElement = toExplore.pop();
      currentVizElement.visited = true;
      toExplore = toExplore.concat(this.getUnvisitedNeighborsOf_(currentVizElement));
    }
  } else if (this.localNode) {
    // ONLY pull the local node to the foreground if we don't have a connection
    // yet.
    this.localNode.visited = true;
  }

  // Now, visited nodes belong in the foreground.
  // Move all nodes to their new, correct layers
  // Possible optimization: Can we do this with just one operation on the live DOM?
  var foreground = this.svgRoot_.find('#foreground-group');
  var background = this.svgRoot_.find('#background-group');
  this.elements_.forEach(function (vizEntity) {
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
    neighbors = this.getWiresAttachedToNode(vizEntity)
        .concat(this.getFakeWiresAttachedToNode(vizEntity));
  } else if (vizEntity instanceof NetSimVizWire) {
    if (vizEntity.localVizNode) {
      neighbors.push(vizEntity.localVizNode);
    }

    if (vizEntity.remoteVizNode) {
      neighbors.push(vizEntity.remoteVizNode);
    }
  }
  // We intentionally exclude NetSimFakeVizWire; it should give no
  // neighbors because it's not used to calculate reachability.

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
  var foregroundNodes = this.elements_.filter(function (entity) {
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
 * @param {DnsMode} newDnsMode
 */
NetSimVisualization.prototype.setDnsMode = function (newDnsMode) {
  // Tell all nodes about the new DNS mode, so they can decide whether to
  // show or hide their address.
  this.elements_.forEach(function (vizEntity) {
    if (vizEntity instanceof NetSimVizNode) {
      vizEntity.setDnsMode(newDnsMode);
    }
  });
};

/**
 * @param {number} dnsNodeID
 */
NetSimVisualization.prototype.setDnsNodeID = function (dnsNodeID) {
  this.elements_.forEach(function (vizEntity) {
    if (vizEntity instanceof NetSimVizNode) {
      vizEntity.setIsDnsNode(vizEntity.id === dnsNodeID);
    }
  });
};

/**
 * Update encoding-view setting across the visualization.
 *
 * @param {EncodingType[]} newEncodings
 */
NetSimVisualization.prototype.setEncodings = function (newEncodings) {
  this.elements_.forEach(function (vizEntity) {
    if (vizEntity instanceof NetSimVizWire) {
      vizEntity.setEncodings(newEncodings);
    }
  });
};

/**
 * Kick off an animation that will show the state of the simplex wire being
 * set by the local node.
 * @param {"0"|"1"} newState
 */
NetSimVisualization.prototype.animateSetWireState = function (newState) {
  // Assumptions - we are talking about the wire between the local node
  // and its remote partner.
  // This only gets used in peer-to-peer mode, so there should be an incoming
  // wire too, which we should hide.
  // This is a no-op if no such wire exists.
  // We can stop any previous animation on the wire if this is called

  var vizWire = this.getVizWireToRemote();
  var incomingWire = this.getVizWireFromRemote();
  if (!(vizWire && incomingWire)) {
    return;
  }

  // Hide the incoming wire because we are in simplex mode.
  incomingWire.hide();
  // Animate the outgoing wire
  vizWire.animateSetState(newState);
};

/**
 * Kick off an animation that will show the state of the simplex wire being
 * read by the local node.
 * @param {"0"|"1"} newState
 */
NetSimVisualization.prototype.animateReadWireState = function (newState) {
  // Assumes we are in simplex P2P mode and talking about the wire between
  // the local node and its remote partner.  This is a no-op if no such wire
  // exists.  We can stop any previous animation on the wire if this is called.

  var vizWire = this.getVizWireToRemote();
  var incomingWire = this.getVizWireFromRemote();
  if (!(vizWire && incomingWire)) {
    return;
  }

  // Hide the incoming wire because we are in simplex mode.
  incomingWire.hide();
  // Animate the outgoing wire
  vizWire.animateReadState(newState);
};

/**
 * Find the outgoing wire from the local node to a remote node.
 * @returns {NetSimVizWire|null} null if no outgoing connection is established.
 */
NetSimVisualization.prototype.getVizWireToRemote = function () {
  if (!this.localNode) {
    return null;
  }

  var outgoingWires = this.elements_.filter(function (entity) {
    return entity instanceof NetSimVizWire &&
        entity.localVizNode === this.localNode;
  }, this);

  if (outgoingWires.length === 0) {
    return null;
  }

  return outgoingWires[0];
};

/**
 * Find the incoming wire from a remote node to the local node.
 * @returns {NetSimVizWire|null} null if no incoming connection is established.
 */
NetSimVisualization.prototype.getVizWireFromRemote = function () {
  if (!this.localNode) {
    return null;
  }

  var incomingWires = this.elements_.filter(function (entity) {
    return entity instanceof NetSimVizWire &&
        entity.remoteVizNode === this.localNode;
  }, this);

  if (incomingWires.length === 0) {
    return null;
  }

  return incomingWires[0];
};
