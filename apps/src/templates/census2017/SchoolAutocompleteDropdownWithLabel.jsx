import React, { Component, PropTypes } from 'react';
import SchoolAutocompleteDropdown from '../SchoolAutocompleteDropdown';
import 'react-virtualized/styles.css';
import 'react-select/dist/react-select.css';
import 'react-virtualized-select/styles.css';
import i18n from "@cdo/locale";
import { styles } from './censusFormStyles';

export default class SchoolAutocompleteDropdownWithLabel extends Component {
  static propTypes = {
    setField: PropTypes.func,
    showErrorMsg: PropTypes.bool,
    // Value is the NCES id of the school
    value: PropTypes.string
  };

  sendToParent = (selectValue) => {
    this.props.setField("nces", selectValue);
  };

  handleSchoolNotFoundCheckbox(event) {
    var checkbox = event.target;
    if (checkbox.checked) {
      this.props.setField("nces", {value: "-1"});
    } else {
      this.props.setField("nces", {value: ""});
    }
  }

  render() {
    return (
      <div>
        <div style={styles.question}>
          {i18n.schoolName()}
          <span style={styles.asterisk}> *</span>
          {this.props.showErrorMsg && (
             <div style={styles.errors}>
               {i18n.censusRequiredSelect()}
             </div>
          )}
        </div>
        <SchoolAutocompleteDropdown
          value={this.props.value}
          onChange={this.sendToParent}
        />
        <label>
          <input id="schoolNotFoundCheckbox" type="checkbox" onChange={this.handleSchoolNotFoundCheckbox.bind(this)} checked={this.props.value === "-1"}/>
          <span style={styles.checkboxOption}>
            {i18n.schoolNotFoundCheckboxLabel()}
          </span>
        </label>
      </div>
    );
  }
}
