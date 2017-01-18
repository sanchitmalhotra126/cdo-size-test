import { TestResults } from '../../constants';

export default class FreeResponse {
  constructor(levelId) {
    this.levelId = levelId;

    $(document).ready(function () {
      var textarea = $(`textarea#level_${levelId}.response`);
      textarea.blur(function () {
        window.dashboard.codeStudioLevels.onAnswerChanged(levelId, true);
      });
      textarea.on('input', null, null, function () {
        window.dashboard.codeStudioLevels.onAnswerChanged(levelId, false);
      });
    });
  }

  getResult() {
    var response = $(`#level_${this.levelId}`).val();
    return {
      response: response,
      valid: response.length > 0,
      result: true,
      testResult: TestResults.FREE_PLAY,
    };
  }

  getAppName() {
    return 'free_response';
  }

  lockAnswers() {
    $(`textarea#level_${this.levelId}.response`).prop('disabled', true);
  }

  getCurrentAnswerFeedback() {
    // Not implemented
  }
}
