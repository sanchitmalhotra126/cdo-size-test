import PropTypes from 'prop-types';
import React from 'react';
import UsPhoneNumberInput from '../../form_components/UsPhoneNumberInput';
import {
  PageLabels,
  SectionHeaders,
  TextFields
} from '@cdo/apps/generated/pd/teacherApplicationConstants';
import {isEmail, isZipCode} from '@cdo/apps/util/formatValidation';
import {
  FormGroup,
  Modal,
  Button,
  ControlLabel,
  FormControl,
  HelpBlock,
  Row,
  Col
} from 'react-bootstrap';
import {RegionalPartnerMiniContactPopupLink} from '@cdo/apps/code-studio/pd/regional_partner_mini_contact/RegionalPartnerMiniContact';
import queryString from 'query-string';
import {styles} from './TeacherApplicationConstants';
import SchoolAutocompleteDropdown from '@cdo/apps/templates/SchoolAutocompleteDropdown';
import {
  LabelsContext,
  labelFor
} from '../../form_components_func/LabeledFormComponent';
import {
  LabeledRadioButtons,
  LabeledRadioButtonsWithAdditionalTextFields
} from '../../form_components_func/labeled/LabeledRadioButtons';
import {
  LabeledInput,
  LabeledLargeInput
} from '../../form_components_func/labeled/LabeledInput';
import {LabeledUsPhoneNumberInput} from '../../form_components_func/labeled/LabeledUsPhoneNumberInput';
import {LabeledCheckBoxes} from '../../form_components_func/labeled/LabeledCheckBoxes';
import {LabeledSelect} from '../../form_components_func/labeled/LabeledSelect';
import {
  FormContext,
  getValidationState
} from '../../form_components_func/FormComponent';

const CSD_URL = 'https://code.org/educate/csd';
const CSP_URL = 'https://code.org/educate/csp';
const PD_RESOURCES_URL =
  'https://support.code.org/hc/en-us/articles/115003865532';
const CS_TEACHERS_URL = 'https://code.org/educate/community';
const INTERNATIONAL = 'Other country';
const US = 'United States';

