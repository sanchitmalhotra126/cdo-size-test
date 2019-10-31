import {getFunctionsAndMetadata} from '@cdo/apps/lib/tools/jsinterpreter/JSInterpreter';

/**
 * Finds all functions in the provided code and returns them with any metadata
 * @param {string} code The code to parse to get all functions
 * @returns {array} A list of objects where each object represents a function with its doc comment and params
 */
export function getFunctions(code) {
  return getFunctionsAndMetadata(code);
}

/**
 * Creates a droplet config for all functions in a library.
 * The format will look like this:
 * config: [
 *   {
 *     func: libName.funcName
 *     category: Functions
 *     params = [param1, param2]
 *     paletteParams = [param1, param2]
 *   }
 *   {
 *     func: ...
 *
 * @param {array} functions The list of functions and metadata to include
 * @param {string} libraryName The name of the library
 * @returns {null,object} null if there is an error. Else, the droplet config.
 */
function createDropletConfig(functions, libraryName) {
  let fullConfig = [];
  for (let currentFunction of functions) {
    if (!currentFunction.functionName) {
      return;
    }

    let individualConfig = {
      func: currentFunction.functionName,
      category: 'Functions',
      comment: currentFunction.comment
    };

    if (currentFunction.parameters && currentFunction.parameters.length > 0) {
      individualConfig.params = currentFunction.parameters;
      individualConfig.paletteParams = currentFunction.parameters;
    }

    fullConfig.push(individualConfig);
  }

  return fullConfig;
}

/**
 * Creates a closure to contain the library
 * The format will look like this:
 * var libraryName = (function() {function myFunc{doSomething}; return {myFunc: myFunc}})();
 * The library functions can be called with dot notation:
 * libraryName.myFunc();
 *
 * @param {string} code All the code in the library
 * @param {array} functions All functions that will be exported from the library
 * @param {string} libraryName The name of the library
 * @returns {null,string} null if there is an error. Else, the library closure
 */
export function createLibraryClosure(json) {
  let exportedFunctions = [];
  exportedFunctions = json.functions.map(name => `${name}: ${name}`);
  let functionsInClosure = exportedFunctions.join(',');
  return `var ${json.name} = (function() {${
    json.source
  }; return {${functionsInClosure}}})();`;
}

/**
 * Given a library json, migrates it into a consumable format. This function
 * creates the library closure and edits the droplet config so each function
 * references the closure using the correct name of the library.
 *
 * @param {string} json The raw string json of the library as imported from S3
 * @param {string} newName An alternate name for the library if the user renamed
 *                         it on import.
 * @returns {obejct} The json representation of the library with the source
 *                   wrapped in a closure and the functions named Library.func
 */
export function prepareLibraryForImport(json, channelId, versionId, newName) {
  let libraryJson = JSON.parse(json);
  libraryJson.originalName = libraryJson.name;
  if (newName) {
    libraryJson.name = newName;
  }

  libraryJson.dropletConfig.forEach(functionConfig => {
    functionConfig.func = `${libraryJson.name}.${functionConfig.func}`;
  });

  libraryJson.versionId = versionId;
  libraryJson.channelId = channelId;
  return libraryJson;
}

/**
 * Takes the input library elements and creates a json string from them to be
 * uploaded to S3
 * @param {string} code The code that makes up the library
 * @param {array} selectedFunctions The list of functions that will be exported from the library
 * @param {string} libraryName The name of the library to be exported
 * @param {string} libraryDescription The description of the library to be exported
 * @returns {null,string} null if there is an error. Else, a JSON string representing the library
 */
export function createLibraryJson(
  code,
  selectedFunctions,
  libraryName,
  libraryDescription
) {
  if (
    typeof code !== 'string' ||
    !Array.isArray(selectedFunctions) ||
    typeof libraryName !== 'string' ||
    !libraryName ||
    typeof libraryDescription !== 'string'
  ) {
    return;
  }

  let config = createDropletConfig(selectedFunctions, libraryName);
  let functions =
    selectedFunctions && selectedFunctions.map(func => func.functionName);
  if (!config || !functions) {
    return;
  }

  return JSON.stringify({
    name: libraryName,
    description: libraryDescription,
    functions: functions,
    dropletConfig: config,
    source: code
  });
}

/**
 * Removes all illegal characters from a library's name and insures it starts
 * with a capitalized letter.
 * @param {string} libraryName The name of the library
 * @returns {string} The name of the library without any illegal characters.
 */
export function sanitizeName(libraryName) {
  // /\s+/g <- removes all whtespace
  // /\W/g <- removes all characters except numbers and letters and underscores
  let sanitizedName = libraryName.replace(/\s+/g, '').replace(/\W/g, '');
  if (sanitizedName.length === 0 || !isNaN(sanitizedName.charAt(0))) {
    sanitizedName = 'Lib' + sanitizedName;
  }
  sanitizedName =
    sanitizedName.charAt(0).toUpperCase() + sanitizedName.slice(1);
  return sanitizedName;
}

export default {
  prepareLibraryForImport,
  getFunctions,
  createLibraryJson,
  sanitizeName,
  createLibraryClosure
};
