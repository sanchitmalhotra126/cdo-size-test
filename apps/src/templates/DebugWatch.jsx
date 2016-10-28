import React from 'react';
import Immutable from 'immutable';
import {connect} from 'react-redux';
import i18n from '@cdo/locale';
import {add, update, remove} from '../redux/watchedExpressions'

const WATCH_TIMER_PERIOD = 50;
const WATCH_VALUE_NOT_RUNNING = "undefined";

/**
 * A "watchers" window for our debugger.
 */
const DebugWatch = React.createClass({
  propTypes: {
    debugButtons: React.PropTypes.bool,
    isRunning: React.PropTypes.bool,
    watchedExpressions: React.PropTypes.instanceOf(Immutable.List)
  },

  getInitialState : function() {
    return {
      text : "",
      history : [],
      editing : false,
    };
  },

  componentDidMount() {
    this.wasRunning = null;
    this.intervalId_ = setInterval(() => {
      const justStoppedRunning = this.wasRunning && !this.props.isRunning;
      this.wasRunning = this.props.isRunning;

      if (!this.props.isRunning) {
        if (justStoppedRunning) {
          this.props.watchedExpressions.map(we => this.props.dispatch(update(we.get('expression'), WATCH_VALUE_NOT_RUNNING)));
        }
        return;
      }

      this.props.watchedExpressions.map(we => {
        if (window.tempJSInterpreter) {
          const currentValue = window.tempJSInterpreter.evaluateWatchExpression(we.get('expression'));
          this.props.dispatch(update(we.get('expression'), currentValue));
        }
      });
    }, WATCH_TIMER_PERIOD);
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
    const descriptor = this.nonValueDescriptor(obj);
    const isError = obj instanceof Error;

    if (isError) {
      return <span
        className="watch-value watch-unavailable">{i18n.debugWatchNotAvailable()}</span>;
    }

    switch(descriptor) {
      case 'null':
      case 'undefined':
        return <span className="watch-value">{descriptor}</span>;
      case 'regexp':
        return <span className="watch-value">[regexp]</span>;
      case 'array':
        return <span className="watch-value">[array]</span>;
      case 'function':
        // [function MyFunctionName]
        return <span className="watch-value">{`[${obj.toString().match(/(.*)\(/)[1]}]`}</span>;
      default:
        return <span className="watch-value">{obj.toString()}</span>;
    }
  },

  scrollToBottom() {
    window.requestAnimationFrame(() => {
      this.refs.scrollableContainer.scrollTop = this.refs.scrollableContainer.scrollHeight;
    })
  },

  addFromInput() {
    const inputText = this.state.text;
    this.props.dispatch(add(inputText));
    this.setState({
      history: this.state.history.concat(inputText)
    });
    this.setState({
      editing: false,
      text: ''
    });
    this.refs.debugInput.focus();
    this.forceUpdate();
    this.scrollToBottom();
  },

  onKeyDown(e) {
    if (e.key === 'Enter') {
      this.addFromInput();
    }
    if (e.key === 'Escape') {
      this.setState({
        editing: false,
      });
    }
    if (e.key === 'ArrowUp') {
      this.setState({
        editing: false,
        text: this.state.history[this.state.history.length - 1]
      });
      this.setState({
        editing: true
      });
      e.preventDefault();
    }
    if (e.key === 'ArrowDown') {
      this.setState({
        editing: false,
        text: ''
      });
      this.setState({
        editing: true
      });
      e.preventDefault();
    }
  },

  onChange(e) {
    this.setState({
      text: e.target.value,
    });
  },

  render() {
    let classes = 'debug-watch';
    return (
        <div id="debugger-watch-container" style={{
          width: '100%',
          height: '100%'
        }}>
          <div id="debug-watch" ref="scrollableContainer" className={classes}>
            {
                this.props.watchedExpressions.map(wv => {
                    const varName = wv.get('expression');
                    const varValue = wv.get('lastValue');
                    return (
                    <div className="debug-watch-item" key={wv.get('uuid')}>
                      <div
                          style={{
                            fontSize: '18px',
                            float: 'right',
                            cursor: 'pointer',
                            width: '25px',
                            backgroundColor: '#be0712',
                            color: 'white',
                            padding: '6px',
                            paddingRight: '0px',
                            paddingLeft: '10px'
                          //  style="font-size: 18px;
                          // float: right;
                          // width: 25px;
                          // background-color: red;
                          // color: white;
                          // padding: 6px;padding-right: 0px;padding-left: 10px;"
                          }}
                          onClick={()=>this.props.dispatch(remove(wv.get('expression')))}>
                        x
                      </div>
                      <div style={{
                        float: 'left',
                        marginTop: '7px',
                        marginLeft: '2px',
                        whiteSpace: 'nowrap',
                        overflow: 'scroll',
                        width: '160px',
                        height: '21px',
                      }}>
                        <span
                            className="watch-variable">{varName}</span>
                        <span
                            className="watch-separator">: </span>
                        {this.renderValue(varValue)}
                      </div>
                    </div>
                        );
                    })
                }
            <div style={{clear: 'both'}}>
              <div
                  style={{
                            fontSize: '18px',
                            float: 'right',
                            cursor: 'pointer',
                            width: '25px',
                            backgroundColor: '#1e93cd',
                            color: 'white',
                            padding: '6px',
                            paddingRight: '0px',
                            paddingLeft: '10px'
                          }}
                  onClick={()=>this.addFromInput()}>
                +
              </div>
              <input
                  ref="debugInput"
                  placeholder="Variable / Property"
                  onKeyDown={this.onKeyDown}
                  onChange={this.onChange}
                  value={this.state.text}
                  style={{
                    width: '159px',
                    marginTop: '0px',
                    height: '25px',
                  }}
              >
              </input>
            </div>
          </div>
          <div id="autocomplete-panel" style={{
              display: 'none',
              width: '200px',
              height: '200px',
              position: 'absolute',
              background: 'gray',
              right: '-10px',
              bottom: '76px',
          }}>
            <div className="autocomplete-option">Option 1</div>
            <div className="autocomplete-option">Option 2</div>
            <div className="autocomplete-option">Option 3</div>
          </div>
        </div>
    );
  }
});

export default connect(state => {
  return {
    watchedExpressions: state.watchedExpressions,
    isRunning: state.runState.isRunning,
  };
})(DebugWatch);

