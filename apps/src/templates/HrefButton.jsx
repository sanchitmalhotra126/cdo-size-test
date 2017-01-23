/**
 * This component is a button that navigates to a particular URL when clicked.
 * It shares some styles with Button.jsx. Longterm, these might be able to be
 * merged. One significant difference here is that we use a form/input to
 * navigate. This apparently makes it easier to screen readers to deal with.
 */

import React from 'react';
import { BUTTON_TYPES } from './Button';

const styles = {
  form: {
    marginBottom: 0,
    display: 'inline-block'
  },
  input: {
    fontSize: 18,
    height: 40,
    paddingBottom: 4,
    paddingTop: 4,
    paddingLeft: 12,
    paddingRight: 12,
    whitespace: 'pre',
    borderStyle: 'solid',
    borderWidth: 1,
    borderRadius: 4
  }
};

const HrefButton = ({href, text, type, style}) => (
  <form
    style={{...styles.form, ...style}}
    method="get"
    action={href}
  >
    <input
      style={{...styles.input, ...BUTTON_TYPES[type].style}}
      type="submit"
      value={text}
    />
  </form>
);

HrefButton.propTypes = {
  href: React.PropTypes.string.isRequired,
  text: React.PropTypes.string.isRequired,
  type: React.PropTypes.oneOf(Object.keys(BUTTON_TYPES)),
  style: React.PropTypes.object
};

export default HrefButton;
