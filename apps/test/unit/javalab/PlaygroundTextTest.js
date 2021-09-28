import React from 'react';
import {expect} from '../../util/reconfiguredChai';
import {shallow} from 'enzyme';
import PlaygroundText from '@cdo/apps/javalab/PlaygroundText';

describe('PlaygroundImageTest', () => {
  it('sets styles correctly', () => {
    const props = {
      id: '1',
      x: '350',
      y: '0',
      height: '100',
      index: '0',
      rotation: '90.5',
      red: '0',
      blue: '0',
      green: '255',
      font: 'MONO',
      fontStyle: 'BOLD_ITALIC'
    };

    const wrapper = shallow(<PlaygroundText {...props} />);
    const textStyles = wrapper
      .find('span')
      .first()
      .props().style;
    // check dynamically generated styles
    expect(textStyles.top).to.equal(0);
    expect(textStyles.left).to.equal(700);
    expect(textStyles.height).to.equal(200);
    expect(textStyles.fontSize).to.equal(200);
    expect(textStyles.fontFamily).to.equal('monospace');
    expect(textStyles.fontWeight).to.equal('bold');
    expect(textStyles.fontStyle).to.equal('italic');
    expect(textStyles.color).to.equal('rgb(0,255,0)');
    expect(textStyles.transform).to.equal('rotate(90.5deg)');
  });
});
