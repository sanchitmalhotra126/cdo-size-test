import sinon from 'sinon';
import {expect} from '../util/configuredChai';
import {singleton as studioApp, stubStudioApp, restoreStudioApp} from '@cdo/apps/StudioApp';
import {throwOnConsoleErrors, throwOnConsoleWarnings} from '../util/testUtils';
import {assets as assetsApi} from '@cdo/apps/clientApi';
import {listStore} from '@cdo/apps/code-studio/assets';

describe('StudioApp.singleton', () => {
  throwOnConsoleErrors();
  throwOnConsoleWarnings();

  beforeEach(stubStudioApp);
  afterEach(restoreStudioApp);

  let containerDiv, codeWorkspaceDiv;
  beforeEach(() => {
    codeWorkspaceDiv = document.createElement('div');
    codeWorkspaceDiv.id = 'codeWorkspace';
    document.body.appendChild(codeWorkspaceDiv);

    containerDiv = document.createElement('div');
    containerDiv.id = 'foo';
    containerDiv.innerHTML = `
<button id="runButton" />
<button id="resetButton" />
<div id="visualizationColumn" />
<div id="toolbox-header" />
`;
    document.body.appendChild(containerDiv);
  });

  afterEach(() => {
    document.body.removeChild(codeWorkspaceDiv);
    document.body.removeChild(containerDiv);
  });

  describe("the init() method", () => {
    let files;
    beforeEach(() => {
      files = [];
      sinon.stub(studioApp(), 'configureDom');
      studioApp().configureRedux({});
      sinon.stub(assetsApi, 'getFiles').callsFake(cb => cb({files}));
      sinon.spy(listStore, 'reset');
    });

    afterEach(() => {
      assetsApi.getFiles.restore();
      listStore.reset.restore();
    });

    it('will pre-populate assets for levels that use assets', () => {
      studioApp().init({
        usesAssets: true,
        enableShowCode: true,
        containerId: 'foo',
        level: {
          editCode: true,
          codeFunctions: {},
        },
        dropletConfig: {
          blocks: [],
        },
        skin: {},
      });

      expect(assetsApi.getFiles).to.have.been.calledOnce;
      expect(listStore.reset).to.have.been.calledWith(files);
    });

    it("will emit an afterInit event", () => {
      const listener = sinon.spy();
      studioApp().on('afterInit', listener);
      studioApp().init({
        usesAssets: true,
        enableShowCode: true,
        containerId: 'foo',
        level: {
          editCode: true,
          codeFunctions: {},
        },
        dropletConfig: {
          blocks: [],
        },
        skin: {},
      });

      expect(listener).to.have.been.calledOnce;
    });
  });
});
