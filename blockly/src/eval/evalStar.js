var EvalObject = require('./evalObject');
var EvalString = require('./evalString');
var evalUtils = require('./evalUtils');

var EvalStar = function (radius, style, color) {
  evalUtils.ensureType(style, EvalString);
  evalUtils.ensureType(color, EvalString);

  EvalObject.apply(this);

  this.radius_ = radius;
  this.color_ = color.getValue();
  this.style_ = style.getValue();

  this.element_ = null;
};
EvalStar.inherits(EvalObject);
module.exports = EvalStar;

EvalStar.prototype.draw = function (parent) {
  if (!this.element_) {
    this.element_ = document.createElementNS(Blockly.SVG_NS, 'polygon');
    parent.appendChild(this.element_);
  }

  var points = [];
  var outerRadius = this.radius_;
  var innerRadius = (3 - Math.sqrt(5)) / 2 * outerRadius;

  var angleDelta = 2 * Math.PI / 5;
  for (var angle = 0; angle < 2 * Math.PI; angle += angleDelta) {
    points.push(outerRadius * Math.cos(angle) + "," + outerRadius * Math.sin(angle));
    points.push(innerRadius * Math.cos(angle + angleDelta / 2) + "," +
      innerRadius * Math.sin(angle + angleDelta / 2));
  }

  this.element_.setAttribute('points', points.join(' '));

  EvalObject.prototype.draw.apply(this, arguments);
};
