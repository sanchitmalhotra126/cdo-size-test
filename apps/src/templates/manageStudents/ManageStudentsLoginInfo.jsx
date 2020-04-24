import PropTypes from 'prop-types';
import React, {Component} from 'react';
import {SectionLoginType} from '@cdo/apps/util/sharedConstants';
import i18n from '@cdo/locale';
import color from '@cdo/apps/util/color';
import {teacherDashboardUrl} from '@cdo/apps/templates/teacherDashboard/urlHelpers';
import {pegasus} from '@cdo/apps/lib/util/urlHelpers';
import SafeMarkdown from '@cdo/apps/templates/SafeMarkdown';
import {ParentLetterButtonMetricsCategory} from '@cdo/apps/templates/manageStudents/manageStudentsRedux';
import DownloadParentLetter from './DownloadParentLetter';

const styles = {
  explanation: {
    clear: 'both',
    paddingTop: 20
  },
  heading: {
    color: color.purple
  },
  listAlign: {
    marginLeft: 10
  }
};

class ManageStudentsLoginInfo extends Component {
  static propTypes = {
    sectionId: PropTypes.number,
    sectionCode: PropTypes.string,
    loginType: PropTypes.string,
    // The prefix for the code studio url in the current environment,
    // e.g. 'https://studio.code.org' or 'http://localhost-studio.code.org:3000'.
    studioUrlPrefix: PropTypes.string
  };

  render() {
    const {loginType, sectionId, sectionCode, studioUrlPrefix} = this.props;

    return (
      <div style={styles.explanation}>
        <h2 style={styles.heading}>{i18n.setUpClass()}</h2>
        {(loginType === SectionLoginType.word ||
          loginType === SectionLoginType.picture) && (
          <div>
            {loginType === SectionLoginType.word && (
              <p>{i18n.setUpClassWordIntro()}</p>
            )}
            {loginType === SectionLoginType.picture && (
              <p>{i18n.setUpClassPicIntro()}</p>
            )}
            <p style={styles.listAlign}>{i18n.setUpClassWordPic1()}</p>
            {loginType === SectionLoginType.word && (
              <SafeMarkdown
                markdown={i18n.setUpClassWord2({
                  printLoginCardLink: teacherDashboardUrl(
                    sectionId,
                    '/login_info'
                  )
                })}
              />
            )}
            {loginType === SectionLoginType.picture && (
              <SafeMarkdown
                markdown={i18n.setUpClassPic2({
                  printLoginCardLink: teacherDashboardUrl(
                    sectionId,
                    '/login_info'
                  )
                })}
              />
            )}
            <SafeMarkdown
              markdown={i18n.setUpClass3({
                parentLetterLink: teacherDashboardUrl(
                  sectionId,
                  '/parent_letter'
                )
              })}
            />
            <p style={styles.listAlign}>{i18n.setUpClass4()}</p>
          </div>
        )}
        {loginType === SectionLoginType.email && (
          <div>
            <p>{i18n.setUpClassEmailIntro()}</p>
            <SafeMarkdown
              markdown={i18n.setUpClassEmail1({
                createAccountLink: `${studioUrlPrefix}/users/sign_up`
              })}
            />
            <SafeMarkdown
              markdown={i18n.setUpClassEmail2({
                joinLink: `${studioUrlPrefix}/join/${sectionCode}`
              })}
            />
            <SafeMarkdown
              markdown={i18n.setUpClass3({
                parentLetterLink: teacherDashboardUrl(
                  sectionId,
                  '/parent_letter'
                )
              })}
            />
            <p style={styles.listAlign}>{i18n.setUpClass4()}</p>
          </div>
        )}
        {loginType === SectionLoginType.google_classroom && (
          <div>
            <p>{i18n.setUpClassGoogleIntro()}</p>
            <p style={styles.listAlign}>{i18n.setUpClassGoogle1()}</p>
            <p style={styles.listAlign}>{i18n.setUpClassGoogle2()}</p>
            <p>{i18n.setUpClassGoogleFinished()}</p>
          </div>
        )}
        {loginType === SectionLoginType.clever && (
          <div>
            <p>{i18n.setUpClassCleverIntro()}</p>
            <p style={styles.listAlign}>{i18n.setUpClassClever1()}</p>
            <p style={styles.listAlign}>{i18n.setUpClassClever2()}</p>
            <p>{i18n.setUpClassCleverFinished()}</p>
          </div>
        )}
        <h2 style={styles.heading}>{i18n.loginType()}</h2>

        <h2 style={styles.heading}>{i18n.privacyHeading()}</h2>
        <p id="uitest-privacy-text">{i18n.privacyDocExplanation()}</p>
        <DownloadParentLetter
          sectionId={this.props.sectionId}
          buttonMetricsCategory={ParentLetterButtonMetricsCategory.BELOW_TABLE}
        />
        <br />
        <span id="uitest-privacy-link">
          <SafeMarkdown
            markdown={i18n.privacyLinkToPolicy({
              privacyPolicyLink: pegasus('/privacy/student-privacy')
            })}
          />
        </span>
      </div>
    );
  }
}

export default ManageStudentsLoginInfo;
