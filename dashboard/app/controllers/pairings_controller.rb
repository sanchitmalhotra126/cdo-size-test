class PairingsController < ApplicationController
  before_action :authenticate_user!
  skip_before_filter :verify_authenticity_token

  def show
    render json: {pairings: pairings_summary, sections: sections_summary}
  end

  def update
    if params[:pairings].present?
      self.pairings = params[:pairings]
    else # turn off pair programming
      self.pairings = nil
    end

    head :ok
  end

  private

  # Serialization helpers

  def pairings_summary
    pairings.map do |user|
      {id: user.id, name: user.name}
    end
  end

  def sections_summary
    current_user.sections_as_student.map do |section|
      {id: section.id,
       name: section.name,
       students:
         (section.students - [current_user]).map do |student|
           {id: student.id, name: student.name}
         end
      }
    end
  end
end
