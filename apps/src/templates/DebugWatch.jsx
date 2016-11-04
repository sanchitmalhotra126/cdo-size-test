import React from 'react';
import Immutable from 'immutable';
import {connect} from 'react-redux';
import i18n from '@cdo/locale';
import {add, update, remove} from '../redux/watchedExpressions';
import TetherComponent from 'react-tether';
import onClickOutside from 'react-onclickoutside';

const WATCH_VALUE_NOT_RUNNING = "undefined";
const DEFAULT_AUTOCOMPLETE_OPTIONS = [
  'Game.mouseX',
  'Game.mouseY',
  'Game.frameRate',
  'Game.frameCount',
  'camera.x',
  'camera.y',
  'sprite.x',
  'sprite.y',
  'sprite.velocityX',
  'sprite.velocityY',
  'sprite.width',
  'sprite.height',
];

const buttonSize = '34px';
const inputValueWidth = 159;
const autocompletePanelWidth = 163;
const inputElementHeight = 29;

const styles = {
  watchContainer: {
    width: '100%',
    height: '100%'
  },
  autocompletePanel: {
    width: autocompletePanelWidth,
    height: 'initial',
    background: 'white',
    color: '#808080',
    border: '1px gray solid',
    padding: 0,
    marginTop: -2,
    marginLeft: -1
  },
  autocompleteOption: {
    cursor: 'pointer',
    margin: 0,
    padding: 4
  },
  watchRemoveButton: {
    fontSize: 23,
    float: 'right',
    cursor: 'pointer',
    width: buttonSize,
    lineHeight: buttonSize,
    height: buttonSize,
    textAlign: 'center',
    backgroundColor: '#be0712',
    color: 'white',
    margin: 0,
    padding: 0
  },
  watchAddButton: {
    fontSize: 20,
    width: buttonSize,
    lineHeight: buttonSize,
    height: buttonSize,
    textAlign: 'center',
    float: 'right',
    cursor: 'pointer',
    backgroundColor: '#1e93cd',
    color: 'white',
    margin: 0,
    padding: 0
  },
  watchValue: {
    whiteSpace: 'nowrap',
    height: buttonSize,
    lineHeight: buttonSize,
    marginLeft: 3,
    overflow: 'scroll',
    width: inputValueWidth,
  },
  watchInputSection: {
    clear: 'both'
  },
  watchInput: {
    width: inputValueWidth,
    marginTop: 0,
    height: inputElementHeight,
    fontFamily: 'monospace',
    fontSize: '12px'
  }
};

const AutocompleteSelector = onClickOutside(React.createClass({
  getInitialState() {
    return {
      selectedOption: this.props.options.length - 1
    };
  },

  handleClickOutside() {
    this.props.onClickOutside();
  },

  render() {
    // If we ever want to highlight range of matches:
    // http://stackoverflow.com/a/2295681

    return (
      <div
        id="autocomplete-panel"
        style={styles.autocompletePanel}
      >
        {this.props.options.map((option, index) => {
          const isSelected = index === this.props.currentIndex;
          const selectedStyle = {
            backgroundColor: '#cad6fa',
            color: 'black'
            };
          return (
            <div
              key={option}
              onClick={(e) => this.props.onOptionClicked(option, e)}
              onMouseOver={() => this.props.onOptionHovered(index)}
              style={Object.assign({}, styles.autocompleteOption, isSelected ? selectedStyle : {})}
            >
              {option}
            </div>
          );
        })}
      </div>
    );
  },

  propTypes: {
    currentText: React.PropTypes.string,
    currentIndex: React.PropTypes.number,
    options: React.PropTypes.arrayOf(React.PropTypes.string),
    onOptionClicked: React.PropTypes.func,
    onOptionHovered: React.PropTypes.func,
    onClickOutside: React.PropTypes.func
  }
}));

/**
 * A "watchers" window for our debugger.
 */
