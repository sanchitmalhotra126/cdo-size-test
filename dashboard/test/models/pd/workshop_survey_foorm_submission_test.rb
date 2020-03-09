require 'test_helper'

module Pd
  class WorkshopSurveyFoormSubmissionTest < ActiveSupport::TestCase
    self.use_transactional_test_case = true
    setup_all do
      @user = create :user
      @pd_summer_workshop = create :csp_summer_workshop
      @foorm_form = create :foorm_form
    end

    test 'save workshop with submission' do
      workshop_survey = Pd::WorkshopSurveyFoormSubmission.new(user_id: @user.id, pd_workshop_id: @pd_summer_workshop.id, day: 0)
      workshop_survey.save_with_foorm_submission({'question1': 'answer1'}, @foorm_form.name, @foorm_form.version)
      assert_equal @foorm_form.name, workshop_survey.foorm_submission.form_name
    end

    test 'can check that survey has already been submitted' do
      workshop_survey = Pd::WorkshopSurveyFoormSubmission.new(user_id: @user.id, pd_workshop_id: @pd_summer_workshop.id, day: 0)
      workshop_survey.save_with_foorm_submission({'question1': 'answer1'}, @foorm_form.name, @foorm_form.version)

      assert Pd::WorkshopSurveyFoormSubmission.has_submitted_form?(@user.id, @pd_summer_workshop.id, nil, 0, @foorm_form.name)
    end

    test 'can check that survey has already been submitted without form name' do
      workshop_survey = Pd::WorkshopSurveyFoormSubmission.new(user_id: @user.id, pd_workshop_id: @pd_summer_workshop.id, day: 0)
      workshop_survey.save_with_foorm_submission({'question1': 'answer1'}, @foorm_form.name, @foorm_form.version)

      assert Pd::WorkshopSurveyFoormSubmission.has_submitted_form?(@user.id, @pd_summer_workshop.id, nil, 0, nil)
    end

    test 'can check that survey has not already been submitted' do
      refute Pd::WorkshopSurveyFoormSubmission.has_submitted_form?(@user.id, @pd_summer_workshop.id, nil, nil, @foorm_form.name)
    end
  end
end
