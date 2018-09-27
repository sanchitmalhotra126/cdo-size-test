require 'test_helper'

module OmniauthCallbacksControllerTests
  #
  # Tests over Clever sign-up and sign-in stories
  #
  class CleverTest < ActionDispatch::IntegrationTest
    setup do
      # See https://github.com/omniauth/omniauth/wiki/Integration-Testing
      OmniAuth.config.test_mode = true

      # Skip firehose logging for these tests, unless explicitly requested
      FirehoseClient.instance.stubs(:put_record)

      # Force split-test to control group (override in tests over experiment)
      SignUpTracking.stubs(:split_test_percentage).returns(0)
    end

    test "student sign-up" do
      mock_oauth generate_auth_hash user_type: User::TYPE_STUDENT

      # The user signs in through their Clever portal
      # The oauth endpoint (which is mocked) redirects to the oauth callback,
      # which in turn redirects to the finish-sign-up experience.
      get '/users/auth/clever'
      assert_redirected_to '/users/auth/clever/callback'
      assert_creates User do
        follow_redirect!
      end
      assert_redirected_to '/'
      follow_redirect!
      assert_redirected_to '/home'
      assert_equal I18n.t('auth.signed_in'), flash[:notice]

      # Locate new user, make sure it has all the oauth info we'd expect
      created_user = User.find_by_credential(
        type: @auth_hash.provider,
        id: @auth_hash.uid
      )
      assert created_user.valid?
      assert created_user.student?
      assert_empty created_user.email
      assert_nil created_user.hashed_email
      assert_equal @auth_hash.credentials.token, created_user.oauth_token
      assert_equal @auth_hash.credentials.expires_at, created_user.oauth_token_expiration
    ensure
      created_user&.destroy!
    end

    test "teacher sign-up" do
      mock_oauth generate_auth_hash user_type: User::TYPE_TEACHER

      # The user signs in through their Clever portal
      # The oauth endpoint (which is mocked) redirects to the oauth callback,
      # which in turn redirects to the finish-sign-up experience.
      get '/users/auth/clever'
      assert_redirected_to '/users/auth/clever/callback'
      assert_creates User do
        follow_redirect!
      end
      assert_redirected_to '/home'
      assert_equal I18n.t('auth.signed_in'), flash[:notice]

      # Locate new user, make sure it has all the oauth info we'd expect
      created_user = User.find_by_credential(
        type: @auth_hash.provider,
        id: @auth_hash.uid
      )
      assert created_user.valid?
      assert created_user.teacher?
      assert_equal @auth_hash.info.email, created_user.email
      assert_equal @auth_hash.credentials.token, created_user.oauth_token
      assert_equal @auth_hash.credentials.expires_at, created_user.oauth_token_expiration
    ensure
      created_user&.destroy!
    end

    test "student sign-up (new sign-up flow)" do
      mock_oauth generate_auth_hash user_type: User::TYPE_STUDENT
      SignUpTracking.stubs(:split_test_percentage).returns(100)

      # The user signs in through their Clever portal
      # The oauth endpoint (which is mocked) redirects to the oauth callback,
      # which in turn redirects to the finish-sign-up experience.
      get '/users/auth/clever'
      assert_redirected_to '/users/auth/clever/callback'
      follow_redirect!
      assert_redirected_to '/users/sign_up'
      follow_redirect!
      assert_template partial: '_finish_sign_up'

      # The user fills out the form and clicks "Sign up"
      assert_creates User do
        post '/users', params: finish_sign_up_params(user_type: User::TYPE_STUDENT)
      end
      assert_redirected_to '/'
      follow_redirect!
      assert_redirected_to '/home'
      assert_equal I18n.t('devise.registrations.signed_up'), flash[:notice]

      # Locate new user, make sure it has all the oauth info we'd expect
      created_user = User.find_by_credential(
        type: @auth_hash.provider,
        id: @auth_hash.uid
      )
      assert created_user.valid?
      assert created_user.student?
      assert_empty created_user.email
      assert_nil created_user.hashed_email
      assert_equal @auth_hash.credentials.token, created_user.oauth_token
      assert_equal @auth_hash.credentials.expires_at, created_user.oauth_token_expiration
    ensure
      created_user&.destroy!
    end

    test "teacher sign-up (new sign-up flow)" do
      mock_oauth generate_auth_hash user_type: User::TYPE_TEACHER
      SignUpTracking.stubs(:split_test_percentage).returns(100)

      # The user signs in through their Clever portal
      # The oauth endpoint (which is mocked) redirects to the oauth callback,
      # which in turn redirects to the finish-sign-up experience.
      get '/users/auth/clever'
      assert_redirected_to '/users/auth/clever/callback'
      follow_redirect!
      assert_redirected_to '/users/sign_up'
      follow_redirect!
      assert_template partial: '_finish_sign_up'

      # The user fills out the form and clicks "Sign up"
      assert_creates User do
        post '/users', params: finish_sign_up_params(user_type: User::TYPE_TEACHER)
      end
      assert_redirected_to '/home'
      assert_equal I18n.t('devise.registrations.signed_up'), flash[:notice]

      # Locate new user, make sure it has all the oauth info we'd expect
      created_user = User.find_by_credential(
        type: @auth_hash.provider,
        id: @auth_hash.uid
      )
      assert created_user.valid?
      assert created_user.teacher?
      assert_equal @auth_hash.info.email, created_user.email
      assert_equal @auth_hash.credentials.token, created_user.oauth_token
      assert_equal @auth_hash.credentials.expires_at, created_user.oauth_token_expiration
    ensure
      created_user&.destroy!
    end

    test "student sign-in" do
      mock_oauth generate_auth_hash user_type: User::TYPE_STUDENT

      student = create(:student, :unmigrated_clever_sso, uid: @auth_hash.uid)

      # The user signs in through their Clever portal
      # The oauth endpoint (which is mocked) redirects to the oauth callback,
      # which in turn signs the user in.
      get '/users/auth/clever'
      assert_redirected_to '/users/auth/clever/callback'
      follow_redirect!
      assert_redirected_to '/'
      follow_redirect!
      assert_redirected_to '/home'
      assert_equal I18n.t('auth.signed_in'), flash[:notice]
      assert_equal student.id, signed_in_user_id

      # Make sure user has all the oauth info we'd expect
      student.reload
      assert_equal @auth_hash.credentials.token, student.oauth_token
      assert_equal @auth_hash.credentials.expires_at, student.oauth_token_expiration
    end

    test "teacher sign-in" do
      mock_oauth generate_auth_hash user_type: User::TYPE_TEACHER

      teacher = create(:teacher, :unmigrated_clever_sso, uid: @auth_hash.uid)

      # The user signs in through their Clever portal
      # The oauth endpoint (which is mocked) redirects to the oauth callback,
      # which in turn signs the user in.
      get '/users/auth/clever'
      assert_redirected_to '/users/auth/clever/callback'
      follow_redirect!
      assert_redirected_to '/home'
      assert_equal I18n.t('auth.signed_in'), flash[:notice]
      assert_equal teacher.id, signed_in_user_id

      # Make sure user has all the oauth info we'd expect
      teacher.reload
      assert_equal @auth_hash.credentials.token, teacher.oauth_token
      assert_equal @auth_hash.credentials.expires_at, teacher.oauth_token_expiration
    end

    private

    EMAIL = 'upgraded@code.org'
    DEFAULT_UID = '1111'

    def mock_oauth(auth_hash = generate_auth_hash)
      @auth_hash = auth_hash
      OmniAuth.config.mock_auth[:clever] = @auth_hash
    end

    def generate_auth_hash(args = {})
      OmniAuth::AuthHash.new(
        uid: args[:uid] || DEFAULT_UID,
        provider: args[:provider] || AuthenticationOption::CLEVER,
        info: {
          name: args[:name] || 'someone',
          email: args[:email] || EMAIL,
          user_type: args[:user_type].presence,
          dob: args[:dob] || Date.today - 20.years,
          gender: args[:gender] || 'f'
        },
        credentials: {
          token: args[:token] || 'fake-token',
          expires_at: args[:expires_at] || 'fake-token-expiration'
        }
      )
    end

    def finish_sign_up_params(override_params)
      user_type = override_params[:user_type] || User::TYPE_STUDENT
      if user_type == User::TYPE_STUDENT
        {
          user: {
            locale: 'en-US',
            user_type: user_type,
            name: @auth_hash.info.name,
            age: '13',
            gender: 'f',
            school_info_attributes: {
              country: 'US'
            },
            terms_of_service_version: 1,
            email_preference_opt_in: nil,
          }.merge(override_params)
        }
      else
        {
          user: {
            locale: 'en-US',
            user_type: user_type,
            name: @auth_hash.info.name,
            age: '21+',
            gender: nil,
            school_info_attributes: {
              country: 'US'
            },
            terms_of_service_version: 1,
            email_preference_opt_in: 'yes',
          }.merge(override_params)
        }
      end
    end
  end
end
