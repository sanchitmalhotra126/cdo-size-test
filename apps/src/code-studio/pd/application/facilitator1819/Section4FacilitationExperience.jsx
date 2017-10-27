import React, {PropTypes} from 'react';
import {FormGroup} from "react-bootstrap";
import Facilitator1819FormComponent from "./Facilitator1819FormComponent";
import {PageLabels, SectionHeaders} from '@cdo/apps/generated/pd/facilitator1819ApplicationConstants';
import {YES, NO} from '../ApplicationConstants';

export default class Section4FacilitationExperience extends Facilitator1819FormComponent {
  static propTypes = {
    ...Facilitator1819FormComponent.propTypes,
    accountEmail: PropTypes.string.isRequired
  };

  static labels = PageLabels.section4FacilitationExperience;

  static associatedFields = [
    ...Object.keys(PageLabels.section4FacilitationExperience)
  ];

  render() {
    return (
      <FormGroup>
        <h3>Section 4: {SectionHeaders.section4FacilitationExperience}</h3>

        {this.radioButtonsFor("codeOrgFacilitator")}

        {this.props.data.codeOrgFacilitator === YES &&
          <div>
            {this.checkBoxesFor("codeOrgFacilitatorYears")}
            {this.checkBoxesFor("codeOrgFacilitatorPrograms")}
          </div>
        }

        {this.radioButtonsFor("haveLedPd")}

        {this.props.data.haveLedPd === YES &&
          <div>
            {this.checkBoxesFor("groupsLedPd")}
            {this.largeInputFor("describePriorPd")}
          </div>
        }
        {this.props.data.haveLedPd === NO &&
          this.largeInputFor("whyNoPd")
        }
      </FormGroup>
    );
  }

  /**
   * @override
   */
  static getDynamicallyRequiredFields(data) {
    const requiredFields = [];

    if (data.codeOrgFacilitator === YES) {
      requiredFields.push(
        "codeOrgFacilitatorYears",
        "codeOrgFacilitatorPrograms"
      );
    }

    if (data.haveLedPd === YES) {
      requiredFields.push(
        "groupsLedPd",
        "describePriorPd"
      );
    } else if (data.haveLedPd === NO) {
      requiredFields.push(
        "whyNoPd"
      );
    }

    return requiredFields;
  }
}
