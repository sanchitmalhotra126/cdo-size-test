import PropTypes from 'prop-types';
import React from 'react';

const styles = {
  headerContainer: {
    position: 'relative',
    overflow: 'hidden',
    height: 40
  },
  headerInner: {
    position: 'absolute'
  },
  scriptLinkWithUpdatedAt: {
    display: 'block'
  },
  outerContainer: {
    textAlign: 'right'
  },
  containerWithUpdatedAt: {
    verticalAlign: 'bottom',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: 'inline-block'
  },
  headerVignetteRight: {
    position: 'absolute',
    width: '100%',
    height: 18,
    background:
      'linear-gradient(to right, rgba(0, 173, 188, 0) calc(100% - 20px), rgba(0, 173, 188, 1) 100%)'
  }
};

export default class HeaderFinish extends React.Component {
  static propTypes = {
    lessonData: PropTypes.object,
    width: PropTypes.number,
    setDesiredWidth: PropTypes.func
  };

  componentDidMount() {
    // Report back to our parent how wide we would like to be.
    const fullWidth = $('.header_finished').width();
    if (this.props.setDesiredWidth) {
      this.props.setDesiredWidth(fullWidth);
    }
  }

  componentDidUpdate() {
    // Report back to our parent how wide we would like to be.
    const fullWidth = $('.header_finished').width();
    this.props.setDesiredWidth(fullWidth);
  }

  shouldComponentUpdate(nextProps, nextState) {
    /*
    console.log(
      'HeaderFinish should',
      this.props,
      nextProps,
      this.state,
      nextState
    );
    */

    const lessonData = this.props.lessonData;

    return (
      this.props.width !== nextProps.width ||
      !!lessonData !== !!nextProps.lessonData ||
      lessonData.finishLink !== nextProps.lessonData.finishLink
    );
  }

  render() {
    const {lessonData} = this.props;

    const fullWidth = $('.header_finished').width();
    const actualWidth = this.props.width;

    const vignetteStyle =
      actualWidth < fullWidth ? styles.headerVignetteRight : null;

    console.log('HeaderFinish render', this.props.width);

    return (
      <div style={styles.headerContainer}>
        <div className="header_finished" style={styles.headerInner}>
          <div className="header_finished_link" style={styles.finishedLink}>
            <a href={lessonData.finishLink} title={lessonData.finishText}>
              {lessonData.finishText}
            </a>
          </div>
        </div>
        <div id="vignette" style={vignetteStyle} />
      </div>
    );
  }
}
