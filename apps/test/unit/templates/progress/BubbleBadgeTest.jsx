import React from 'react';
import {mount} from 'enzyme';
import BubbleBadge from '@cdo/apps/templates/progress/BubbleBadge';
import {expect} from '../../../util/reconfiguredChai';
import color from '@cdo/apps/util/color';

describe('BubbleBadge', () => {
  it('has a purple background when type is assessment', () => {
    const wrapper = mount(<BubbleBadge type="assessment" />);
    expect(wrapper.find({icon: 'circle'}).props().style.color).to.equal(
      color.purple
    );
  });

  it('has a check icon when type is assessment', () => {
    const wrapper = mount(<BubbleBadge type="assessment" />);
    expect(wrapper.find({icon: 'check'})).to.have.length(1);
  });

  it('has a red background when type is keepWorking', () => {
    const wrapper = mount(<BubbleBadge type="keepWorking" />);
    expect(wrapper.find({icon: 'circle'}).props().style.color).to.equal(
      color.red
    );
  });

  it('has a exclamation icon when type is keepWorking', () => {
    const wrapper = mount(<BubbleBadge type="keepWorking" />);
    expect(wrapper.find({icon: 'exclamation'})).to.have.length(1);
  });

  it('positions the icon correctly if isDiamond is true', () => {
    const wrapper = mount(<BubbleBadge type="assessment" isDiamond={true} />);
    expect(wrapper.find('.fa-stack').props().style.top).to.equal(-13);
    expect(wrapper.find('.fa-stack').props().style.right).to.equal(-17);
  });
});
