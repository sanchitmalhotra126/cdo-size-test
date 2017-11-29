/**
 * @fileoverview Constants used in application dashboard components.
 */

import color from '@cdo/apps/util/color';

/**
 * Mapping of application statuses to their background and text colors.
 */
exports.StatusColors = {
  'unreviewed': {
    backgroundColor: color.charcoal,
    color: color.white
  },
  'pending': {
    backgroundColor: color.lighter_orange,
    color: color.black
  },
  'interview': {
    backgroundColor: color.orange,
    color: color.black
  },
  'waitlisted': {
    backgroundColor: color.level_passed,
    color: color.black
  },
  'accepted': {
    backgroundColor: color.level_perfect,
    color: color.black
  },
  'declined': {
    backgroundColor: color.red,
    color: color.white
  },
  'withdrawn': {
    backgroundColor: color.lightest_red,
    color: color.black
  }
};

/**
 * Valid statuses for Applications.
 */
exports.ApplicationStatuses = {
  'teacher': [
    'Unreviewed',
    'Pending',
    'Waitlisted',
    'Accepted',
    'Declined',
    'Withdrawn'
  ],
  'facilitator': [
    'Unreviewed',
    'Pending',
    'Interview',
    'Waitlisted',
    'Accepted',
    'Declined',
    'Withdrawn'
  ]
};

/**
 * Constants for Regional Partner dropdown
 */
const allPartners = "All Regional Partner Applications";
exports.AllPartners = allPartners;
exports.RegionalPartnerDropdownOptions = {
  unmatched: {value: "unmatched", label: "No Partner/Unmatched Applications"},
  all: {value: "all", label: allPartners}
};

