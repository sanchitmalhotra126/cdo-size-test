import React, {Component, PropTypes} from 'react';
import i18n from '@cdo/locale';
import $ from 'jquery';
import {pegasus} from '@cdo/apps/lib/util/urlHelpers';
import color from "../../util/color";

const styles = {
  main: {
    margin: 0
  },
  actionText: {
    fontSize: 14,
    fontFamily: '"Gotham", sans-serif',
    color: color.charcoal,
  },
};

export default class PrintCertificates extends Component {
  static propTypes = {
    sectionId: PropTypes.number.isRequired,
    assignmentName: PropTypes.string,
  };

  state = {
    names: [],
  };

  onClickPrintCerts = () => {
    $.ajax(`/v2/sections/${this.props.sectionId}/students`).done(result => {
      const names = result.map(student => student.name);
      this.setState({names}, this.submitForm);
    });
  };

  submitForm = () => {
    this.certForm.submit();
  };

  render() {
    return (
      <form
        style={styles.main}
        ref={element => this.certForm = element}
        action={pegasus('/certificates')}
        method="POST"
      >
        <input type="hidden" name="script" defaultValue={this.props.assignmentName}/>
        {this.state.names.map((name, index) => (
          <input key={index} type="hidden" name="names[]" value={name}/>
        ))}
        <div style={styles.actionText} onClick={this.onClickPrintCerts}>
          {i18n.printCertificates()}
        </div>
      </form>
    );
  }
}
