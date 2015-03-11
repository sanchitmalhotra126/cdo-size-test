var chai = require('chai');
chai.config.includeStack = true;
var assert = chai.assert;

var testUtils = require('../util/testUtils');

var ExpressionNode = require(testUtils.buildPath('/calc/expressionNode'));
var EquationSet = require(testUtils.buildPath('/calc/equationSet'));
var Equation = require(testUtils.buildPath('/calc/equation.js'));

describe('EquationSet', function () {
  describe('addEquation_', function () {
    it('can add a compute equation', function () {
      var set = new EquationSet();
      assert.equal(set.compute_, null);
      assert.equal(set.equations_.length, 0);

      var computeExpression = new ExpressionNode('1');
      var equation = new Equation(null, [], computeExpression);
      set.addEquation_(equation);
      assert.equal(set.compute_, equation);
      assert.equal(set.equations_.length, 0);
    });

    it('can add non-compute equations', function () {
      var set = new EquationSet();
      set.addEquation_(new Equation('one', [], new ExpressionNode(1)));
      assert.equal(set.equations_.length, 1);
      assert.equal(set.equations_[0].name, 'one');
      set.addEquation_(new Equation('two', [], new ExpressionNode(2)));
      assert.equal(set.equations_.length, 2);
      assert.equal(set.equations_[1].name, 'two');
    });

    it('doesnt allow duplicates', function () {
      var set = new EquationSet();
      set.addEquation_(new Equation(null, [], new ExpressionNode(1)));
      assert.throws(function () {
        set.addEquation_(new Equation(null, [], new ExpressionNode(2)));
      });
      set.addEquation_(new Equation('one', [], new ExpressionNode(1)));
      assert.throws(function () {
        set.addEquation_(new Equation('one', [], new ExpressionNode(3)));
      });
    });
  });

  describe('getEquation', function () {
    var set = new EquationSet();
    var computeEquation = new Equation(null, [], new ExpressionNode(0));
    var equationOne = new Equation('one', [], new ExpressionNode(1));
    var equationTwo = new Equation('two', [], new ExpressionNode(2));
    set.addEquation_(computeEquation);
    set.addEquation_(equationOne);
    set.addEquation_(equationTwo);

    it('gets compute equation when given null', function () {
      assert.equal(set.getEquation(null), computeEquation);
    });

    it('gets equation with matching name when given a name', function () {
      assert.equal(set.getEquation('one'), equationOne);
      assert.equal(set.getEquation('two'), equationTwo);
    });

    it('returns null when no equation with that name', function () {
      assert.equal(set.getEquation('three'), null);
    });
  });

  describe('hasVariablesOrFunctions', function () {
    var set = new EquationSet();
    set.addEquation_(new Equation(null, [], new ExpressionNode(0)));

    it('returns false when we only have a compute equation', function () {
      assert.equal(set.hasVariablesOrFunctions(), false);
    });

    it('returns true when we have a variable or function', function () {
      set.addEquation_(new Equation('x', [], new ExpressionNode(1)));
      assert.equal(set.hasVariablesOrFunctions(), true);
    });
  });

  describe('hasSingleFunction', function () {
    it('returns false if we have no functions or variables', function () {
      var set = new EquationSet();
      set.addEquation_(new Equation(null, [], new ExpressionNode(0)));
      assert.equal(set.hasSingleFunction(), false);
    });

    it('returns false if we have no functions, but do have variables', function () {
      var set = new EquationSet();
      set.addEquation_(new Equation(null, [], new ExpressionNode(0)));
      set.addEquation_(new Equation('x', [], new ExpressionNode(1)));
      assert.equal(set.hasSingleFunction(), false);
    });

    it('returns false if we have multiple functions', function () {
      var set = new EquationSet();
      set.addEquation_(new Equation(null, [], new ExpressionNode(0)));
      set.addEquation_(new Equation('f', ['x'], new ExpressionNode('+', ['x', 1])));
      set.addEquation_(new Equation('g', ['x'], new ExpressionNode('+', ['x', 1])));
      assert.equal(set.hasSingleFunction(), false);
    });

    it('returns false if we have one function and one or more variables', function () {
      var set = new EquationSet();
      set.addEquation_(new Equation(null, [], new ExpressionNode(0)));
      set.addEquation_(new Equation('f', ['x'], new ExpressionNode('+', ['x', 1])));
      set.addEquation_(new Equation('y', [], new ExpressionNode(1)));
      assert.equal(set.hasSingleFunction(), false);
    });

    it('returns true if we have exactly one function and no variables', function () {
      var set = new EquationSet();
      set.addEquation_(new Equation(null, [], new ExpressionNode(0)));
      var functionEquation = new Equation('f', ['x'], new ExpressionNode('+', ['x', 1]));
      set.addEquation_(functionEquation);
      assert.equal(set.hasSingleFunction(), true);
    });
  });

  describe('isIdenticalTo', function () {
    var computeExpression = new ExpressionNode(0);
    var expression1 = new ExpressionNode(1);
    var expression2 = new ExpressionNode(2);
    var expression3 = new ExpressionNode(3);

    it('returns false when differing numbers of equations', function () {
      var set1 = new EquationSet();
      var set2 = new EquationSet();

      set1.addEquation_(new Equation(null, [], computeExpression));
      set1.addEquation_(new Equation('one', [], expression1));
      set1.addEquation_(new Equation('two', [], expression2));

      set2.addEquation_(new Equation(null, [], computeExpression));
      set2.addEquation_(new Equation('one', [], expression1));
      set2.addEquation_(new Equation('two', [], expression2));
      set2.addEquation_(new Equation('three', [], expression3));

      assert.equal(set1.isIdenticalTo(set2), false);
    });

    it('returns false when same expressions but different names', function () {
      var set1 = new EquationSet();
      var set2 = new EquationSet();

      set1.addEquation_(new Equation(null, [], computeExpression));
      set1.addEquation_(new Equation('one', [], expression1));
      set1.addEquation_(new Equation('two', [], expression2));

      set2.addEquation_(new Equation(null, [], computeExpression));
      set2.addEquation_(new Equation('one', [], expression1));
      set2.addEquation_(new Equation('NOTtwo', [], expression2));

      assert.equal(set1.isIdenticalTo(set2), false);
    });

    it('returns false when compute expressions differ but others are the same', function () {
      var set1 = new EquationSet();
      var set2 = new EquationSet();

      set1.addEquation_(new Equation(null, [], new ExpressionNode(0)));
      set1.addEquation_(new Equation('one', [], expression1));
      set1.addEquation_(new Equation('two', [], expression2));
      set1.addEquation_(new Equation('three', [], expression3));

      set2.addEquation_(new Equation(null, [], new ExpressionNode(1)));
      set2.addEquation_(new Equation('one', [], expression1));
      set2.addEquation_(new Equation('two', [], expression2));
      set2.addEquation_(new Equation('three', [], expression3));

      assert.equal(set1.isIdenticalTo(set2), false);
    });

    it('returns false when same names, but different expressions', function () {
      var set1 = new EquationSet();
      var set2 = new EquationSet();

      set1.addEquation_(new Equation(null, [], new ExpressionNode(0)));
      set1.addEquation_(new Equation('one', [], expression1));
      set1.addEquation_(new Equation('two', [], expression2));
      set1.addEquation_(new Equation('three', [], expression3));

      set2.addEquation_(new Equation(null, [], new ExpressionNode(1)));
      set2.addEquation_(new Equation('one', [], expression1));
      set2.addEquation_(new Equation('two', [], expression3));
      set2.addEquation_(new Equation('three', [], expression2));

      assert.equal(set1.isIdenticalTo(set2), false);
    });

    it('returns true when identical', function () {
      var set1 = new EquationSet();
      var set2 = new EquationSet();

      set1.addEquation_(new Equation(null, [], computeExpression));
      set1.addEquation_(new Equation('one', [], expression1));
      set1.addEquation_(new Equation('two', [], expression2));
      set1.addEquation_(new Equation('three', [], expression3));

      set2.addEquation_(new Equation(null, [], computeExpression));
      set2.addEquation_(new Equation('one', [], expression1));
      set2.addEquation_(new Equation('two', [], expression2));
      set2.addEquation_(new Equation('three', [], expression3));

      assert.equal(set1.isIdenticalTo(set2), true);
    });
  });

  describe('evaluate/evaluateWithExpression', function () {
    it('can evaluate a single expression that is just a number', function () {
      var computeExpression = new ExpressionNode(5);
      var set = new EquationSet();
      set.addEquation_(new Equation(null, [], computeExpression));

      var evaluation = set.evaluate();
      assert(!evaluation.err);
      assert.equal(evaluation.result, 5);

      evaluation = set.evaluateWithExpression(computeExpression);
      assert(!evaluation.err);
      assert.equal(evaluation.result, 5);
    });

    it('can evaluate a simple expression with no vars/function', function () {
      var computeExpression = new ExpressionNode('+', [1, 2]);
      var set = new EquationSet();
      set.addEquation_(new Equation(null, [], computeExpression));

      var evaluation = set.evaluate();
      assert(!evaluation.err);
      assert.equal(evaluation.result, 3);

      evaluation = set.evaluateWithExpression(computeExpression);
      assert(!evaluation.err);
      assert.equal(evaluation.result, 3);
    });

    it('can evaluate using a single function', function () {
      // f(1,2)
      var computeExpression = new ExpressionNode('f', [1, 2]);
      // f(x,y) = ((2 * x) + y)
      var fnExpression = new ExpressionNode('+', [
        new ExpressionNode('*', [2, 'x']),
        new ExpressionNode('y')
      ]);

      var set = new EquationSet();
      set.addEquation_(new Equation('f', ['x','y'], fnExpression));
      set.addEquation_(new Equation(null, [], computeExpression));

      var evaluation = set.evaluate();
      assert(!evaluation.err);
      assert.equal(evaluation.result, 4);

      evaluation = set.evaluateWithExpression(computeExpression);
      assert(!evaluation.err);
      assert.equal(evaluation.result, 4);

      var otherExpression = new ExpressionNode('f', [2, 3]);

      evaluation = set.evaluateWithExpression(otherExpression);
      assert(!evaluation.err);
      assert.equal(evaluation.result, 7);
    });

    it('can evaluate with multiple variables', function () {
      var set = new EquationSet();
      // x = 1
      set.addEquation_(new Equation('x', [], new ExpressionNode(1)));
      // y = 2
      set.addEquation_(new Equation('y', [], new ExpressionNode(2)));
      // x + y
      var computeExpression = new ExpressionNode('+', ['x', 'y']);
      set.addEquation_(new Equation(null, [], computeExpression));

      var evaluation = set.evaluate();
      assert(!evaluation.err);
      assert.equal(evaluation.result, 3);

      evaluation = set.evaluateWithExpression(computeExpression);
      assert(!evaluation.err);
      assert.equal(evaluation.result, 3);

      var otherExpression = new ExpressionNode('*', ['x', 'y']);
      evaluation = set.evaluateWithExpression(otherExpression);
      assert(!evaluation.err);
      assert.equal(evaluation.result, 2);
    });

    it('can evaluate with multiple functions', function () {
      var set = new EquationSet();
      // f(x) = x
      // g(y) = 2 * y
      //compute: f(1) + g(2)
      set.addEquation_(new Equation('f', ['x'], new ExpressionNode('x')));
      set.addEquation_(new Equation('g', ['y'], new ExpressionNode('*', [2, 'y'])));
      var computeExpression = new ExpressionNode('+', [
        new ExpressionNode('f', [1]),
        new ExpressionNode('g', [2])
      ]);
      set.addEquation_(new Equation(null, [], computeExpression));

      var evaluation = set.evaluate();
      assert(!evaluation.err);
      assert.equal(evaluation.result, 5);

      evaluation = set.evaluateWithExpression(computeExpression);
      assert(!evaluation.err);
      assert.equal(evaluation.result, 5);

      var otherExpression = new ExpressionNode('+', [
        new ExpressionNode('f', [2]),
        new ExpressionNode('g', [2])
      ]);
      evaluation = set.evaluateWithExpression(otherExpression);
      assert(!evaluation.err);
      assert.equal(evaluation.result, 6);

    });

    it('can evaluate with a mix of vars and functions', function () {
      // f(x) = x
      // myvar = 1
      // compute: f(1) + myvar
      var set = new EquationSet();
      set.addEquation_(new Equation('f', ['x'], new ExpressionNode('x')));
      set.addEquation_(new Equation('myvar', [], new ExpressionNode(1)));
      var computeEquation = new ExpressionNode('+', [
        new ExpressionNode('f', [1]),
        new ExpressionNode('myvar'),
      ]);
      set.addEquation_(new Equation(null, [], computeEquation));

      var evaluation = set.evaluate();
      assert(!evaluation.err);
      assert.equal(evaluation.result, 2);
    });

    it('fails to resolve an unresolveable set of variables', function () {
      var set = new EquationSet();
      set.addEquation_(new Equation('z', [], new ExpressionNode(0)));
      set.addEquation_(new Equation(null, [], new ExpressionNode('y')));

      var evaluation = set.evaluate();
      assert(evaluation.err);
      assert.equal(evaluation.result, undefined);
    });
  });

  describe('computesSingleVariable', function () {
    it ('returns true when our compute expression is a variable', function () {
      var set = new EquationSet();
      set.addEquation_(new Equation(null, [], new ExpressionNode('age_in_months')));
      set.addEquation_(new Equation('age', [], new ExpressionNode(17)));
      set.addEquation_(new Equation('age_in_months', [],
        new ExpressionNode('*', ['age', 12])));
      assert.equal(set.computesSingleVariable(), true);
    });

    it('returns false when our compute expression is not just a variable', function () {
      var set = new EquationSet();
      set.addEquation_(new Equation(null, [],
        new ExpressionNode('*', ['age', 12])));
      set.addEquation_(new Equation('age', [], new ExpressionNode(17)));
      assert.equal(set.computesSingleVariable(), false);
    });
  });

  describe('getConstants', function () {
    it('returns constants', function () {
      var set = new EquationSet();
      set.addEquation_(new Equation(null, [], new ExpressionNode('mult')));
      set.addEquation_(new Equation('x', [], new ExpressionNode(17)));
      set.addEquation_(new Equation('y', [], new ExpressionNode(7)));
      set.addEquation_(new Equation('mult', [],
        new ExpressionNode('*', ['x', 'y'])));

      var constants = set.getConstants();
      assert.equal(constants.length, 2);
      assert.equal(constants[0].name, 'x');
      assert.equal(constants[1].name, 'y');
    });
  });

  describe('computesSingleConstant', function () {
    it ('returns true when we have a single constant', function () {
      var set = new EquationSet();
      set.addEquation_(new Equation(null, [], new ExpressionNode('x')));
      set.addEquation_(new Equation('x', [], new ExpressionNode(5)));
      assert.equal(set.computesSingleConstant(), true);
    });

    it ('returns false when we have a single variable thats not a number', function () {
      var set = new EquationSet();
      set.addEquation_(new Equation(null, [], new ExpressionNode('x')));
      set.addEquation_(new Equation('x', [], new ExpressionNode('+', [1, 2])));
      assert.equal(set.computesSingleConstant(), false);
    });
  });
});
