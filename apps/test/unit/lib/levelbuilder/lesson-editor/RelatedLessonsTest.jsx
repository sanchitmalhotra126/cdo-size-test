import React from 'react';
import {shallow} from 'enzyme';
import {expect} from '../../../../util/reconfiguredChai';
import RelatedLessons from '@cdo/apps/lib/levelbuilder/lesson-editor/RelatedLessons';

describe('RelatedLessons', () => {
  let defaultProps;
  beforeEach(() => {
    defaultProps = {
      relatedLessons: [
        {
          scriptTitle: 'Course A',
          versionYear: '2017',
          lockable: false,
          relativePosition: 3,
          id: 123,
          editUrl: '/lessons/123/edit'
        },
        {
          scriptTitle: 'Express (2019)',
          versionYear: '2019',
          lockable: null,
          relativePosition: 2,
          id: 456,
          editUrl: '/lessons/456/edit'
        }
      ]
    };
  });

  it('renders default props', () => {
    const wrapper = shallow(<RelatedLessons {...defaultProps} />);
    expect(wrapper.text()).to.include('Update Similar Lessons');
    expect(wrapper.text()).to.include(
      'The following lessons are similar to this one.'
    );

    const link1 = wrapper.find('a').first();
    expect(link1.props().href).to.equal('/lessons/123/edit');
    expect(link1.text()).to.equal('Course A - 2017 - Lesson 3');

    const link2 = wrapper.find('a').last();
    expect(link2.props().href).to.equal('/lessons/456/edit');
    // Redundant version year is omitted
    expect(link2.text()).to.equal('Express (2019) - Lesson 2');
  });
});
