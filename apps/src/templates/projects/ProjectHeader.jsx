/** @file Header banner and start new project buttons for the project gallery */
import PropTypes from 'prop-types';
import React from 'react';
import i18n from '@cdo/locale';
import StartNewProject from '@cdo/apps/templates/projects/StartNewProject';
import HeaderBanner from '@cdo/apps/templates/HeaderBanner';
import {SpecialAnnouncementActionBlock} from '../studioHomepages/TwoColumnActionBlock';

export default class ProjectHeader extends React.Component {
  static propTypes = {
    canViewAdvancedTools: PropTypes.bool,
    projectCount: PropTypes.number,
    specialAnnouncement: PropTypes.object
  };

  render() {
    const projectCountWithCommas = this.props.projectCount.toLocaleString();

    return (
      <div style={{display: 'flex'}}>
        <HeaderBanner
          short={true}
          headingText={i18n.projects()}
          subHeadingText={i18n.projectsSubHeading({
            project_count: projectCountWithCommas
          })}
        />
        {this.props.specialAnnouncement && (
          <SpecialAnnouncementActionBlock
            announcement={this.props.specialAnnouncement}
          />
        )}
        <StartNewProject
          canViewFullList
          canViewAdvancedTools={this.props.canViewAdvancedTools}
        />
      </div>
    );
  }
}
