require 'test_helper'

class QueuedAccountPurgeTest < ActiveSupport::TestCase
  test "requires a user" do
    assert_raises ActiveRecord::StatementInvalid do
      QueuedAccountPurge.create(reason_for_review: 'test')
    end
  end

  test "resolve! purges the user account" do
    qap = create :queued_account_purge
    user = qap.user

    AccountPurger.any_instance.expects(:purge_data_for_account).with(user).once
    qap.resolve!
  end

  test "resolve! deletes the QueuedAccountPurge" do
    AccountPurger.any_instance.stubs(:purge_data_for_account)

    qap = create :queued_account_purge
    refute_nil QueuedAccountPurge.find_by_id(qap.id)

    qap.resolve!
    assert_nil QueuedAccountPurge.find_by_id(qap.id)
  end
end
