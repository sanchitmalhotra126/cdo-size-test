@no_mobile
Feature: Using the Internet Simulator Lobby

  The internet simulator lets students experiment with a simulated network environment, connecting
  to one another through our system and sending data back and forth with different encodings.

  Scenario: If I am not logged in, I must enter a name
    Given I load netsim
    Then element "#netsim_lobby_name" is visible
    And element "#netsim_lobby_name" is enabled
    And element "#netsim_lobby_set_name_button" is visible
    And element "#netsim_lobby_set_name_button" is enabled
    And element "#netsim_shard_select" is hidden

  Scenario: Entering a name displays the shard view
    Given I load netsim
    And I enter the netsim name "Fred"
    Then element "#netsim_lobby_name" is disabled
    And element "#netsim_lobby_set_name_button" is hidden
    And element "#netsim_shard_select" is visible

  Scenario: If I am not logged in, a private shard is used
    Given I load netsim
    When I enter the netsim name "Wilma"
    Then element "#netsim_shard_select" contains text "My Private Network"
    And element "#shard_view" contains text "Share this private network"

  Scenario: I can add a router to the shard
    Given I load netsim
    And I enter the netsim name "Pebbles"
    When I add a router
    Then element ".router-row" contains text "Router"

  Scenario: The connect button enables when a router is selected
    Given I load netsim
    And I enter the netsim name "Barney"
    When I add a router
    Then element ".router-row" does not have class "selected-row"
    And element "#netsim_lobby_connect" is disabled
    When I select the first router
    Then element ".router-row" has class "selected-row"
    And element "#netsim_lobby_connect" is enabled

  Scenario: Connecting to a router hides the lobby, and shows the send controls
    Given I load netsim
    And I enter the netsim name "Betty"
    And I add a router
    And I connect to the first router
    Then element ".netsim-lobby" is hidden
    And element ".netsim-send-panel" is visible
    And element ".netsim-log-panel" is visible

  # Scenario: If I am logged in, my name is filled in automatically
  #   Given I am a teacher
  #   And I load netsim
  #   Then element "#netsim_lobby_name" is disabled
  #   And element "#netsim_lobby_set_name_button" is hidden
  #   And element "#netsim_shard_select" is visible
