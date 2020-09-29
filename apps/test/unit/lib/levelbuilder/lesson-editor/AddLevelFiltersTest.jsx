import React from 'react';
import {shallow} from 'enzyme';
import {expect} from '../../../../util/reconfiguredChai';
import AddLevelFilters from '@cdo/apps/lib/levelbuilder/lesson-editor/AddLevelFilters';

describe('AddLevelFilters', () => {
  let defaultProps;
  beforeEach(() => {
    defaultProps = {};
  });

  it('renders default props', () => {
    const wrapper = shallow(<AddLevelFilters {...defaultProps} />);
    expect(wrapper.contains('By Name:')).to.be.true;
    expect(wrapper.contains('By Type:')).to.be.true;
    expect(wrapper.contains('By Script:')).to.be.true;
    expect(wrapper.contains('By Owner:')).to.be.true;
    expect(wrapper.find('input').length).to.equal(1);
    expect(wrapper.find('select').length).to.equal(3);
    expect(wrapper.find('Button').length).to.equal(1);
  });
});
