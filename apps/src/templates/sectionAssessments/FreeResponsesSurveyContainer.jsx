import React, {Component, PropTypes} from 'react';
import FreeResponsesSurveyTable from './FreeResponsesSurveyTable';
import {
  getSurveyFreeResponseQuestions,
} from './sectionAssessmentsRedux';
import { connect } from 'react-redux';
import i18n from "@cdo/locale";

const QUESTION_CHARACTER_LIMIT = 110;

const styles = {
  text: {
    font: 10,
    paddingTop: 20,
    paddingBottom: 20,
  },
};

const freeResponseQuestionsPropType = PropTypes.shape({
  questionNumber: PropTypes.number,
  questionText: PropTypes.string,
  answers: PropTypes.array,
});

class FreeResponsesSurveyContainer extends Component {
  static propTypes = {
    freeResponsesByQuestion: PropTypes.arrayOf(freeResponseQuestionsPropType),
    openDialog: PropTypes.func.isRequired,
  };

  render() {
    const {freeResponsesByQuestion} = this.props;
    return (
      <div>
        <h2>{i18n.studentFreeResponseAnswers()}</h2>
        {freeResponsesByQuestion.map((question, index) => (
          <div key={index}>
            <div style={styles.text}>
              {`${question.questionNumber}. ${question.questionText.slice(0, QUESTION_CHARACTER_LIMIT)}`}
              {question.questionText.length >= QUESTION_CHARACTER_LIMIT &&
                <a onClick={() => {this.props.openDialog(question.questionText);}}>
                  <span>{i18n.seeFullQuestion()}</span>
                </a>
              }
            </div>
            <FreeResponsesSurveyTable
              freeResponses={question.answers}
            />
          </div>
        ))}
      </div>
    );
  }
}

export const UnconnectedFreeResponsesSurveyContainer = FreeResponsesSurveyContainer;

export default connect(state => ({
  freeResponsesByQuestion: getSurveyFreeResponseQuestions(state),
}))(FreeResponsesSurveyContainer);
