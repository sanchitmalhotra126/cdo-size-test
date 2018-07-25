# == Schema Information
#
# Table name: teacher_feedbacks
#
#  id         :integer          not null, primary key
#  comment    :text(65535)
#  student_id :integer
#  level_id   :integer
#  teacher_id :integer
#  created_at :datetime         not null
#  updated_at :datetime         not null
#  deleted_at :datetime
#
# Indexes
#
#  index_feedback_on_student_and_level                 (student_id,level_id)
#  index_feedback_on_student_and_level_and_teacher_id  (student_id,level_id,teacher_id)
#

class TeacherFeedback < ApplicationRecord
  acts_as_paranoid # use deleted_at column instead of deleting rows
  validates_presence_of :student_id, :level_id, :teacher_id
  belongs_to :student, class_name: 'User'
  has_many :student_sections, class_name: 'Section', through: :student, source: 'sections_as_student'
  belongs_to :level
  belongs_to :teacher, class_name: 'User'

  def self.latest_per_teacher
    feedbacks = find(group(:teacher_id).maximum(:id).values)

    #Only select feedback from teachers who lead sections in which the student is still enrolled
    feedbacks.select {|feedback| User.find_by(id: feedback.teacher_id).students.exists?(feedback.student_id)}
  end

  def self.latest
    find_by(id: maximum(:id))
  end
end
