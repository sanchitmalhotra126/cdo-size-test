import React, { PropTypes } from 'react';
import ProgressBubbleSet from './ProgressBubbleSet';
import color from "@cdo/apps/util/color";
import i18n from '@cdo/locale';
import { connect } from 'react-redux';
import { lessonNames, statusByStage, urlsByStage } from '@cdo/apps/code-studio/progressRedux';

const lighterBorder = color.border_light_gray;

const styles = {
  table: {
    borderWidth: 1,
    borderStyle: 'solid',
    borderLeftColor: color.border_gray,
    borderTopColor: color.border_gray,
    borderRightColor: lighterBorder,
    borderBottomColor: lighterBorder,
    float: 'left'
  },
  headerRow: {
    backgroundColor: color.table_header,
  },
  lightRow: {
    backgroundColor: color.table_light_row
  },
  darkRow: {
    backgroundColor: color.table_dark_row
  },
  col1: {
    width: 200,
    minWidth: 200,
    maxWidth: 200,
    lineHeight: '52px',
    color: color.charcoal,
    letterSpacing: -0.11,
    whiteSpace: 'nowrap',
    paddingLeft: 20,
    paddingRight: 20,
    borderRightWidth: 1,
    borderRightColor: lighterBorder,
    borderRightStyle: 'solid',
  },
  col2: {
    width: '100%',
    paddingLeft: 20,
    paddingRight: 20
  },
  colText: {
    color: color.charcoal,
    fontFamily: '"Gotham 5r", sans-serif',
    fontSize: 12,
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  }
};

const ProgressTable = React.createClass({
  propTypes: {
    lessonNames: PropTypes.arrayOf(PropTypes.string).isRequired,
    statusByStage: PropTypes.arrayOf(
      PropTypes.arrayOf(PropTypes.string)
    ).isRequired,
    urlsByStage: PropTypes.arrayOf(
      PropTypes.arrayOf(PropTypes.string)
    ).isRequired
  },
  componentDidMount() {
    // TODO - This modifies things outside of our scope. This is done right now
    // because we only want to modify this (dashboard-owned) markup in the case
    // where an experiment is enabled (leading to this component being rendered).
    // Once we're not behind an experiment, we should make these changes elsewhere.
    const padding = 80;
    $(".container.main").css({
      width: 'initial',
      maxWidth: 940 + 2 * padding,
      paddingLeft: padding,
      paddingRight:padding
    });
  },

  render() {
    const { lessonNames, statusByStage, urlsByStage } = this.props;
    return (
      <table style={styles.table}>
        <thead>
          <tr style={styles.headerRow}>
            <td style={styles.col1}>
              <div style={styles.colText}>{i18n.lessonName()}</div>
            </td>
            <td style={styles.col2}>
              <div style={styles.colText}>{i18n.yourProgress()}</div>
            </td>
          </tr>
        </thead>
        <tbody>
          {
            lessonNames.map((lessonName, index) => (
              <tr
                key={index}
                style={{
                  ...((index % 2 === 0) && styles.lightRow),
                  ...((index % 2 === 1) && styles.darkRow)
                }}
              >
                <td style={styles.col1}>
                  <div style={styles.colText}>
                    {`${index + 1}. ${lessonName}`}
                  </div>
                </td>
                <td style={styles.col2}>
                  <ProgressBubbleSet
                    startingNumber={1}
                    statuses={statusByStage[index]}
                    urls={urlsByStage[index]}
                  />
                </td>
              </tr>
            ))
          }
        </tbody>

      </table>
    );
  }
});

export default connect(state => ({
  lessonNames: lessonNames(state.progress),
  statusByStage: statusByStage(state.progress),
  urlsByStage: urlsByStage(state.progress)
}))(ProgressTable);
