import React from 'react';
import Radium from 'radium';
import { connect } from 'react-redux';
import _ from 'lodash';

import { stageShape } from './types';
import CourseProgressRow from './course_progress_row.jsx';
import HrefButton from '@cdo/apps/templates/HrefButton';
import SectionSelector from './SectionSelector';
import { ViewType } from '@cdo/apps/code-studio/stageLockRedux';
import color from "@cdo/apps/util/color";
import i18n from '@cdo/locale';
import experiments from '@cdo/apps/util/experiments';
import ProgressTable from '@cdo/apps/templates/progress/ProgressTable';

const styles = {
  flexHeader: {
    padding: '8px 11px',
    margin: '20px 0 0 0',
    borderRadius: 5,
    background: color.cyan,
    color: color.white
  },
  sectionSelector: {
    position: 'absolute',
    // offset selector's margin so that we're aligned flush right
    right: -10
  }
};

/**
 * Stage progress component used in level header and course overview.
 */
const CourseProgress = React.createClass({
  propTypes: {
    onOverviewPage: React.PropTypes.bool.isRequired,

    // redux provided
    perLevelProgress: React.PropTypes.object.isRequired,
    scriptName: React.PropTypes.string.isRequired,
    professionalLearningCourse: React.PropTypes.bool,
    focusAreaPositions: React.PropTypes.arrayOf(React.PropTypes.number),
    stages: React.PropTypes.arrayOf(stageShape),
    peerReviewStage: stageShape,
    viewAs: React.PropTypes.oneOf(Object.values(ViewType)).isRequired,
  },

  render() {
    const {
      stages,
      peerReviewStage,
      professionalLearningCourse,
      focusAreaPositions,
      scriptName,
      viewAs
    } = this.props;
    const groups = _.groupBy(stages, stage => (stage.flex_category || 'Content'));
    // Add an additional group for any peer reviews
    if (peerReviewStage) {
      // peerReviewStage.flex_category will always be "Peer Review" here
      groups[peerReviewStage.flex_category] = [peerReviewStage];
    }

    let count = 1;

    const hasLevelProgress = Object.keys(this.props.perLevelProgress).length > 0;

    const progressRedesign = experiments.isEnabled('progressRedesign');

    return (
      <div>
        {this.props.onOverviewPage && !this.props.professionalLearningCourse &&
          <HrefButton
            href={`/s/${scriptName}/next.next`}
            text={hasLevelProgress ? i18n.continue() : i18n.tryNow()}
            type="primary"
            style={{marginBottom: 10}}
          />
        }
        {this.props.onOverviewPage && !this.props.professionalLearningCourse &&
          <HrefButton
            href="//support.code.org"
            text={i18n.getHelp()}
            type="default"
            style={{marginLeft: 10, marginBottom: 10}}
          />
        }
        {this.props.onOverviewPage && viewAs === ViewType.Teacher &&
          <span style={styles.sectionSelector}>
            <SectionSelector/>
          </span>
        }
        {progressRedesign && <ProgressTable/>}

        {!progressRedesign && <div className="user-stats-block">
          {_.map(groups, (stages, group) =>
            <div key={group}>
              <h4
                id={group.toLowerCase().replace(' ', '-')}
                style={[
                  professionalLearningCourse ? styles.flexHeader : {display: 'none'},
                  count === 1 && {margin: '2px 0 0 0'}
                ]}
              >
                {group}
              </h4>
              {stages.map(stage =>
                <CourseProgressRow
                  stage={stage}
                  key={stage.name}
                  isFocusArea={focusAreaPositions.indexOf(count++) > -1}
                  professionalLearningCourse={professionalLearningCourse}
                />
              )}
            </div>
          )}
        </div>
        }
      </div>
    );
  }
});

export default connect(state => ({
  perLevelProgress: state.progress.levelProgress,
  scriptName: state.progress.scriptName,
  professionalLearningCourse: state.progress.professionalLearningCourse,
  focusAreaPositions: state.progress.focusAreaPositions,
  stages: state.progress.stages,
  peerReviewStage: state.progress.peerReviewStage,
  viewAs: state.stageLock.viewAs
}))(Radium(CourseProgress));
