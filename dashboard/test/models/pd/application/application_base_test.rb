require 'test_helper'

module Pd::Application
  class ApplicationBaseTest < ActiveSupport::TestCase
    include ApplicationConstants

    test 'required fields' do
      application = ApplicationBase.new
      refute application.valid?
      assert_equal(
        [
          'Form data is required',
          'User is required',
          'Application type is not included in the list',
          'Application year is not included in the list',
          'Type is required'
        ],
        application.errors.full_messages
      )
    end

    test 'derived classes override type and year' do
      application = Teacher1819Application.new
      assert_equal TEACHER_APPLICATION, application.application_type
      assert_equal YEAR_18_19, application.application_year

      # with form_data and user, it is valid
      application.form_data = {}.to_json
      application.user = create(:user)
      assert application.valid?
    end

    test 'default status is unreviewed' do
      application = ApplicationBase.new

      assert_equal 'unreviewed', application.status
      assert application.unreviewed?
    end

    test 'can update status' do
      application = create :pd_facilitator1819_application
      assert application.unreviewed?

      application.update(status: 'pending')
      assert application.pending?

      application.reload
      assert application.pending?
    end

    test 'regional partner name' do
      partner = build :regional_partner
      application = build :pd_facilitator1819_application, regional_partner: partner

      assert_equal partner.name, application.regional_partner_name
    end

    test 'school name' do
      school_info = build :school_info
      teacher = build :teacher, school_info: school_info
      application = build :pd_facilitator1819_application, user: teacher

      assert_equal school_info.effective_school_name.titleize, application.school_name
    end

    test 'district name' do
      school_info = create :school_info
      teacher = build :teacher, school_info: school_info
      application = build :pd_facilitator1819_application, user: teacher

      assert_equal school_info.effective_school_district_name.titleize, application.district_name
    end
  end
end
