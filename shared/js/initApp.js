
// Sets up default options and initializes blockly
startTiming('Puzzle', script_path, '');
var baseOptions = {
  containerId: 'codeApp',
  Dialog: Dialog,
  cdoSounds: CDOSounds,
  position: { blockYCoordinateInterval: 25 },
  onInitialize: function() {
    this.createCallouts();
    if (window.wrapExistingClipPaths && window.handleClipPathChanges) {
      wrapExistingClipPaths();
      handleClipPathChanges();
    }
    $(document).trigger('appInitialized');
  },
  createCallouts: function() {
    $.fn.qtip.zindex = 500;
    this.callouts && this.callouts.every(function(callout) {
      var selector = callout.element_id; // jquery selector.
      if ($(selector).length === 0 && !callout.on) {
        return true;
      }

      var defaultConfig = {
        content: {
          text: callout.localized_text,
          title: {
            button: $('<div class="tooltip-x-close"/>')
          }
        },
        style: {
          classes: "",
          tip: {
            width: 20,
            height: 20
          }
        },
        position: {
          my: "bottom left",
          at: "top right"
        },
        hide: {
          event: 'click mousedown touchstart'
        },
        show: false // don't show on mouseover
      };

      var customConfig = $.parseJSON(callout.qtip_config);
      var config = $.extend(true, {}, defaultConfig, customConfig);
      config.style.classes = config.style.classes.concat(" cdo-qtips");

      // Reverse callouts in RTL mode
      if (Blockly.RTL) {
        config.position.my = reverseCallout(config.position.my);
        config.position.at = reverseCallout(config.position.at);
        if (config.position.adjust) {
          config.position.adjust.x *= -1;
        }
      }

      if (callout.on) {
        window.addEventListener(callout.on, function() {
          if (!callout.seen && $(selector).length > 0) {
            callout.seen = true;
            $(selector).qtip(config).qtip('show');
          }
        });
      } else {
        $(selector).qtip(config).qtip('show');
      }

      return true;
    });
  },
  onAttempt: function(report) {
    if (appOptions.level.isProjectLevel) {
      return;
    }
    report.fallbackResponse = appOptions.report.fallback_response;
    report.callback = appOptions.report.callback;
    // Track puzzle attempt event
    trackEvent('Puzzle', 'Attempt', script_path, report.pass ? 1 : 0);
    if (report.pass) {
      trackEvent('Puzzle', 'Success', script_path, report.attempt);
      stopTiming('Puzzle', script_path, '');
    }
    trackEvent('Activity', 'Lines of Code', script_path, report.lines);
    sendReport(report);
  },
  onResetPressed: function() {
    cancelReport();
  },
  onContinue: function() {
    if (lastServerResponse.videoInfo) {
      showVideoDialog(lastServerResponse.videoInfo);
    } else if (lastServerResponse.nextRedirect) {
      window.location.href = lastServerResponse.nextRedirect;
    }
  },
  backToPreviousLevel: function() {
    if (lastServerResponse.previousLevelRedirect) {
      window.location.href = lastServerResponse.previousLevelRedirect;
    }
  },
  showInstructionsWrapper: function(showInstructions) {
    var hasInstructions = appOptions.level.instructions || appOptions.level.aniGifURL;
    if (!hasInstructions || this.share || appOptions.level.skipInstructionsPopup) {
      return;
    }

    if (appOptions.autoplayVideo) {
      showVideoDialog(appOptions.autoplayVideo);
      $('.video-modal').on('hidden.bs.modal', function () {
        showInstructions();
      });
    } else {
      showInstructions();
    }
  }
};
$.extend(appOptions, baseOptions);

