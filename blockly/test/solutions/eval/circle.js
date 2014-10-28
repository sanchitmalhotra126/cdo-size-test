var TestResults = require('../../../src/constants.js').TestResults;
var blockUtils = require('../../../src/block_utils');

module.exports = {
  app: "eval",
  skinId: 'eval',
  levelDefinition: {
    solutionBlocks: blockUtils.msmBlockXml('functional_circle', {
      'COLOR': blockUtils.msmBlockXml('functional_string', null, { VAL: 'red' } ),
      'STYLE': blockUtils.msmBlockXml('functional_string', null, { VAL: 'outline' }),
      'SIZE': blockUtils.msmBlockXml('functional_math_number', null, { NUM: 50 } )
    }),
    requiredBlocks: '',
    freePlay: false
  },
  tests: [
    {
      description: "Nothing",
      expected: {
        result: false,
        testResult: TestResults.APP_SPECIFIC_FAIL
      },
      xml: '<xml>' +
      '</xml>'
    },
    {
      description: "correct answer",
      expected: {
        result: true,
        testResult: TestResults.ALL_PASS
      },
      customValidator: function (assert) {
        var user = document.getElementById('user');
        var circle = user.querySelector('circle');
        var fill = circle.getAttribute('fill');
        var stroke = circle.getAttribute('stroke');
        assert(fill === 'none', 'fill: ' + fill);
        assert(stroke === 'red', 'stroke: ' + stroke);
        assert(circle.getAttribute('cx') === '200');
        assert(circle.getAttribute('cy') === '200');
        return true;
      },
      xml: '<xml>' +
        blockUtils.msmBlockXml('functional_circle', {
          'COLOR': blockUtils.msmBlockXml('functional_string', null, { VAL: 'red' } ),
          'STYLE': blockUtils.msmBlockXml('functional_string', null, { VAL: 'outline' }),
          'SIZE': blockUtils.msmBlockXml('functional_math_number', null, { NUM: 50 } )
        }) +
      '</xml>'
    },
    {
      description: "correct answer with style block",
      expected: {
        result: true,
        testResult: TestResults.ALL_PASS
      },
      xml: '<xml>' +
        blockUtils.msmBlockXml('functional_circle', {
          'COLOR': blockUtils.msmBlockXml('functional_string', null, { VAL: 'red' } ),
          'STYLE': blockUtils.msmBlockXml('functional_style', null, { VAL: 'outline' }),
          'SIZE': blockUtils.msmBlockXml('functional_math_number', null, { NUM: 50 } )
        }) +
      '</xml>'
    },
    {
      description: "wrong color",
      expected: {
        result: false,
        testResult: TestResults.APP_SPECIFIC_FAIL
      },
      xml: '<xml>' +
        blockUtils.msmBlockXml('functional_circle', {
          'COLOR': blockUtils.msmBlockXml('functional_string', null, { VAL: 'blue' } ),
          'STYLE': blockUtils.msmBlockXml('functional_string', null, { VAL: 'outline' }),
          'SIZE': blockUtils.msmBlockXml('functional_math_number', null, { NUM: 50 } )
        }) +
      '</xml>'
    }
  ]
};
