var EvalObject = require('./evalObject');
var EvalString = require('./evalString');
var evalUtils = require('./evalUtils');

var EvalCircle = function (width, height, style, color) {
  evalUtils.ensureType(style, EvalString);
  evalUtils.ensureType(color, EvalString);

  EvalObject.apply(this);

  this.width_ = width;
  this.height_ = height;
  this.color_ = color.getValue();
  this.style_ = style.getValue();

  this.element_ = null;
};
EvalCircle.inherits(EvalObject);
module.exports = EvalCircle;

EvalCircle.prototype.draw = function (parent) {
  if (!this.element_) {
    this.element_ = document.createElementNS(Blockly.SVG_NS, 'ellipse');
    parent.appendChild(this.element_);
  }
  this.element_.setAttribute('cx', this.x_);
  this.element_.setAttribute('cy', this.y_);
  this.element_.setAttribute('rx', this.width_ / 2);
  this.element_.setAttribute('ry', this.height_ / 2);

  this.element_.setAttribute('fill', evalUtils.getFill(this.style_, this.color_));
  this.element_.setAttribute('stroke', evalUtils.getStroke(this.style_, this.color_));
  this.element_.setAttribute('opacity', evalUtils.getOpacity(this.style_, this.color_));
};
