/* globals dashboard */

import $ from 'jquery';
import _ from 'lodash';

import {
  showProjectHeader,
  showMinimalProjectHeader,
  showProjectBackedHeader,
  showLevelBuilderSaveButton,
  setProjectUpdatedError,
  setProjectUpdatedSaving,
  showProjectUpdatedAt,
  setProjectUpdatedAt,
  refreshProjectName,
  setShowTryAgainDialog
} from './headerRedux';

import React from 'react';
import ReactDOM from 'react-dom';

import {Provider} from 'react-redux';
import progress from './progress';
import {getStore} from '../redux';
import msg from '@cdo/locale';
import firehoseClient from '../lib/util/firehose';

import HeaderMiddle from '@cdo/apps/code-studio/components/header/HeaderMiddle';

import ProjectInfo from '@cdo/apps/code-studio/components/header/ProjectInfo';

/**
 * Dynamic header generation and event bindings for header actions.
 */

// Namespace for manipulating the header DOM.
var header = {};

/**
 * See ApplicationHelper::PUZZLE_PAGE_NONE.
 */
const PUZZLE_PAGE_NONE = -1;

/**
 * @param {object} scriptData
 * @param {boolean} scriptData.disablePostMilestone
 * @param {boolean} scriptData.isHocScript
 * @param {string} scriptData.name
 * @param {object} lessonData{{
 *   script_id: number,
 *   script_name: number,
 *   num_script_lessons: number,
 *   title: string,
 *   finishLink: string,
 *   finishText: string,
 *   levels: Array.<{
 *     id: number,
 *     position: number,
 *     title: string,
 *     kind: string
 *   }>
 * }}
 * @param {object} progressData
 * @param {string} currentLevelId
 * @param {number} puzzlePage
 * @param {boolean} signedIn True/false if we know the sign in state of the
 *   user, null otherwise
 * @param {boolean} stageExtrasEnabled Whether this user is in a section with
 *   stageExtras enabled for this script
 */
header.build = function(
  scriptData,
  lessonData,
  progressData,
  currentLevelId,
  puzzlePage,
  signedIn,
  stageExtrasEnabled,
  scriptNameData
) {
  scriptData = scriptData || {};
  lessonData = lessonData || {};
  progressData = progressData || {};

  const scriptName = scriptData.name;

  let saveAnswersBeforeNavigation = puzzlePage !== PUZZLE_PAGE_NONE;

  const renderedProgress = progress.renderStageProgress(
    scriptData,
    lessonData,
    progressData,
    currentLevelId,
    saveAnswersBeforeNavigation,
    signedIn,
    stageExtrasEnabled
  );

  ReactDOM.render(
    <Provider store={getStore()}>
      <HeaderMiddle scriptNameData={scriptNameData} lessonData={lessonData}>
        {renderedProgress}
      </HeaderMiddle>
    </Provider>,
    document.querySelector('.header_level')
  );

  /**
   * Track boolean "visible" state of header popup to avoid
   * expensive lookup on window resize.
   * @type {boolean}
   */
  var isHeaderPopupVisible = false;

  function showHeaderPopup() {
    firehoseClient.putRecord(
      {
        study: 'mini_view',
        event: 'mini_view_opened',
        data_json: JSON.stringify({
          current_level_id: currentLevelId
        })
      },
      {includeUserId: true}
    );
    sizeHeaderPopupToViewport();
    $('.header_popup').show();
    $('.header_popup_link_glyph').html('&#x25B2;');
    $('.header_popup_link_text').text(msg.lessAllCaps());
    $(document).on('click', hideHeaderPopup);
    progress.renderMiniView(
      $('.user-stats-block')[0],
      scriptName,
      currentLevelId,
      progressData.linesOfCodeText,
      scriptData.student_detail_progress_view
    );
    isHeaderPopupVisible = true;
  }
  function hideHeaderPopup(event) {
    // Clicks inside the popup shouldn't close it, unless it's on close button
    const target = event && event.target;
    if (
      $('.header_popup').find(target).length > 0 &&
      !$(event.target).hasClass('header_popup_close')
    ) {
      return;
    }
    $('.header_popup').hide();
    $('.header_popup_link_glyph').html('&#x25BC;');
    $('.header_popup_link_text').text(msg.moreAllCaps());
    $(document).off('click', hideHeaderPopup);
    isHeaderPopupVisible = false;
  }

  $('.header_popup_link').click(function(e) {
    e.stopPropagation();
    $('.header_popup').is(':visible') ? hideHeaderPopup() : showHeaderPopup();
  });

  $(window).resize(
    _.debounce(function() {
      if (isHeaderPopupVisible) {
        sizeHeaderPopupToViewport();
      }
    }, 250)
  );

  /**
   * Adjust the maximum size of the popup's inner scroll area so that the whole popup
   * will fit within the browser viewport.
   */
  function sizeHeaderPopupToViewport() {
    var viewportHeight = $(window).height();
    var headerWrapper = $('.header-wrapper');
    var headerPopup = $('.header_popup');
    var popupTop =
      parseInt(headerWrapper.css('padding-top'), 10) +
      parseInt(headerPopup.css('top'), 10);
    var popupBottom = parseInt(headerPopup.css('margin-bottom'), 10);
    headerPopup
      .find('.header_popup_scrollable')
      .css('max-height', viewportHeight - (popupTop + popupBottom));
  }
};

