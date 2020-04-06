import $ from 'jquery';
import React from 'react';
import ReactDOM from 'react-dom';
import {Provider} from 'react-redux';
import {getStore, registerReducers} from '@cdo/apps/redux';
import teacherSections, {
  setSections
} from '@cdo/apps/templates/teacherDashboard/teacherSectionsRedux';
import sectionData, {setSection} from '@cdo/apps/redux/sectionDataRedux';
import currentUser, {
  setCurrentUserName
} from '@cdo/apps/templates/currentUserRedux';
import ParentLetter from '@cdo/apps/lib/ui/ParentLetter';

$(() => {
  // Register the reducers we need to show the parent letter:
  registerReducers({currentUser, sectionData, teacherSections});

  // Populate the store with data passed down from the server:
  const script = document.querySelector('script[data-dashboard]');
  const scriptData = JSON.parse(script.dataset.dashboard);
  const store = getStore();
  store.dispatch(setCurrentUserName(scriptData.userName));
  store.dispatch(setSections(scriptData.sections));
  store.dispatch(setSection(scriptData.section));

  // Mount and render the letter:
  const mountPoint = document.createElement('div');
  document.body.appendChild(mountPoint);
  ReactDOM.render(
    <Provider store={store}>
      <ParentLetter autoPrint />
    </Provider>,
    mountPoint
  );
});
