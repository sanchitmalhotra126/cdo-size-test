import React, {PropTypes} from 'react';
import {FormGroup} from "react-bootstrap";
import Facilitator1819FormComponent from "./Facilitator1819FormComponent";
import {pageLabels} from './Facilitator1819Labels';

const PROGRAM_CSF = "CS Fundamentals (Pre-K - 5th grade)";
const CSF_AVAILABILITY_ONLY_WEEKEND = "I will only be able to attend Saturday and Sunday of the training";

export default class Section2ChooseYourProgram extends Facilitator1819FormComponent {
  static propTypes = {
    ...Facilitator1819FormComponent.propTypes,
    accountEmail: PropTypes.string.isRequired
  };

  static labels = pageLabels.Section2ChooseYourProgram;

  static associatedFields = [
    ...Object.keys(pageLabels.Section2ChooseYourProgram),
    "csdCspTeacherconAvailability_unavailableReason",
    "csdCspFitAvailability_unavailableReason"
  ];

  render() {
    return (
      <FormGroup>
        <h3>Section 2: Choose Your Program</h3>

        {this.radioButtonsFor("program")}

        {this.checkBoxesWithAdditionalTextFieldsFor("planOnTeaching", {
          "Other": "other"
        })}

        {this.selectFor("abilityToMeetRequirements", {controlWidth: {md: 2}, placeholder: true})}

        <br/>
        {this.props.data.program === PROGRAM_CSF &&
          <div>
            <h4>If selected for the program, you will be required to attend a Facilitator-in-Training Weekend in the spring of 2018.</h4>

            {this.radioButtonsFor("csfAvailability")}

            {this.props.data.csfAvailability ===  CSF_AVAILABILITY_ONLY_WEEKEND &&
              this.inputFor("csfPartialAttendanceReason", this.indented())
            }
          </div>
        }

        {this.props.data.program && this.props.data.program !== PROGRAM_CSF &&
          <div>
            <h4>If selected for the program, you will be required to attend TeacherCon and a Facilitator-in-Training Weekend in the summer of 2018.</h4>

            {this.checkBoxesWithAdditionalTextFieldsFor("csdCspTeacherconAvailability", {
              "I'm not available for either TeacherCon. (Please Explain)" : "unavailableReason"
            })}

            {this.checkBoxesWithAdditionalTextFieldsFor("csdCspFitAvailability", {
              "I'm not available for either Facilitator-in-Training workshop. (Please Explain)" : "unavailableReason"
            })}
          </div>
        }
      </FormGroup>
    );
  }

  /**
   * @override
   */
  static getDynamicallyRequiredFields(data) {
    const requiredFields = [];

    if (data.program === PROGRAM_CSF) {
      requiredFields.push("csfAvailability");

      if (data.csfAvailability === CSF_AVAILABILITY_ONLY_WEEKEND) {
        requiredFields.push("csfPartialAttendanceReason");
      }
    }

    if (data.program && data.program !== PROGRAM_CSF) {
      requiredFields.push(
        "csdCspTeacherconAvailability",
        "csdCspFitAvailability"
      );
    }

    return requiredFields;
  }
}

