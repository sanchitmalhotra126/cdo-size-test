var ExpressionNode = require('./expressionNode');

exports.expression = function (operator, arg1, arg2, blockId) {
  // todo (brent) - make use of blockId
  // todo (brent) - hacky way to get last expression
  Calc.lastExpression = new ExpressionNode(operator, arg1, arg2);

  return Calc.lastExpression;
};
