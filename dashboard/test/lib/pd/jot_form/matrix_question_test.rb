require 'test_helper'
require 'pd/jot_form/matrix_question'

module Pd
  module JotForm
    class MatrixQuestionTest < ActiveSupport::TestCase
      include Constants

      test 'parse jotform question data for matrix' do
        data = {
          id: '1',
          type: TYPE_MATRIX,
          name: 'sampleMatrix',
          text: 'This is a matrix label',
          order: '1',
          mcolumns: 'Strongly Agree|Agree|Neutral|Disagree|Strongly Disagree',
          mrows: 'Question 1|Question 2'
        }.stringify_keys

        question = MatrixQuestion.from_jotform_question(
          id: '1',
          type: TYPE_MATRIX,
          jotform_question: data
        )
        assert question.is_a? MatrixQuestion
        assert_equal 1, question.id
        assert_equal TYPE_MATRIX, question.type
        assert_equal 'sampleMatrix', question.name
        assert_equal 'This is a matrix label', question.text
        assert_equal 1, question.order
        assert_equal ANSWER_SELECT_VALUE, question.answer_type
        assert_equal ['Strongly Agree', 'Agree', 'Neutral', 'Disagree', 'Strongly Disagree'], question.options
        assert_equal ['Question 1', 'Question 2'], question.sub_questions
      end

      test 'get_value' do
        question = MatrixQuestion.new(
          id: 1,
          options: %w(Agree Neutral Disagree),
          sub_questions: ['Question 1', 'Question 2']
        )

        answer = {
          'Question 1' => 'Neutral',
          'Question 2' => 'Agree'
        }

        assert_equal(
          {0 => 2, 1 => 1},
          question.get_value(answer)
        )
      end

      test 'get_value errors' do
        question = MatrixQuestion.new(
          id: 1,
          options: %w(Agree Neutral Disagree),
          sub_questions: ['Question 1']
        )

        e = assert_raises do
          question.get_value({'Nonexistent Question' => 'Agree'})
        end
        assert_equal "Unable to find sub-question 'Nonexistent Question' in matrix question 1", e.message

        e = assert_raises do
          question.get_value('Question 1' => 'Nonexistent Answer')
        end
        assert_equal "Unable to find 'Nonexistent Answer' in the options for matrix question 1", e.message
      end

      test 'to_summary' do
        question = MatrixQuestion.new(
          id: 1,
          name: 'sampleMatrix',
          sub_questions: ['Question 1', 'Question 2']
        )

        assert_equal(
          {
            'sampleMatrix_0' => {text: 'Question 1', answer_type: ANSWER_SELECT_VALUE},
            'sampleMatrix_1' => {text: 'Question 2', answer_type: ANSWER_SELECT_VALUE}
          },
          question.to_summary
        )
      end

      test 'to_form_data' do
        question = MatrixQuestion.new(
          id: 1,
          name: 'sampleMatrix',
          options: %w(Agree Neutral Disagree),
          sub_questions: ['Question 1', 'Question 2']
        )

        answer = {
          'Question 1' => 'Disagree',
          'Question 2' => 'Agree'
        }

        assert_equal(
          {
            'sampleMatrix_0' => 3,
            'sampleMatrix_1' => 1
          },
          question.to_form_data(answer)
        )
      end

      test 'to hash and back' do
        hash = {
          id: 1,
          type: TYPE_MATRIX,
          name: 'a name',
          text: 'label',
          order: 1,
          options: %w(One Two Three),
          sub_questions: ['Question 1', 'Question 2']
        }

        question = MatrixQuestion.new(hash)
        assert_equal hash, question.to_h
      end
    end
  end
end
