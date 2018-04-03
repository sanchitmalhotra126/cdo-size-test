# == Schema Information
#
# Table name: authentication_options
#
#  id                :integer          not null, primary key
#  email             :string(255)      default(""), not null
#  hashed_email      :string(255)      default(""), not null
#  credential_type   :string(255)      not null
#  authentication_id :string(255)
#  data              :string(255)
#  deleted_at        :datetime
#  user_id           :integer          not null
#  created_at        :datetime         not null
#  updated_at        :datetime         not null
#
# Indexes
#
#  index_auth_on_cred_type_and_auth_id                          (credential_type,authentication_id,deleted_at) UNIQUE
#  index_authentication_options_on_email_and_deleted_at         (email,deleted_at)
#  index_authentication_options_on_hashed_email_and_deleted_at  (hashed_email,deleted_at)
#  index_authentication_options_on_user_id                      (user_id)
#  index_authentication_options_on_user_id_and_deleted_at       (user_id,deleted_at)
#

class AuthenticationOption < ApplicationRecord
  acts_as_paranoid
  belongs_to :user
end
