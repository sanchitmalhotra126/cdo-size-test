/* global dashboard appOptions addToHome CDOSounds trackEvent Applab Blockly */
import $ from 'jquery';
import { getStore } from '../redux';
import { disableBubbleColors } from '../progressRedux';
import experiments from '../../util/experiments';
import DisabledBubblesAlert from '../DisabledBubblesAlert';
import React from 'react';
import ReactDOM from 'react-dom';
var renderAbusive = require('./renderAbusive');
var userAgentParser = require('./userAgentParser');
var progress = require('../progress');
var clientState = require('../clientState');
var color = require("../../util/color");
import PlayZone from '@cdo/apps/code-studio/components/playzone';
var timing = require('@cdo/apps/code-studio/initApp/timing');
var chrome34Fix = require('@cdo/apps/code-studio/initApp/chrome34Fix');
var project = require('@cdo/apps/code-studio/initApp/project');
var createCallouts = require('@cdo/apps/code-studio/callouts');
var reporting = require('@cdo/apps/code-studio/reporting');
var Dialog = require('@cdo/apps/code-studio/dialog');
var showVideoDialog = require('@cdo/apps/code-studio/videos').showVideoDialog;
import { lockContainedLevelAnswers } from '@cdo/apps/code-studio/levels/codeStudioLevels';
import queryString from 'query-string';

import { activityCssClass, mergeActivityResult, LevelStatus } from '../activityUtils';

// Max milliseconds to wait for last attempt data from the server
var LAST_ATTEMPT_TIMEOUT = 5000;

function showDisabledButtonsAlert(isHocScript) {
  const div = $('<div>').css({
    position: 'absolute',
    left: 0,
    right: 0,
    top: 45,
    zIndex: 1000
  });
  $(document.body).append(div);

  ReactDOM.render(<DisabledBubblesAlert isHocScript={isHocScript}/>, div[0]);
}

