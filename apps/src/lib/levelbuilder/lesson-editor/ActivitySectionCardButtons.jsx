import React, {Component} from 'react';
import PropTypes from 'prop-types';
import TipWithTooltip from '@cdo/apps/lib/levelbuilder/lesson-editor/TipWithTooltip';
import AddLevelDialog from '@cdo/apps/lib/levelbuilder/lesson-editor/AddLevelDialog';
import AddResourceDialog from '@cdo/apps/lib/levelbuilder/lesson-editor/AddResourceDialog';
import EditTipDialog from '@cdo/apps/lib/levelbuilder/lesson-editor/EditTipDialog';

const styles = {
  bottomControls: {
    height: 30,
    display: 'flex',
    justifyContent: 'space-between'
  },
  addLevel: {
    fontSize: 14,
    background: '#eee',
    border: '1px solid #ddd',
    boxShadow: 'inset 0 1px 0 0 rgba(255, 255, 255, 0.8)',
    margin: '0 5px 0 0'
  }
};

export default class ActivitySectionCardButtons extends Component {
  static propTypes = {
    activitySection: PropTypes.object,
    addTip: PropTypes.func,
    editTip: PropTypes.func,
    addLevel: PropTypes.func
  };

  constructor(props) {
    super(props);

    this.state = {
      addTipOpen: false,
      editingExistingTip: false,
      addResourceOpen: false,
      addLevelOpen: false,
      tipToEdit: {type: 'teachingTip', markdown: ''}
    };
  }

  handleOpenAddLevel = () => {
    this.setState({addLevelOpen: true});
  };

  handleCloseAddLevel = () => {
    this.setState({addLevelOpen: false});
  };

  handleEditTip = tip => {
    this.setState({tipToEdit: tip, addTipOpen: true, editingExistingTip: true});
  };

  handleOpenAddTip = () => {
    this.setState({
      tipToEdit: {
        key: `tip-${Math.floor(Math.random() * 100)}`,
        type: 'teachingTip',
        markdown: ''
      },
      addTipOpen: true
    });
  };

  handleCloseAddTip = tip => {
    if (!this.state.editingExistingTip) {
      this.props.addTip(tip);
    }
    this.setState({addTipOpen: false, editingExistingTip: false});
  };

  handleOpenAddResource = () => {
    this.setState({addResourceOpen: true});
  };

  handleCloseAddResource = () => {
    this.setState({addResourceOpen: false});
  };

  render() {
    return (
      <div>
        <div style={styles.bottomControls}>
          <span>
            <button
              onMouseDown={this.handleOpenAddLevel}
              className="btn"
              style={styles.addLevel}
              type="button"
            >
              <i style={{marginRight: 7}} className="fa fa-plus-circle" />
              Add Level
            </button>
            <button
              onMouseDown={this.handleOpenAddTip}
              className="btn"
              style={styles.addLevel}
              type="button"
            >
              <i style={{marginRight: 7}} className="fa fa-plus-circle" />
              Add Tip
            </button>
            <button
              onMouseDown={this.handleOpenAddResource}
              className="btn"
              style={styles.addLevel}
              type="button"
            >
              <i style={{marginRight: 7}} className="fa fa-plus-circle" />
              Add Resource Link
            </button>
          </span>
          {this.props.activitySection.tips.length > 0 && (
            <span>
              {this.props.activitySection.tips.map(tip => {
                return (
                  <TipWithTooltip
                    tip={tip}
                    key={tip.key}
                    onClick={this.handleEditTip}
                  />
                );
              })}
            </span>
          )}
        </div>
        <AddResourceDialog
          isOpen={this.state.addResourceOpen}
          handleConfirm={this.handleCloseAddResource}
        />
        <EditTipDialog
          isOpen={this.state.addTipOpen}
          handleConfirm={this.handleCloseAddTip}
          tip={this.state.tipToEdit}
        />
        <AddLevelDialog
          isOpen={this.state.addLevelOpen}
          handleConfirm={this.handleCloseAddLevel}
          currentLevels={this.props.activitySection.levels}
          addLevel={this.props.addLevel}
        />
      </div>
    );
  }
}
