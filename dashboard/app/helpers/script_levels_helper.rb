module ScriptLevelsHelper
  include Plc::EvaluationsHelper

  def script_level_solved_response(response, script_level)
    next_user_redirect = next_progression_level_or_redirect_path(script_level)

    if has_another_level_to_go_to?(script_level)
      if script_level.end_of_stage?
        response[:stage_changing] = {previous: {name: script_level.name}}
      end
    else
      response[:message] = 'no more levels' # used by blockly to show a different feedback message on the last level

      if script_level.script.wrapup_video
        response[:video_info] = wrapup_video_then_redirect_response(
            script_level.script.wrapup_video, next_user_redirect)
        return
      end
    end

    response[:redirect] = next_user_redirect
  end

  def has_another_level_to_go_to?(script_level)
    script_level.next_progression_level
  end

  def next_progression_level_or_redirect_path(script_level)
    next_level =
      if script_level.level.unplugged? ||
          (script_level.stage && script_level.stage.unplugged?)
        # if we're coming from an unplugged level, it's ok to continue
        # to unplugged level (example: if you start a sequence of
        # assessments associated with an unplugged level you should
        # continue on that sequence instead of skipping to next stage)
        script_level.next_level
      else
        script_level.next_progression_level
      end

    if script_level.level.try(:is_plc_evaluation?)
      last_result = UserLevel.where(user: current_user, level: script_level.levels[0]).last
      level_source = LevelSource.where(id: last_result.level_source_id).last
      enrolled_modules = determine_preferred_learning_modules level_source, script_level.script
      enrollment_unit_assignment = Plc::EnrollmentUnitAssignment.find_by(user: current_user, plc_course_unit: script_level.script.plc_course_unit)
      preview_assignments_path(unit_assignment_id: enrollment_unit_assignment, params: {enrolled_modules: enrolled_modules})
    else
      next_level ?
          build_script_level_path(next_level) :
          script_completion_redirect(script_level.script)
    end
  end

  def wrapup_video_then_redirect_response(wrapup_video, redirect)
    video_info_response = wrapup_video.summarize
    video_info_response[:redirect] = redirect
    video_info_response
  end

  def script_completion_redirect(script)
    if script.hoc?
      script.hoc_finish_url
    elsif script.csf?
      script.csf_finish_url
    else
      root_path
    end
  end

  def twenty_hour_next_url
    script_level_path(:show, twenty_hour_path_params)
  end

  def twenty_hour_path_params
    {script_id: Script.twenty_hour_script.id, chapter: 'next'}
  end

  def tracking_pixel_url(script)
    if script.name == Script::HOC_2013_NAME
      CDO.code_org_url '/api/hour/begin_codeorg.png'
    else
      CDO.code_org_url "/api/hour/begin_#{script.name}.png"
    end
  end

  def section_options
    current_user.sections.map do |section|
      content_tag 'option', section.name, value: url_for(params.merge(section_id: section.id, user_id: nil))
    end.join(" ").html_safe
  end
end