function reverseDirection(token) {
  if (/left/i.test(token)) {
    token = 'right';
  } else if (/right/i.test(token)) {
    token = 'left';
  }
  return token;
}
function reverseCallout(position) {
  position = position.split(/\s+/);
  var a = position[0];
  var b = position[1];
  return reverseDirection(a) + reverseDirection(b);
}
// Hide callouts when the function editor is closed (otherwise they jump to the top left corner)
$(window).on('function_editor_closed', function() {
  $('.cdo-qtips').qtip('hide');
});
// Turn string values into functions for keys that begin with 'fn_' (JSON can't contain function definitions)
// E.g. { fn_example: 'function () { return; }' } becomes { example: function () { return; } }
(function fixUpFunctions(node) {
  if (typeof node !== 'object') return;
  for (var i in node) {
    if (/^fn_/.test(i)) {
      try {
        node[i.replace(/^fn_/, '')] = eval('(' + node[i] + ')');
      } catch (e) { }
    } else {
      fixUpFunctions(node[i]);
    }
  }
})(appOptions.level);

/**
 * Only execute the given argument if it is a function.
 * @param callback
 */
function callbackSafe(callback, data) {
  if (typeof callback === 'function') {
    callback(data);
  }
}

dashboard.updateTimestamp = function() {
  if (dashboard.currentApp.updatedAt) {
    // TODO i18n
    $('.project_updated_at').empty().append("Saved ")  // TODO i18n
        .append($('<span class="timestamp">').attr('title', dashboard.currentApp.updatedAt)).show();
    $('.project_updated_at span.timestamp').timeago();
  } else {
    $('.project_updated_at').text("Click 'Run' to save"); // TODO i18n
  } 
};

dashboard.saveProject = function(callback) {
  $('.project_updated_at').text('Saving...');  // TODO (Josh) i18n
  var channelId = dashboard.currentApp.id;
  dashboard.currentApp.levelSource = window.Blockly
      ? Blockly.Xml.domToText(Blockly.Xml.blockSpaceToDom(Blockly.mainBlockSpace))
      : Applab.getCode();
  dashboard.currentApp.level = window.location.pathname;
  if (channelId) {
    storageApps().update(channelId, dashboard.currentApp, function(data) {
      dashboard.currentApp = data;
      dashboard.updateTimestamp();
      callbackSafe(callback, data);
    });
  } else {
    storageApps().create(dashboard.currentApp, function(data) {
      dashboard.currentApp = data;
      location.hash = dashboard.currentApp.id + '/edit';
      dashboard.updateTimestamp();
      callbackSafe(callback, data);
    });
  }
};

dashboard.deleteProject = function(callback) {
  var channelId = dashboard.currentApp.id;
  if (channelId) {
    storageApps().delete(channelId, function(data) {
      callbackSafe(callback, data);
    });
  } else {
    callbackSafe(callback, false);
  }
};

dashboard.loadEmbeddedProject = function(projectTemplateLevelName) {
  var deferred = new $.Deferred();
  // get all projects (TODO: filter on server side?)
  storageApps().all(function(data) {
    if (data) {
      // find the one that matches this level
      var projects = $.grep(data, function(app) {
        return (app.projectTemplateLevelName &&
                app.projectTemplateLevelName === projectTemplateLevelName);
      });
      if (projects.length == 0) {
        // create a new project
        var options = {
          projectTemplateLevelName: projectTemplateLevelName,
          name: projectTemplateLevelName,
          hidden: true
        };
        storageApps().create(options, function(app) {
          if (app) {
            dashboard.currentApp = app;
            deferred.resolve();
          } else {
            deferred.reject(); // failed to create project
          }
        });
      } else {
        // use the existing project
        dashboard.currentApp = projects[0];
        deferred.resolve();
      }
    } else {
      deferred.reject(); // failed to list projects
    }
  });
  return deferred;
};

