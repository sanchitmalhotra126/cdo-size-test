# This can be viewed on non-production environments at /rails/mailers/pd/teacher_application_mailer
class Pd::Teacher1819ApplicationMailerPreview < ActionMailer::Preview
  include FactoryGirl::Syntax::Methods

  def teachercon_accepted
    Pd::Application::Teacher1819ApplicationMailer.teachercon_accepted build_application
  end

  def local_summer_accepted
    Pd::Application::Teacher1819ApplicationMailer.local_summer_accepted build_application
  end

  private

  def build_application(course: 'csp')
    # Build user explicitly (instead of create) so it's not saved
    school_info = build :school_info, school: School.first
    user = build :teacher, email: 'rubeus@hogwarts.co.uk', school_info: school_info
    application_hash = build :pd_teacher1819_application_hash, school: School.first
    application = build :pd_teacher1819_application, user: user, course: course, form_data: application_hash.to_json, regional_partner: RegionalPartner.first
    application.pd_workshop_id = Pd::Workshop.first.id
    application.generate_application_guid
    application
  end
end
