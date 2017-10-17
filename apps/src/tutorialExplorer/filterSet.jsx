/* FilterSet: The overall search area in TutorialExplorer.  Contains a set of filter groups.
 */

import React, {PropTypes} from 'react';
import FilterGroup from './filterGroup';
import RoboticsButton from './roboticsButton';
import FilterGroupOrgNames from './filterGroupOrgNames';
import FilterGroupSortBy from './filterGroupSortBy';
import { TutorialsSortBy } from './util';

export default class FilterSet extends React.Component {
  static propTypes = {
    uniqueOrgNames: PropTypes.arrayOf(PropTypes.string).isRequired,
    orgName: PropTypes.string,
    showSortDropdown: PropTypes.bool.isRequired,
    defaultSortBy: PropTypes.oneOf(Object.keys(TutorialsSortBy)).isRequired,
    sortBy: PropTypes.oneOf(Object.keys(TutorialsSortBy)).isRequired,
    filterGroups: PropTypes.array.isRequired,
    selection: PropTypes.objectOf(PropTypes.arrayOf(PropTypes.string)).isRequired,
    onUserInputFilter: PropTypes.func.isRequired,
    onUserInputOrgName: PropTypes.func.isRequired,
    onUserInputSortBy: PropTypes.func.isRequired,
    roboticsButtonUrl: PropTypes.string
  };

  render() {
    return (
      <div>
        {this.props.showSortDropdown && (
          <FilterGroupSortBy
            defaultSortBy={this.props.defaultSortBy}
            sortBy={this.props.sortBy}
            onUserInput={this.props.onUserInputSortBy}
          />
        )}

        <FilterGroupOrgNames
          orgName={this.props.orgName}
          uniqueOrgNames={this.props.uniqueOrgNames}
          onUserInput={this.props.onUserInputOrgName}
        />

        {this.props.filterGroups.map(item =>
          item.display !== false && (
            <FilterGroup
              name={item.name}
              text={item.text}
              filterEntries={item.entries}
              onUserInput={this.props.onUserInputFilter}
              selection={this.props.selection[item.name]}
              key={item.name}
            />
          )
        )}

        {this.props.roboticsButtonUrl && (
          <RoboticsButton url={this.props.roboticsButtonUrl}/>
        )}

      </div>
    );
  }
}