const DebugWatch = React.createClass({
  propTypes: {
    debugButtons: React.PropTypes.bool,
    isRunning: React.PropTypes.bool,
    watchedExpressions: React.PropTypes.instanceOf(Immutable.List),
    add: React.PropTypes.func.isRequired,
    update: React.PropTypes.func.isRequired,
    remove: React.PropTypes.func.isRequired,
  },

  getInitialState: function () {
    return {
      text: "",
      history: [],
      editing: false,
      autocompleteSelecting: false,
      autocompleteOpen: false,
      autocompleteIndex: 0,
      autocompleteOptions: DEFAULT_AUTOCOMPLETE_OPTIONS,
      historyIndex: -1
    };
  },

  // http://stackoverflow.com/a/7390612
  nonValueDescriptor(obj) {
    return {}.toString.call(obj).split(' ')[1].slice(0, -1).toLowerCase();
  },

  /**
   * Gets text to display for given value
   * @param obj
   * @returns {*}
   */
  renderValue(obj) {
    if (!this.props.isRunning) {
      return (<span className="watch-value">{WATCH_VALUE_NOT_RUNNING}</span>);
    }

    const descriptor = this.nonValueDescriptor(obj);
    const isError = obj instanceof Error;

    if (isError) {
      return (
        <span className="watch-value watch-unavailable">
          {i18n.debugWatchNotAvailable()}
        </span>
      );
    }

    switch (descriptor) {
      case 'null':
      case 'undefined':
        return <span className="watch-value">{descriptor}</span>;
      case 'regexp':
        return <span className="watch-value">[regexp]</span>;
      case 'array':
        return <span className="watch-value">[array]</span>;
      case 'function':
        // [function MyFunctionName]
        return (
          <span className="watch-value">
            {`[${obj.toString().match(/(.*)\(/)[1]}]`}
          </span>
        );
      default:
        return <span className="watch-value">{obj.toString()}</span>;
    }
  },

  scrollToBottom() {
    this.refs.scrollableContainer.scrollTop = this.refs.scrollableContainer.scrollHeight;
  },

  addButtonClick() {
    if (this.state.text === '') {
      this.setState({
        autocompleteOpen: true
      });
    } else {
      this.addFromInput();
    }
  },

  addFromInput(inputText = this.state.text) {
    if (inputText === '') {
      return;
    }
    this.props.add(inputText);
    this.setState({
      history: [inputText].concat(this.state.history),
      editing: false,
      historyIndex: -1,
      text: ''
    }, () => {
      this.scrollToBottom();
      this.filterOptions();
    });
  },

  closeAutocomplete() {
    this.setState({
      editing: false,
      autocompleteSelecting: false,
      autocompleteOpen: false
    });
  },

  clearInput() {
    this.setState({
      editing: false,
      text: '',
    }, () => {
      this.filterOptions();
      this.setState({editing: true});
    });
  },

  selectHistoryIndex(historyIndex) {
    this.setState({
      editing: false,
      text: this.state.history[historyIndex],
      historyIndex: historyIndex,
      autocompleteSelecting: false,
      autocompleteOpen: false,
    }, () => {
      this.filterOptions();
      this.setState({editing: true,});
    });
  },

  selectAutocompleteIndex(autocompleteIndex) {
    this.setState({
      autocompleteSelecting: true,
      autocompleteIndex: autocompleteIndex
    });
  },

  historyDown() {
    const historyIndex = this.wrapValue(this.state.historyIndex - 1, this.state.history.length);
    this.selectHistoryIndex(historyIndex);
  },

  historyUp() {
    const atTopmostHistoryItem = this.state.historyIndex === this.state.history.length - 1;
    if (atTopmostHistoryItem) {
      return;
    }

    const historyIndex = this.wrapValue(this.state.historyIndex + 1, this.state.history.length);
    this.selectHistoryIndex(historyIndex);
  },

  autocompleteDown() {
    this.selectAutocompleteIndex(this.wrapValue(this.state.autocompleteIndex + 1, this.state.autocompleteOptions.length));
  },

  autocompleteUp() {
    this.selectAutocompleteIndex(this.wrapValue(this.state.autocompleteIndex - 1, this.state.autocompleteOptions.length));
  },

  onKeyDown(e) {
    if (e.key === 'Enter') {
      if (this.state.autocompleteOpen && this.state.autocompleteSelecting) {
        this.addFromInput(this.state.autocompleteOptions[this.state.autocompleteIndex]);
      } else {
        this.addFromInput();
      }
    }
    if (e.key === 'Escape') {
      this.closeAutocomplete();
    }

    if (e.key === 'ArrowUp') {
      if (this.state.autocompleteOpen) {
        this.autocompleteUp();
      } else if (this.state.history.length > 0) {
        this.historyUp();
      }
      e.preventDefault();
    }
    if (e.key === 'ArrowDown') {
      if (this.state.autocompleteOpen) {
        this.autocompleteDown();
      } else if (this.navigatingHistory()) {
        const atFirstHistoryItem = this.state.historyIndex === 0;
        if (atFirstHistoryItem) {
          this.setState({historyIndex: -1}, () => this.clearInput());
        } else {
          this.historyDown();
        }
      }
      e.preventDefault();
    }
  },

  navigatingHistory() {
    return this.state.historyIndex >= 0;
  },

  wrapValue(index, length) {
    return (index + length) % length;
  },

  handleClickOutside() {
    this.closeAutocomplete();
  },

  resetAutocomplete() {
    this.setState({
      autocompleteIndex: 0,
      historyIndex: -1,
      autocompleteSelecting: false
    });
  },

  componentDidUpdate(_, prevState) {
    if (prevState.text !== this.state.text) {
      //this.filterOptions();
    }
    if (prevState.autocompleteOpen && !this.state.autocompleteOpen) {
      this.resetAutocomplete();
    }
  },

  filterOptions() {
    const text = this.state.text;
    const filteredOptions = DEFAULT_AUTOCOMPLETE_OPTIONS.filter((option) => option.match(new RegExp(text, 'i')));
    const completeMatch = filteredOptions.length === 1 && filteredOptions[0] === text;
    const navigatingHistory = this.state.historyIndex >= 0;
    const historyTextModified = navigatingHistory && this.state.history[this.state.historyIndex] !== text;
    this.setState({
      autocompleteIndex: this.state.autocompleteIndex > filteredOptions.length ? 0 : this.state.autocompleteIndex,
      autocompleteOptions: filteredOptions,
      autocompleteOpen: text.length && filteredOptions.length && !completeMatch && (!navigatingHistory || historyTextModified)
    });
  },

  onAutocompleteOptionClicked(text, e) {
    this.addFromInput(text);
    e.preventDefault();
  },

  onChange(e) {
    this.setState({
      text: e.target.value
    }, () => {
      this.filterOptions();
    });
  },

  render() {
    return (
      <div
        id="debugger-watch-container"
        style={styles.watchContainer}
      >
        <div id="debug-watch" ref="scrollableContainer" className="debug-watch">
          {
            this.props.watchedExpressions.map(wv => {
              const varName = wv.get('expression');
              const varValue = wv.get('lastValue');
              return (
              <div className="debug-watch-item" key={wv.get('uuid')}>
                <div
                  style={styles.watchRemoveButton}
                  onClick={()=> this.props.remove(wv.get('expression'))}
                >
                  ×
                </div>
                <div
                  style={styles.watchValue}
                >
                  <span className="watch-variable">{varName}</span>
                  <span className="watch-separator">: </span>
                  {this.renderValue(varValue)}
                </div>
              </div>
                );
              })
            }
          <div style={styles.watchInputSection}>
            <div
              style={styles.watchAddButton}
              onClick={()=>this.addButtonClick()}
            >
              +
            </div>
            <TetherComponent
              attachment="top center"
              constraints={[{
                to: 'scrollParent',
                attachment: 'together'
              }]}
            >
              <input
                placeholder="Variable / Property"
                ref="debugInput"
                onKeyDown={this.onKeyDown}
                onChange={this.onChange}
                onClick={() => this.setState({autocompleteOpen: true})}
                value={this.state.text}
                style={styles.watchInput}
              />
              {this.state.autocompleteOpen &&
              <AutocompleteSelector
                options={this.state.autocompleteOptions}
                currentIndex={this.state.autocompleteSelecting ? this.state.autocompleteIndex : -1}
                currentText={this.state.text}
                onOptionClicked={this.onAutocompleteOptionClicked}
                onOptionHovered={(index) => this.setState({
                  autocompleteSelecting: true,
                  autocompleteIndex: index
                })}
                onClickOutside={this.closeAutocomplete}
              />}
            </TetherComponent>
          </div>
        </div>
      </div>
    );
  }
});

export default connect(state => {
  return {
    watchedExpressions: state.watchedExpressions,
    isRunning: state.runState.isRunning
  };
}, dispatch => {
  return {
    add(expression) {
      dispatch(add(expression));
    },
    update(expression, value) {
      dispatch(update(expression, value));
    },
    remove(expression) {
      dispatch(remove(expression));
    },
  };
})(DebugWatch);
