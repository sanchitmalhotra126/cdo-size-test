require 'test_helper'

module Pd::Foorm
  class RollupHelperTest < ActiveSupport::TestCase
    setup_all do
      @rollup_configuration = JSON.parse(File.read('test/fixtures/rollup_config.json'), symbolize_names: true)
      daily_survey_day_0 = ::Foorm::Form.find_by_name('surveys/pd/workshop_daily_survey_day_0')
      daily_survey_day_5 = ::Foorm::Form.find_by_name('surveys/pd/workshop_daily_survey_day_5')
      @parsed_forms = FoormParser.parse_forms([daily_survey_day_0, daily_survey_day_5])
    end

    test 'creates question details for CSD rollup' do
      questions_to_summarize = @rollup_configuration['CS Discoveries'.to_sym]
      question_details = RollupHelper.get_question_details_for_rollup(@parsed_forms, questions_to_summarize)

      expected_question_details = {
        teacher_engagement: {
          title: "How much do you agree or disagree with the following statements about your level of engagement in the workshop?",
          rows: {
            activities_engaging:  "I found the activities we did in this workshop interesting and engaging.",
            participated: "I was highly active and participated a lot in the workshop activities.",
            frequently_talk_about: "When I'm not in Code.org workshops, I frequently talk about ideas or content from the workshop with others.",
            planning_to_use: "I am definitely planning to make use of ideas and content covered in this workshop in my classroom."
          },
          column_count: 7,
          type: "matrix",
          header: "Teacher Engagement",
          form_keys: ["surveys/pd/workshop_daily_survey_day_5.0"]
        },
        overall_success: {
          title: "How much do you agree or disagree with the following statements about the workshop overall?",
          rows: {
            more_prepared: "I am more prepared to teach the material covered in this workshop than before I came.",
            know_help: "I know where to go if I need help preparing to teach this material.",
            pd_suitable_experience: "This professional development was suitable for my level of experience with teaching CS.",
            connected_community: "I feel connected to a community of computer science teachers.",
            would_recommend: "I would recommend this professional development to others.",
            absolute_best_pd: "This was the the absolute best professional development I have ever participated in."
          },
          column_count: 7,
          type: "matrix",
          header: "Overall Success",
          form_keys: ["surveys/pd/workshop_daily_survey_day_5.0"]
        },
        expertise_rating: {
          title: "Lead Learner. 1. model expertise in how to learn  --- 5. need deep content expertise",
          column_count: 5,
          type: "scale",
          form_keys: %w(surveys/pd/workshop_daily_survey_day_0.0 surveys/pd/workshop_daily_survey_day_5.0)
        }
      }

      assert_equal expected_question_details.with_indifferent_access, question_details.with_indifferent_access
    end
  end
end
