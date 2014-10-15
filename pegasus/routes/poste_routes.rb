get '/l/:id/:url' do |id, url_64|
  only_for 'code.org'
  dont_cache

  delivery = Poste::Delivery.get_by_encrypted_id(id)
  pass unless delivery

  url_id = Base64.urlsafe_decode64(url_64).to_i
  url = DB[:poste_urls].where(id:url_id).first
  pass unless url

  DB[:poste_clicks].insert(
    contact_id:delivery.contact_id,
    delivery_id:delivery.id,
    message_id:delivery.message_id,
    url_id:url[:id],
    created_at:DateTime.now,
    created_ip:request.ip,
  )

  redirect url[:url], 302
end

get '/o/:id' do |id|
  only_for 'code.org'
  dont_cache
  delivery = Poste::Delivery.get_by_encrypted_id(id)
  Poste::Open.create(delivery: delivery, created_ip: request.ip) unless delivery.nil?
  send_file pegasus_dir('sites.v3/code.org/public/images/1x1.png'), type: 'image/png'
end

get '/u/:id' do |id|
  only_for 'code.org'
  dont_cache
  delivery = Poste::Delivery.get_by_encrypted_id(id)
  Contact.unsubscribe(delivery.contact.email, ip_address:request.ip) if delivery
  halt(200, "You're unsubscribed.\n")
end
