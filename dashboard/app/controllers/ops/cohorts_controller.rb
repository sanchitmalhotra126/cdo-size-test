module Ops
  class CohortsController < OpsControllerBase
    before_filter :convert_teachers, :convert_districts_to_cohorts_districts_attributes, :timestamp_cutoff_date, only: [:create, :update]
    after_filter :notify_district_contact_added_teachers, only: [:update]

    load_and_authorize_resource except: [:index]

    # DELETE /ops/cohorts/1/teachers/:teacher_id
    def destroy_teacher
      @cohort.teachers.delete User.find(params[:teacher_id])
      @cohort.save!
      respond_with @cohort
    end

    # POST /ops/cohorts
    def create
      @cohort.update!(params[:cohort])
      respond_with :ops, @cohort
    end

    # GET /ops/cohorts
    def index
      authorize! :manage, Cohort
      @cohorts =
        if current_user.try(:admin?)
          Cohort.all
        elsif current_user.try(:district_contact?)
          current_user.district_as_contact.cohorts
        else
          []
        end
      respond_with @cohorts
    end

    # GET /ops/cohorts/1
    def show
      # filter cohort info for current user.
      # this should really be done with the 'scope' feature in ActiveModel::Serializers but I can't figure out their git branches
      unless current_user.admin?
        @cohort.teachers = @cohort.teachers.select {|teacher| teacher.district_id == current_user.district_as_contact.id}
        @cohort.cohorts_districts = @cohort.cohorts_districts.where(district_id: current_user.district_as_contact.id)
      end

      respond_with @cohort
    end

    # PATCH/PUT /ops/cohorts/1
    def update
      if params[:cohort][:teachers]
        @added_teachers = params[:cohort][:teachers] - @cohort.teachers
      end

      @cohort.update!(params[:cohort])
      respond_with @cohort
    end

    # DELETE /ops/cohorts/1
    def destroy
      @cohort.destroy
      render text: 'OK'
    end

    private
    # Required for CanCanCan to work with strong parameters
    # (see: http://guides.rubyonrails.org/action_controller_overview.html#strong-parameters)
    def cohort_params
      params.require(:cohort).permit(
          :name,
          :program_type,
          :cutoff_date,
          :district_ids => [],
          :district_names => [],
          :districts => [:id, :max_teachers, :_destroy],
          :teachers => [:ops_first_name, :ops_last_name, :email, :district, :district_id, :ops_school, :ops_gender] # permit array of objects with specified keys
      )
    end

    # Support district_names in the API
    def convert_districts_to_cohorts_districts_attributes
      return unless params[:cohort]
      district_params_list = params[:cohort].delete :districts
      return unless district_params_list
      params[:cohort][:cohorts_districts_attributes] = district_params_list.map do |district_params|
        {district_id: district_params[:id],
         max_teachers: district_params[:max_teachers],
         _destroy: district_params[:_destroy]}.tap do |cohorts_districts_attrs|
          if params[:id] && existing = CohortsDistrict.find_by(district_id: district_params[:id], cohort_id: params[:id])
            cohorts_districts_attrs[:id] = existing.id
          end
        end
      end
    end

    def convert_teachers
      return unless params[:cohort]
      teacher_param_list = params[:cohort].delete :teachers
      return unless teacher_param_list

      params[:cohort][:teachers] = teacher_param_list.map do |teacher_params|
        next if teacher_params[:email].blank?

        district_params = teacher_params.delete :district
        if district_params.is_a?(String)
          teacher_params[:district_id] = District.find_by!(name: district_params).id
        elsif district_params.is_a?(Hash) && district_params[:id]
          teacher_params[:district_id] = district_params[:id]
        end
        User.find_or_create_teacher(teacher_params, current_user)
      end
    end

    def timestamp_cutoff_date
      return unless params[:cohort]
      cutoff_date = params[:cohort].delete :cutoff_date
      return unless cutoff_date.present?

      params[:cohort][:cutoff_date] = Chronic.parse(cutoff_date).strftime('%Y-%m-%d 00:00:00')
    end

    def notify_district_contact_added_teachers
      # notification to ops team that a district contact added teachers
      if @added_teachers.present? && current_user.district_contact?
        OpsMailer.district_contact_added_teachers(current_user, @cohort, @added_teachers).deliver
      end
    end
  end
end
