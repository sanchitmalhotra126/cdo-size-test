/**
 * Blockly Apps: Maze
 *
 * Copyright 2012 Google Inc.
 * http://blockly.googlecode.com/
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
 * @fileoverview JavaScript for Blockly's Maze application.
 * @author fraser@google.com (Neil Fraser)
 */

const timeoutList = require('../lib/util/timeoutList');
const studioApp = require('../StudioApp').singleton;

const AnimationsController = require('./animationsController');
const MazeMap = require('./mazeMap');
const drawMap = require('./drawMap');
const getSubtypeForSkin = require('./mazeUtils').getSubtypeForSkin;
const tiles = require('./tiles');

module.exports = class MazeController {
  constructor(level, skin, config) {
    const Type = getSubtypeForSkin(config.skinId);
    const subtype = new Type(this, studioApp(), config);

    this.stepSpeed = 100;

    this.level = level;
    this.skin = skin;
    this.startDirection;

    this.map;
    this.subtype = subtype;
    this.animationsController;

    this.animating_;
    this.response;
    this.result;
    this.testResults;
    this.waitingForReport;

    this.pegmanD;
    this.pegmanX;
    this.pegmanY;

    this.MAZE_HEIGHT;
    this.MAZE_WIDTH;
    this.PATH_WIDTH;
    this.PEGMAN_HEIGHT;
    this.PEGMAN_WIDTH;
    this.PEGMAN_X_OFFSET;
    this.PEGMAN_Y_OFFSET;
    this.SQUARE_SIZE;

    this.loadLevel_();
  }

  initWithSvg(svg) {
    // Adjust outer element size.
    svg.setAttribute('width', this.MAZE_WIDTH);
    svg.setAttribute('height', this.MAZE_HEIGHT);

    drawMap.default(svg, this.skin, this.subtype, this.map, this.SQUARE_SIZE);
    this.animationsController = new AnimationsController(this, svg);
  }

  loadLevel_() {
    // Load maps.
    //
    // "serializedMaze" is the new way of storing maps; it's a JSON array
    // containing complex map data.
    //
    // "map" plus optionally "levelDirt" is the old way of storing maps;
    // they are each arrays of a combination of strings and ints with
    // their own complex syntax. This way is deprecated for new levels,
    // and only exists for backwards compatibility for not-yet-updated
    // levels.
    if (this.level.serializedMaze) {
      this.map = MazeMap.deserialize(this.level.serializedMaze, this.subtype.getCellClass());
    } else {
      this.map = MazeMap.parseFromOldValues(this.level.map, this.level.initialDirt, this.subtype.getCellClass());
    }

    // this could possibly be eliminated in favor of just always referencing
    // this.level.startDirection
    this.startDirection = this.level.startDirection;

    // this could probably be moved to the constructor
    this.animating_ = false;

    if (this.level.fastGetNectarAnimation) {
      this.skin.actionSpeedScale.nectar = 0.5;
    }

    // Pixel height and width of each maze square (i.e. tile).
    this.SQUARE_SIZE = 50;
    this.PEGMAN_HEIGHT = this.skin.pegmanHeight;
    this.PEGMAN_WIDTH = this.skin.pegmanWidth;
    this.PEGMAN_X_OFFSET = this.skin.pegmanXOffset || 0;
    this.PEGMAN_Y_OFFSET = this.skin.pegmanYOffset;

    this.MAZE_WIDTH = this.SQUARE_SIZE * this.map.COLS;
    this.MAZE_HEIGHT = this.SQUARE_SIZE * this.map.ROWS;
    this.PATH_WIDTH = this.SQUARE_SIZE / 3;
  }

  /**
   * Redraw all dirt images
   * @param {boolean} running Whether or not user program is currently running
   */
  resetDirtImages_(running) {
    this.map.forEachCell((cell, row, col) => {
      this.subtype.drawer.updateItemImage(row, col, running);
    });
  }

  /**
   * Initialize Blockly and the maze.  Called on page load.
   */

  gridNumberToPosition_(n) {
    return (n + 0.5) * this.SQUARE_SIZE;
  }

  /**
   * @param svg
   * @param {Array<Array>} coordinates An array of x and y grid coordinates.
   */
  drawHintPath_(svg, coordinates) {
    const path = svg.getElementById('hintPath');
    path.setAttribute('d', 'M' + coordinates.map(([x, y]) => {
      return `${this.gridNumberToPosition_(x)},${this.gridNumberToPosition_(y)}`;
    }).join(' '));
  }

  /**
   * Reset the maze to the start position and kill any pending animation tasks.
   * @param {boolean} first True if an opening animation is to be played.
   */
  reset_ = (first) => {
    this.subtype.reset();

    // Kill all tasks.
    timeoutList.clearTimeouts();

    this.animating_ = false;

    // Move Pegman into position.
    this.pegmanX = this.subtype.start.x;
    this.pegmanY = this.subtype.start.y;

    this.pegmanD = this.startDirection;
    this.animationsController.reset(first);

    // Move the init dirt marker icons into position.
    this.map.resetDirt();
    this.resetDirtImages_(false);

    // Reset the obstacle image.
    var obsId = 0;
    var x, y;
    for (y = 0; y < this.map.ROWS; y++) {
      for (x = 0; x < this.map.COLS; x++) {
        var obsIcon = document.getElementById('obstacle' + obsId);
        if (obsIcon) {
          obsIcon.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href',
                                 this.skin.obstacleIdle);
        }
        ++obsId;
      }
    }

    if (this.subtype.resetTiles) {
      this.subtype.resetTiles();
    } else {
      this.resetTiles_();
    }
  };

  resetTiles_() {
    // Reset the tiles
    var tileId = 0;
    for (var y = 0; y < this.map.ROWS; y++) {
      for (var x = 0; x < this.map.COLS; x++) {
        // Tile's clipPath element.
        var tileClip = document.getElementById('tileClipPath' + tileId);
        tileClip.setAttribute('visibility', 'visible');
        // Tile sprite.
        var tileElement = document.getElementById('tileElement' + tileId);
        tileElement.setAttributeNS(
            'http://www.w3.org/1999/xlink', 'xlink:href', this.skin.tiles);
        tileElement.setAttribute('opacity', 1);
        tileId++;
      }
    }
  }

  animatedFinish_(timePerStep) {
    this.animationsController.scheduleDance(true, timePerStep);
  }

  animatedMove_(direction, timeForMove) {
    var positionChange = tiles.directionToDxDy(direction);
    var newX = this.pegmanX + positionChange.dx;
    var newY = this.pegmanY + positionChange.dy;
    this.animationsController.scheduleMove(newX, newY, timeForMove);
    studioApp().playAudio('walk');
    this.pegmanX = newX;
    this.pegmanY = newY;
  }

  animatedTurn_(direction) {
    var newDirection = this.pegmanD + direction;
    this.animationsController.scheduleTurn(newDirection);
    this.pegmanD = tiles.constrainDirection4(newDirection);
  }

  animatedFail_(forward) {
    var dxDy = tiles.directionToDxDy(this.pegmanD);
    var deltaX = dxDy.dx;
    var deltaY = dxDy.dy;

    if (!forward) {
      deltaX = -deltaX;
      deltaY = -deltaY;
    }

    var targetX = this.pegmanX + deltaX;
    var targetY = this.pegmanY + deltaY;
    var frame = tiles.directionToFrame(this.pegmanD);
    this.animationsController.displayPegman(
      this.pegmanX + deltaX / 4,
      this.pegmanY + deltaY / 4,
      frame,
    );
    // Play sound and animation for hitting wall or obstacle
    var squareType = this.map.getTile(targetY, targetX);
    if (squareType === tiles.SquareType.WALL || squareType === undefined ||
      (this.subtype.isScrat() && squareType === tiles.SquareType.OBSTACLE)) {
      // Play the sound
      studioApp().playAudio('wall');
      if (squareType !== undefined) {
        // Check which type of wall pegman is hitting
        studioApp().playAudio('wall' + this.subtype.wallMap[targetY][targetX]);
      }

      if (this.subtype.isScrat() && squareType === tiles.SquareType.OBSTACLE) {
        this.animationsController.crackSurroundingIce(targetX, targetY);
      }

      this.animationsController.scheduleWallHit(targetX, targetY, deltaX, deltaY, frame);
      timeoutList.setTimeout(() => {
        studioApp().playAudioOnFailure();
      }, this.stepSpeed * 2);
    } else if (squareType === tiles.SquareType.OBSTACLE) {
      // Play the sound
      studioApp().playAudio('obstacle');
      this.animationsController.scheduleObstacleHit(targetX, targetY, deltaX, deltaY, frame);
      timeoutList.setTimeout(function () {
        studioApp().playAudioOnFailure();
      }, this.stepSpeed);
    }
  }

  /**
   * Display the look icon at Pegman's current location,
   * in the specified direction.
   * @param {!Direction} direction Direction (0 - 3).
   */
  animatedLook_(direction) {
    var x = this.pegmanX;
    var y = this.pegmanY;
    switch (direction) {
      case tiles.Direction.NORTH:
        x += 0.5;
        break;
      case tiles.Direction.EAST:
        x += 1;
        y += 0.5;
        break;
      case tiles.Direction.SOUTH:
        x += 0.5;
        y += 1;
        break;
      case tiles.Direction.WEST:
        y += 0.5;
        break;
    }
    x *= this.SQUARE_SIZE;
    y *= this.SQUARE_SIZE;
    var d = direction * 90 - 45;

    this.animationsController.scheduleLook(x, y, d);
  }

  scheduleDirtChange_(options) {
    var col = this.pegmanX;
    var row = this.pegmanY;

    // cells that started as "flat" will be undefined
    var previousValue = this.map.getValue(row, col) || 0;

    this.map.setValue(row, col, previousValue + options.amount);
    this.subtype.scheduleDirtChange(row, col);
    studioApp().playAudio(options.sound);
  }

  /**
   * Schedule to add dirt at pegman's current position.
   */
  scheduleFill_() {
    this.scheduleDirtChange_({
      amount: 1,
      sound: 'fill'
    });
  }

  /**
   * Schedule to remove dirt at pegman's current location.
   */
  scheduleDig_() {
    this.scheduleDirtChange_({
      amount: -1,
      sound: 'dig'
    });
  }

  /**
   * Certain Maze types - namely, WordSearch, Collector, and any Maze with
   * Quantum maps, don't want to check for success until the user's code
   * has finished running completely.
   */
  shouldCheckSuccessOnMove() {
    if (this.map.hasMultiplePossibleGrids()) {
      return false;
    }
    return this.subtype.shouldCheckSuccessOnMove();
  }
};
