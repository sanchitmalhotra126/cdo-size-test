Feature: Projects

Background:
  Given I am on "http://learn.code.org/p/artist"
  And I rotate to landscape
  And element "#runButton" is visible
  And element ".project_updated_at" has text "Click 'Run' to save"

Scenario: Save Project
  Then I open the topmost blockly category "Color"
  And I drag block matching selector "#draw-color" to block matching selector "#when_run"
  And I press "runButton"
  Then element ".project_updated_at" contains text "Saving..."
  Then I wait until element ".project_updated_at" contains text "Saved"
  And I reload the page
  Then element "#draw-color" is a child of element "#when_run"
