import React from 'react';
import {expect} from '../../util/reconfiguredChai';
import sinon from 'sinon';
import {shallow} from 'enzyme';
import PlaygroundImage from '@cdo/apps/javalab/PlaygroundImage';

describe('PlaygroundImageTest', () => {
  it('sets styles correctly', () => {
    const props = {
      fileUrl: 'test-url',
      id: '1',
      x: '350',
      y: '0',
      height: '100',
      width: '250',
      index: '0',
      onClick: () => {}
    };

    const wrapper = shallow(<PlaygroundImage {...props} />);
    const imageStyles = wrapper
      .find('img')
      .first()
      .props().style;
    // spot check some styles: we double width, we set the marginLeft
    // based on x * 2, we set the right clip path
    expect(imageStyles.width).to.equal(500);
    expect(imageStyles.marginLeft).to.equal(700);
    expect(imageStyles.clipPath).to.equal('inset(0 400px 0 0)');
  });

  it('sets onClick correctly', () => {
    const onClick = sinon.stub();
    const props = {
      fileUrl: 'test-url',
      id: '1',
      x: '350',
      y: '0',
      height: '100',
      width: '250',
      index: '0',
      onClick: onClick
    };
    const wrapper = shallow(<PlaygroundImage {...props} />);
    const image = wrapper.find('img').first();
    image.simulate('click');
    expect(onClick).to.have.been.calledOnce;
  });
});
