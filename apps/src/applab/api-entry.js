// entry point for api that gets exposed.

// third party dependencies that are provided as globals in code-studio but
// which need to be explicitly required here.
window.$ = require('jquery');

window.Applab = require('./applab');
import applabCommands from './commands';
import * as api from './api';
import appStorage from './appStorage';
import Sounds from '../Sounds';
import {singleton as studioApp} from '../StudioApp';
studioApp.cdoSounds = new Sounds();

// TODO: remove the below two monkey patches.
window.Applab.JSInterpreter = {getNearestUserCodeLine: function () {return 0;}};

window.Applab.callCmd = function (cmd) {
  var retVal = false;
  if (applabCommands[cmd.name] instanceof Function) {
    retVal = applabCommands[cmd.name](cmd.opts);
  }
  return retVal;
};

// Expose api functions globally, unless they already exist
// in which case they are probably browser apis that we should
// not overwrite.
for (let key in api) {
  if (!window[key]) {
    window[key] = api[key];
  }
}

// disable appStorage
for (let key in appStorage) {
  appStorage[key] = function () {
    console.error("Data APIs are not available outside of code studio.");
  };
}
