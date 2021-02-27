// Main page for Foorm Editor interface. Will initially show a choice
// between loading an existing configuration or an empty configuration.
// After that choice is made, will render FoormEditor with the chosen configuration.

import React from 'react';
import {connect} from 'react-redux';
import PropTypes from 'prop-types';
import {Button, DropdownButton, MenuItem} from 'react-bootstrap';
import {
  setLastSaved,
  setSaveError,
  setHasJSONError,
  setLastSavedQuestions
} from '../foormEditorRedux';

class FoormLoadButtons extends React.Component {
  static propTypes = {
    resetCodeMirror: PropTypes.func,
    namesAndVersions: PropTypes.array,
    resetSelectedData: PropTypes.func,
    onSelect: PropTypes.func,
    dropdownOptions: PropTypes.array,
    showCodeMirror: PropTypes.func,

    // populated by redux
    setLastSaved: PropTypes.func,
    setSaveError: PropTypes.func,
    setHasJSONError: PropTypes.func,
    setLastSavedQuestions: PropTypes.func
  };

  getFormattedConfigurationDropdownOptions() {
    return this.props.dropdownOptions.map((dropdownOption, i) => {
      return this.renderMenuItem(
        () => this.props.onSelect(dropdownOption['id']),
        dropdownOption['text'],
        i
      );
    });
  }

  renderMenuItem(clickHandler, textToDisplay, key) {
    return (
      <MenuItem key={key} eventKey={key} onClick={clickHandler}>
        {textToDisplay}
      </MenuItem>
    );
  }

  // There's gotta be a cleaner way than what I'm doing here
  // Maybe a general "reset" redux action?
  initializeEmptyCodeMirror = () => {
    this.props.resetSelectedData();
    this.props.showCodeMirror();
    this.props.resetCodeMirror({});

    // From redux store
    this.props.setLastSaved(null);
    this.props.setSaveError(null);
    this.props.setHasJSONError(false);
    this.props.setLastSavedQuestions({});
  };

  render() {
    return (
      <div>
        <DropdownButton id="load_config" title="Load Form..." className="btn">
          {this.getFormattedConfigurationDropdownOptions()}
        </DropdownButton>
        <Button onClick={this.initializeEmptyCodeMirror} className="btn">
          New Form
        </Button>
      </div>
    );
  }
}

export default connect(
  null,
  dispatch => ({
    setLastSaved: lastSaved => dispatch(setLastSaved(lastSaved)),
    setSaveError: saveError => dispatch(setSaveError(saveError)),
    setHasJSONError: hasJSONError => dispatch(setHasJSONError(hasJSONError)),
    setLastSavedQuestions: questions =>
      dispatch(setLastSavedQuestions(questions))
  })
)(FoormLoadButtons);
