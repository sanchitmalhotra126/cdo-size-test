var msg = require('../locale');

var styles = {
  main: {
    display: 'inline'
  }
};

var Controls = React.createClass({
  propTypes: {
    imgUrl: React.PropTypes.string.isRequired,
    finishButton: React.PropTypes.bool.isRequired,
    submitButton: React.PropTypes.bool.isRequired,
    unsubmitButton: React.PropTypes.bool.isRequired,
  },

  render: function () {
    // TODO - are soft buttons used in applab?
    return (
      <div style={styles.main}>
        <div id="soft-buttons" className="soft-buttons-none">
          <button id="leftButton" disabled className="arrow">
            <img src={this.props.imgUrl} className="left-btn icon21"/>
          </button>
          <button id="rightButton" disabled className="arrow">
            <img src={this.props.imgUrl} className="right-btn icon21"/>
          </button>
          <button id="upButton" disabled className="arrow">
            <img src={this.props.imgUrl} className="up-btn icon21"/>
          </button>
          <button id="downButton" disabled className="arrow">
            <img src={this.props.imgUrl} className="down-btn icon21"/>
          </button>
        </div>
        {this.props.finishButton &&
          <div id="share-cell" className="share-cell-none">
            <button id="finishButton" className="share">
              <img src={this.props.imgUrl}/>
              {msg.finish()}
            </button>
          </div>
        }
        {this.props.submitButton &&
          <div id="share-cell" className="share-cell-none">
            <button id="submitButton" className="share">
              <img src={this.props.imgUrl}/>
              {msg.submit()}
            </button>
          </div>
        }
        {this.props.unsubmitButton &&
          <div id="share-cell" className="share-cell-enabled">
            <button id="unsubmitButton" className="share">
              <img src={this.props.imgUrl}/>
              {msg.unsubmit()}
            </button>
          </div>
        }
      </div>
    );
  }
});

module.exports = Controls;
