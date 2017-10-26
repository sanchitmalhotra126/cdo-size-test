import React, {PropTypes} from 'react';
import {FormGroup} from "react-bootstrap";
import Facilitator1819FormComponent from "./Facilitator1819FormComponent";
import {PageLabels, SectionHeaders} from '@cdo/apps/generated/pd/facilitator1819ApplicationConstants';
import {YES} from '../ApplicationConstants';

export default class Section6Logistics extends Facilitator1819FormComponent {
  static propTypes = {
    ...Facilitator1819FormComponent.propTypes,
    accountEmail: PropTypes.string.isRequired
  };

  static labels = PageLabels.section6Logistics;

  static associatedFields = [
    ...Object.keys(PageLabels.section6Logistics)
  ];

  render() {
    return (
      <FormGroup>
        <h3>Section 6: {SectionHeaders.section6Logistics}</h3>

        {this.radioButtonsFor("availableDuringWeek")}

        {this.props.data.availableDuringWeek === YES &&
        this.checkBoxesFor("weeklyAvailability", this.indented())
        }

        {this.radioButtonsFor("travelDistance")}

      </FormGroup>
    );
  }

  /**
   * @override
   */
  static getDynamicallyRequiredFields(data) {
    const requiredFields = [];

    if (data.availableDuringWeek === YES) {
      requiredFields.push("weeklyAvailability");
    }

    return requiredFields;
  }
}