// Legacy Blockly initialization that was moved here from _blockly.html.haml.
// Modifies `appOptions` with some default values in `baseOptions`.
// TODO(dave): Move blockly-specific setup function out of shared and back into dashboard.
export function setupApp(appOptions) {
  if (!window.dashboard) {
    throw new Error('Assume existence of window.dashboard');
  }
  timing.startTiming('Puzzle', window.script_path, '');

  var lastSavedProgram;

  if (appOptions.hasContainedLevels) {
    if (appOptions.readonlyWorkspace) {
      // Lock the contained levels if this is a teacher viewing student work:
      lockContainedLevelAnswers();
    }
    // Always mark the workspace as readonly when we have contained levels:
    appOptions.readonlyWorkspace = true;
  }

  // Sets up default options and initializes blockly
  var baseOptions = {
    containerId: 'codeApp',
    Dialog: Dialog,
    cdoSounds: CDOSounds,
    position: {blockYCoordinateInterval: 25},
    onInitialize: function () {
      createCallouts(this.level.callouts || this.callouts);
      if (userAgentParser.isChrome34()) {
        chrome34Fix.fixup();
      }
      if (appOptions.level.projectTemplateLevelName || appOptions.app === 'applab' || appOptions.app === 'gamelab' || appOptions.app === 'weblab') {
        $('#clear-puzzle-header').hide();
        // Only show Version History button if the user owns this project
        if (project.isEditable()) {
          $('#versions-header').show();
        }
      }
      $(document).trigger('appInitialized');
    },
    onAttempt: function (report) {
      if (appOptions.level.isProjectLevel) {
        return;
      }
      // or unless the program is actually the result for a contained level
      if (!appOptions.hasContainedLevels) {
        if (appOptions.channel && !appOptions.level.edit_blocks) {
          // Don't send the levelSource or image to Dashboard for channel-backed levels,
          // unless we are actually editing blocks and not really completing a level
          // (The levelSource is already stored in the channels API.)
          delete report.program;
          delete report.image;
        } else {
          // Only locally cache non-channel-backed levels. Use a client-generated
          // timestamp initially (it will be updated with a timestamp from the server
          // if we get a response.
          lastSavedProgram = decodeURIComponent(report.program);
          clientState.writeSourceForLevel(appOptions.scriptName, appOptions.serverLevelId, +new Date(), lastSavedProgram);
        }
        report.callback = appOptions.report.callback;
        trackEvent('Activity', 'Lines of Code', window.script_path, report.lines);
      }
      report.scriptName = appOptions.scriptName;
      report.fallbackResponse = appOptions.report.fallback_response;
      // Track puzzle attempt event
      trackEvent('Puzzle', 'Attempt', window.script_path, report.pass ? 1 : 0);
      if (report.pass) {
        trackEvent('Puzzle', 'Success', window.script_path, report.attempt);
        timing.stopTiming('Puzzle', window.script_path, '');
      }
      reporting.sendReport(report);
    },
    onComplete: function (response) {
      if (!appOptions.channel && !appOptions.hasContainedLevels) {
        // Update the cache timestamp with the (more accurate) value from the server.
        clientState.writeSourceForLevel(appOptions.scriptName, appOptions.serverLevelId, response.timestamp, lastSavedProgram);
      }
    },
    onResetPressed: function () {
      reporting.cancelReport();
    },
    onContinue: function () {
      var lastServerResponse = reporting.getLastServerResponse();
      if (lastServerResponse.videoInfo) {
        showVideoDialog(lastServerResponse.videoInfo);
      } else if (lastServerResponse.endOfStageExperience) {
        const body = document.createElement('div');
        const stageInfo = lastServerResponse.previousStageInfo;
        const stageName = `${window.dashboard.i18n.t('stage')} ${stageInfo.position}: ${stageInfo.name}`;
        ReactDOM.render(
          <PlayZone
            stageName={stageName}
            onContinue={() => { dialog.hide(); }}
            i18n={window.dashboard.i18n}
          />,
          body
        );
        const dialog = new Dialog({
          body: body,
          width: 800,
          redirect: lastServerResponse.nextRedirect
        });
        dialog.show();
      } else if (lastServerResponse.nextRedirect) {
        window.location.href = lastServerResponse.nextRedirect;
      }
    },
    backToPreviousLevel: function () {
      var lastServerResponse = reporting.getLastServerResponse();
      if (lastServerResponse.previousLevelRedirect) {
        window.location.href = lastServerResponse.previousLevelRedirect;
      }
    },
    showInstructionsWrapper: function (showInstructions) {
      // Always skip all pre-level popups on share levels or when configured thus
      if (this.share || appOptions.level.skipInstructionsPopup) {
        return;
      }

      var afterVideoCallback = showInstructions;
      if (appOptions.level.afterVideoBeforeInstructionsFn) {
        afterVideoCallback = function () {
          appOptions.level.afterVideoBeforeInstructionsFn(showInstructions);
        };
      }

      var hasVideo = !!appOptions.autoplayVideo;
      var hasInstructions = !!(appOptions.level.instructions ||
                               appOptions.level.aniGifURL);
      var noAutoplay = !!queryString.parse(location.search).noautoplay;

      if (hasVideo && !noAutoplay) {
        if (hasInstructions) {
          appOptions.autoplayVideo.onClose = afterVideoCallback;
        }
        showVideoDialog(appOptions.autoplayVideo);
      } else {
        if (hasVideo && noAutoplay) {
          clientState.recordVideoSeen(appOptions.autoplayVideo.key);
        }
        if (hasInstructions) {
          afterVideoCallback();
        }
      }
    }
  };
  $.extend(true, appOptions, baseOptions);

  // Turn string values into functions for keys that begin with 'fn_' (JSON can't contain function definitions)
  // E.g. { fn_example: 'function () { return; }' } becomes { example: function () { return; } }
  (function fixUpFunctions(node) {
    if (typeof node !== 'object') {
      return;
    }
    for (var i in node) {
      if (/^fn_/.test(i)) {
        try {
          // eslint-disable-next-line no-eval
          node[i.replace(/^fn_/, '')] = eval('(' + node[i] + ')');
        } catch (e) {
        }
      } else {
        fixUpFunctions(node[i]);
      }
    }
  })(appOptions.level);

  // Previously, this was set by dashboard based on route and user agent. We
  // stopped being able to use the user agent on the server, and thus try
  // to have the same logic on the client.
  appOptions.noPadding = userAgentParser.isMobile();
}

