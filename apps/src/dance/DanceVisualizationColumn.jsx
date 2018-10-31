import React, {PropTypes} from 'react';
import GameButtons from '../templates/GameButtons';
import ArrowButtons from '../templates/ArrowButtons';
import BelowVisualization from '../templates/BelowVisualization';
import * as gameLabConstants from './constants';
import ProtectedVisualizationDiv from '../templates/ProtectedVisualizationDiv';
import Radium from "radium";
import {connect} from "react-redux";
import i18n from '@cdo/locale';
import Sounds from "../Sounds";
import project from "../code-studio/initApp/project";

const GAME_WIDTH = gameLabConstants.GAME_WIDTH;
const GAME_HEIGHT = gameLabConstants.GAME_HEIGHT;

const styles = {
  selectStyle: {
    width: '100%',
  }
};

const SongSelector = Radium(class extends React.Component {
  static propTypes = {
    retrieveMetadata: PropTypes.func.isRequired,
    setSong: PropTypes.func.isRequired,
    selectedSong: PropTypes.string.isRequired,
    songData: PropTypes.objectOf(PropTypes.object).isRequired,
    hasChannel: PropTypes.bool.isRequired
  };

  changeSong = (event) => {
    const song = event.target.value;
    this.props.setSong(song);
    this.loadSong(song);
  };

  loadSong(song) {
    //Load song
    let options = {id: song};
    options['mp3'] = this.props.songData[options.id].url;
    Sounds.getSingleton().register(options);

    this.props.retrieveMetadata(song);

    if (this.props.hasChannel) {
      //Save song to project
      project.saveSelectedSong(song);
    }
  }

  componentDidMount() {
    this.loadSong(this.props.selectedSong);
  }

  render() {
    return (
      <div>
        <label><b>{i18n.selectSong()}</b></label>
        <select id="song_selector" style={styles.selectStyle} onChange={this.changeSong} value={this.props.selectedSong}>
          {Object.keys(this.props.songData).map((option, i) => (
            <option key={i} value={option}>{this.props.songData[option].title}</option>
          ))}
        </select>
      </div>
    );
  }
});

class DanceVisualizationColumn extends React.Component {
  static propTypes = {
    showFinishButton: PropTypes.bool.isRequired,
    retrieveMetadata: PropTypes.func.isRequired,
    setSong: PropTypes.func.isRequired,
    selectedSong: PropTypes.string.isRequired,
    isShareView: PropTypes.bool.isRequired,
    songData: PropTypes.objectOf(PropTypes.object).isRequired,
    hasChannel: PropTypes.bool.isRequired
  };

  render() {
    const divDanceStyle = {
      touchAction: 'none',
      width: GAME_WIDTH,
      height: GAME_HEIGHT,
      backgroundColor: '#fff',
      position: 'relative',
      overflow: 'hidden',
    };
    return (
      <span>
        {!this.props.isShareView &&
          <SongSelector
            retrieveMetadata={this.props.retrieveMetadata}
            setSong={this.props.setSong}
            selectedSong={this.props.selectedSong}
            songData={this.props.songData}
            hasChannel={this.props.hasChannel}
          />
        }
        <ProtectedVisualizationDiv>
          <div
            id="divDance"
            style={divDanceStyle}
          />
        </ProtectedVisualizationDiv>
        <GameButtons showFinishButton={this.props.showFinishButton}>
          <ArrowButtons />
        </GameButtons>
        <BelowVisualization />
      </span>
    );
  }
}

export default connect(state => ({
  hasChannel: !!state.pageConstants.channelId,
  isShareView: state.pageConstants.isShareView,
  songData: state.songs.songData,
  selectedSong: state.songs.selectedSong,
}))(DanceVisualizationColumn);
