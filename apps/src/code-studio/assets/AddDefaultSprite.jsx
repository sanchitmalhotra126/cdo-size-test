import React from 'react';
import PropTypes from 'prop-types';
import Button from '@cdo/apps/templates/Button';

export default class AddDefaultSprite extends React.Component {
  static propTypes = {
    onAdd: PropTypes.func.isRequired
  };

  state = {
    spriteName: '',
    spriteCategory: '',
    displaySuccess: false
  };

  handleNameChange = event => {
    this.setState({spriteName: event.target.value, displaySuccess: false});
  };

  handleCategoryChange = event => {
    this.setState({spriteCategory: event.target.value, displaySuccess: false});
  };

  handleSpriteAdd = addToBeginning => {
    this.props.onAdd(
      addToBeginning,
      this.state.spriteName,
      this.state.spriteCategory
    );
    this.setState({spriteName: '', spriteCategory: '', displaySuccess: true});
  };

  render() {
    let {displaySuccess} = this.state;
    return (
      <div style={styles.assetRow}>
        <h4>Add a sprite: </h4>
        <label htmlFor="sprite-path" style={styles.addSpriteLabel}>
          Sprite name:
        </label>
        <input
          type="text"
          id="sprite-name"
          name="name"
          onChange={this.handleNameChange}
          required
        />
        <label htmlFor="sprite-path" style={styles.addSpriteLabel}>
          Sprite category path:
        </label>
        <input
          type="text"
          id="sprite-path"
          name="path"
          onChange={this.handleCategoryChange}
          required
        />
        <Button
          text="Add to start"
          color={Button.ButtonColor.orange}
          onClick={() => this.handleSpriteAdd(true)}
          size={Button.ButtonSize.narrow}
        />
        <Button
          text="Add to end"
          color={Button.ButtonColor.orange}
          onClick={() => this.handleSpriteAdd(false)}
          size={Button.ButtonSize.narrow}
        />
        <i
          style={{
            ...styles.checkmark,
            visibility: displaySuccess ? 'visible' : 'hidden'
          }}
          className="fa fa-check"
          aria-hidden="true"
        />
      </div>
    );
  }
}

const styles = {
  assetRow: {
    borderTop: '1px solid gray',
    display: 'flex',
    justifyContent: 'flex-start',
    alignItems: 'center'
  },
  addSpriteLabel: {
    padding: 10
  },
  checkmark: {
    color: 'lightgreen',
    fontSize: 18,
    left: 5,
    lineHeight: '25px',
    position: 'relative',
    top: 7
  }
};
