import React, {PropTypes} from 'react';
import BaseDialog from '@cdo/apps/templates/BaseDialog';
import i18n from '@cdo/locale';
import color from '@cdo/apps/util/color';
import {hashEmail} from '../../../code-studio/hashEmail';
import {isEmail} from '../../../util/formatValidation';
import {Header, ConfirmCancelFooter} from '../SystemDialog/SystemDialog';
import ChangeEmailForm from './ChangeEmailForm';

/*

Note: This feature is in active development, so there are still some rough edges.
(Brad Buchanan, 2018-05-10)

Spec:
https://docs.google.com/document/d/1eKDnrgorG9koHQF3OdY6nxiO4PIfJ-JCNHGGQu0-G9Y/edit

Task list:
Send the email opt-in to the server and handle it correctly

 */

const STATE_INITIAL = 'initial';
const STATE_SAVING = 'saving';
const STATE_UNKNOWN_ERROR = 'unknown-error';

export default class ChangeEmailModal extends React.Component {
  static propTypes = {
    /**
     * @type {function({newEmail: string, currentPassword: string}):Promise}
     */
    handleSubmit: PropTypes.func.isRequired,
    /**
     * @type {function()}
     */
    handleCancel: PropTypes.func.isRequired,
    currentHashedEmail: PropTypes.string,
  };

  state = {
    saveState: STATE_INITIAL,
    values: {
      newEmail: '',
      currentPassword: '',
    },
    serverErrors: {
      newEmail: '',
      currentPassword: ''
    },
  };

  save = () => {
    // No-op if we know the form is invalid, client-side.
    // This blocks return-key submission when the form is invalid.
    if (!this.isFormValid(this.getValidationErrors())) {
      return;
    }

    const {values} = this.state;
    this.setState({saveState: STATE_SAVING});
    this.props.handleSubmit(values)
      .catch(this.onSubmitFailure);
  };

  cancel = () => this.props.handleCancel();

  onSubmitFailure = (error) => {
    if (error && error.hasOwnProperty('serverErrors')) {
      this.setState({
        saveState: STATE_INITIAL,
        serverErrors: error.serverErrors
      }, () => this.changeEmailForm.focusOnAnError());
    } else {
      this.setState({saveState: STATE_UNKNOWN_ERROR});
    }
  };

  isFormValid(validationErrors) {
    return Object.keys(validationErrors).every(key => !validationErrors[key]);
  }

  getValidationErrors() {
    const {serverErrors} = this.state;
    return {
      newEmail: serverErrors.newEmail || this.getNewEmailValidationError(),
      currentPassword: serverErrors.currentPassword || this.getCurrentPasswordValidationError(),
    };
  }

  getNewEmailValidationError = () => {
    const {newEmail} = this.state.values;
    const {currentHashedEmail} = this.props;
    if (newEmail.trim().length === 0) {
      return i18n.changeEmailModal_newEmail_isRequired();
    }
    if (!isEmail(newEmail.trim())) {
      return i18n.changeEmailModal_newEmail_invalid();
    }
    if (currentHashedEmail === hashEmail(newEmail)) {
      return i18n.changeEmailModal_newEmail_mustBeDifferent();
    }
    return null;
  };

  getCurrentPasswordValidationError = () => {
    const {currentPassword} = this.state.values;
    if (currentPassword.length === 0) {
      return i18n.changeEmailModal_currentPassword_isRequired();
    }
    return null;
  };

  onFormChange = (newValues) => {
    const {values: oldValues, serverErrors} = this.state;
    const newServerErrors = {...serverErrors};
    if (newValues.newEmail !== oldValues.newEmail) {
      newServerErrors.newEmail = undefined;
    }
    if (newValues.currentPassword !== oldValues.currentPassword) {
      newServerErrors.currentPassword = undefined;
    }
    this.setState({
      values: newValues,
      serverErrors: newServerErrors
    });
  };

  render = () => {
    const {saveState, values} = this.state;
    const validationErrors = this.getValidationErrors();
    const isFormValid = this.isFormValid(validationErrors);
    return (
      <BaseDialog
        useUpdatedStyles
        isOpen
        handleClose={this.cancel}
        uncloseable={STATE_SAVING === saveState}
      >
        <div style={styles.container}>
          <Header text={i18n.changeEmailModal_title()}/>
          <ChangeEmailForm
            ref={x => this.changeEmailForm = x}
            values={values}
            validationErrors={validationErrors}
            disabled={STATE_SAVING === saveState}
            onChange={this.onFormChange}
            onSubmit={this.save}
          />
          <ConfirmCancelFooter
            confirmText={i18n.changeEmailModal_save()}
            onConfirm={this.save}
            onCancel={this.cancel}
            disableConfirm={STATE_SAVING === saveState || !isFormValid}
            disableCancel={STATE_SAVING === saveState}
          >
            {(STATE_SAVING === saveState) &&
              <em>{i18n.saving()}</em>}
            {(STATE_UNKNOWN_ERROR === saveState) &&
              <em>{i18n.changeEmailModal_unexpectedError()}</em>}
          </ConfirmCancelFooter>
        </div>
      </BaseDialog>
    );
  };
}

const styles = {
  container: {
    margin: 20,
    color: color.charcoal,
  }
};
