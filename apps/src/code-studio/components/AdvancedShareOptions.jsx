import React, {PropTypes} from 'react';
import Radium from 'radium';
import QRCode from 'qrcode.react';
import * as color from "../../util/color";
import {CIPHER, ALPHABET} from '../../constants';

const style = {
  nav: {
    ul: {
      borderBottom: '1px solid',
      borderColor: color.purple,
      marginTop: 0,
      marginLeft: 0,
      marginRight: 0,
      marginBottom: 10,
    },
    li: {
      display: 'inline-block',
      color: color.light_gray,
      fontSize: 'larger',
      fontWeight: 'bold',
      marginRight: 10,
      cursor: 'pointer',
    },
    selectedLi: {color:color.purple},
  },
  p: {
    fontSize: 'inherit',
    lineHeight: 'inherit',
    color: 'inherit',
  },
  root: {
    marginTop: 20,
  },
  expand: {
    color: color.purple,
    cursor: 'pointer',
    fontWeight: 'bold'
  },
  embedInput: {
    cursor: 'copy',
    width: 465,
    height: 80,
    margin: 0,
  },
  expoButton: {
    marginLeft: 0,
    marginRight: 20,
    width: 250,
  },
  expoContainer: {
    display: 'flex',
    flexDirection: 'column',
  },
  expoExportRow: {
    display: 'flex',
    alignItems: 'flex-start',
  },
  expoQRCodeRow: {
    height: 128,
  }
};

class AdvancedShareOptions extends React.Component {
  static propTypes = {
    shareUrl: PropTypes.string.isRequired,
    onClickExport: PropTypes.func,
    onClickExportExpo: PropTypes.func,
    onExpand: PropTypes.func.isRequired,
    expanded: PropTypes.bool.isRequired,
    i18n: PropTypes.object.isRequired,
    channelId: PropTypes.string.isRequired,
    embedOptions: PropTypes.shape({
      iframeHeight: PropTypes.number.isRequired,
      iframeWidth: PropTypes.number.isRequired,
    }).isRequired,
  };

  constructor(props) {
    super(props);
    this.state = {
      selectedOption: props.onClickExport ? 'export' : 'embed',
      exporting: false,
      exportingExpo: null,
      exportError: null,
      exportExpoError: null,
      embedWithoutCode: false,
    };
  }

  downloadExport = () => {
    this.setState({exporting: true});
    this.props.onClickExport().then(
      this.setState.bind(this, {exporting: false}),
      () => {
        this.setState({
          exporting: false,
          exportError: 'Failed to export project. Please try again later.'
        });
      }
    );
  };

  downloadExpoExport = () => this.expoExport({ mode: 'zip'});

  publishExpoExport = () => this.expoExport({ mode: 'publish'});

  expoExport = async (opts) => {
    this.setState({exportingExpo: opts.mode});
    try {
      const expoUri = await this.props.onClickExportExpo(opts);
      this.setState({
        exportingExpo: null,
        expoUri,
      });
    } catch (e) {
      this.setState({
        exportingExpo: null,
        exportExpoError: 'Failed to export project. Please try again later.',
      });
    }
  };

  renderEmbedTab() {
    let url = `${this.props.shareUrl}/embed`;
    if (this.state.embedWithoutCode) {
      // When embedding without code, we "hide" the real channel id for the
      // project by encoding it with a cipher. This is not meant to be secure,
      // it is just meant to make the bar slightly higher for people trying
      // to get to the original source.
      url = url.replace(
        this.props.channelId,
        this.props.channelId
          .split('')
          .map(char => CIPHER[ALPHABET.indexOf(char)] || char)
          .join('')
      ) + '?nosource';
    }
    const {iframeWidth, iframeHeight} = this.props.embedOptions;
    const iframeHtml =
      `<iframe width="${iframeWidth}" height="${iframeHeight}" style="border: 0px;" src="${url}"></iframe>`;
    return (
      <div>
        <p style={style.p}>
          {this.props.i18n.t('project.share_embed_description')}
        </p>
        <textarea
          type="text"
          onClick={(e) => e.target.select()}
          readOnly="true"
          value={iframeHtml}
          style={style.embedInput}
        />
        <label style={{display: 'flex'}}>
          <input
            type="checkbox"
            checked={this.state.embedWithoutCode}
            onChange={() => this.setState({embedWithoutCode: !this.state.embedWithoutCode})}
          />
          <span style={{marginLeft: 5}}>
            Hide ability to view code
          </span>
        </label>
      </div>
    );
  }

