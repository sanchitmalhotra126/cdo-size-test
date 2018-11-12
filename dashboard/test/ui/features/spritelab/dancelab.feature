@no_older_chrome
Feature: Dance Lab
  # This test relies on CloudFront signed cookies to access /restricted/ on the
  # test machine, but uses SoundLibraryApi for access in CircleCI.
  @no_firefox
  @no_safari
  Scenario: Restricted audio content is protected
    When I am on "http://studio.code.org/restricted/placeholder.txt"
    Then page text does not contain "placeholder for testing"

    When I am on "http://studio.code.org/s/dance/stage/1/puzzle/1"
    And I wait for the page to fully load
    And I am on "http://studio.code.org/restricted/placeholder.txt"
    Then page text does contain "placeholder for testing"

  @no_mobile
  Scenario: Can toggle run/reset in DanceLab
    Given I am on "http://studio.code.org/s/allthethings/stage/37/puzzle/2?noautoplay=true"
    And I rotate to landscape
    And I wait for the page to fully load
    And I wait for 3 seconds
    And I wait until I don't see selector "#p5_loading"
    And I select age 10 in the age dialog
    And I close the instructions overlay if it exists
    Then element "#runButton" is visible
    And element "#resetButton" is hidden
    And element "#song_selector" is enabled
    Then I click selector "#runButton" once I see it
    Then I wait until element "#runButton" is not visible
    And element "#resetButton" is visible
    And element "#song_selector" is disabled
    Then I click selector "#resetButton" once I see it
    Then element "#runButton" is visible
    And element "#resetButton" is hidden
    And element "#song_selector" is enabled

  @no_mobile
  Scenario: Can get to level success in DanceLab
    Given I am on "http://studio.code.org/s/allthethings/stage/37/puzzle/1?noautoplay=true"
    And I rotate to landscape
    And I wait for the page to fully load
    And I wait for 3 seconds
    And I wait until I don't see selector "#p5_loading"
    And I select age 10 in the age dialog
    And I close the instructions overlay if it exists

    #Run for two measures until level success
    Then I click selector "#runButton" once I see it
    And I wait until element ".congrats" is visible

  @as_student
  @no_mobile
  Scenario: Dance Party Share
    Given I am on "http://studio.code.org/s/dance/stage/1/puzzle/13?noautoplay=true"
    And I rotate to landscape
    And I wait for the page to fully load
    And I close the instructions overlay if it exists

    When I navigate to the shared version of my project
    And element ".signInOrAgeDialog" is hidden
    Then I click selector "#runButton" once I see it
    Then I wait until element "#runButton" is not visible

    Then evaluate JavaScript expression "window.__DanceTestInterface.getSprites().length === 3"

    Then I click selector "#resetButton" once I see it
    Then element "#runButton" is visible
    And element "#resetButton" is hidden

  @no_mobile
  Scenario: Dance Party can share while logged out
    Given I am on "http://studio.code.org/s/dance/stage/1/puzzle/13?noautoplay=true"
    And I rotate to landscape
    And I wait for the page to fully load
    And I close the instructions overlay if it exists

    When I navigate to the shared version of my project
    Then I wait until element "#runButton" is visible
