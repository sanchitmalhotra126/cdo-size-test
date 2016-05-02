/**
 * A React component for our JavaScript debugger UI. Returns a connected component
 * so this can only be used in cases where we have a redux store.
 */

var connect = require('react-redux').connect;

var i18n = require('../locale');
var commonStyles = require('../commonStyles');
var ProtectedStatefulDiv = require('./ProtectedStatefulDiv');
var PaneHeader = require('./PaneHeader');
var PaneSection = PaneHeader.PaneSection;
var PaneButton = PaneHeader.PaneButton;
var experiments = require('../experiments');

var styles = {
  noPadding: {
    padding: 0
  }
};

/**
 * The console for our debugger UI
 */
var DebugConsole = function (props) {
  var classes = 'debug-console';
  if (!props.debugButtons) {
    classes += ' no-commands';
  }
  if (!props.debugWatch) {
    classes += ' no-watch';
  }

  return (
    <div id="debug-console" className={classes}>
      <div id="debug-output" className="debug-output"/>
      <span className="debug-input-prompt">
        &gt;
      </span>
      <div contentEditable spellCheck="false" id="debug-input" className="debug-input"/>
    </div>
  );
};

/**
 * Buttons for stepping through code.
 */
var DebugButtons = function () {
  return (
    <div id="debug-commands" className="debug-commands">
      <div id="debug-buttons">
        {" " /* Explicitly insert whitespace so that this behaves like our ejs file*/}
        <button id="pauseButton" className="debugger_button">
          <img src="/blockly/media/1x1.gif" className="pause-btn icon21"/>
          {i18n.pause()}
        </button>
        {" " /* Explicitly insert whitespace so that this behaves like our ejs file*/}
        <button id="continueButton" className="debugger_button">
          <img src="/blockly/media/1x1.gif" className="continue-btn icon21"/>
          {i18n.continue()}
        </button>
        {" " /* Explicitly insert whitespace so that this behaves like our ejs file*/}
        <button id="stepOverButton" className="debugger_button">
          <img src="/blockly/media/1x1.gif" className="step-over-btn icon21"/>
          {i18n.stepOver()}
        </button>

        <button id="stepOutButton" className="debugger_button">
          <img src="/blockly/media/1x1.gif" className="step-out-btn icon21"/>
          {i18n.stepOut()}
        </button>
        {" " /* Explicitly insert whitespace so that this behaves like our ejs file*/}
        <button id="stepInButton" className="debugger_button">
          <img src="/blockly/media/1x1.gif" className="step-in-btn icon21"/>
          {i18n.stepIn()}
        </button>
      </div>
    </div>
  );
};

/**
 * A watch window for our debugger.
 */
var DebugWatch = function (props) {
  var classes = 'debug-watch';
  if (!props.debugButtons) {
    classes += 'no-commands';
  }
  return (
    <div id="debug-watch" className={classes}/>
  );
};

/**
 * Slider for modifying speed. Ideall we will eventually have a common component
 * used here and by turtle.
 */
var Slider = function (props) {
  var icons = props.hasFocus ? '/blockly/media/turtle/icons_white.png' :
    '/blockly/media/turtle/icons.png';
  return (
    <div id="slider-cell" style={props.style}>
      <svg id="speed-slider"
           version="1.1"
           width="150"
           height="28">
        {/*<!-- Slow icon. -->*/}
        <clipPath id="slowClipPath">
          <rect
              width={26}
              height={12}
              x={5}
              y={6} />
        </clipPath>
        <image xlinkHref={icons}
            height={42}
            width={84}
            x={-21}
            y={-18}
            clipPath="url(#slowClipPath)" />
        {/*<!-- Fast icon. -->*/}
        <clipPath id="fastClipPath">
          <rect
              width={26}
              height={16}
              x={120}
              y={2} />
        </clipPath>
        <image
            xlinkHref={icons}
            height={42}
            width={84}
            x={120}
            y={-19}
            clipPath="url(#fastClipPath)" />
      </svg>
    </div>
  );
};
Slider.propTypes = {
  hasFocus: React.PropTypes.bool.isRequired
};

/**
 * The parent JsDebugger component.
 */
var JsDebugger = function (props) {
  // Initially, don't want to toggle PaneHeader unless runModeIndicators is on
  var runModeIndicators = experiments.isEnabled('runModeIndicators');
  var hasFocus = runModeIndicators && props.isDebugging;

  var sliderStyle = {
    marginLeft: props.debugButtons ? 0 : 40
  };

  return (
    <div id="debug-area">
      <div id="debugResizeBar" className="fa fa-ellipsis-h"></div>
      <PaneHeader
          id="debug-area-header"
          hasFocus={hasFocus}
      >
        <span className="header-text">{i18n.debugConsoleHeader()}</span>
        <i id="show-hide-debug-icon" className="fa fa-chevron-circle-down"/>
        {props.debugButtons &&
        <PaneSection id="debug-commands-header">
          <i id="running-spinner" style={commonStyles.hidden} className="fa fa-spinner fa-spin"></i>
          <i id="paused-icon" style={commonStyles.hidden} className="fa fa-pause"></i>
          <span className="header-text">{i18n.debugCommandsHeaderWhenOpen()}</span>
        </PaneSection>
        }
        {props.debugWatch &&
        <PaneSection id="debug-watch-header">
          <span className="header-text">{i18n.debugWatchHeader()}</span>
        </PaneSection>
        }
        <PaneButton
            id="clear-console-header"
            iconClass="fa fa-eraser"
            label="Clear"
            headerHasFocus={hasFocus}
        />
        <Slider style={sliderStyle} hasFocus={hasFocus}/>
      </PaneHeader>
      {props.debugButtons && <DebugButtons/>}
      {props.debugConsole && <DebugConsole debugButtons={props.debugButtons} debugWatch={props.debugWatch}/>}
      {props.debugWatch && <DebugWatch debugButtons={props.debugButtons}/>}
    </div>
  );
};

JsDebugger.propTypes = {
  debugButtons: React.PropTypes.bool.isRequired,
  debugConsole: React.PropTypes.bool.isRequired,
  debugWatch: React.PropTypes.bool.isRequired,
  isDebugging: React.PropTypes.bool.isRequired
};

module.exports = connect(function propsFromStore(state) {
  return {
    debugButtons: state.level.showDebugButtons,
    debugConsole: state.level.showDebugConsole,
    debugWatch: state.level.showDebugWatch,
    isDebugging: state.runState.isDebugging
  };
})(JsDebugger);
