var Radium = require('radium');
var ProtectedStatefulDiv = require('./ProtectedStatefulDiv');
var JsDebugger = require('./JsDebugger');
var PaneHeader = require('./PaneHeader');
var WorkspaceHeader = PaneHeader.WorkspaceHeader;
var WorkspaceHeaderButton = PaneHeader.WorkspaceHeaderButton;
var msg = require('../locale');
var commonStyles = require('../commonStyles');
var styleConstants = require('../styleConstants');
var color = require('../color');
var experiments = require('../experiments');

var styles = {
  headerIcon: {
    fontSize: 18
  },
  chevron: {
    fontSize: 18,
  },
  runningChevron: {
    color: color.dark_charcoal
  }
};

var CodeWorkspace = React.createClass({
  propTypes: {
    localeDirection: React.PropTypes.oneOf(['rtl', 'ltr']).isRequired,
    editCode: React.PropTypes.bool.isRequired,
    readonlyWorkspace: React.PropTypes.bool.isRequired,
    showDebugger: React.PropTypes.bool,
    isRunning: React.PropTypes.bool
  },

  shouldComponentUpdate: function (nextProps) {
    // This component is current semi-protected. We don't want to completely
    // disallow rerendering, since that would prevent us from being able to
    // update styles. However, we do want to prevent property changes that would
    // change the DOM structure.
    Object.keys(nextProps).forEach(function (key) {
      // isRunning only affects style, and can be updated
      if (key === 'isRunning') {
        return;
      }

      if (nextProps[key] !== this.props[key]) {
        throw new Error('Attempting to change key ' + key + ' in CodeWorkspace');
      }
    }.bind(this));

    // Should be no need to update unless we have runModeIndicators enabled
    return experiments.isEnabled('runModeIndicators');
  },

  render: function () {
    var props = this.props;

    var runModeIndicators = experiments.isEnabled('runModeIndicators');

    var chevronStyle = [
      commonStyles.hidden,
      styles.chevron,
      runModeIndicators && props.isRunning && styles.runningChevron
    ];

    return (
      <span id="codeWorkspaceWrapper">
        <PaneHeader
            id="headers"
            dir={props.localeDirection}
            hasFocus={!props.isRunning}
        >
          <div id="codeModeHeaders">
            <WorkspaceHeader id="toolbox-header">
              <i id="hide-toolbox-icon" style={chevronStyle} className="fa fa-chevron-circle-right"/>
              <span>{props.editCode ? msg.toolboxHeaderDroplet() : msg.toolboxHeader()}</span>
            </WorkspaceHeader>
            <WorkspaceHeader id="show-toolbox-header" style={commonStyles.hidden}>
              <i id="show-toolbox-icon" styles={styles.headerIcon} className="fa fa-chevron-circle-right"/>
              <span>{msg.showToolbox()}</span>
            </WorkspaceHeader>
            <WorkspaceHeaderButton
                id="show-code-header"
                hiddenImage="/blockly/media/applab/blocks_glyph.gif"
                iconClass="fa fa-code"
                label={msg.showCodeHeader()}
                headerHasFocus={!props.isRunning}/>
            {!props.readonlyWorkspace && <WorkspaceHeaderButton
                id="clear-puzzle-header"
                headerHasFocus={!props.isRunning}
                iconClass="fa fa-undo"
                label={msg.clearPuzzle()}/>
            }
            <WorkspaceHeaderButton
                id="versions-header"
                headerHasFocus={!props.isRunning}
                iconClass="fa fa-clock-o"
                label={msg.showVersionsHeader()}/>
            <WorkspaceHeader id="workspace-header">
              <span id="workspace-header-span">
                {props.readonlyWorkspace ? msg.readonlyWorkspaceHeader() : msg.workspaceHeaderShort()}
              </span>
              <div id="blockCounter">
                <div id="blockUsed" className='block-counter-default'>
                </div>
                <span> / </span>
                <span id="idealBlockNumber"></span>
                <span>{" " + msg.blocks()}</span>
              </div>
            </WorkspaceHeader>
          </div>
        </PaneHeader>
        {props.editCode && <ProtectedStatefulDiv id="codeTextbox"/>}
        {props.showDebugger && <JsDebugger/>}
      </span>
    );
  }
});

module.exports = Radium(CodeWorkspace);