function loadAppAsync(appOptions, callback) {
  setupApp(appOptions);
  var lastAttemptLoaded = false;

  var loadLastAttemptFromSessionStorage = function () {
    if (!lastAttemptLoaded) {
      lastAttemptLoaded = true;

      // Load the locally-cached last attempt (if one exists)
      appOptions.level.lastAttempt = clientState.sourceForLevel(
        appOptions.scriptName, appOptions.serverLevelId);

      callback();
    }
  };

  var isViewingSolution = (clientState.queryParams('solution') === 'true');
  var isViewingStudentAnswer = !!clientState.queryParams('user_id');

  if (appOptions.share && !window.navigator.standalone && userAgentParser.isSafari()) {
    window.addEventListener("load", function () {
      addToHome.show(true);
    }, false);
  }


  if (!appOptions.channel && !isViewingSolution && !isViewingStudentAnswer) {

    if (appOptions.publicCaching) {
      // Disable social share by default on publicly-cached pages, because we don't know
      // if the user is underage until we get data back from /api/user_progress/ and we
      // should err on the side of not showing social links
      appOptions.disableSocialShare = true;
    }

    $.ajax(
      `/api/user_progress` +
      `/${appOptions.scriptName}` +
      `/${appOptions.stagePosition}` +
      `/${appOptions.levelPosition}` +
      `/${appOptions.serverLevelId}`
    ).done(function (data) {
      appOptions.disableSocialShare = data.disableSocialShare;

      // Merge progress from server (loaded via AJAX)
      var serverProgress = data.progress || {};
      var clientProgress = clientState.allLevelsProgress()[appOptions.scriptName] || {};
      Object.keys(serverProgress).forEach(function (levelId) {
        if (serverProgress[levelId] !== clientProgress[levelId]) {
          var mergedResult = mergeActivityResult(clientProgress[levelId], serverProgress[levelId]);
          var status = activityCssClass(mergedResult);

          // Set the progress color
          var css = {backgroundColor: color[`level_${status}`] || color.level_not_tried};
          if (status && status !== LevelStatus.not_tried && status !== LevelStatus.attempted) {
            Object.assign(css, {color: color.white});
          }
          $('.level-' + levelId).css(css);

          // Write down new progress in sessionStorage
          clientState.trackProgress(null, null, serverProgress[levelId], appOptions.scriptName, levelId);
        }
      });

      if (!lastAttemptLoaded) {
        if (data.lastAttempt) {
          lastAttemptLoaded = true;

          var timestamp = data.lastAttempt.timestamp;
          var source = data.lastAttempt.source;

          var cachedProgram = clientState.sourceForLevel(
            appOptions.scriptName, appOptions.serverLevelId, timestamp);
          if (cachedProgram !== undefined) {
            // Client version is newer
            appOptions.level.lastAttempt = cachedProgram;
          } else if (source && source.length) {
            // Sever version is newer
            appOptions.level.lastAttempt = source;

            // Write down the lastAttempt from server in sessionStorage
            clientState.writeSourceForLevel(appOptions.scriptName,
                                            appOptions.serverLevelId, timestamp, source);
          }
          callback();
        } else {
          loadLastAttemptFromSessionStorage();
        }

        if (data.pairingDriver) {
          appOptions.level.pairingDriver = data.pairingDriver;
        }
      }

      if (progress.refreshStageProgress) {
        progress.refreshStageProgress();
      }

      const signedOutUser = Object.keys(data).length === 0;
      if (!signedOutUser && (data.disablePostMilestone ||
          experiments.isEnabled('postMilestoneDisabledUI'))) {
        getStore().dispatch(disableBubbleColors());
        showDisabledButtonsAlert(!!data.isHoc);
      }
    }).fail(loadLastAttemptFromSessionStorage);

    // Use this instead of a timeout on the AJAX request because we still want
    // the header progress data even if the last attempt data takes too long.
    // The progress dots can fade in at any time without impacting the user.
    setTimeout(loadLastAttemptFromSessionStorage, LAST_ATTEMPT_TIMEOUT);
  } else if (window.dashboard && dashboard.project) {
    dashboard.project.load().then(function () {
      if (dashboard.project.hideBecauseAbusive()) {
        renderAbusive(window.dashboard.i18n.t('project.abuse.tos'));
        return $.Deferred().reject();
      }
      if (dashboard.project.hideBecausePrivacyViolationOrProfane()) {
        renderAbusive(window.dashboard.i18n.t('project.abuse.policy_violation'));
        return $.Deferred().reject();
      }
    }).then(callback);
  } else {
    loadLastAttemptFromSessionStorage();
  }
}