  renderExportTab() {
    const spinner = this.state.exporting ?
          <i className="fa fa-spinner fa-spin"></i> :
          null;
    // TODO: Make this use a nice UI component from somewhere.
    const alert = this.state.exportError ? (
      <div className="alert fade in">
        {this.state.exportError}
      </div>
    ) : null;

    return (
      <div>
        <p style={style.p}>
          Export your project as a zipped file, which will contain the
          HTML/CSS/JS files, as well as any assets, for your project.
          Note that data APIs will not work outside of Code Studio.
        </p>
        <button onClick={this.downloadExport} style={{marginLeft: 0}}>
          {spinner}
          Export
        </button>
        {alert}
      </div>
    );
  }

  renderExportExpoTab() {
    const { expoUri } = this.state;
    const exportSpinner = this.state.exportingExpo === 'zip' ?
          <i className="fa fa-spinner fa-spin"></i> :
          null;
    const publishSpinner = this.state.exportingExpo === 'publish' ?
          <i className="fa fa-spinner fa-spin"></i> :
          null;
    // TODO: Make this use a nice UI component from somewhere.
    const alert = this.state.exportExpoError ? (
      <div className="alert fade in">
        {this.state.exportExpoError}
      </div>
    ) : null;

    return (
      <div>
        <p style={style.p}>
          Export your project for use in Expo or as a zipped file for
          submission to an App Store. Your exported app will
          contain the HTML/CSS/JS files, as well as any assets, for your
          project. Note that data APIs will not work outside of Code Studio.
        </p>
        <div style={style.expoContainer}>
          <div style={style.expoExportRow}>
            <button onClick={this.downloadExpoExport} style={style.expoButton}>
              {exportSpinner}
              Export to Expo Zip
            </button>
          </div>
          <div style={[style.expoExportRow, style.expoQRCodeRow]}>
            <button onClick={this.publishExpoExport} style={style.expoButton}>
              {publishSpinner}
              Try in Expo App
            </button>
            {!!expoUri &&
              <QRCode value={expoUri} />
            }
          </div>
          {alert}
        </div>
      </div>
    );
  }

  render() {
    if (!this.state.selectedOption) {
      // no options are available. Render nothing.
      return null;
    }
    let optionsNav;
    let selectedOption;
    if (this.props.expanded) {
      let exportTab = null;
      let exportExpoTab = null;
      if (this.props.onClickExport) {
        exportTab = (
          <li
            style={[
              style.nav.li,
              this.state.selectedOption === 'export' && style.nav.selectedLi
            ]}
            onClick={() => this.setState({selectedOption: 'export'})}
          >
            Export
          </li>
        );
      }
      if (this.props.onClickExportExpo) {
        exportExpoTab = (
          <li
            style={[
              style.nav.li,
              this.state.selectedOption === 'exportExpo' && style.nav.selectedLi
            ]}
            onClick={() => this.setState({selectedOption: 'exportExpo'})}
          >
            Export to Expo
          </li>
        );
      }
      const embedTab = (
        <li
          style={[
            style.nav.li,
            this.state.selectedOption === 'embed' && style.nav.selectedLi
          ]}
          onClick={() => this.setState({selectedOption: 'embed'})}
        >
          {this.props.i18n.t('project.embed')}
        </li>
      );
      optionsNav = (
        <div>
          <ul style={style.nav.ul}>
            {exportTab}
            {exportExpoTab}
            {embedTab}
          </ul>
        </div>
      );
      switch (this.state.selectedOption) {
        case 'export':
          selectedOption = this.renderExportTab();
          break;
        case 'exportExpo':
          selectedOption = this.renderExportExpoTab();
          break;
        case 'embed':
          selectedOption = this.renderEmbedTab();
          break;
      }
    }
    const expand = this.props.expanded && this.state.selectedOption ? null :
          (
            <a onClick={this.props.onExpand} style={style.expand}>
              {this.props.i18n.t('project.advanced_share')}
            </a>
          );
    return (
      <div style={style.root}>
        {expand}
        {optionsNav}
        {selectedOption}
      </div>
    );
  }
}

export default Radium(AdvancedShareOptions);
