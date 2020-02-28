require 'test_helper'

class Api::V1::Pd::WorkshopSurveyFoormSubmissionsControllerTest < ::ActionController::TestCase
  self.use_transactional_test_case = true
  setup_all do
    @user = create :user
    @pd_summer_workshop = create :csp_summer_workshop
    @foorm_form = create :foorm_form
  end

  test 'can create and save survey submission' do
    params = {
      answers: {
        question1: 'answer1'
      },
      user_id: @user.id,
      pd_workshop_id: @pd_summer_workshop.id,
      pd_session_id: nil,
      day: 0,
      form_name: @foorm_form.name,
      form_version: @foorm_form.version
    }

    response = post :create, params: params
    assert_response :created
    response_body = JSON.parse(response.body)
    assert_not_nil response_body['submission_id']
    assert_not_nil response_body['survey_submission_id']
  end
end
