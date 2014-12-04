class GalleryActivity < ActiveRecord::Base
  belongs_to :user
  belongs_to :activity

  before_save :set_app

  def set_app
    return unless activity
    self.app = activity.try(:level).try(:game).try(:app)
  end

  def self.pseudocount
    # select count(*) is not a fast query but this is
    self.last.try(:id) || 0
  end
end
