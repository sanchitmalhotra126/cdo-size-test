class BackfillScriptIdInTeacherFeedbacks < ActiveRecord::Migration[5.2]
  def up
    # In production, this migration will already have been done via
    # bin/oneoff/backfill_data/backfill_script_ids_in_teacher_feedbacks.rb,
    # because this operation may take longer there to update 2M rows then we
    # want to spend in the middle of a deploy to production.
    #
    # The purpose of this part of the migration is to fix any other environments,
    # such as staging, test, and local development.
    unless Rails.env.production?
      # Do not batch, because we do not expect many of these to exist in
      # non-production environments.
      TeacherFeedback.where(script_id: nil).find_each do |teacher_feedback|
        script_id = teacher_feedback.script_level.script_id
        teacher_feedback.update!(script_id: script_id)
      end
    end

    change_column :teacher_feedbacks, :script_id, :integer, null: false
  end

  def down
    change_column :teacher_feedbacks, :script_id, :integer, null: true
  end
end