const AboutYou = props => {
  const {accountEmail, onChange, errors, errorMessages, data} = props;
  const nominated = queryString.parse(window.location.search).nominated;

  const resetCountry = () => onChange({country: US});
  const exitApplication = () => (window.location = PD_RESOURCES_URL);

  const renderInternationalModal = () => {
    return (
      <Modal show={data.country === INTERNATIONAL}>
        <Modal.Header>
          <Modal.Title>
            Thank you for your interest in Code.org’s Professional Learning
            Program.
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          At this time, we are only able to provide this program to teachers in
          the United States. Please visit our website for additional Code.org{' '}
          <a href={PD_RESOURCES_URL} target="_blank" rel="noopener noreferrer">
            professional development resources
          </a>{' '}
          and opportunities to connect with other{' '}
          <a href={CS_TEACHERS_URL} target="_blank" rel="noopener noreferrer">
            computer science teachers
          </a>
          .
        </Modal.Body>
        <Modal.Footer>
          <Button onClick={resetCountry} bsStyle="primary">
            Continue as United States Teacher
          </Button>
          <Button onClick={exitApplication}>Exit Application</Button>
        </Modal.Footer>
      </Modal>
    );
  };

  const REQUIRED = <span style={{color: 'red'}}>&nbsp;*</span>;

  const NameInput = ({
    id,
    validationState,
    label,
    value,
    handleChange,
    errorMessage
  }) => (
    <FormGroup controlId={id} validationState={validationState}>
      <ControlLabel>
        {label}
        {REQUIRED}
      </ControlLabel>
      <FormControl
        type="text"
        componentClass="input"
        bsClass="form-control"
        value={value}
        onChange={e => handleChange({[id]: e.target.value})}
      />
      <HelpBlock>{errorMessage}</HelpBlock>
    </FormGroup>
  );
  NameInput.propTypes = {
    id: PropTypes.string,
    label: PropTypes.node,
    value: PropTypes.any,
    validationState: PropTypes.any,
    errorMessage: PropTypes.node,
    handleChange: PropTypes.func
  };

  const LabeledNameInput = ({name}) => {
    return (
      <NameInput
        id={name}
        label={labelFor(name)}
        validationState={getValidationState(name, errors)}
        errorMessage={errorMessages[name]}
        value={data[name] || ''}
        handleChange={onChange}
      />
    );
  };
  LabeledNameInput.propTypes = {
    name: PropTypes.string.isRequired
  };

  const handleSchoolChange = selectedSchool => {
    onChange({
      school: selectedSchool?.value,
      schoolZipCode: selectedSchool?.school?.zip
    });
  };

  return (
    <FormContext.Provider value={props}>
      <LabelsContext.Provider value={PageLabels.aboutYou}>
        <FormGroup>
          {nominated && (
            <p>
              Congratulations on being nominated for a scholarship to cover the
              costs of the Code.org Professional Learning Program! We will let
              your local partner know that you’ve been nominated as they
              consider your application for the regional scholarship or
              discounts they have available.
            </p>
          )}

          <p>
            Thanks for your interest in the Code.org Professional Learning
            Program! This application should take 10 - 15 minutes to complete.
            Fields marked with a <span style={{color: 'red'}}>*</span> are
            required.
          </p>

          <h3>Need more information? </h3>
          <p>
            If you need more information about the program before you apply,
            please visit the{' '}
            <a href={CSD_URL} target="_blank" rel="noopener noreferrer">
              CS Discoveries
            </a>{' '}
            and{' '}
            <a href={CSP_URL} target="_blank" rel="noopener noreferrer">
              CS Principles
            </a>{' '}
            landing pages. For additional questions regarding the program or
            application, please{' '}
            <RegionalPartnerMiniContactPopupLink
              sourcePageId="teacher-application-first-page"
              notes="Please tell me more about the professional learning program for grades 6-12!"
            >
              <span style={styles.linkLike}>contact your Regional Partner</span>
            </RegionalPartnerMiniContactPopupLink>
            .
          </p>

          <h3>Section 1: {SectionHeaders.aboutYou}</h3>

          <LabeledRadioButtons name="country" />

          {renderInternationalModal()}

          <LabeledRadioButtons name="completingOnBehalfOfSomeoneElse" />
          {data.completingOnBehalfOfSomeoneElse === 'Yes' && (
            <LabeledLargeInput name="completingOnBehalfOfName" />
          )}

          <Row>
            <Col md={3}>
              <LabeledNameInput name="firstName" />
            </Col>
            <Col md={3}>
              <LabeledNameInput name="lastName" />
            </Col>
          </Row>

          <LabeledInput
            name="accountEmail"
            value={accountEmail}
            readOnly={true}
          />

          <LabeledInput name="alternateEmail" required={false} />

          <LabeledUsPhoneNumberInput name="phone" />

          <p>
            Code.org or your Regional Partner may need to ship workshop
            materials to you. Please provide the address where you can receive
            mail when school is not in session.
          </p>
          <LabeledInput name="streetAddress" />
          <LabeledInput name="city" />
          <LabeledInput name="state" />
          <LabeledInput name="zipCode" />

          <LabeledCheckBoxes name="previousUsedCurriculum" />
          <LabeledCheckBoxes name="previousYearlongCdoPd" />
          <LabeledRadioButtonsWithAdditionalTextFields
            name="currentRole"
            textFieldMap={{[TextFields.otherPleaseList]: 'other'}}
          />

          <p>Please provide your school and principal information below:</p>

          <FormGroup
            id="school"
            controlId="school"
            validationState={getValidationState('school', errors)}
          >
            <Row>
              <Col md={6}>
                <ControlLabel>
                  School
                  <span style={{color: 'red'}}> *</span>
                </ControlLabel>
              </Col>
            </Row>
            <Row>
              <Col md={6}>
                <SchoolAutocompleteDropdown
                  value={data.school}
                  onChange={handleSchoolChange}
                />
              </Col>
            </Row>
          </FormGroup>

          {/* if we have a school but it doesn't exist in our database */}
          {data.school && data.school === '-1' && (
            <div style={styles.indented}>
              <LabeledInput name="schoolName" />
              <LabeledInput name="schoolDistrictName" required={false} />
              <LabeledInput name="schoolAddress" required={false} />
              <LabeledInput name="schoolCity" required={false} />
              <LabeledSelect name="schoolState" placeholder="Select a state" />
              <LabeledInput name="schoolZipCode" />
              <LabeledRadioButtons name="schoolType" />
            </div>
          )}

          {
            // Disable auto complete for principal fields, so they are not filled with the teacher's details.
            // Using a custom unmatched string "never" instead of "off" for wider browser compatibility.
            // See https://developer.mozilla.org/en-US/docs/Web/Security/Securing_your_site/Turning_off_form_autocompletion#Disabling_autocompletion
          }
          <LabeledInput name="principalFirstName" autoComplete="never" />
          <LabeledInput name="principalLastName" autoComplete="never" />
          <LabeledInput name="principalEmail" autoComplete="never" />
          <LabeledInput name="principalConfirmEmail" autoComplete="never" />
          <LabeledUsPhoneNumberInput
            name="principalPhoneNumber"
            autoComplete="never"
          />
        </FormGroup>
      </LabelsContext.Provider>
    </FormContext.Provider>
  );
};

