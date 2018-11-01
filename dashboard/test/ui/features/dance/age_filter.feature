Feature: Dance Lab Age Filter
  Scenario: Song selector displays pg13 songs for age < 13 initially then teacher override shows all songs
    Given I create a young student named "Harry"
    And I am on "http://studio.code.org/s/allthethings/stage/37/puzzle/1?noautoplay=true"
    And I rotate to landscape
    And I wait for the page to fully load
    And I wait for 3 seconds
    And I wait until I don't see selector "#p5_loading"
    And I close the instructions overlay if it exists
    Then element "#runButton" is visible
    And element "#song_selector" is visible
    And I see 1 options in the dropdown "#song_selector"

    Then I am on "http://studio.code.org/s/allthethings/stage/37/puzzle/1?noautoplay=true&songfilter=off"
    And I wait for the page to fully load
    And I wait until I don't see selector "#p5_loading"
    And I close the instructions overlay if it exists
    And I see 2 options in the dropdown "#song_selector"

  Scenario: Song selector displays all songs for age > 13 initially then teacher override hides pg13 songs
    Given I create a student named "Harry"
    Given I am on "http://studio.code.org/s/allthethings/stage/37/puzzle/1?noautoplay=true"
    And I rotate to landscape
    And I wait for the page to fully load
    And I wait for 3 seconds
    And I wait until I don't see selector "#p5_loading"
    And I close the instructions overlay if it exists
    Then element "#runButton" is visible
    And element "#song_selector" is visible
    And I see 2 options in the dropdown "#song_selector"

    Then I am on "http://studio.code.org/s/allthethings/stage/37/puzzle/1?noautoplay=true&songfilter=on"
    And I wait for the page to fully load
    And I wait until I don't see selector "#p5_loading"
    And I see 1 options in the dropdown "#song_selector"

  Scenario: Selecting <13 in age dialog turns filter on
    Given I am on "http://studio.code.org/s/allthethings/stage/37/puzzle/1?noautoplay=true"
    And I rotate to landscape
    And I wait for the page to fully load
    And I wait for 3 seconds
    And I wait until I don't see selector "#p5_loading"
    And element ".signInOrAgeDialog" is visible
    And I select the "10" option in dropdown "uitest-age-selector"
    And I click selector "#uitest-submit-age"

    And I close the instructions overlay if it exists
    Then element "#runButton" is visible
    And element "#song_selector" is visible
    And I see 1 options in the dropdown "#song_selector"
