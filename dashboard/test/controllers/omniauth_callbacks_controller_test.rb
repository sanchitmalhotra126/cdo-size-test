require 'test_helper'

class OmniauthCallbacksControllerTest < ActionController::TestCase
  include Mocha::API
  include UsersHelper

  setup do
    @request.env["devise.mapping"] = Devise.mappings[:user]
  end

  test "login: authorizing with known facebook account signs in" do
    user = create(:user, provider: 'facebook', uid: '1111')

    @request.env['omniauth.auth'] = OmniAuth::AuthHash.new(provider: 'facebook', uid: '1111')
    @request.env['omniauth.params'] = {}

    get :facebook

    assert_equal user.id, signed_in_user_id
  end

  test "login: authorizing with unknown facebook account needs additional information" do
    auth = OmniAuth::AuthHash.new(
      uid: '1111',
      provider: 'facebook',
      info: {
        nickname: '',
        name: 'someone',
        email: nil,
        user_type: nil,
        dob: nil,
        gender: nil
      },
    )
    @request.env['omniauth.auth'] = auth
    @request.env['omniauth.params'] = {}

    assert_does_not_create(User) do
      get :facebook
    end

    assert_redirected_to 'http://test.host/users/sign_up'
    attributes = session['devise.user_attributes']

    assert_nil attributes['email']
    assert_nil attributes['age']
  end

  test "login: authorizing with unknown clever teacher account" do
    auth = OmniAuth::AuthHash.new(
      uid: '1111',
      provider: 'clever',
      info: {
        nickname: '',
        name: {'first' => 'Hat', 'last' => 'Cat'},
        email: 'first_last@clever-teacher.xx',
        user_type: 'teacher',
        dob: nil,
        gender: nil
      },
    )
    @request.env['omniauth.auth'] = auth
    @request.env['omniauth.params'] = {}

    assert_creates(User) do
      get :clever
    end

    user = User.last
    assert_equal 'clever', user.provider
    assert_equal 'Hat Cat', user.name
    assert_equal User::TYPE_TEACHER, user.user_type
    assert_equal "21+", user.age # we know you're an adult if you are a teacher on clever
    assert_nil user.gender
  end

  test "login: authorizing with unknown clever district admin account creates teacher" do
    auth = OmniAuth::AuthHash.new(
      uid: '1111',
      provider: 'clever',
      info: {
        nickname: '',
        name: {'first' => 'Hat', 'last' => 'Cat'},
        email: 'first_last@clever-district-admin.xx',
        user_type: 'district_admin',
        dob: nil,
        gender: nil
      },
    )
    @request.env['omniauth.auth'] = auth
    @request.env['omniauth.params'] = {}

    assert_creates(User) do
      get :clever
    end

    user = User.last
    assert_equal 'clever', user.provider
    assert_equal 'Hat Cat', user.name
    assert_equal User::TYPE_TEACHER, user.user_type
    assert_equal "21+", user.age # we know you're an adult if you are a teacher on clever
    assert_nil user.gender
  end

  test "login: authorizing with unknown clever school admin account creates teacher" do
    auth = OmniAuth::AuthHash.new(
      uid: '1111',
      provider: 'clever',
      info: {
        nickname: '',
        name: {'first' => 'Hat', 'last' => 'Cat'},
        email: 'first_last@clever-school-admin.xx',
        user_type: 'school_admin',
        dob: nil,
        gender: nil
      },
    )
    @request.env['omniauth.auth'] = auth
    @request.env['omniauth.params'] = {}

    assert_creates(User) do
      get :clever
    end

    user = User.last
    assert_equal 'clever', user.provider
    assert_equal 'Hat Cat', user.name
    assert_equal User::TYPE_TEACHER, user.user_type
    assert_equal "21+", user.age # we know you're an adult if you are a teacher on clever
    assert_nil user.gender
  end

  test "login: authorizing with unknown clever teacher account needs additional information" do
    auth = OmniAuth::AuthHash.new(
      uid: '1111',
      provider: 'clever',
      info: {
        nickname: '',
        name: {'first' => 'Hat', 'last' => 'Cat'},
        email: nil,
        user_type: 'teacher',
        dob: nil,
        gender: nil
      },
    )
    @request.env['omniauth.auth'] = auth
    @request.env['omniauth.params'] = {}

    assert_does_not_create(User) do
      get :clever
    end

    assert_redirected_to 'http://test.host/users/sign_up'
    attributes = session['devise.user_attributes']

    assert_nil attributes['email']
  end

  test "login: authorizing with unknown clever student account creates student" do
    auth = OmniAuth::AuthHash.new(
      uid: '111133',
      provider: 'clever',
      info: {
        nickname: '',
        name: {'first' => 'Hat', 'last' => 'Cat'},
        email: nil,
        user_type: 'student',
        dob: Date.today - 10.years,
        gender: 'f'
      },
    )
    @request.env['omniauth.auth'] = auth
    @request.env['omniauth.params'] = {}

    assert_creates(User) do
      get :clever
    end

    user = User.last
    assert_equal 'clever', user.provider
    assert_equal 'Hat Cat', user.name
    assert_equal User::TYPE_STUDENT, user.user_type
    assert_equal 10, user.age
    assert_equal 'f', user.gender
  end

  # NOTE: Though this test really tests the User model, specifically the
  # before_save action hide_email_and_full_address_for_students, we include this
  # test here as there was concern authentication through clever could be a
  # workflow where we persist student email addresses.
  test "login: authorizing with unknown clever student account does not save email" do
    auth = OmniAuth::AuthHash.new(
      uid: '111133',
      provider: 'clever',
      info: {
        nickname: '',
        name: {'first' => 'Hat', 'last' => 'Cat'},
        email: 'hat.cat@example.com',
        user_type: 'student',
        dob: Date.today - 10.years,
        gender: 'f'
      },
    )
    @request.env['omniauth.auth'] = auth
    @request.env['omniauth.params'] = {}

    assert_creates(User) do
      get :clever
    end

    user = User.last
    assert_equal '', user.email
  end

  test "login: authorizing with unknown powerschool student account does not save email" do
    auth = OmniAuth::AuthHash.new(
      uid: '12345',
      provider: 'powerschool',
      info: {
        name: nil,
      },
      extra: {
        response: {
          message: {
            args: {
              '["http://openid.net/srv/ax/1.0", "value.ext0"]': 'student',
              '["http://openid.net/srv/ax/1.0", "value.ext1"]': 'splat.cat@example.com',
              '["http://openid.net/srv/ax/1.0", "value.ext2"]': 'splat',
              '["http://openid.net/srv/ax/1.0", "value.ext3"]': 'cat',
            }
          }
        }
      }
    )
    @request.env['omniauth.auth'] = auth
    @request.env['omniauth.params'] = {}

    assert_creates(User) do
      get :powerschool
    end

    user = User.last
    assert_equal '', user.email
  end

  test "login: authorizing with known clever student account does not alter email or hashed email" do
    clever_student = create(:student, provider: 'clever', uid: '111133')
    student_hashed_email = clever_student.hashed_email

    auth = OmniAuth::AuthHash.new(
      uid: '111133',
      provider: 'clever',
      info: {
        nickname: '',
        name: {'first' => 'Hat', 'last' => 'Cat'},
        email: 'hat.cat@example.com',
        user_type: 'student',
        dob: Date.today - 10.years,
        gender: 'f'
      },
    )
    @request.env['omniauth.auth'] = auth
    @request.env['omniauth.params'] = {}

    assert_does_not_create(User) do
      get :clever
    end

    user = User.last
    assert_equal '', user.email
    assert_equal student_hashed_email, user.hashed_email
  end

  test "login: adding google classroom permissions redirects to the homepage with a param to open the roster dialog" do
    user = create(:user, provider: 'google_oauth2', uid: '1111')

    @request.env['omniauth.auth'] = OmniAuth::AuthHash.new(provider: user.provider, uid: user.uid)
    @request.env['omniauth.params'] = {
      'scope' => 'userinfo.email,userinfo.profile,classroom.courses.readonly,classroom.rosters.readonly'
    }

    assert_does_not_create(User) do
      get :google_oauth2
    end
    assert_redirected_to 'http://test.host/home?open=rosterDialog'
  end

  test "login: omniauth callback sets token on user when passed with credentials" do
    auth = OmniAuth::AuthHash.new(
      uid: '1111',
      provider: 'facebook',
      info: {
        name: 'someone',
        email: 'test@email.com',
        user_type: User::TYPE_STUDENT,
        dob: Date.today - 20.years,
        gender: 'f'
      },
      credentials: {
        token: '123456'
      }
    )
    @request.env['omniauth.auth'] = auth
    @request.env['omniauth.params'] = {}

    assert_creates(User) do
      get :facebook
    end
    user = User.last
    assert_equal auth[:credentials][:token], user.oauth_token
  end

  # The following tests actually test the user model, but relate specifically to
  # oauth uniqueness checks so they are included here. These have not been working
  # in the past for subtle reasons.

  test "login: omniauth student is checked for email uniqueness against student" do
    email = 'duplicate@email.com'
    create(:user, email: email)

    auth = generate_auth_user_hash(email, User::TYPE_STUDENT)

    @request.env['omniauth.auth'] = auth
    @request.env['omniauth.params'] = {}

    assert_does_not_create(User) do
      get :facebook
    end
  end

  test "login: omniauth teacher is checked for email uniqueness against student" do
    email = 'duplicate@email.com'
    create(:user, email: email)

    auth = generate_auth_user_hash(email, User::TYPE_TEACHER)
    @request.env['omniauth.auth'] = auth
    @request.env['omniauth.params'] = {}

    assert_does_not_create(User) do
      get :facebook
    end
  end

  test "login: omniauth student is checked for email uniqueness against teacher" do
    email = 'duplicate@email.com'
    create(:teacher, email: email)

    auth = generate_auth_user_hash(email, User::TYPE_STUDENT)
    @request.env['omniauth.auth'] = auth
    @request.env['omniauth.params'] = {}

    assert_does_not_create(User) do
      get :facebook
    end
  end

  test "login: omniauth teacher is checked for email uniqueness against teacher" do
    email = 'duplicate@email.com'
    create(:teacher, email: email)

    auth = generate_auth_user_hash(email, User::TYPE_TEACHER)
    @request.env['omniauth.auth'] = auth
    @request.env['omniauth.params'] = {}

    assert_does_not_create(User) do
      get :facebook
    end
  end

  test 'login: oauth takeover transfers sections to taken over account' do
    User::OAUTH_PROVIDERS_UNTRUSTED_EMAIL.each do |provider|
      teacher = create :teacher
      section = create :section, user: teacher, login_type: 'clever'
      oauth_student = create :student, provider: provider, uid: '12345'
      student = create :student

      oauth_students = [oauth_student]
      section.set_exact_student_list(oauth_students)

      # Pull sections_as_student from the database and store them in an array to compare later
      sections_as_student = oauth_student.sections_as_student.to_ary

      @request.cookies[:pm] = 'clever_takeover'
      @request.session['clever_link_flag'] = provider
      @request.session['clever_takeover_id'] = oauth_student.uid
      @request.session['clever_takeover_token'] = '54321'
      check_and_apply_oauth_takeover(student)

      assert_equal sections_as_student, student.sections_as_student
    end
  end

  test 'login: prefers migrated user to legacy user' do
    legacy_student = create(:student, :unmigrated_google_sso)
    migrated_student = create(:student, :with_google_authentication_option, :multi_auth_migrated)
    migrated_student.primary_contact_info = migrated_student.authentication_options.first
    migrated_student.primary_contact_info.update(authentication_id: legacy_student.uid)

    auth = OmniAuth::AuthHash.new(
      uid: legacy_student.uid,
      provider: 'google_oauth2',
      credentials: {
        token: '123456'
      }
    )

    @request.env['omniauth.auth'] = auth
    @request.env['omniauth.params'] = {}

    assert_does_not_create(User) do
      get :google_oauth2
    end

    assert_equal migrated_student.id, signed_in_user_id
  end

  def generate_auth_user_hash(email, user_type)
    OmniAuth::AuthHash.new(
      uid: '1111',
      provider: 'facebook',
      info: {
        name: 'someone',
        email: email,
        user_type: user_type,
        dob: Date.today - 20.years,
        gender: 'f'
      }
    )
  end

  def setup_should_connect_provider(user, timestamp = Time.now)
    sign_in user
    session[:connect_provider] = timestamp
  end

  test 'connect_provider: returns bad_request if user not migrated' do
    user = create :user, :unmigrated_facebook_sso
    Timecop.freeze do
      setup_should_connect_provider(user)
      get :google_oauth2
      assert_response :bad_request
    end
  end

  test 'connect_provider: returns bad_request if session[:connect_provider] is expired' do
    user = create :user, :multi_auth_migrated
    Timecop.freeze do
      setup_should_connect_provider(user, 3.minutes.ago)
      get :google_oauth2
      assert_response :bad_request
    end
  end

  def assert_auth_option(user, oauth_hash)
    assert_equal 1, user.authentication_options.count
    auth_option = user.authentication_options.last

    assert_authentication_option auth_option,
      user: user,
      hashed_email: User.hash_email(oauth_hash.info.email),
      credential_type: oauth_hash.provider,
      authentication_id: user.uid,
      data: {
        oauth_token: oauth_hash.credentials.token,
        oauth_token_expiration: oauth_hash.credentials.expires_at,
        oauth_refresh_token: oauth_hash.credentials.refresh_token
      }
  end

  test 'connect_provider: creates new google auth option for signed in user' do
    user = create :user, :multi_auth_migrated, uid: 'some-uid'
    auth = OmniAuth::AuthHash.new(
      uid: user.uid,
      provider: 'google_oauth2',
      credentials: {
        token: '123456',
        expires_at: 'some-future-time',
        refresh_token: '654321'
      },
      info: {
        email: 'new@email.com'
      }
    )

    @request.env['omniauth.auth'] = auth

    Timecop.freeze do
      setup_should_connect_provider(user, 2.days.from_now)
      assert_creates(AuthenticationOption) do
        get :google_oauth2
      end

      user.reload
      assert_response :success
      assert_auth_option(user, auth)
    end
  end

  test 'connect_provider: creates new windowslive auth option for signed in user' do
    user = create :user, :multi_auth_migrated, uid: 'some-uid'
    auth = OmniAuth::AuthHash.new(
      uid: user.uid,
      provider: 'windowslive',
      credentials: {
        token: '123456',
        expires_at: 'some-future-time'
      },
      info: {
        email: 'new@email.com'
      }
    )

    @request.env['omniauth.auth'] = auth

    Timecop.freeze do
      setup_should_connect_provider(user, 2.days.from_now)
      assert_creates(AuthenticationOption) do
        get :windowslive
      end

      user.reload
      assert_response :success
      assert_auth_option(user, auth)
    end
  end

  test 'connect_provider: creates new facebook auth option for signed in user' do
    user = create :user, :multi_auth_migrated, uid: 'some-uid'
    auth = OmniAuth::AuthHash.new(
      uid: user.uid,
      provider: 'facebook',
      credentials: {
        token: '123456',
        expires_at: 'some-future-time'
      },
      info: {
        email: 'new@email.com'
      }
    )

    @request.env['omniauth.auth'] = auth

    Timecop.freeze do
      setup_should_connect_provider(user, 2.days.from_now)
      assert_creates(AuthenticationOption) do
        get :facebook
      end

      user.reload
      assert_response :success
      assert_auth_option(user, auth)
    end
  end

  test 'connect_provider: creates new clever auth option for signed in user' do
    user = create :user, :multi_auth_migrated, uid: 'some-uid'
    auth = OmniAuth::AuthHash.new(
      uid: user.uid,
      provider: 'clever',
      credentials: {
        token: '123456',
        expires_at: 'some-future-time'
      },
      info: {
        email: 'new@email.com'
      }
    )

    @request.env['omniauth.auth'] = auth

    Timecop.freeze do
      setup_should_connect_provider(user, 2.days.from_now)
      assert_creates(AuthenticationOption) do
        get :clever
      end

      user.reload
      assert_response :success
      assert_auth_option(user, auth)
    end
  end

  test 'connect_provider: creates new powerschool auth option for signed in user' do
    user = create :user, :multi_auth_migrated, uid: 'some-uid'
    auth = OmniAuth::AuthHash.new(
      uid: user.uid,
      provider: 'powerschool',
      credentials: {
        token: '123456',
        expires_at: 'some-future-time'
      },
      info: {
        email: 'new@email.com'
      }
    )

    @request.env['omniauth.auth'] = auth

    Timecop.freeze do
      setup_should_connect_provider(user, 2.days.from_now)
      assert_creates(AuthenticationOption) do
        get :powerschool
      end

      user.reload
      assert_response :success
      assert_auth_option(user, auth)
    end
  end

  test 'connect_provider: returns unprocessable_entity if AuthenticationOption cannot save' do
    AuthenticationOption.any_instance.expects(:save).returns(false)

    user = create :user, :multi_auth_migrated, uid: 'some-uid'
    auth = OmniAuth::AuthHash.new(
      uid: user.uid,
      provider: 'google_oauth2',
      credentials: {
        token: '123456',
        expires_at: 'some-future-time',
        refresh_token: '654321'
      },
      info: {
        email: 'new@email.com'
      }
    )

    @request.env['omniauth.auth'] = auth

    Timecop.freeze do
      setup_should_connect_provider(user, 2.days.from_now)
      assert_does_not_create(AuthenticationOption) do
        get :google_oauth2
      end

      assert_response :unprocessable_entity
    end
  end

  test 'connect: returns bad_request if user not signed in' do
    get :connect, params: {provider: 'google_oauth2'}
    assert_response :bad_request
  end

  test 'connect: returns bad_request if user not migrated' do
    user = create :user, :unmigrated_facebook_sso
    sign_in user
    get :connect, params: {provider: 'google_oauth2'}
    assert_response :bad_request
  end

  test 'connect: returns bad_request if provider not supported' do
    user = create :user, :multi_auth_migrated
    sign_in user
    get :connect, params: {provider: 'some_fake_provider'}
    assert_response :bad_request
  end

  test 'connect: sets connect_provider on session and redirects to google authorization' do
    user = create :user, :multi_auth_migrated
    sign_in user

    Timecop.freeze do
      get :connect, params: {provider: 'google_oauth2'}
      assert_equal 2.minutes.from_now, session[:connect_provider]
      assert_redirected_to 'http://test.host/users/auth/google_oauth2'
    end
  end

  test 'connect: sets connect_provider on session and redirects to facebook authorization' do
    user = create :user, :multi_auth_migrated
    sign_in user

    Timecop.freeze do
      get :connect, params: {provider: 'facebook'}
      assert_equal 2.minutes.from_now, session[:connect_provider]
      assert_redirected_to 'http://test.host/users/auth/facebook'
    end
  end

  test 'connect: sets connect_provider on session and redirects to windowslive authorization' do
    user = create :user, :multi_auth_migrated
    sign_in user

    Timecop.freeze do
      get :connect, params: {provider: 'windowslive'}
      assert_equal 2.minutes.from_now, session[:connect_provider]
      assert_redirected_to 'http://test.host/users/auth/windowslive'
    end
  end

  test 'connect: sets connect_provider on session and redirects to clever authorization' do
    user = create :user, :multi_auth_migrated
    sign_in user

    Timecop.freeze do
      get :connect, params: {provider: 'clever'}
      assert_equal 2.minutes.from_now, session[:connect_provider]
      assert_redirected_to 'http://test.host/users/auth/clever'
    end
  end

  test 'connect: sets connect_provider on session and redirects to powerschool authorization' do
    user = create :user, :multi_auth_migrated
    sign_in user

    Timecop.freeze do
      get :connect, params: {provider: 'powerschool'}
      assert_equal 2.minutes.from_now, session[:connect_provider]
      assert_redirected_to 'http://test.host/users/auth/powerschool'
    end
  end
end
