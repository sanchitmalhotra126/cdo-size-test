/* SortBy: The sort order of tutorials.
 */

import React, {PropTypes} from 'react';
import FilterGroupContainer from './filterGroupContainer';
import { TutorialsSortBy } from './util';
import i18n from './locale';

const styles = {
  select: {
    width: '100%',
    marginTop: 10,
    height: 26
  }
};

const FilterGroupSortBy = React.createClass({
  propTypes: {
    defaultSortBy: PropTypes.oneOf(Object.keys(TutorialsSortBy)).isRequired,
    sortBy: PropTypes.oneOf(Object.keys(TutorialsSortBy)).isRequired,
    onUserInput: PropTypes.func.isRequired
  },

  handleChangeSort(event) {
    this.props.onUserInput(
      event.target.value
    );
  },

  render() {
    // Show the default sort criteria first.  That way, when the dropdown that
    // shows "Sort" is opened to show the two possible options, the default
    // will be first and will get the checkmark that seems to be always shown
    // next to the first option.
    let sortOptions;
    if (this.props.defaultSortBy === TutorialsSortBy.popularityrank) {
      sortOptions = [
        {value: "popularityrank", text: i18n.filterHeaderPopularityRank()},
        {value: "displayweight", text: i18n.filterHeaderDisplayWeight()}
      ];
    } else {
      sortOptions = [
        {value: "displayweight", text: i18n.filterHeaderDisplayWeight()},
        {value: "popularityrank", text: i18n.filterHeaderPopularityRank()}
      ];
    }

    return (
      <FilterGroupContainer text={i18n.filterSortBy()}>
        <select
          value={this.props.sortBy}
          onChange={this.handleChangeSort}
          style={styles.select}
          className="noFocusButton"
        >
          <option value={sortOptions[0].value}>{sortOptions[0].text}</option>
          <option value={sortOptions[1].value}>{sortOptions[1].text}</option>
        </select>
      </FilterGroupContainer>
    );
  }
});

export default FilterGroupSortBy;
