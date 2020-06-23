import {expect} from '../../util/reconfiguredChai';
import sinon from 'sinon';
import i18n from '@cdo/locale';
import {replaceOnWindow, restoreOnWindow} from '../../util/testUtils';
import DropletCommon from '@cdo/apps/util/dropletCommon';

describe('dropletCommon.findDropletParseErrors', () => {
  it('returns false when given no editor', () => {
    expect(DropletCommon.findDropletParseErrors()).to.be.false;
  });

  it('returns false when the parser finds no errors', () => {
    const editor = {parse: () => {}};
    expect(DropletCommon.findDropletParseErrors(editor)).to.be.false;
  });

  it('returns true when the parser finds codeBlock errors', () => {
    const lineNumber = 5;
    const errorMessage = `Line ${lineNumber}. indent must be inside block`;
    const callback = sinon.spy();
    const dropletError = 'droplet error';
    sinon.stub(i18n, 'droplet_parsing_error').returns(dropletError);
    const editor = {
      parse: () => {
        throw new Error(errorMessage);
      }
    };
    expect(DropletCommon.findDropletParseErrors(editor, callback)).to.be.true;
    expect(callback).to.have.been.calledWith(lineNumber + 1, dropletError);
    i18n.droplet_parsing_error.restore();
  });

  it('returns true when the parser finds errors with line numbers', () => {
    const lineNumber = 5;
    const message = 'message';
    const errorMessage = `Line ${lineNumber}. ${message}`;
    replaceOnWindow('dashboard', {
      project: {
        getShareUrl: () => {}
      }
    });
    sinon.stub(window.dashboard.project, 'getShareUrl');
    const callback = sinon.spy();
    const editor = {
      parse: () => {
        throw new Error(errorMessage);
      }
    };
    expect(DropletCommon.findDropletParseErrors(editor, callback)).to.be.true;
    expect(callback).to.have.been.calledWith(lineNumber + 1, message);
    window.dashboard.project.getShareUrl.restore();
    restoreOnWindow('dashboard');
  });

  it('returns true when the parser finds errors without line numbers', () => {
    const errorMessage = 'error message';
    const callback = sinon.spy();
    const editor = {
      parse: () => {
        throw new Error(errorMessage);
      }
    };
    expect(DropletCommon.findDropletParseErrors(editor, callback)).to.be.true;
    expect(callback).to.have.been.calledWith(0, errorMessage);
  });
});
