* * *

title: Thanks for signing up to host an Hour of Code! layout: wide

social: "og:title": "<%= hoc_s(:meta_tag_og_title) %>" "og:description": "<%= hoc_s(:meta_tag_og_description) %>" "og:image": "http://<%=request.host%>/images/hour-of-code-2014-video-thumbnail.jpg" "og:image:width": 1705 "og:image:height": 949 "og:url": "http://<%=request.host%>" "og:video": "https://youtube.googleapis.com/v/rH7AjDMz_dc"

"twitter:card": player "twitter:site": "@codeorg" "twitter:url": "http://<%=request.host%>" "twitter:title": "<%= hoc_s(:meta_tag_twitter_title) %>" "twitter:description": "<%= hoc_s(:meta_tag_twitter_description) %>" "twitter:image:src": "http://<%=request.host%>/images/hour-of-code-2014-video-thumbnail.jpg" "twitter:player": 'https://www.youtubeeducation.com/embed/rH7AjDMz_dc?iv_load_policy=3&rel=0&autohide=1&showinfo=0' "twitter:player:width": 1920 "twitter:player:height": 1080

* * *

<% facebook = {:u=>"http://#{request.host}/us"}

twitter = {:url=>"http://hourofcode.com", :related=>'codeorg', :hashtags=>'', :text=>hoc_s(:twitter_default_text)} twitter[:hashtags] = 'HourOfCode' unless hoc_s(:twitter_default_text).include? '#HourOfCode' %>

# Děkujeme za přihlášení k hostování akce Hodina kódu!

**KAŽDÝ** organizátor akce Hodiny kódu dostane jako poděkování 10 GB místa na Dropboxu nebo 10 dolarů Skype.kreditu [Podrobnosti](/prizes)

<% if @country == 'us' %>

Get your [whole school to participate](/us/prizes) for a chance for big prizes for your entire school.

<% end %>

## 1. Povídejte o tom

Povězte svým přátelům o #HourOfCode.

<%= view :share_buttons, facebook:facebook, twitter:twitter %>

<% if @country == 'us' %>

## 2. Požádejte celou vaší školu, aby nabídla akci Hodina kódu

[Send this email](/resources#email) or [give this handout to your principal](/files/schools-handout.pdf). Jakmile se vaše škola zapojila, [Přihlašte se se do soutěže o 10 000 dolarů v hodnotě technologie pro vaši školu](/prizes) a vyzvěte jiné školy z vaší oblasti, aby se přidaly.

<% else %>

## 2. Požádejte celou vaší školu, aby nabídla akci Hodina kódu

[Send this email](/resources#email) or give [this handout](/files/schools-handout.pdf) to your principal.

<% end %>

## 3. Make a generous donation

[Donate to our crowdfunding campaign](http://code.org/donate). To teach 100 million children, we need your support. We just launched what could be the [largest education crowdfunding campaign](http://code.org/donate) in history. Every dollar will be matched by major Code.org [donors](http://code.org/about/donors), doubling your impact.

## 4. Ask your employer to get involved

[Send this email](/resources#email) to your manager, or the CEO. Or [give them this handout](/resources/hoc-one-pager.pdf).

## 5. Promote Hour of Code within your community

Získejte místní skupinu – skautský klub, kostel, univerzitu, skupiny veteránů nebo odboráře. Nebo uspořádejte akci vaše okolí.

## 6. Ask a local elected official to support the Hour of Code

[Send this email](/resources#politicians) to your mayor, city council, or school board. Or [give them this handout](/resources/hoc-one-pager.pdf) and invite them to visit your school.

<%= view 'popup_window.js' %>