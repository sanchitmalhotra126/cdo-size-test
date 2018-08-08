/* eslint-disable react/no-is-mounted */
import React, {PropTypes} from 'react';
import AssetUploader from './AssetUploader';
import Button from "../../templates/Button";
import i18n from '@cdo/locale';
import {assetButtonStyles} from "./AssetManager";

const RecordButton = ({onSelectRecord}) => (
  <span>
    <Button
      onClick={onSelectRecord}
      id="record-asset"
      className="share"
      text={i18n.recordAudio()}
      icon="microphone"
      style={assetButtonStyles.button}
      size="large"
    />
  </span>
);

RecordButton.propTypes = {
  onSelectRecord: PropTypes.func,
};

/**
 * A component for the buttons that enable adding an asset to a project.
 */
export default class AddAssetButtonRow extends React.Component {
  static propTypes = {
    uploadsEnabled: PropTypes.bool.isRequired,
    allowedExtensions: PropTypes.string,
    useFilesApi: PropTypes.bool,
    onUploadStart: PropTypes.func.isRequired,
    onUploadDone: PropTypes.func.isRequired,
    onUploadError: PropTypes.func.isRequired,
    onSelectRecord: PropTypes.func.isRequired,
    statusMessage: PropTypes.string,
    // Temporary prop until recording audio is widely released
    recordEnabled: PropTypes.bool
  };

  render() {
    return (
      <div style={assetButtonStyles.buttonRow}>
        <AssetUploader
          uploadsEnabled={this.props.uploadsEnabled}
          allowedExtensions={this.props.allowedExtensions}
          useFilesApi={this.props.useFilesApi}
          onUploadStart={this.props.onUploadStart}
          onUploadDone={this.props.onUploadDone}
          onUploadError={this.props.onUploadError}
        />
        {this.props.recordEnabled && <RecordButton onSelectRecord={this.props.onSelectRecord}/>}
        <span id="manage-asset-status">
          {this.props.statusMessage}
        </span>
      </div>
    );
  }
}
