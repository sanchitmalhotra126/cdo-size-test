/* global dashboard */

import React from 'react';
import Radium from 'radium';
import { connect } from 'react-redux';

import { stageShape } from './types';
import StageProgress from './stage_progress';
import TeacherStageInfo from './TeacherStageInfo';
import { ViewType } from '../../stageLockRedux';
import color from '../../../color';

const styles = {
  row: {
    position: 'relative',
    boxSizing: 'border-box',
    margin: '2px 0',
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: color.lighter_gray,
    borderRadius: 5,
    background: color.lightest_gray,
    display: 'table',
    padding: 10,
    width: '100%'
  },
  hiddenStage: {
    display: 'none'
  },
  transparentStage: {
    opacity: 0.5,
  },
  focusAreaRow: {
    height: 110,
    borderWidth: 3,
    background: color.almost_white_cyan,
    borderColor: color.cyan,
    padding: '8px 8px 20px 8px'
  },
  stageName: {
    display: 'table-cell',
    width: 200,
    verticalAlign: 'middle',
    paddingRight: 10
  },
  ribbonWrapper: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 90,
    height: 90,
    overflow: 'hidden'
  },
  ribbon: {
    fontFamily: '"Gotham 5r", sans-serif',
    position: 'absolute',
    top: 16,
    right: -31,
    fontSize: 12,
    whiteSpace: 'nowrap',
    background: color.cyan,
    color: color.white,
    padding: '5px 25px',
    transform: 'rotate(45deg)'
  },
  changeFocusArea: {
    fontFamily: '"Gotham 5r", sans-serif',
    color: color.dark_charcoal,
    position: 'absolute',
    right: 5,
    bottom: 5
  },
  changeFocusAreaIcon: {
    fontSize: '1.2em',
    marginRight: 6
  }
};

/**
 * Stage progress component used in level header and course overview.
 */
const CourseProgressRow = React.createClass({
  propTypes: {
    stage: stageShape,
    professionalLearningCourse: React.PropTypes.bool,
    isFocusArea: React.PropTypes.bool,

    // redux provided
    isHidden: React.PropTypes.bool,
    viewAs: React.PropTypes.oneOf(Object.values(ViewType)).isRequired,
    showTeacherInfo: React.PropTypes.bool,
    lockableAuthorized: React.PropTypes.bool.isRequired,
    changeFocusAreaPath: React.PropTypes.string,
  },

  render() {
    const { stage } = this.props;
    if (this.props.stage.lockable && !this.props.lockableAuthorized) {
      return null;
    }

    return (
      <div
        style={[
          styles.row,
          this.props.professionalLearningCourse && {background: color.white},
          this.props.isFocusArea && styles.focusAreaRow,
          this.props.isHidden && this.props.viewAs === ViewType.Student && styles.hiddenStage,
          this.props.isHidden && this.props.viewAs === ViewType.Teacher && styles.transparentStage
        ]}
      >
        {this.props.isFocusArea && [
          <div style={styles.ribbonWrapper} key="ribbon">
            <div style={styles.ribbon}>Focus Area</div>
          </div>,
          <a
            href={this.props.changeFocusAreaPath}
            style={styles.changeFocusArea}
            key="changeFocusArea"
          >
            <i className="fa fa-pencil" style={styles.changeFocusAreaIcon} />
            <span>Change your focus area</span>
          </a>
        ]}
        <div style={styles.stageName}>
          {this.props.professionalLearningCourse ? stage.name : stage.title}
        </div>
        <div>
          {this.props.showTeacherInfo && this.props.viewAs === ViewType.Teacher &&
            <TeacherStageInfo stage={stage}/>
          }
          <StageProgress
            stageId={stage.id}
            levels={stage.levels}
            courseOverviewPage={true}
          />
        </div>
      </div>
    );
  }
});

export default connect((state, ownProps) => {
  const isHidden = state.hiddenStage[ownProps.stage.id];
  return {
    isHidden,
    showTeacherInfo: state.progress.showTeacherInfo,
    viewAs: state.stageLock.viewAs,
    lockableAuthorized: state.stageLock.lockableAuthorized,
    changeFocusAreaPath: state.progress.changeFocusAreaPath,
  };
})(Radium(CourseProgressRow));
