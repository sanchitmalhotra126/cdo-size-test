# Testing that the social share buttons are shown/hidden in the correct scenarios
# in Dance Party.

Feature: Social share buttons
  Scenario: Signed in 13+ user sees social share buttons
    Given I create a teacher named "Hermoine"
    And I am on "http://studio.code.org/s/dance/stage/1/puzzle/13"
    And I rotate to landscape
    And I wait for the page to fully load

    And I wait until I see selector ".project_share"
    When I click ".project_share"
    And I wait for 10 seconds
    Then element "#project-share" is visible
    Then element ".social-buttons .fa-facebook" is visible
    And element ".social-buttons .fa-twitter" is visible

    And I sign out

  Scenario: Signed in user under 13 does not see social share buttons
    Given I create a young student named "Harry"
    And I am on "http://studio.code.org/s/dance/stage/1/puzzle/13"
    And I rotate to landscape
    And I wait for the page to fully load

    And I wait until I see selector ".project_share"
    When I click ".project_share"
    And I wait for 10 seconds
    Then element "#project-share" is visible
    Then element ".social-buttons .fa-facebook" is not visible
    And element ".social-buttons .fa-twitter" is not visible

    And I sign out

  Scenario: Signed out 13+ user sees social share buttons
    Given I am on "http://studio.code.org/s/dance/stage/1/puzzle/13"
    And I rotate to landscape
    And I wait for the page to fully load
    And I select age 13 in the age dialog
    And I close the instructions overlay if it exists

    And I wait until I see selector ".project_share"
    When I click ".project_share"
    And I wait for 3 seconds
    Then element "#project-share" is visible
    Then element ".social-buttons .fa-facebook" is visible
    And element ".social-buttons .fa-twitter" is visible


  Scenario: Signed out user under 13 does not see social share buttons
    Given I am on "http://studio.code.org/s/dance/stage/1/puzzle/13"
    And I rotate to landscape
    And I wait for the page to fully load
    And I select age 12 in the age dialog
    And I close the instructions overlay if it exists

    And I wait until I see selector ".project_share"
    When I click ".project_share"
    And I wait for 3 seconds
    Then element "#project-share" is visible
    Then element ".social-buttons .fa-facebook" is not visible
    And element ".social-buttons .fa-twitter" is not visible