function initApp() {
  if (appOptions.level.isProjectLevel || dashboard.currentApp) {

    $(window).on('hashchange', function () {
      var hashData = parseHash();
      if ((dashboard.currentApp && hashData.channelId !== dashboard.currentApp.id)
          || hashData.isEditingProject !== dashboard.isEditingProject) {
        location.reload();
      }
    });

    if (dashboard.isEditingProject) {
      if (dashboard.currentApp) {
        if (dashboard.currentApp.levelSource) {
          appOptions.level.lastAttempt = dashboard.currentApp.levelSource;
        }
      } else {
        dashboard.currentApp = {
          name: 'My Project'
        };
      }

      $(window).on('run_button_pressed', dashboard.saveProject);

      if (!dashboard.currentApp.hidden) {
        dashboard.showProjectHeader();
      }
    } else if (dashboard.currentApp && dashboard.currentApp.levelSource) {
      appOptions.level.lastAttempt = dashboard.currentApp.levelSource;
      appOptions.hideSource = true;
      appOptions.callouts = [];
    }
  }
  window[appOptions.app + 'Main'](appOptions);
}

// Returns a function which returns a $.Deferred instance. When executed, the
// function loads the given app script.
function loadSource(name) {
  return function () {
    var deferred = new $.Deferred();
    document.body.appendChild($('<script>', {
      src: appOptions.baseUrl + 'js/' + name + '.js'
    }).on('load', function () {
      deferred.resolve();
    })[0]);
    return deferred;
  }
}

// Loads the given app stylesheet.
function loadStyle(name) {
  $('body').append($('<link>', {
    rel: 'stylesheet',
    type: 'text/css',
    href: appOptions.baseUrl + 'css/' + name + '.css'
  }));
}

function parseHash() {
  // Example paths:
  // edit: /p/artist#7uscayNy-OEfVERwJg0xqQ==/edit
  // view: /p/artist#7uscayNy-OEfVERwJg0xqQ==
  var isEditingProject = false;
  var channelId = location.hash.slice(1);
  if (channelId) {
    // TODO: Use a router.
    var params = channelId.split("/");
    if (params.length > 1 && params[1] == "edit") {
      channelId = params[0];
      isEditingProject = true;
    }
  }
  return {
    channelId: channelId,
    isEditingProject: isEditingProject
  }
}

function loadProject(promise) {
  if (appOptions.level.isProjectLevel) {
    var hashData = parseHash();
    if (hashData.channelId) {
      if (hashData.isEditingProject) {
        dashboard.isEditingProject = true;
      }

      // Load the project ID, if one exists
      promise = promise.then(function () {
        var deferred = new $.Deferred();
        storageApps().fetch(hashData.channelId, function (data) {
          if (data) {
            dashboard.currentApp = data;
            deferred.resolve();
          } else {
            // Project not found, redirect to the new project experience.
            location.href = location.pathname;
          }
        });
        return deferred;
      });
    } else {
      dashboard.isEditingProject = true;
    }
  } else if (appOptions.level.projectTemplateLevelName) {
    // this is an embedded project
    dashboard.isEditingProject = true;
    promise = promise.then(dashboard.loadEmbeddedProject(appOptions.level.projectTemplateLevelName));
  }
  return promise;
}

loadStyle('common');
loadStyle(appOptions.app);
var promise;
if (appOptions.droplet) {
  loadStyle('droplet/droplet.min');
  promise = loadSource('jsinterpreter/acorn_interpreter')()
      .then(loadSource('requirejs/require'))
      .then(loadSource('ace/ace'))
      .then(loadSource('ace/ext-language_tools'))
      .then(loadSource('droplet/droplet-full.min'));
  promise = loadProject(promise);
} else {
  promise = loadSource('blockly')()
    .then(loadSource(appOptions.locale + '/blockly_locale'));
  promise = loadProject(promise);
}
promise = promise.then(loadSource('common' + appOptions.pretty))
  .then(loadSource(appOptions.locale + '/common_locale'))
  .then(loadSource(appOptions.locale + '/' + appOptions.app + '_locale'))
  .then(loadSource(appOptions.app + appOptions.pretty))
  .then(initApp);
