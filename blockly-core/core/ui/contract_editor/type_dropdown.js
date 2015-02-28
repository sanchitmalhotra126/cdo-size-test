'use strict';

goog.provide('Blockly.TypeDropdown');

/**
 * A DOM-based type selection dropdown
 * @param {!Object} options
 * @param {Function} options.onTypeChanged takes parameter {String} newType
 * @param {Array.<BlockValueType>} options.typeChoices
 * @constructor
 */
Blockly.TypeDropdown = function (options) {
  /**
   * @type {goog.ui.Select}
   * @private
   */
  this.selectComponent_ = null;

  /**
   * Called with new {Blockly.BlockValueType}
   * @type {Function}
   * @private
   */
  this.onTypeChanged_ = options.onTypeChanged;

  /**
   * Types to make available
   * @type {Array.<BlockValueType>}
   * @private
   */
  this.typeChoices_ = options.typeChoices;

  /**
   * Current type of select dropdown
   * @type {Blockly.BlockValueType}
   * @private
   */
  this.type_ = options.type;

  // For disposal
  this.changeListenerKey_ = null;
};

Blockly.TypeDropdown.prototype.render = function (parent) {
  var selectComponent = this.renderSelectComponent_(parent);
  this.attachListeners_(selectComponent);
  this.selectComponent_ = selectComponent;
  this.setType_(this.type_);
};

Blockly.TypeDropdown.prototype.setType_ = function (newType) {
  this.type_ = newType;
  this.colorInputButtonForType_(newType);
};

/**
 * @param {Element} parent parent to render on
 * @returns {goog.ui.Select}
 * @private
 */
Blockly.TypeDropdown.prototype.renderSelectComponent_ = function (parent) {
  var selectComponent = this.createSelect_();
  selectComponent.render(parent);
  return selectComponent;
};

/**
 * @returns {goog.ui.Select} new dropdown
 * @private
 */
Blockly.TypeDropdown.prototype.createSelect_ = function() {
  var newTypeDropdown = new goog.ui.Select(null, null,
    goog.ui.FlatMenuButtonRenderer.getInstance(),
    null,
    new Blockly.CustomCssClassMenuRenderer('colored-type-dropdown'));
  this.typeChoices_.forEach(function (choiceKey) {
    var menuItem = new goog.ui.MenuItem(choiceKey);
    newTypeDropdown.addItem(menuItem);
    this.setMenuItemColor_(menuItem, Blockly.FunctionalTypeColors[choiceKey]);
  }, this);
  newTypeDropdown.setValue(this.type_);
  return newTypeDropdown;
};

Blockly.TypeDropdown.prototype.attachListeners_ = function (selectComponent) {
  this.changeListenerKey_ = goog.events.listen(selectComponent, goog.ui.Component.EventType.CHANGE,
    goog.bind(this.selectChanged_, this));
};

/**
 * @param comboBoxEvent
 * @private
 */
Blockly.TypeDropdown.prototype.selectChanged_ = function(comboBoxEvent) {
  /** @type {Blockly.BlockValueType} */
  var newType = comboBoxEvent.target.getContent();
  this.setType_(newType);
  this.onTypeChanged_(newType);
};

Blockly.TypeDropdown.prototype.colorInputButtonForType_ = function(newType) {
  this.setBackgroundFromHSV_(this.selectComponent_.getElement(), Blockly.FunctionalTypeColors[newType]);
};

/**
 * @param {!goog.ui.MenuItem} menuItem
 * @param {!Array.<Number>} hsvColor
 * @private
 */
Blockly.TypeDropdown.prototype.setMenuItemColor_ = function(menuItem, hsvColor) {
  var menuItemElement = menuItem.getElement();
  this.setBackgroundFromHSV_(menuItemElement, hsvColor);
};

/**
 * @param {!Element} element
 * @param {!Array.<Number>} hsvColor
 */
Blockly.TypeDropdown.prototype.setBackgroundFromHSV_ = function (element, hsvColor) {
  element.style.background =
    goog.color.hsvToHex(hsvColor[0], hsvColor[1], hsvColor[2] * 255);
};

Blockly.TypeDropdown.prototype.dispose = function () {
  goog.events.unlistenByKey(this.changeListenerKey_);
  this.selectComponent_.dispose();
};
