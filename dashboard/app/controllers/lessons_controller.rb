class LessonsController < ApplicationController
  load_and_authorize_resource

  before_action :require_levelbuilder_mode, except: [:show]

  # GET /lessons/1
  def show
  end

  # GET /lessons/1/edit
  def edit
    @lesson_data = {
      id: @lesson.id,
      overview: @lesson.overview
    }
  end

  # PATCH/PUT /lessons/1
  def update
    @lesson.update!(lesson_params)

    redirect_to lesson_path(id: @lesson.id)
  end

  private

  def lesson_params
    return head :bad_request unless params[:lesson]

    # for now, only allow editing of fields that cannot be edited on the
    # script edit page.
    params[:lesson].permit(:overview)
  end
end
