import queryString from 'query-string';
import {setSectionLockStatus} from './stageLockRedux';
import {selectSection} from '../templates/teacherDashboard/teacherSectionsRedux';
import {Provider} from 'react-redux';
import React from 'react';
import ReactDOM from 'react-dom';
import {reload} from '@cdo/apps/utils';
import {updateQueryParam} from '@cdo/apps/code-studio/utils';
import {setStudentsForCurrentSection} from '@cdo/apps/templates/teacherDashboard/teacherSectionsRedux';
import {queryUserProgress} from '@cdo/apps/code-studio/progressRedux';
import TeacherPanel from './components/progress/TeacherPanel';

/**
 * Render our teacher panel that shows up on our course overview page.
 */
export function renderTeacherPanel(
  store,
  scriptId,
  section,
  scriptName,
  sectionData = null,
  pageType = null,
  isAsync = false
) {
  const div = document.createElement('div');
  div.setAttribute('id', 'teacher-panel-container');

  if (section && section.students) {
    store.dispatch(setStudentsForCurrentSection(section.id, section.students));
  }

  const onSelectUser = id => {
    updateQueryParam('user_id', id);
    isAsync ? store.dispatch(queryUserProgress(id)) : reload();
  };

  const getSelectedUserId = () => {
    const userIdStr = queryString.parse(location.search).user_id;
    const selectedUserId = userIdStr ? parseInt(userIdStr, 10) : null;
    return selectedUserId;
  };

  ReactDOM.render(
    <Provider store={store}>
      <TeacherPanel
        sectionData={sectionData}
        onSelectUser={onSelectUser}
        scriptName={scriptName}
        getSelectedUserId={getSelectedUserId}
        pageType={pageType}
      />
    </Provider>,
    div
  );
  document.body.appendChild(div);
}

/**
 * Query the server for lock status of this teacher's students
 * @returns {Promise} when finished
 */
export function queryLockStatus(store, scriptId) {
  return new Promise((resolve, reject) => {
    $.ajax('/api/lock_status', {
      data: {script_id: scriptId}
    }).done(data => {
      store.dispatch(setSectionLockStatus(data));
      const query = queryString.parse(location.search);
      if (query.section_id) {
        store.dispatch(selectSection(query.section_id));
      }
      resolve();
    });
  });
}
