import React, { Component, PropTypes } from 'react';
import i18n from "@cdo/locale";
import Button from "../Button";
import SchoolAutocompleteDropdownWithLabel from '../census2017/SchoolAutocompleteDropdownWithLabel';
import { styles as censusFormStyles } from '../census2017/censusFormStyles';

const styles = {
  confirmed: {
    marginBottom: 5
  }
};

export default class DiscountCodeSchoolChoice extends Component {
  static propTypes = {
    initialSchoolId: PropTypes.string,
    initialSchoolName: PropTypes.string,
    schoolConfirmed: PropTypes.bool.isRequired,
    onSchoolConfirmed: PropTypes.func.isRequired,
  };

  constructor(props) {
    super(props);
    this.state = {
      confirming: false,
      confirmed: props.schoolConfirmed,
      schoolId: props.initialSchoolId,
      schoolName: props.initialSchoolName,
    };
  }

  handleDropdownChange = (field, event) => {
    if (field === 'nces') {
      this.setState({
        schoolId: event.value,
        schoolName: event.label,
      });
    }
  }

  handleClickConfirmSchool = () => {
    this.setState({
      confirming: true
    });

    // TODO: eventually this will be an API call. To start with, just fake it
    // by at least making it async
    setTimeout(() => {
      this.setState({
        confirming: false,
        confirmed: true,
      });
      const fullDiscount = false;
      this.props.onSchoolConfirmed(fullDiscount);
    }, 1000);
  }

  render() {
    const { schoolId, schoolName, confirming, confirmed } = this.state;

    if (confirmed) {
      return (
        <div style={styles.confirmed}>
          <div style={censusFormStyles.question}>{i18n.schoolName()}</div>
          {schoolName}
        </div>
      );
    }

    return (
      <div>
        <SchoolAutocompleteDropdownWithLabel
          setField={this.handleDropdownChange}
          value={schoolId}
          showErrorMsg={false}
        />
        <br/>
        {this.state.schoolId !== "-1" && (
          <Button
            color={Button.ButtonColor.orange}
            text={confirming ? i18n.confirming() : i18n.confirmSchool()}
            onClick={this.handleClickConfirmSchool}
          />
        )}
        {this.state.schoolId === "-1" && (
          <div>
            {i18n.eligibilitySchoolUnknown()}
            <b> {i18n.contactToContinue()}</b>
          </div>
        )}
      </div>
    );
  }
}
