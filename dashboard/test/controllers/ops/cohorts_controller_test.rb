require 'test_helper'
module Ops
  class CohortsControllerTest < ::ActionController::TestCase
    include Devise::TestHelpers
    API = ::OPS::API

    setup do
      @request.headers['Accept'] = 'application/json'
      @admin = create :admin
      sign_in @admin
      @cohorts_district = create(:cohorts_district)
      @cohort = @cohorts_district.cohort
      @district = @cohorts_district.district
    end

    test 'District Contact can add teachers to a cohort' do
      #87054720 (part 1)
      #can click "Add Teacher" button to add a teacher
      assert_routing({ path: "#{API}/cohorts/1", method: :patch }, { controller: 'ops/cohorts', action: 'update', id: '1' })

      teacher_params = @cohort.teachers.map {|teacher| {ops_first_name: teacher.name, email: teacher.email, id: teacher.id}}
      teacher_params += [
                         {ops_first_name: 'Laurel', ops_last_name: 'X', email: 'laurel_x@example.xx', district: @district.name, ops_school: 'Washington Elementary', ops_gender: 'Female'},
                         {ops_first_name: 'Laurel', ops_last_name: 'Y', email: 'laurel_y@example.xx', district: @district.name, ops_school: 'Jefferson Middle School', ops_gender: 'Male'}
                        ]

      assert_difference('@cohort.reload.teachers.count', 2) do
        assert_difference('User.count', 2) do
          patch :update, id: @cohort.id, cohort: {teachers: teacher_params}
        end
      end

      assert_response :success

      last_user = User.last
      assert_equal 'Male', last_user.ops_gender
      assert_equal 'Jefferson Middle School', last_user.ops_school
    end

    test 'District Contact can drop teachers in their district from a cohort' do
      assert_routing({ path: "#{API}/cohorts/1/teachers/2", method: :delete }, { controller: 'ops/cohorts', id: '1', teacher_id: '2', action: 'destroy_teacher' })

      @cohort.teachers << create(:teacher)
      @cohort.save!

      assert_difference ->{@cohort.teachers.count}, -1 do
        delete :destroy_teacher, id: @cohort.id, teacher_id: @cohort.teachers.first.id
      end
      assert_response :success
    end

    test 'District Contact cannot add/drop teachers in other districts' do
      #87054720 (part 3)
      # todo
    end

      # Test index + CRUD controller actions

    test 'Ops team can list all cohorts' do
      cohorts = [create(:cohort), create(:cohort), create(:cohort)]
      assert_routing({ path: "#{API}/cohorts", method: :get }, { controller: 'ops/cohorts', action: 'index' })

      get :index
      assert_response :success

      assert_equal cohorts.count + 1, assigns(:cohorts).count # cohorts created in this test + cohort created in setup
    end

    test 'district contact can list their districts cohorts' do
      cd = create :cohorts_district
      cohort = cd.cohort

      # 2nd that we will add the same district as the 1st
      cohort2 = create :cohort
      cohort2 = cohort2.reload
      cohort2.districts << cohort.districts.first
      cohort2.save!

      dc = cohort.districts.first.contact
      assert dc

      sign_in dc

      get :index
      assert_response :success
      assert_equal [cohort, cohort2], assigns(:cohorts) # only the cohorts for this district
    end

    test 'district contact can show their districts cohorts' do
      cd = create :cohorts_district
      cohort = cd.cohort

      dc = cohort.districts.first.contact
      assert dc

      sign_in dc

      get :show, id: cohort.id
      assert_response :success
      assert_equal cohort, assigns(:cohort)
    end

    test 'district contact cannot show cohorts without their district' do
      create :cohort # this one is not accessible

      cd = create :cohorts_district
      cohort = cd.cohort

      dc = cohort.districts.first.contact
      assert dc

      sign_in dc

      get :show, id: @cohort.id # not accessible
      assert_response :forbidden
    end

    test 'Anonymous users cannot affect cohorts' do
      sign_out @admin
      all_forbidden
    end

    test 'Logged-in teachers cannot affect cohorts' do
      sign_out @admin
      sign_in create(:user)
      all_forbidden
    end

    def all_forbidden
      get :index
      assert_response :forbidden
      post :create, cohort: {name: 'x'}
      assert_response :forbidden
      get :show, id: @cohort.id
      assert_response :forbidden
      patch :update, id: @cohort.id, cohort: {name: 'name'}
      assert_response :forbidden
      delete :destroy, id: @cohort.id
      assert_response :forbidden
    end

    test 'Ops team can create Cohorts' do
      #87054348
      assert_routing({ path: "#{API}/cohorts", method: :post }, { controller: 'ops/cohorts', action: 'create' })

      assert_difference 'Cohort.count' do
        post :create, cohort: {name: 'Cohort name'}
      end
      assert_response :success
    end

    def teacher_params
      (1..5).map do |x|
        {ops_first_name: 'Teacher', ops_last_name: "#{x}", email: "teacher_#{x}@school.edu", district: @district.name}
      end
    end

    test 'Ops team can create a Cohort from a list of teacher information' do
      #87054348 (part 2)
      assert_difference 'User.count', 5 do
        assert_creates(Cohort, CohortsDistrict) do
          post :create, cohort: {name: 'Cohort name', districts: [{id: @district.id}], teachers: teacher_params}
        end
      end
      assert_response :success

      # Ensure that the returned Cohort JSON object contains the provided District and teacher info
      cohort_json = JSON.parse(@response.body)
      assert_not_equal @cohort.id, cohort_json[:id]
      assert_equal @district.id, cohort_json['districts'].first['id']

      assert_equal (1..5).map(&:to_s), cohort_json['teachers'].map {|x| x['ops_last_name']}

      # district info is included
      expected_district = {'name' => @district.name, 'id' => @district.id, 'location' => @district.location}
      assert_equal expected_district, cohort_json['teachers'].first['district']
    end

    test 'Create Cohort with districts' do
      d1 = create(:district)
      d2 = create(:district)

      post :create, cohort: {name: 'Cohort name', districts: [{id: d1.id, max_teachers: 3}, {id: d2.id, max_teachers: 5}], teachers: teacher_params}
      assert_response :success

      cohort_id = JSON.parse(@response.body)['id']
      cohort = Cohort.find(cohort_id)
      assert_not_equal cohort, @cohort

      # new teachers
      assert_equal (1..5).map {|x| "Teacher #{x}"}, cohort.teachers.map {|x| x[:name]}

      # only the two new destricts
      assert_equal [d1, d2], cohort.districts
    end

    test 'update Cohort with districts' do
      d1 = create(:district)
      d2 = create(:district)

      put :update, id: @cohort.id, cohort: {name: 'Cohort name', districts: [{id: @district.id, _destroy: 1}, {id: d1.id, max_teachers: 3}, {id: d2.id, max_teachers: 5}]}
      assert_response :success

      # only the two new districts
      assert_equal [d1, d2], @cohort.reload.districts
    end


    test 'updating Cohort with existing district updates count' do
      put :update, id: @cohort.id, cohort: {name: 'Cohort name', districts: [{id: @district.id, max_teachers: 8}]}
      assert_response :success

      # only the two new districts
      assert_equal [8], @cohort.reload.cohorts_districts.collect(&:max_teachers)
    end

    test 'Can create Cohort without providing list of acceptable districts' do
      post :create, cohort: {name: 'Cohort name'}
      assert_response :success

      assert_equal 'Cohort name', assigns(:cohort).name
      assert_equal [], assigns(:cohort).districts
    end

    test 'Create Cohort from a list, including existing teacher account' do
      # Add existing teacher account to teacher info list
      teacher = create(:teacher, district_id: @district.id)
      extra_teacher_params = [{ops_first_name: 'Hey', ops_last_name: 'Blah', email: teacher.email, district: teacher.district.name}]

      # Only 5 new teachers created, not 6
      assert_difference ->{User.count}, 5 do
        assert_creates(Cohort, CohortsDistrict) do
          post :create, cohort: {name: 'Cohort name',
            districts: [{id: @district.id, max_teachers: 5}],
            teachers: teacher_params + extra_teacher_params}
        end
      end
      assert_response :success
      teachers = Cohort.last.teachers

      # did not change display name of existing teacher
      assert_equal teacher.name, teacher.reload.name

      # Existing teacher added to cohort along with new teachers
      assert_equal (teacher_params + extra_teacher_params).map{|x| x[:ops_first_name]}.sort, teachers.map{|x| x.ops_first_name}.sort
      assert_equal (teacher_params + extra_teacher_params).map{|x| x[:ops_last_name]}.sort, teachers.map{|x| x.ops_last_name}.sort
      cd = CohortsDistrict.last
      assert_equal @district, cd.district
      assert_equal Cohort.last, cd.cohort
      assert_equal 5, cd.max_teachers
    end

    test 'read cohort info' do
      assert_routing({ path: "#{API}/cohorts/1", method: :get }, { controller: 'ops/cohorts', action: 'show', id: '1' })

      get :show, id: @cohort.id
      assert_response :success
      response = JSON.parse(@response.body)
      assert_equal response['id'], @cohort.id
      # Ensure extra association info is provided in the right format
      assert_equal response['districts'].map{|d|d['id']}, @cohort.district_ids
    end

    test 'update cohort info' do
      assert_routing({ path: "#{API}/cohorts/1", method: :patch }, { controller: 'ops/cohorts', action: 'update', id: '1' })

      new_name = 'New cohort name'
      patch :update, id: @cohort.id, cohort: {name: new_name}

      get :show, id: @cohort.id
      assert_equal new_name, JSON.parse(@response.body)['name']
      assert_response :success
    end

    test 'delete cohort' do
      assert_routing({ path: "#{API}/cohorts/1", method: :delete }, { controller: 'ops/cohorts', action: 'destroy', id: '1' })

      assert_difference 'Cohort.count', -1 do
        delete :destroy, id: @cohort.id
      end
      assert_response :success
    end
  end
end
