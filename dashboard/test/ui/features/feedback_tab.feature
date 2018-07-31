@no_mobile
Feature: Feedback Tab Visibility

Background:
  Given I create a teacher-associated student named "Lillian"
  And I am on "http://studio.code.org/s/allthethings/stage/18/puzzle/7?noautoplay=true"
  Then I rotate to landscape
  And I wait to see "#runButton"
  And I submit this level

# This scenario will be removed when stable flag is deprecated.
Scenario: With stable flag, 'Feedback' tab is not visible for students and displays coming soon text to teachers
  #As student, stable flag, see nothing
  And I am on "http://studio.code.org/s/allthethings/stage/18/puzzle/7?enableExperiments=commentBoxTab"
  And element ".uitest-feedback" is not visible
  And I am on "http://studio.code.org/s/allthethings/stage/18/puzzle/7?disableExperiments=commentBoxTab"
  And I am on "http://studio.code.org/users/sign_out"

  #As teacher, stable tag, see temporary text
  Then I sign in as "Teacher_Lillian"
  And I am on "http://studio.code.org/s/allthethings/stage/18/puzzle/7?enableExperiments=commentBoxTab"
  And I wait to see ".show-handle"
  Then I click selector ".show-handle .fa-chevron-left" once I see it
  Then I click selector ".section-student .name a"
  And I click selector ".uitest-feedback" once I see it
  And I wait until element "textarea" is visible
  And I wait until ".editor-column" contains text "Coming soon"
  And I am on "http://studio.code.org/s/allthethings/stage/18/puzzle/7?disableExperiments=commentBoxTab"

  #As teacher, all flags off, tab not visible
  And element ".uitest-feedback" is not visible

Scenario: With dev flag, as student, 'Feedback' tab is not visible if no feedback
  #As student, see temporary text
  And I am on "http://studio.code.org/s/allthethings/stage/18/puzzle/7?enableExperiments=devCommentBoxTab"
  And element ".uitest-feedback" is not visible
  And I am on "http://studio.code.org/s/allthethings/stage/18/puzzle/7?disableExperiments=devCommentBoxTab"

@no_ie
# Disabling IE due to bug where text changes in the feedback text input are not registered,
# so submit button remains disabled
Scenario: With dev flag, as teacher, tab is invisible when not reviewing student work and visible when viewing student work, feedback can be submitted and displayed
  #As teacher, not reviewing work, don't see feedback tab
  Then I sign in as "Teacher_Lillian"
  Then I am on "http://studio.code.org/s/allthethings/stage/18/puzzle/7?enableExperiments=devCommentBoxTab"
  And element ".uitest-feedback" is not visible

  #As teacher, reviewing work, submit feedback
  And I wait to see ".show-handle"
  Then I click selector ".show-handle .fa-chevron-left"
  Then I click selector ".section-student .name a"
  And I press the first "#ui-test-feedback-input" element
  And element "#ui-test-submit-feedback" contains text "Save and share"
  And element "#ui-test-feedback-time" does not exist
  And I press keys "Nice!" for element "#ui-test-feedback-input"
  And I press "#ui-test-submit-feedback" using jQuery
  And I wait until ".editor-column" contains text "Nice!"
  And element "#ui-test-feedback-time" contains text "Last updated"
  And element "#ui-test-submit-feedback" contains text "Update"

  #As teacher, refresh page and latest feedback is visible
  And I reload the page
  And I wait for the page to fully load
  And I wait until ".editor-column" contains text "Nice!"
  And element "#ui-test-feedback-time" contains text "Last updated"
  And element "#ui-test-feedback-time" contains text "ago"
  And element "#ui-test-submit-feedback" contains text "Update"

  #As student, latest feedback from teacher is displayed
  Then I sign out
  And I sign in as "Lillian"
  And I am on "http://studio.code.org/s/allthethings/stage/18/puzzle/7?enableExperiments=devCommentBoxTab"
  And I press the first ".uitest-feedback" element
  And I wait until ".editor-column" contains text "Nice!"
  And element ".editor-column" contains text "Feedback from Teacher_Lillian"
  And element ".editor-column" contains text "(From"
  And element ".editor-column" contains text "ago):"
  And I am on "http://studio.code.org/s/allthethings/stage/18/puzzle/7?disableExperiments=devCommentBoxTab"