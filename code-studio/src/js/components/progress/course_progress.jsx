import React from 'react';
import { connect } from 'react-redux';
import { stageShape } from './types';
import _ from 'lodash';
import CourseProgressRow from './course_progress_row.jsx';
import color from '../../color';

const styles = {
  flexHeader: {
    padding: '5px 10px',
    margin: '10px 0 0 0',
    borderRadius: 5,
    background: color.cyan,
    color: color.white
  }
};

/**
 * Stage progress component used in level header and course overview.
 */
const CourseProgress = React.createClass({
  propTypes: {
    currentLevelId: React.PropTypes.string,
    teacherCourse: React.PropTypes.boolean,
    stages: React.PropTypes.arrayOf(stageShape)
  },

  render() {
    const groups = _.groupBy(this.props.stages, stage => (stage.flex_category || 'Content'));

    const rows = _.map(groups, (stages, group) =>
      <div key={group}>
        <h4 style={this.props.teacherCourse ? styles.flexHeader : {display: 'none'}}>{group}</h4>
        {stages.map(stage => <CourseProgressRow stage={stage} key={stage.name} currentLevelId={this.props.currentLevelId} teacherCourse={this.props.teacherCourse} />)}
      </div>
    );

    return (
      <div className='user-stats-block'>
        {rows}
      </div>
    );
  }
});

export default connect(state => ({
  currentLevelId: state.currentLevelId,
  teacherCourse: state.teacherCourse,
  stages: state.stages
}))(CourseProgress);
