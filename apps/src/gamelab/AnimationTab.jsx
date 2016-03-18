/** @file Root of the animation editor interface mode for GameLab */
'use strict';

var AnimationFrameList = require('./AnimationFrameList.jsx');
var AnimationSequenceList = require('./AnimationSequenceList.jsx');
var GameLabVisualizationHeader = require('./GameLabVisualizationHeader.jsx');
var ResizablePanes = require('./ResizablePanes.jsx');

/**
 * Root of the animation editor interface mode for GameLab
 */
var AnimationTab = React.createClass({
  render: function () {
    var fillAbsoluteParentStyle = {
      position: 'absolute',
      top: 0,
      bottom: 20,
      left: 0,
      right: 0
    };

    return (
      <ResizablePanes style={fillAbsoluteParentStyle}>
        <div id='sequences-column' style={{flex: '0 0 150px'}}>
          <GameLabVisualizationHeader/>
          <AnimationSequenceList/>
        </div>
        <div id='frames-column' style={{flex: '0 0 250px'}}>
          <div className="purple-header workspace-header"><span>Frames</span></div>
          <AnimationFrameList/>
        </div>
        <div id='editor-column'>
          <div className="purple-header workspace-header"><span>Workspace</span></div>
          <div style={{flex: '1 0', backgroundColor: 'white', textAlign: 'center', paddingTop:'48%'}}>
            TODO: Piskel editor goes here!
          </div>
        </div>
      </ResizablePanes>
    );
  }
});
module.exports = AnimationTab;