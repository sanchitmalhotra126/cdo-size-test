require_relative '../test_helper'
require 'cdo/i18n_string_url_tracker'

class TestI18nStringUrlTracker < Minitest::Test
  # We don't want to make actual calls to the AWS Firehose apis, so stub it and verify we are trying to send the right
  # data.
  def stub_firehose
    FirehoseClient.instance.stubs(:put_record).with do |stream, data|
      # Capture the data we try to send to firehose so we can verify it is what we expect.
      @firehose_stream = stream
      @firehose_record = data.dup
      true
    end
  end

  def unstub_firehose
    FirehoseClient.instance.unstub(:put_record)
    @firehose_stream = nil
    @firehose_record = nil
  end

  def stub_dcdo(flag)
    DCDO.stubs(:get).with(I18nStringUrlTracker::I18N_STRING_TRACKING_DCDO_KEY, false).returns(flag)
  end

  def unstub_dcdo
    DCDO.unstub(:get)
  end

  def setup
    super
    stub_firehose
    stub_dcdo(true)
  end

  def teardown
    super
    unstub_firehose
    unstub_dcdo
  end

  def test_instance_not_empty
    assert I18nStringUrlTracker.instance
  end

  def test_log_given_no_string_key_should_not_call_firehose
    unstub_firehose
    FirehoseClient.instance.expects(:put_record).never
    test_record = {string_key: nil, url: 'https://code.org', source: 'test'}
    I18nStringUrlTracker.instance.log(test_record[:string_key], test_record[:url], test_record[:source])
  end

  def test_log_given_no_url_should_not_call_firehose
    unstub_firehose
    FirehoseClient.instance.expects(:put_record).never
    test_record = {string_key: 'string.key', url: nil, source: 'test'}
    I18nStringUrlTracker.instance.log(test_record[:string_key], test_record[:url], test_record[:source])
  end

  def test_log_given_no_source_should_not_call_firehose
    unstub_firehose
    FirehoseClient.instance.expects(:put_record).never
    test_record = {string_key: 'string.key', url: 'https://code.org', source: nil}
    I18nStringUrlTracker.instance.log(test_record[:string_key], test_record[:url], test_record[:source])
  end

  def test_log_given_data_should_call_firehose
    test_record = {string_key: 'string.key', url: 'https://code.org', source: 'test'}
    I18nStringUrlTracker.instance.log(test_record[:string_key], test_record[:url], test_record[:source])
    assert_equal(:i18n, @firehose_stream)
    assert_equal(test_record, @firehose_record)
  end

  def test_log_given_url_with_query_string_should_call_firehose_without_query_string
    test_record = {string_key: 'string.key', url: 'https://code.org/?query=true', source: 'test'}
    expected_record = {string_key: 'string.key', url: 'https://code.org', source: 'test'}
    I18nStringUrlTracker.instance.log(test_record[:string_key], test_record[:url], test_record[:source])
    assert_equal(:i18n, @firehose_stream)
    assert_equal(expected_record, @firehose_record)
  end

  def test_log_given_url_with_anchor_tag_should_call_firehose_without_anchor_tag
    test_record = {string_key: 'string.key', url: 'https://code.org/#tag-youre-it', source: 'test'}
    expected_record = {string_key: 'string.key', url: 'https://code.org', source: 'test'}
    I18nStringUrlTracker.instance.log(test_record[:string_key], test_record[:url], test_record[:source])
    assert_equal(:i18n, @firehose_stream)
    assert_equal(expected_record, @firehose_record)
  end

  def test_log_given_projects_url_should_only_log_the_project_type
    test_record = {string_key: 'string.key', url: 'https://studio.code.org/projects/flappy/zjiufOp0h-9GS-DywevS0d3tKJyjdbQZZqZVaiuAjiU/view', source: 'test'}
    expected_record = {string_key: 'string.key', url: 'https://studio.code.org/projects/flappy', source: 'test'}
    I18nStringUrlTracker.instance.log(test_record[:string_key], test_record[:url], test_record[:source])
    assert_equal(:i18n, @firehose_stream)
    assert_equal(expected_record, @firehose_record)
  end

  def test_log_given_false_dcdo_flag_should_not_call_firehose
    unstub_firehose
    unstub_dcdo
    stub_dcdo(false)
    FirehoseClient.instance.expects(:put_record).never
    test_record = {string_key: 'string.key', url: 'https://code.org', source: 'test'}
    I18nStringUrlTracker.instance.log(test_record[:string_key], test_record[:url], test_record[:source])
  end

  def test_log_given_http_url_should_call_firehose_with_https_url
    test_record = {string_key: 'string.key', url: 'http://code.org', source: 'test'}
    expected_record = test_record.dup
    expected_record[:url] = 'https://code.org'
    I18nStringUrlTracker.instance.log(test_record[:string_key], test_record[:url], test_record[:source])
    assert_equal(:i18n, @firehose_stream)
    assert_equal(expected_record, @firehose_record)
  end

  def test_log_given_unknown_studio_url_should_not_be_logged
    unstub_firehose
    FirehoseClient.instance.expects(:put_record).never
    test_record = {string_key: 'string.key', url: 'https://studio.code.org/unknown/url', source: 'test'}
    I18nStringUrlTracker.instance.log(test_record[:string_key], test_record[:url], test_record[:source])
  end

  def test_log_given_studio_script_url_should_only_log_the_script_name
    test_record = {string_key: 'string.key', url: 'https://studio.code.org/s/dance-2019/stage/1/puzzle/1', source: 'test'}
    expected_record = {string_key: 'string.key', url: 'https://studio.code.org/s/dance-2019', source: 'test'}
    I18nStringUrlTracker.instance.log(test_record[:string_key], test_record[:url], test_record[:source])
    assert_equal(:i18n, @firehose_stream)
    assert_equal(expected_record, @firehose_record)
  end

  def test_log_given_hour_of_code_url_should_be_logged
    test_record = {string_key: 'string.key', url: 'https://hourofcode.com', source: 'test'}
    I18nStringUrlTracker.instance.log(test_record[:string_key], test_record[:url], test_record[:source])
    assert_equal(:i18n, @firehose_stream)
    assert_equal(test_record, @firehose_record)
  end

  def test_log_given_url_with_trailing_slash_should_log_without_trailing_slash
    test_record = {string_key: 'string.key', url: 'https://code.org/', source: 'test'}
    expected_record = {string_key: 'string.key', url: 'https://code.org', source: 'test'}
    I18nStringUrlTracker.instance.log(test_record[:string_key], test_record[:url], test_record[:source])
    assert_equal(:i18n, @firehose_stream)
    assert_equal(expected_record, @firehose_record)
  end

  def test_log_given_home_url_should_be_logged
    test_record = {string_key: 'string.key', url: 'https://studio.code.org/home', source: 'test'}
    I18nStringUrlTracker.instance.log(test_record[:string_key], test_record[:url], test_record[:source])
    assert_equal(:i18n, @firehose_stream)
    assert_equal(test_record, @firehose_record)
  end

  def test_log_given_teacher_dashboard_url_should_only_log_teacher_dashboard
    test_record = {string_key: 'string.key', url: 'https://studio.code.org/teacher_dashboard/sections/3263468/login_info', source: 'test'}
    expected_record = {string_key: 'string.key', url: 'https://studio.code.org/teacher_dashboard', source: 'test'}
    I18nStringUrlTracker.instance.log(test_record[:string_key], test_record[:url], test_record[:source])
    assert_equal(:i18n, @firehose_stream)
    assert_equal(expected_record, @firehose_record)
  end

  def test_log_given_courses_url_should_only_log_courses
    test_record = {string_key: 'string.key', url: 'https://studio.code.org/courses/csd-2020?section_id=3263468', source: 'test'}
    expected_record = {string_key: 'string.key', url: 'https://studio.code.org/courses', source: 'test'}
    I18nStringUrlTracker.instance.log(test_record[:string_key], test_record[:url], test_record[:source])
    assert_equal(:i18n, @firehose_stream)
    assert_equal(expected_record, @firehose_record)
  end

  def test_log_given_users_url_should_only_log_users
    test_record = {string_key: 'string.key', url: 'https://studio.code.org/users/edit', source: 'test'}
    expected_record = {string_key: 'string.key', url: 'https://studio.code.org/users', source: 'test'}
    I18nStringUrlTracker.instance.log(test_record[:string_key], test_record[:url], test_record[:source])
    assert_equal(:i18n, @firehose_stream)
    assert_equal(expected_record, @firehose_record)
  end
end
