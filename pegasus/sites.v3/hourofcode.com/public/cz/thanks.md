<% facebook = {:u=>"http://#{request.host}/us"}
                      twitter = {:url=>"http://hourofcode.com", :related=>"codeorg", :hashtags=>"", :text=>hoc_s(:twitter_default_text)}
                      twitter[:hashtags] = "HourOfCode" unless hoc_s(:twitter_default_text).include? "#HourOfCode" %>



# Děkujeme za přihlášení k hostování akce Hodina kódu!

**EVERY** Hour of Code organizer will receive 10 GB of Dropbox space or $10 of Skype credit as a thank you. [Details](<%= hoc_uri('/prizes') %>)

<% if @country == 'us' %>

Get your [whole school to participate](<%= hoc_uri('/prizes') %>) for a chance for big prizes for your entire school.

<% end %>

## 1. Povídejte o tom

Povězte svým přátelům o #HourOfCode.

<%= view :share_buttons, facebook:facebook, twitter:twitter %>

<% if @country == 'us' %>

## 2. Požádejte celou vaší školu, aby nabídla akci Hodina kódu

[Send this email](<%= hoc_uri('/resources#email') %>) or [this handout](http://hourofcode.com/files/schools-handout.pdf). Jakmile se vaše škola zapojila, [Přihlašte se se do soutěže o 10 000 dolarů v hodnotě technologie pro vaši školu](/prizes) a vyzvěte jiné školy z vaší oblasti, aby se přidaly.

<% else %>

## 2. Požádejte celou vaší školu, aby nabídla akci Hodina kódu

[Send this email](<%= hoc_uri('/resources#email') %>) or give [this handout](http://hourofcode.com/files/schools-handout.pdf) to your principal.

<% end %>

## 3. Make a generous donation

[Donate to our crowdfunding campaign.](http://<%= codeorg_url() %>/donate) To teach 100 million children, we need your support. We just launched what could be the [largest education crowdfunding campaign](http://<%= codeorg_url() %>/donate) in history. Every dollar will be matched by major Code.org [donors](http://<%= codeorg_url() %>/about/donors), doubling your impact.

## 4. Ask your employer to get involved

[Send this email](<%= hoc_uri('/resources#email') %>) to your manager, or the CEO. Or [give them this handout](http://hourofcode.com/resources/hoc-one-pager.pdf).

## 5. Promote Hour of Code within your community

Získejte místní skupinu – skautský klub, kostel, univerzitu, skupiny veteránů nebo odboráře. Nebo uspořádejte akci vaše okolí.

## 6. Ask a local elected official to support the Hour of Code

[Send this email](<%= hoc_uri('/resources#politicians') %>) to your mayor, city council, or school board. Or [give them this handout](http://hourofcode.com/resources/hoc-one-pager.pdf) and invite them to visit your school.

<%= view 'popup_window.js' %>