var EvalString = require('./evalString');
var EvalCircle = require('./evalCircle');

// todo (brent) - make use of blockId

exports.register = function (object) {

  // todo (brent) - hacky way to get last object
  Eval.lastEvalObject = object;

  return object;
};

exports.string = function (str, blockId) {
  return exports.register(new EvalString(str));
};

exports.circle = function (size, style, color) {
  return exports.register(new EvalCircle(size, style, color));
};

exports.placeImage = function (image, x, y, blockId) {
  // todo - validate we have an image, use public setter
  // todo - where does argument validation happen?
  image.x_ = x;
  image.y_ = y;
  return exports.register(image);
};
