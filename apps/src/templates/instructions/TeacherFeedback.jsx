import React, {PropTypes, Component} from 'react';
import { connect } from 'react-redux';
import color from "../../util/color";
import i18n from '@cdo/locale';
import { ViewType } from '@cdo/apps/code-studio/viewAsRedux';
import Button from '@cdo/apps/templates/Button';
import FeedbacksList from './FeedbacksList';

const styles = {
  container: {
    margin: 20,
    borderWidth: 5,
    borderStyle: 'solid',
    borderColor: color.cyan,
    backgroundColor: color.lightest_cyan,
    borderRadius: 5
  },
  header: {
    color: color.white,
    backgroundColor: color.cyan,
    padding: 5,
    fontSize: 18,
    fontFamily: '"Gotham 7r", sans-serif'
  },
  content: {
    padding: 10
  },
  textInput: {
    margin: 10,
    display: 'block',
    width: '90%',
  },
  button: {
    margin: 10,
    fontWeight: 'bold'
  },
  errorIcon: {
    color: 'red',
    margin: 10
  }
};

const ErrorType = {
  NoError: 'NoError',
  Load: 'Load',
  Save: 'Save'
};

class TeacherFeedback extends Component {
  static propTypes = {
    //temp prop for which version to display (stable, released 2018-teacher-experience, or internal, developer version)
    withUnreleasedFeatures: PropTypes.bool,

    //Provided by Redux
    viewAs: PropTypes.oneOf(['Teacher', 'Student']),
    serverLevelId: PropTypes.number,
    teacher: PropTypes.number,
  };

  constructor(props) {
    super(props);
    const search = window.location.search;
    const studentId = search.split('&')[1].split("=")[1];

    this.state = {
      comment: "",
      studentId: studentId,
      latestFeedback: [],
      submitting: false,
      errorState: ErrorType.NoError,
      token: ""
    };
  }

  componentDidMount = () => {
    $.ajax({
      url: `/api/v1/teacher_feedbacks/get_feedback_from_teacher?student_id=${this.state.studentId}&level_id=${this.props.serverLevelId}&teacher_id=${this.props.teacher}`,
      method: 'GET',
      contentType: 'application/json;charset=UTF-8',
    }).done((data, textStatus, request) => {
      this.setState({latestFeedback: [data]});
      this.setState({token: request.getResponseHeader('csrf-token')});
    }).fail((jqXhr, status) => {
      console.log(status + "  " + jqXhr.responseJSON);
      this.setState({errorState: ErrorType.Load});
    });
  };

  onCommentChange = (event) => {
    this.setState({comment: event.target.value});
  };

  onSubmitFeedback = () => {
    this.setState({submitting: true});
    const payload = {
      comment: this.state.comment,
      student_id: this.state.studentId,
      level_id: this.props.serverLevelId,
      teacher_id: this.props.teacher
    };

    $.ajax({
      url: '/api/v1/teacher_feedbacks',
      method: 'POST',
      contentType: 'application/json;charset=UTF-8',
      dataType: 'json',
      data: JSON.stringify({teacher_feedback: payload}),
      headers: {"X-CSRF-Token": this.state.token}
    }).done(data => {
      this.setState({latestFeedback: [data]});
      this.setState({submitting: false});
      this.setState({errorState: ErrorType.NoError});
    }).fail((jqXhr, status) => {
      console.log(status + "  " + jqXhr.responseJSON);
      this.setState({errorState: ErrorType.Save});
      this.setState({submitting: false});
    });
  };

  render() {
    if (!(this.props.viewAs === ViewType.Teacher)) {
      return null;
    }

    const buttonDisabled = this.state.comment.length <= 0 || this.state.submitting || this.state.errorState === ErrorType.Load;

    // Placeholder for upcoming feedback input
    return (
      <div style={styles.container}>
        <div style={styles.header}>{i18n.forTeachersOnly()}</div>
        {!this.props.withUnreleasedFeatures &&
          <div style={styles.content}>
            Coming soon: You’ll be able to use this tab to give feedback to your students about their work.
          </div>
        }
        {this.props.withUnreleasedFeatures &&
          <div>
            {this.state.latestFeedback.length > 0 &&
              <FeedbacksList
                feedbacks={this.state.latestFeedback}
              />
            }
            {this.state.errorState === ErrorType.Load &&
              <span>
                <i className="fa fa-warning" style={styles.errorIcon}></i>
                {i18n.feedbackLoadError()}
              </span>
            }
            <textarea
              id="ui-test-feedback-input"
              style={styles.textInput}
              onChange={this.onCommentChange}
              type="text"
              placeholder={i18n.feedbackPlaceholder()}
            />
            <div style={styles.button}>
              <Button
                id="ui-test-submit-feedback"
                text={i18n.saveAndShare()}
                onClick={this.onSubmitFeedback}
                color={Button.ButtonColor.blue}
                disabled={buttonDisabled}
              />
              {this.state.errorState === ErrorType.Save &&
                <span>
                  <i className="fa fa-warning" style={styles.errorIcon}></i>
                  {i18n.feedbackSaveError()}
                </span>
              }
            </div>
          </div>
        }
      </div>
    );
  }
}

export default connect(state => ({
  viewAs: state.viewAs,
  serverLevelId: state.pageConstants.serverLevelId,
  teacher: state.pageConstants.userId
}))(TeacherFeedback);
