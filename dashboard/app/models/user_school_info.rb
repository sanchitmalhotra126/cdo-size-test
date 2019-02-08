# == Schema Information
#
# Table name: user_school_infos
#
#  id                     :integer          not null, primary key
#  user_id                :integer
#  start_date             :datetime
#  end_date               :datetime
#  school_info_id         :integer
#  last_confirmation_date :datetime
#  created_at             :datetime         not null
#  updated_at             :datetime         not null
#

class UserSchoolInfo < ApplicationRecord
end
