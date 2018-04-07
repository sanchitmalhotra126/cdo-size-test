/**
 * Dropdown for admins to select which
 * RegionalPartner's applications to view
 */

import React, { PropTypes } from 'react';
import { connect } from 'react-redux';
import { FormGroup, ControlLabel } from 'react-bootstrap';
import Select from "react-select";
import { SelectStyleProps } from '../constants';
import {
  setRegionalPartnerFilter,
  setRegionalPartnerName
} from './reducers';
import { RegionalPartnerFilterPropType } from './constants';

const styles = {
  select: {
    maxWidth: '500px'
  }
};

export class RegionalPartnerDropdown extends React.Component {
  static propTypes = {
    onChange: PropTypes.func.isRequired,
    regionalPartnerFilter: RegionalPartnerFilterPropType.isRequired,
    regionalPartners: PropTypes.arrayOf(PropTypes.shape({
      id: PropTypes.number,
      name: PropTypes.string
    })),
    additionalOptions: PropTypes.array
  };

  componentWillMount() {
    this.regionalPartners = this.props.regionalPartners.map(v => ({value: v.id, label: v.name}));
    if (this.props.additionalOptions) {
      this.props.additionalOptions.forEach((option) => this.regionalPartners.unshift({value: option.value, label: option.label}));
    }
  }

  onChange = (selected) => {
    this.props.onChange(selected);
    sessionStorage.setItem("regionalPartnerFilter", selected.value);
    sessionStorage.setItem("regionalPartnerName", selected.label);
  };

  render() {
    return (
      <FormGroup>
        <ControlLabel>Select a regional partner</ControlLabel>
        <Select
          clearable={false}
          value={this.props.regionalPartnerFilter}
          onChange={this.onChange}
          placeholder={null}
          options={this.regionalPartners}
          style={styles.select}
          {...SelectStyleProps}
        />
      </FormGroup>
    );
  }
}

export default connect(
  state => ({
    regionalPartners: state.regionalPartners,
  }),
  dispatch => ({
    onChange(selectedOption) {
      dispatch(setRegionalPartnerFilter(selectedOption.value));
      dispatch(setRegionalPartnerName(selectedOption.label));
    }
  })
)(RegionalPartnerDropdown);