AboutYou.propTypes = {
  options: PropTypes.object.isRequired,
  errors: PropTypes.arrayOf(PropTypes.string).isRequired,
  errorMessages: PropTypes.object.isRequired,
  data: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  accountEmail: PropTypes.string.isRequired
};

AboutYou.associatedFields = [...Object.keys(PageLabels.aboutYou)];

AboutYou.getDynamicallyRequiredFields = data => {
  const requiredFields = [];

  if (data.completingOnBehalfOfSomeoneElse === 'Yes') {
    requiredFields.push('completingOnBehalfOfName');
  }

  if (data.school === '-1') {
    requiredFields.push('schoolName');
    requiredFields.push('schoolState');
    requiredFields.push('schoolZipCode');
    requiredFields.push('schoolType');
  }

  return requiredFields;
};

AboutYou.processPageData = data => {
  const changes = {};
  if (data.completingOnBehalfOfSomeoneElse === 'No') {
    changes.completingOnBehalfOfName = undefined;
  }
  return changes;
};

AboutYou.getErrorMessages = data => {
  const formatErrors = {};

  if (data.alternateEmail && !isEmail(data.alternateEmail)) {
    formatErrors.alternateEmail = 'Must be a valid email address';
  }

  if (data.zipCode && !isZipCode(data.zipCode)) {
    formatErrors.zipCode = 'Must be a valid zip code';
  }

  if (!UsPhoneNumberInput.isValid(data.phone)) {
    formatErrors.phone = 'Must be a valid phone number including area code';
  }

  if (!UsPhoneNumberInput.isValid(data.principalPhoneNumber)) {
    formatErrors.principalPhoneNumber =
      'Must be a valid phone number including area code';
  }

  if (!isEmail(data.principalEmail)) {
    formatErrors.principalEmail = 'Must be a valid email address';
  }

  if (data.principalEmail !== data.principalConfirmEmail) {
    formatErrors.principalConfirmEmail = 'Must match above email';
  }

  if (data.schoolZipCode && !isZipCode(data.schoolZipCode)) {
    formatErrors.schoolZipCode = 'Must be a valid zip code';
  }

  return formatErrors;
};

export default AboutYou;
