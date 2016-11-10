/** @file JavaScript run only on the /s/:script_name/edit page. */
/* globals scriptEditorData */

import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import { createStore } from '@cdo/apps/redux';
import reducer from '@cdo/apps/lib/script-editor/editorRedux';
import ScriptEditor from '@cdo/apps/lib/script-editor/ScriptEditor';

const scriptData = scriptEditorData.script;
const stages = scriptData.stages.filter(stage => stage.id).map(stage => ({
  position: stage.position,
  flex_category: stage.flex_category,
  lockable: stage.lockable,
  name: stage.name,
  // Only include the first level of an assessment (uid ending with "_0").
  levels: stage.levels.filter(level => !level.uid || /_0$/.test(level.uid)).map(level => ({
    position: level.position,
    activeId: level.activeId,
    ids: level.ids.slice(),
    kind: level.kind,
    skin: level.skin,
    videoKey: level.videoKey,
    concepts: level.concepts,
    conceptDifficulty: level.conceptDifficulty
  }))
}));

const store = createStore(reducer, {
  levelKeyList: scriptEditorData.levelKeyList,
  stages
});

ReactDOM.render(
  <Provider store={store}>
    <ScriptEditor
      i18nData={scriptEditorData.i18n}
      hidden={scriptData.hidden}
      loginRequired={scriptData.loginRequired}
      hideableStages={scriptData.hideable_stages}
      professionalLearningCourse={scriptData.professionalLearningCourse}
      peerReviewsRequired={scriptData.peerReviewsRequired}
      wrapupVideo={scriptData.wrapupVideo}
    />
  </Provider>,
  document.querySelector('.edit_container')
);