window.dashboard = window.dashboard || {};
window.dashboard.project = project;

window.apps = {

  // Set up projects, skipping blockly-specific steps. Designed for use
  // by levels of type "external".
  setupProjectsExternal: function () {
    if (!window.dashboard) {
      throw new Error('Assume existence of window.dashboard');
    }
  },

  // Define blockly/droplet-specific callbacks for projects to access
  // level source, HTML and headers.
  sourceHandler: {
    setInitialLevelHtml: function (levelHtml) {
      appOptions.level.levelHtml = levelHtml;
    },
    getLevelHtml: function () {
      return window.Applab && Applab.getHtml();
    },
    setInitialLevelSource: function (levelSource) {
      appOptions.level.lastAttempt = levelSource;
    },
    // returns a Promise to the level source
    getLevelSource: function (currentLevelSource) {
      return new Promise((resolve, reject) => {
        let source;
        if (window.Blockly) {
          // If we're readOnly, source hasn't changed at all
          source = Blockly.mainBlockSpace.isReadOnly() ? currentLevelSource :
                   Blockly.Xml.domToText(Blockly.Xml.blockSpaceToDom(Blockly.mainBlockSpace));
          resolve(source);
        } else if (appOptions.getCode) {
          source = appOptions.getCode();
          resolve(source);
        } else if (appOptions.getCodeAsync) {
          appOptions.getCodeAsync().then((source) => {
            resolve(source);
          });
        }
      });
    },
    setInitialAnimationList: function (animationList) {
      appOptions.initialAnimationList = animationList;
    },
    getAnimationList: function (callback) {
      if (appOptions.getAnimationList) {
        appOptions.getAnimationList(callback);
      } else {
        callback({});
      }
    }
  },
};

/**
 * Sets up everything needed for an app (like applab, gamelab, eval, etc.) to run.
 * This should only be called once per page load, with appoptions specified as a
 * data attribute on the script tag.
 */
export default function loadApp(appMain) {
  // Loads the dependencies for the current app based on values in `appOptions`.
  // This function takes a callback which is called once dependencies are ready.
  const script = document.querySelector(`script[data-appoptions]`);
  const appOptions = JSON.parse(script.dataset.appoptions);

  // ugh, a lot of code expects this to be on the window object pretty early on.
  window.appOptions = appOptions;

  if (appOptions.embedded) {
    // when we just "embed" an app (i.e. via embed_blocks.html.erb),
    // we just want to call the appMain function immediately without
    // loading a bunch of other stuff.
    appMain(appOptions);
  } else {
    loadAppAsync(appOptions, () => {
      project.init(window.apps.sourceHandler);
      appMain(appOptions);
    });
  }
}
