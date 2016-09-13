@eyes
@dashboard_db_access
@as_taught_student
@no_circle
Feature: Submittable level

Scenario: Submittable level
  When I open my eyes to test "submittable level"
  Then I am on "http://studio.code.org/s/allthethings/stage/9/puzzle/3?noautoplay=true"
  And I wait to see ".submitButton"
  And I see no difference for "initial load"
  And I click selector ".answerbutton[index=0]"
  And I click selector ".submitButton"

  Then I am on "http://studio.code.org/s/allthethings/stage/9/puzzle/3?noautoplay=true"
  And I wait until element ".unsubmitButton" is visible
  And I see no difference for "submitted puzzle"
  And I close my eyes
