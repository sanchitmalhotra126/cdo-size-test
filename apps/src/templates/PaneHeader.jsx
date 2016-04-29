var Radium = require('radium');

var commonStyles = require('../commonStyles');
var styleConstants = require('../styleConstants');
var color = require('../color');
var experiments = require('../experiments');

var styles = {
  paneSection: {
    textAlign: 'center',
    whiteSpace: 'nowrap',
    overflowX: 'hidden',
    height: styleConstants["workspace-headers-height"],
    lineHeight: styleConstants["workspace-headers-height"] + 'px',
  },
  headerButton: {
    cursor: 'pointer',
    float: 'right',
    overflow: 'hidden',
    backgroundColor: color.light_purple,
    marginTop: 3,
    marginBottom: 3,
    marginRight: 3,
    marginLeft: 0,
    height: 24,
    borderRadius: 4,
    fontFamily: '"Gotham 5r", sans-serif',
    lineHeight: '18px',
    ':hover': {
      backgroundColor: color.cyan
    }
  },
  headerButtonUnfocused: {
    backgroundColor: color.lightest_purple
  },
  headerButtonSpan: {
    paddingLeft: 12,
    paddingRight: 12,
    paddingTop: 0,
    paddingBottom: 0
  },
  headerButtonIcon: {
    lineHeight: '24px',
    paddingRight: 8,
    fontSize: 15,
    fontWeight: 'bold'
  },
  hiddenIcon: {
    display: 'none',
    height: 18,
    verticalAlign: 'text-bottom',
    paddingRight: 8
  }
};

/**
 * A purple pane header that can be active (purple), inactive (light purple)
 * or read only (charcoal).
 */

var PaneHeader = React.createClass({
  propTypes: {
    hasFocus: React.PropTypes.bool.isRequired,
    readOnly: React.PropTypes.bool
  },

  render: function () {
    // Initially, don't want to toggle PaneHeader unless runModeIndicators is on
    var runModeIndicators = experiments.isEnabled('runModeIndicators');

    // TODO purpleHeader style should possibly move into this module
    var style = [
      commonStyles.purpleHeader,
      runModeIndicators && !this.props.hasFocus && commonStyles.purpleHeaderUnfocused,
      this.props.readOnly && commonStyles.purpleHeaderReadOnly,
    ];

    return (
      <div {...this.props} style={style}/>
    );
  }
});

/**
 * A section of our Pane Header. Essentially this is just a div with some
 * particular styles applied
 */
var PaneSection = function (props) {
  return <div {...props} style={[styles.paneSection, props.style]}/>;
};

/**
 * A button within or PaneHeader, whose styles change whether or not the pane
 * has focus
 */
var PaneButton = function (props) {
  var runModeIndicators = experiments.isEnabled('runModeIndicators');

  return (
    <div
        id={props.id}
        style={[
          styles.headerButton,
          runModeIndicators && !props.headerHasFocus && styles.headerButtonUnfocused
        ]}
    >
      <span style={styles.headerButtonSpan}>
        {/* hiddenIcon currently toggle externally */}
        {props.hiddenImage && <img src={props.hiddenImage} style={styles.hiddenIcon}/>}
        <i className={props.iconClass} style={styles.headerButtonIcon}/>
        <span style={styles.noPadding}>{props.label}</span>
      </span>
    </div>
  );
};
PaneButton.propTypes = {
  headerHasFocus: React.PropTypes.bool.isRequired,
  iconClass: React.PropTypes.string.isRequired,
  label: React.PropTypes.string.isRequired,
  hiddenImage: React.PropTypes.string
};

module.exports = Radium(PaneHeader);

module.exports.PaneSection = Radium(PaneSection);
module.exports.PaneButton = Radium(PaneButton);
