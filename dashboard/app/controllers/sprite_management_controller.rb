class SpriteManagementController < ApplicationController
  before_action :require_levelbuilder_mode
  before_action :authenticate_user!

  def sprite_management_directory
  end

  def sprite_upload
  end
end