header.buildProjectInfoOnly = function() {
  const container = document.getElementsByClassName('project_info');
  if (container.length) {
    ReactDOM.render(
      <Provider store={getStore()}>
        <ProjectInfo onComponentResize={() => {}} />
      </Provider>,
      container[0]
    );
  }
};

function setupReduxSubscribers(store) {
  let state = {};
  store.subscribe(() => {
    let lastState = state;
    state = store.getState();

    // Update the project state when a PublishDialog state transition indicates
    // that a project has just been published.
    if (
      lastState.publishDialog &&
      lastState.publishDialog.lastPublishedAt !==
        state.publishDialog.lastPublishedAt
    ) {
      window.dashboard.project.setPublishedAt(
        state.publishDialog.lastPublishedAt
      );
    }

    // Update the project state when a ShareDialog state transition indicates
    // that a project has just been unpublished.
    if (
      lastState.shareDialog &&
      !lastState.shareDialog.didUnpublish &&
      state.shareDialog.didUnpublish
    ) {
      window.dashboard.project.setPublishedAt(null);
    }
  });
}
setupReduxSubscribers(getStore());

header.showMinimalProjectHeader = function() {
  getStore().dispatch(refreshProjectName());
  getStore().dispatch(showMinimalProjectHeader());
};

header.showLevelBuilderSaveButton = function(getChanges) {
  getStore().dispatch(showLevelBuilderSaveButton(getChanges));
};

/**
 * @param {object} options{{
 *   showShareAndRemix: boolean,
 *   showExport: boolean
 * }}
 */
header.showHeaderForProjectBacked = function(options) {
  if (options.showShareAndRemix) {
    getStore().dispatch(showProjectBackedHeader(options.showExport));
  }

  getStore().dispatch(showProjectUpdatedAt());
  header.updateTimestamp();
};

header.showProjectHeader = function(options) {
  header.updateTimestamp();
  getStore().dispatch(refreshProjectName());
  getStore().dispatch(showProjectHeader(options.showExport));
};

header.updateTimestamp = function() {
  const timestamp = dashboard.project.getCurrentTimestamp();
  getStore().dispatch(setProjectUpdatedAt(timestamp));
};

header.showProjectSaveError = () => {
  getStore().dispatch(setProjectUpdatedError());
};

header.showProjectSaving = () => {
  getStore().dispatch(setProjectUpdatedSaving());
};

header.showTryAgainDialog = () => {
  getStore().dispatch(setShowTryAgainDialog(true));
};

header.hideTryAgainDialog = () => {
  getStore().dispatch(setShowTryAgainDialog(false));
};

export default header;
