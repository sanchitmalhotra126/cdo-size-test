import React, { PropTypes, Component } from 'react';
import ScriptSelector from './ScriptSelector';
import ProgressBubbleSet from '@cdo/apps/templates/progress/ProgressBubbleSet';
import { levelsByLesson } from '@cdo/apps/code-studio/progressRedux';
import { LevelStatus } from '@cdo/apps/util/sharedConstants';
import { TestResults } from '@cdo/apps/constants';
import _ from 'lodash';

const styles = {
  bubbles: {
    overflowX: 'scroll',
    whiteSpace: 'nowrap',
  }
};

export default class SectionProgress extends Component {
  static propTypes = {
    // TODO: better detail shape?
    section: PropTypes.object.isRequired,
    validScripts: PropTypes.array.isRequired,
  };

  state = {
    // TODO: default to what is assigned to section, or at least come up with
    // some heuristic so that we have a default
    scriptId: "112",
    scriptData: null,
    studentLevelProgress: null,
  }

  componentDidMount() {
    this.loadScript(this.state.scriptId);
  }

  onChangeScript = scriptId => {
    this.setState({
      scriptId,
      scriptData: null,
      studentLevelProgress: null,
    });
    this.loadScript(scriptId);
  }

  loadScript(scriptId) {
    $.getJSON(`/dashboardapi/script_structure/${scriptId}`, scriptData => {
      this.setState({
        scriptData
      });
    });

    $.getJSON(`/dashboardapi/section_level_progress/${this.props.section.id}?script_id=${scriptId}`, dataByStudent => {
      // dataByStudent is an object where the keys are student.id and the values
      // are a map of levelId to status
      let studentLevelProgress = {};
      Object.keys(dataByStudent).forEach(studentId => {
        studentLevelProgress[studentId] = _.mapValues(dataByStudent[studentId], level => {
          if (level.status === LevelStatus.locked) {
            return TestResults.LOCKED_RESULT;
          }
          if (level.submitted || level.readonly_answers) {
            return TestResults.SUBMITTED_RESULT;
          }

          return level.result;
        });
      });

      this.setState({
        studentLevelProgress: studentLevelProgress
      });
    });
  }

  render() {
    const { section, validScripts } = this.props;
    const { scriptId, scriptData, studentLevelProgress } = this.state;

    // Merges levelProgress for a student with our fixed scriptData (i.e. level structure)
    // thus giving us a "levels" object in the desired form
    const progressAndLevelState = (levelProgress) => {
      let state = {
        ...scriptData,
        levelProgress
      };
      return levelsByLesson(state);
    };

    let levelDataInitialized = false;
    if (scriptData && studentLevelProgress) {
      levelDataInitialized = true;
    }

    return (
      <div>
        <ScriptSelector
          validScripts={validScripts}
          scriptId={scriptId}
          onChange={this.onChangeScript}
        />
        {section.students.map((student, index) => (
          <div key={student.id}>
            <a href={`/teacher-dashboard#/sections/${section.id}/student/${student.id}/script/${scriptId}`}>
              {student.name}
            </a>
            {levelDataInitialized &&
              <div style={styles.bubbles}>
                {progressAndLevelState(studentLevelProgress[student.id]).map((levels, i) =>
                  <ProgressBubbleSet
                    key={i}
                    levels={levels}
                    disabled={false}
                  />
                )}
              </div>
            }
          </div>
        ))}
      </div>
    );
  }
}
