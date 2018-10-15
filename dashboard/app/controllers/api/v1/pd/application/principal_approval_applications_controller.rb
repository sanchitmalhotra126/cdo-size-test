module Api::V1::Pd::Application
  class PrincipalApprovalApplicationsController < Api::V1::Pd::FormsController
    include Pd::Application::ActiveApplicationModels

    def new_form
      @application = PRINCIPAL_APPROVAL_APPLICATION_CLASS.find_or_create_by(
        application_guid: params.require(:application_guid)
      )
    end

    protected

    def on_successful_create
      # Approval application created, now score corresponding teacher application
      teacher_application = TEACHER_APPLICATION_CLASS.find_by!(application_guid: @application.application_guid)
      principal_response = @application.sanitize_form_data_hash

      response = principal_response.values_at(:replace_course, :replace_course_other).compact.join(": ")
      replaced_courses = principal_response.values_at(:replace_which_course_csp, :replace_which_course_csd).compact.join(', ')
      # Sub out :: for : because "I don't know:" has a colon on the end
      replace_course_string = "#{response}#{replaced_courses.present? ? ': ' + replaced_courses : ''}".gsub('::', ':')

      course = teacher_application.course
      implementation_string = principal_response.values_at("#{course}_implementation".to_sym, "#{course}_implementation_other".to_sym).compact.join(" ")

      teacher_application.update_form_data_hash(
        {
          principal_approval: principal_response.values_at(:do_you_approve, :do_you_approve_other).compact.join(" "),
          principal_plan_to_teach: principal_response.values_at(:plan_to_teach, :plan_to_teach_other).compact.join(" "),
          principal_schedule_confirmed: principal_response.values_at(:committed_to_master_schedule, :committed_to_master_schedule_other).compact.join(" "),
          principal_implementation: implementation_string,
          principal_diversity_recruitment: principal_response.values_at(:committed_to_diversity, :committed_to_diversity_other).compact.join(" "),
          principal_free_lunch_percent: format("%0.02f%%", principal_response[:free_lunch_percent]),
          principal_underrepresented_minority_percent: format("%0.02f%%", @application.underrepresented_minority_percent),
          principal_wont_replace_existing_course: replace_course_string,
          principal_how_heard: principal_response.values_at(:how_heard, :how_heard_other).compact.join(" "),
          principal_send_ap_scores: principal_response[:send_ap_scores],
          principal_pay_fee: principal_response[:pay_fee]
        }
      )
      teacher_application.save!
      teacher_application.auto_score!
      teacher_application.queue_email(:principal_approval_completed, deliver_now: true)
      teacher_application.queue_email(:principal_approval_completed_partner, deliver_now: true)
    end
  end
end
