import * as applabConstants from './constants';
import {getStore} from '../redux';
import project from '../code-studio/initApp/project';
import * as thumbnailUtils from '../util/thumbnail';

// Needed by html2canvas in SVGContainer.hasFabric to work on IE 11.
window.html2canvas = thumbnailUtils.html2canvas;

// The width and height in pixels of the thumbnail image to capture.
const THUMBNAIL_SIZE = 180;

/**
 * @type {number} The last time at which a screenshot capture was attempted.
 */
let lastCaptureTimeMs = 0;

/**
 * @type {boolean} Whether a screenshot capture is pending.
 */
let isCapturePending = false;

export function init() {
  lastCaptureTimeMs = 0;
  isCapturePending = false;
}

/**
 * Whether the thumbnail screenshot capture is complete. Needed for testing.
 * @returns {boolean}
 */
export function isCaptureComplete() {
  return !isCapturePending;
}

export function captureScreenshot() {
  const isOwner = project.isOwner();
  const {isShareView, isEmbedView} = getStore().getState().pageConstants;
  if (isShareView || isEmbedView || !isOwner) {
    return;
  }

  // Skip capturing a screenshot if we just captured one recently.
  if (Date.now() - lastCaptureTimeMs < applabConstants.MIN_CAPTURE_INTERVAL_MS) {
    return;
  }
  lastCaptureTimeMs = Date.now();

  const visualization = document.getElementById('visualization');
  if (!visualization) {
    console.warn(`visualization not found. skipping screenshot.`);
    return;
  }

  isCapturePending = true;

  // Record a square center-cropped image of the app window.

  const options = {
    background: '#eee',
  };

  // html2canvas can take up to 2 seconds to capture the visualization contents
  // onto the canvas.
  thumbnailUtils.html2canvas(visualization, options).then(canvas => {
    if (!isCapturePending) {
      // We most likely got here because a level test triggered a screenshot
      // capture, the test completed, and then another test started before the
      // capture completed.
      console.log('not saving screenshot because no capture is pending');
      return;
    }

    // Center-crop and scale the image down so we don't send so much data over
    // the network.
    const thumbnailCanvas = thumbnailUtils.createThumbnail(canvas, THUMBNAIL_SIZE);

    return new Promise((resolve, reject) => {
      thumbnailCanvas.toBlob(pngBlob => {
        project.saveThumbnail(pngBlob).then(resolve, reject);
      });
    });
  }).catch(e => {
    console.log(`error capturing screenshot: ${e}`);
  }).then(() => {
    isCapturePending = false;
  });
}
