# == Schema Information
#
# Table name: pd_workshop_daily_surveys
#
#  id             :integer          not null, primary key
#  form_id        :integer          not null
#  submission_id  :integer          not null
#  user_id        :integer          not null
#  pd_session_id  :integer
#  pd_workshop_id :integer          not null
#  answers        :text(65535)
#  day            :integer          not null
#
# Indexes
#
#  index_pd_workshop_daily_surveys_on_form_id                 (form_id)
#  index_pd_workshop_daily_surveys_on_pd_session_id           (pd_session_id)
#  index_pd_workshop_daily_surveys_on_pd_workshop_id          (pd_workshop_id)
#  index_pd_workshop_daily_surveys_on_submission_id           (submission_id) UNIQUE
#  index_pd_workshop_daily_surveys_on_user_id                 (user_id)
#  index_pd_workshop_daily_surveys_on_user_workshop_day_form  (user_id,pd_workshop_id,day,form_id) UNIQUE
#

class Pd::WorkshopDailySurvey < ActiveRecord::Base
end
