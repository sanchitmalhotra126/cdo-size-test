import React, {Component, PropTypes} from 'react';
import FreeResponsesAssessmentsTable from './FreeResponsesAssessmentsTable';
import {
  freeResponsesDataPropType,
  QUESTION_CHARACTER_LIMIT,
} from './assessmentDataShapes';
import {
  getAssessmentsFreeResponseResults,
  ALL_STUDENT_FILTER,
  currentStudentHasResponses,
} from './sectionAssessmentsRedux';
import { connect } from 'react-redux';
import i18n from "@cdo/locale";

const styles = {
  text: {
    font: 10,
    paddingTop: 20,
    paddingBottom: 20,
  },
};

export const freeResponseSummaryPropType = PropTypes.shape({
  questionText:  PropTypes.string,
  responses: PropTypes.arrayOf(freeResponsesDataPropType),
});

class FreeResponsesAssessmentsContainer extends Component {
  static propTypes= {
    freeResponseQuestions: PropTypes.arrayOf(freeResponseSummaryPropType),
    studentId: PropTypes.number,
    currentStudentHasResponses: PropTypes.bool,
    openDialog: PropTypes.func.isRequired,
  };

  render() {
    const {freeResponseQuestions, studentId, currentStudentHasResponses} = this.props;
    return (
      <div>
        {(studentId === ALL_STUDENT_FILTER || currentStudentHasResponses) &&
          <div>
            {freeResponseQuestions.length > 0 &&
              <h2>{i18n.studentFreeResponseAnswers()}</h2>
            }
            {freeResponseQuestions.map((question, index) => (
              <div key={index}>
                <div style={styles.text}>
                  {`${question.questionNumber}. ${question.questionText.slice(0, QUESTION_CHARACTER_LIMIT)}`}
                  {question.questionText.length >= QUESTION_CHARACTER_LIMIT &&
                    <a onClick={() => {this.props.openDialog(question.questionText);}}>
                      <span>{i18n.seeFullQuestion()}</span>
                    </a>
                  }
                </div>
                <FreeResponsesAssessmentsTable
                  freeResponses={question.responses}
                />
              </div>
            ))}
          </div>
        }
      </div>
    );
  }
}

export const UnconnectedFreeResponsesAssessmentsContainer = FreeResponsesAssessmentsContainer;

export default connect(state => ({
  freeResponseQuestions: getAssessmentsFreeResponseResults(state),
  studentId: state.sectionAssessments.studentId,
  currentStudentHasResponses: currentStudentHasResponses(state),
}))(FreeResponsesAssessmentsContainer);
