require 'test_helper'

class ProgrammingEnvironmentsControllerTest < ActionController::TestCase
  include Devise::Test::ControllerHelpers

  setup do
    @levelbuilder = create :levelbuilder
    Rails.application.config.stubs(:levelbuilder_mode).returns true
  end

  test 'data is passed down to edit page' do
    sign_in @levelbuilder

    programming_environment = create :programming_environment

    get :edit, params: {name: programming_environment.name}
    assert_response :ok

    edit_data = JSON.parse(css_select('script[data-programmingenvironment]').first.attribute('data-programmingenvironment').to_s)
    assert_equal programming_environment.name, edit_data['name']
  end

  test 'returns not_found if editing a non-existant programming environment' do
    sign_in @levelbuilder

    post :edit, params: {
      name: 'fake_name'
    }
    assert_response :not_found
  end

  test 'can update programming expression from params' do
    sign_in @levelbuilder

    programming_environment = create :programming_environment
    post :update, params: {
      name: programming_environment.name,
      title: 'title',
      description: 'description',
      editorType: 'blockly'
    }
    assert_response :ok

    programming_environment.reload
    assert_equal 'title', programming_environment.title
    assert_equal 'description', programming_environment.description
    assert_equal 'blockly', programming_environment.editor_type
  end

  test 'returns not_found if updating a non-existant programming environment' do
    sign_in @levelbuilder

    post :update, params: {
      name: 'fake_name',
      title: 'title'
    }
    assert_response :not_found
  end

  class AccessTests < ActionController::TestCase
    setup do
      File.stubs(:write)
      @programming_environment = create :programming_environment

      @update_params = {name: @programming_environment.name, title: 'new title'}
    end

    test_user_gets_response_for :edit, params: -> {{name: @programming_environment.name}}, user: nil, response: :redirect, redirected_to: '/users/sign_in'
    test_user_gets_response_for :edit, params: -> {{name: @programming_environment.name}}, user: :student, response: :forbidden
    test_user_gets_response_for :edit, params: -> {{name: @programming_environment.name}}, user: :teacher, response: :forbidden
    test_user_gets_response_for :edit, params: -> {{name: @programming_environment.name}}, user: :levelbuilder, response: :success

    test_user_gets_response_for :update, params: -> {{name: @programming_environment.name}}, user: nil, response: :redirect, redirected_to: '/users/sign_in'
    test_user_gets_response_for :update, params: -> {@update_params}, user: :student, response: :forbidden
    test_user_gets_response_for :update, params: -> {@update_params}, user: :teacher, response: :forbidden
    test_user_gets_response_for :update, params: -> {@update_params}, user: :levelbuilder, response: :success
  end
end
