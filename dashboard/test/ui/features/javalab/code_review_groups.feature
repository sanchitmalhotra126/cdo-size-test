@no_mobile
Feature: Code Review Groups

  # to do
  # (x) make levelbuilder teacher so csa shows up in course list
  # create a csa section
  # create multiple students
  # navigate to teacher dashboard, manage students
  # create a code review group
  # put a student in one of the groups

  # This gets to /home with dumbledore logged in, but doesn't show any created sections
  # https://app.saucelabs.com/tests/46e0db26e4284fdab54072f20efab488#34
  Scenario: Setting up groups
    Given I create a levelbuilder named "Dumbledore"
    When I sign in as "Dumbledore" and go home
    And I create a new section named "CSA Section" assigned to "csa"
    And I save the section url
    And I save the section id from row 0 of the section table
    Given I create a student named "Hermione"
    And I join the section
    Given I create a student named "Harry"
    And I join the section
    When I sign in as "Dumbledore" and go home
    Then I navigate to teacher dashboard for the section I saved
    And I click selector "#uitest-teacher-dashboard-nav a:contains(Manage Students)" once I see it
    And I click selector "#uitest-code-review-groups-button" once I see it