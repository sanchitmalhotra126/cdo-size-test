import React from 'react';
import {shallow, mount} from 'enzyme';
import {expect} from '../../../util/reconfiguredChai';
import CollapsibleEditorSection from '@cdo/apps/lib/levelbuilder/CollapsibleEditorSection';

describe('CollapsibleEditorSection', () => {
  let defaultProps;
  beforeEach(() => {
    defaultProps = {
      title: 'Section Title'
    };
  });

  it('renders default props', () => {
    const wrapper = shallow(
      <CollapsibleEditorSection {...defaultProps}>
        <span>Child</span>
      </CollapsibleEditorSection>
    );
    expect(wrapper.contains('Section Title'));
    expect(wrapper.contains('Child'));
    expect(wrapper.find('span').length).to.equal(1);
    expect(wrapper.find('FontAwesome').length).to.equal(1);
    expect(wrapper.state().collapsed).to.equal(false);
  });

  it('clicking icon collapses area', () => {
    const wrapper = mount(
      <CollapsibleEditorSection {...defaultProps}>
        <span>Child</span>
      </CollapsibleEditorSection>
    );

    let icon = wrapper.find('FontAwesome');
    expect(wrapper.state().collapsed).to.equal(false);
    expect(icon.props().icon).to.include('compress');

    icon.simulate('click');

    expect(wrapper.state().collapsed).to.equal(true);
    expect(wrapper.find('FontAwesome').props().icon).to.include('expand');
  });
});
