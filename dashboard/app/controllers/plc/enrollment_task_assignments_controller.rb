class Plc::EnrollmentTaskAssignmentsController < ApplicationController
  before_action :set_plc_enrollment_task_assignment, only: [:show, :destroy]

  # GET /plc/enrollment_task_assignments
  # GET /plc/enrollment_task_assignments.json
  def index
    @plc_enrollment_task_assignments = Plc::EnrollmentTaskAssignment.all
  end

  # GET /plc/enrollment_task_assignments/1
  # GET /plc/enrollment_task_assignments/1.json
  def show
  end

  # DELETE /plc/enrollment_task_assignments/1
  # DELETE /plc/enrollment_task_assignments/1.json
  def destroy
    @plc_enrollment_task_assignment.destroy
    respond_to do |format|
      format.html { redirect_to plc_enrollment_task_assignments_url }
      format.json { head :no_content }
    end
  end

  private
  # Use callbacks to share common setup or constraints between actions.
  def set_plc_enrollment_task_assignment
    @plc_enrollment_task_assignment = Plc::EnrollmentTaskAssignment.find(params[:id])
  end

  # Never trust parameters from the scary internet, only allow the white list through.
  def plc_enrollment_task_assignment_params
    params[:plc_enrollment_task_assignment]
  end
end
