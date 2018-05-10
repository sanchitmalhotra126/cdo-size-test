/* globals dashboard, appOptions */

import React from 'react';
import ReactDOM from 'react-dom';
import popupWindow from './popup-window';
import ShareDialog from './components/ShareDialog';
import { Provider } from 'react-redux';
import { getStore } from '../redux';
import { showShareDialog } from './components/shareDialogRedux';
import { AllPublishableProjectTypes } from '../util/sharedConstants';
import experiments from '../util/experiments';

export function shareProject(shareUrl) {
  dashboard.project.save().then(() => {

    var i18n = window.dashboard.i18n;

    var dialogDom = document.getElementById('project-share-dialog');
    if (!dialogDom) {
      dialogDom = document.createElement('div');
      dialogDom.setAttribute('id', 'project-share-dialog');
      document.body.appendChild(dialogDom);
    }

    const pageConstants = getStore().getState().pageConstants;
    const canShareSocial = !pageConstants.isSignedIn || pageConstants.is13Plus;
    const appType = dashboard.project.getStandaloneApp();

    // Allow publishing for any project type that students can publish.
    // Younger students can now get to the share dialog if their teacher allows
    // it, and should be able to publish in that case.
    const canPublish = !!appOptions.isSignedIn &&
      AllPublishableProjectTypes.includes(appType);

    const exportExpoApp = (expoOpts) => {
      if (window.Applab) {
        return window.Applab.exportApp(expoOpts);
      } else {
        return Promise.reject(new Error('No Global Applab'));
      }
    };

    ReactDOM.render(
      <Provider store={getStore()}>
        <ShareDialog
          isProjectLevel={!!dashboard.project.isProjectLevel()}
          i18n={i18n}
          shareUrl={shareUrl}
          thumbnailUrl={dashboard.project.getThumbnailUrl()}
          isAbusive={dashboard.project.exceedsAbuseThreshold()}
          canPrint={appType === "artist"}
          canPublish={canPublish}
          isPublished={dashboard.project.isPublished()}
          channelId={dashboard.project.getCurrentId()}
          appType={appType}
          onClickPopup={popupWindow}
          // TODO: Can I not proliferate the use of global references to Applab somehow?
          onClickExport={window.Applab ? window.Applab.exportApp : null}
          onClickExportExpo={experiments.isEnabled('exportExpo') ? exportExpoApp : null}
          canShareSocial={canShareSocial}
          userSharingDisabled={appOptions.userSharingDisabled}
        />
      </Provider>,
      dialogDom
    );

    getStore().dispatch(showShareDialog());
  });
}
