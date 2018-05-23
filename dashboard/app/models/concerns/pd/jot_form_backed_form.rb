# Include in models that represent a JotForm (3rd party survey tool) form
# This will enable syncing and data manipulation
#
# Required model attributes:
#  - form_id: JotForm form id
#  - submission_id: JotForm submission id
#  - answers: JotForm submission answer data
module Pd
  module JotFormBackedForm
    extend ActiveSupport::Concern

    included do
      before_validation :map_answers_to_attributes, if: :answers_changed?

      validates_presence_of(
        :form_id,
        :submission_id,
        :answers
      )
    end

    class_methods do
      def get_last_known_submission_id(form_id)
        [
          where(form_id: form_id).maximum(:submission_id),
          last_known_submission_id_override(form_id)
        ].compact.max
      end

      def last_known_submission_id_override(form_id)
        # Add jotform_last_submission_id_overrides to locals.yml to manually set minimum submission ids for sync.
        # The format is a hash, form_id => last_known_submission_id
        #
        # This is useful to ignore older test submissions before we go live.
        CDO.jotform_last_submission_id_overrides.try do |override_hash|
          override_hash[form_id]
        end
      end

      # @return [Hash] mapping of model attributes to their respective JotForm question names,
      # from where they will be set before validation
      # @see map_answers_to_attributes
      def attribute_mapping
        {}
      end

      # Retrieve all form ids to sync
      # Override in included models
      def all_form_ids
        []
      end

      # Download new responses from JotForm for all relevant form ids
      def sync_all_from_jotform
        all_form_ids.compact.map {|form_id| sync_from_jotform(form_id)}.sum
      end

      def sync_questions_from_jotform(form_id)
        Pd::SurveyQuestion.sync_from_jotform form_id
      end

      # Download new responses from JotForm
      def sync_from_jotform(form_id = nil)
        return sync_all_from_jotform unless form_id

        sync_questions_from_jotform(form_id)

        JotForm::Translation.new(form_id).get_submissions(
          last_known_submission_id: get_last_known_submission_id(form_id)
        ).map do |submission|
          # TODO(Andrew): don't stop the whole set when one fails

          # When we pass the last_known_submission_id filter, there should be no duplicates,
          # But just in case handle them gracefully as an upsert.
          find_or_initialize_by(submission.slice(:form_id, :submission_id)).tap do |model|
            model.update! answers: submission[:answers].to_json
          end
        end
      end

      # Get a form id from the configuration
      # These can be supplied in globals.yml or locals.yml in the form:
      #   jotform_forms:
      #     {category}:
      #       {name}: {id}
      # @param category [String]
      # @param name [String]
      # @raises [KeyError] when either the category or name cannot be found
      # @return [Integer] form id
      def get_form_id(category, name)
        raise KeyError, "Missing jotform form category #{category}" unless CDO.jotform_forms&.key? category
        forms = CDO.jotform_forms[category]
        raise KeyError, "Mising jotform form: #{category}.#{name}" unless forms.key? name
        forms[name]
      end

      def questions_for_form(form_id)
        survey_question = SurveyQuestion.find_by(form_id: form_id)
        raise KeyError, "No survey questions for form #{form_id}" unless survey_question
        survey_question.form_questions
      end
    end

    # Supplies values for important model attributes from the JotForm-downloaded form answers.
    # Run before validation.
    # Override attribute_mapping in included models to designate attributes to map.
    # @see attribute_mapping
    def map_answers_to_attributes
      self.class.attribute_mapping.each do |attribute, question_name|
        write_attribute attribute, form_data_hash[question_name.to_s]
      end
    end

    # Get question for this form
    def questions
      self.class.questions_for_form(form_id)
    end

    # Answers json parsed in hash form
    def answers_hash
      JSON.parse answers
    end

    # Form data JSON
    def form_data
      form_data_hash.to_json
    end

    # Form data hash: answers data processed by up to date form questions
    # @see FormQuestions.process_answers
    def form_data_hash
      @form_data_hash ||= begin
        questions.process_answers(answers_hash)
      rescue StandardError => e
        raise "Error processing answers for submission id #{submission_id}: #{e.message}"
      end
    end

    def answers=(value)
      @form_data_hash = nil
      write_attribute :answers, value
    end

    def reload
      @form_data_hash = nil
      super
    end
  end
end
