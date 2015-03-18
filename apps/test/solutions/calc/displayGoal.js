var testUtils = require('../../util/testUtils');
testUtils.setupLocale('calc');

var TestResults = require(testUtils.buildPath('constants.js')).TestResults;
var blockUtils = require(testUtils.buildPath('block_utils'));
var studioApp = require(testUtils.buildPath('StudioApp')).singleton;
var Calc = require(testUtils.buildPath('calc/calc.js'));
var EquationSet = require(testUtils.buildPath('calc/equationSet.js'));
var Equation = require(testUtils.buildPath('/calc/equation.js'));
var ExpressionNode = require(testUtils.buildPath('calc/expressionNode.js'));

/**
 * This is another example of me taking advantage of the fact that our level
 * tests have a full Blockly environment. This allows me to more easily test
 * things like DOM manipulations
 */

var displayGoal = Calc.__testonly__.displayGoal;

module.exports = {
  app: "calc",
  skinId: 'calc',
  levelDefinition: {
    solutionBlocks: '',
    requiredBlocks: '',
    freePlay: true
  },
  tests: [
    {
      description: "displayGoal",
      expected: {
        result: false,
        testResult: TestResults.EMPTY_FUNCTIONAL_BLOCK
      },
      // Run all validation in a single test to avoid the overhead of new node
      // processes
      customValidator: displayGoalCustomValidator,
      xml: ''
    }
  ]
};

/**
 * Run all our custom validation. Pulled out to reduce nesting.
 */
function displayGoalCustomValidator(assert) {
  var answerExpression = document.getElementById('answerExpression');
  assert(answerExpression);

  displayGoalTest(assert, 'simple target', function () {
    var targetSet = new EquationSet();
    targetSet.addEquation_(new Equation(null, [], new ExpressionNode(5)));

    displayGoal(targetSet);

    assert.equal(answerExpression.children.length, 1);

    var g = answerExpression.children[0];
    assert.equal(g.children.length, 1);
    assert.equal(g.children[0].textContent, "5");
    assert.equal(g.children[0].getAttribute('class'), null);
  });

  displayGoalTest(assert, 'multiple functions', function () {
    // f(x) = x
    // g(y) = y
    // compute: f(1) + g(2)
    var targetSet = new EquationSet();
    targetSet.addEquation_(new Equation('f', ['x'], new ExpressionNode('x')));
    targetSet.addEquation_(new Equation('g', ['y'], new ExpressionNode('y')));
    targetSet.addEquation_(new Equation(null, [], new ExpressionNode('+', [
      new ExpressionNode('f', [1]),
      new ExpressionNode('g', [2]),
    ])));

    assert.throws(function () {
      displayGoal(targetSet);
    });

  });

  displayGoalTest(assert, 'function and variable', function () {
    // f(x) = x
    // myvar = 1
    // compute: f(1) + myvar
    var targetSet = new EquationSet();
    targetSet.addEquation_(new Equation('f', ['x'], new ExpressionNode('x')));
    targetSet.addEquation_(new Equation('myvar', [], new ExpressionNode(1)));
    targetSet.addEquation_(new Equation(null, [], new ExpressionNode('+', [
      new ExpressionNode('f', [1]),
      new ExpressionNode('myvar'),
    ])));

    assert.throws(function () {
      displayGoal(targetSet);
    });

  });

  displayGoalTest(assert, 'single variable in compute', function () {
    // compute: age_in_months
    // age = 17
    // age_in_months = age * 12
    var targetSet = new EquationSet();
    targetSet.addEquation_(new Equation(null, [], new ExpressionNode('age_in_months')));
    targetSet.addEquation_(new Equation('age', [], new ExpressionNode(17)));
    targetSet.addEquation_(new Equation('age_in_months', [],
      new ExpressionNode('*', ['age', 12])));

    displayGoal(targetSet);

    assert.equal(answerExpression.children.length, 1);

    var g = answerExpression.children[0];
    assert.equal(g.children.length, 1);
    assert.equal(g.children[0].textContent, "age_in_months");
    assert.equal(g.children[0].getAttribute('class'), null);
  });

  displayGoalTest(assert, 'variables without single variable in compute', function () {
    // compute: age * 12
    // age = 17
    var targetSet = new EquationSet();
    targetSet.addEquation_(new Equation(null, [],
      new ExpressionNode('*', ['age', 12])));
    targetSet.addEquation_(new Equation('age', [], new ExpressionNode(17)));

    displayGoal(targetSet);

    assert.equal(answerExpression.children.length, 2);

    var g = answerExpression.children[0];
    assert.equal(g.children.length, 2);
    assert.equal(g.children[0].textContent, "age = ");
    assert.equal(g.children[0].getAttribute('class'), null);
    assert.equal(g.children[1].textContent, "17");
    assert.equal(g.children[1].getAttribute('class'), null);

    g = answerExpression.children[1];

    assert.equal(g.children[0].textContent, "age");
    assert.equal(g.children[0].getAttribute('class'), null);
    assert.equal(g.children[1].textContent, " * ");
    assert.equal(g.children[1].getAttribute('class'), null);
    assert.equal(g.children[2].textContent, "12");
    assert.equal(g.children[2].getAttribute('class'), null);
    assert.equal(g.children.length, 3);
  });

  return true;
}

/**
 * Run a single test, initially clearing contents of answerExpression. Done
 * mostly to clearly delineate between test cases.
 * @param {Function} assert Assert object passed through from executor
 * @param {string} description Describe this test. Used just for readability
 * @param {Function} fn Code to run
 */
function displayGoalTest(assert, description, fn) {
  var answerExpression = document.getElementById('answerExpression');
  answerExpression.innerHTML = ''; // clear children

  fn();
}
