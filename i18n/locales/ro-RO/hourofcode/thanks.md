* * *

Titlu: Vă mulțumim pentru ca v-ați înscris să organizați evenimentul Hour of Code! aspect: wide

social: "og:title": "<%= hoc_s(:meta_tag_og_title) %>" "og:description": "<%= hoc_s(:meta_tag_og_description) %>" "og:image": "http://<%=request.host%>/images/hour-of-code-2014-video-thumbnail.jpg" "og:image:width": 1705 "og:image:height": 949 "og:url": "http://<%=request.host%>" "og:video": "https://youtube.googleapis.com/v/rH7AjDMz_dc"

"twitter:card": player "twitter:site": "@codeorg" "twitter:url": "http://<%=request.host%>" "twitter:title": "<%= hoc_s(:meta_tag_twitter_title) %>" "twitter:description": "<%= hoc_s(:meta_tag_twitter_description) %>" "twitter:image:src": "http://<%=request.host%>/images/hour-of-code-2014-video-thumbnail.jpg" "twitter:player": 'https://www.youtubeeducation.com/embed/rH7AjDMz_dc?iv_load_policy=3&rel=0&autohide=1&showinfo=0' "twitter:player:width": 1920 "twitter:player:height": 1080

* * *

<% facebook = {:u=>"http://#{request.host}/us"}

twitter = {:url=>"http://hourofcode.com", :related=>'codeorg', :hashtags=>'', :text=>hoc_s(:twitter_default_text)} twitter[:hashtags] = 'HourOfCode' unless hoc_s(:twitter_default_text).include? '#HourOfCode' %>

# Vă mulţumim ca v-ați înscris pentru organizarea Hour of Code!

**FIECARE** Organizator al Hour of Code va primi 10 GB spaţiu Dropbox sau 10 dolari credit Skype în semn de mulțumire. [Detalii](/prizes)

<% if @country == 'us' %>

Invită [toată scoala să participe ](/us/prizes) pentru șansa de câștiga premii mari pentru întreaga școală.

<% end %>

## 1. Răspândește vestea

Spune prietenilor tai despre #HourOfCode.

<%= view :share_buttons, facebook:facebook, twitter:twitter %>

<% if @country == 'us' %>

## 2. Solicită întregii şcoli sa susțină o Oră de Programare

[Trimite acest e-mail](/resources#email) sau [oferă această broșură](/files/schools-handout.pdf). Odată ce şcoala ta s-a înscris, [participă pentru a câştiga tehnologie în valoare de 10.000 dolari pentru şcoala ta](/prizes) şi provoacă alte şcoli din orașul tău să participe.

<% else %>

## 2. Solicită întregii şcoli sa susțină o Oră de Programare

[Trimite acest e-mail](/resources#email) sau [oferă această broșură](/files/schools-handout.pdf).

<% end %>

## 3. Oferă o donaţie generoasă

[Doneaza în cadrul campaniei noastre de crowdfunding](http://code.org/donate). Pentru a invata 100 de milioane de copii, avem nevoie de sprijinul tău. Am lansat ceea ce ar putea fi [cea mai mare campanie de crowdfunding pentru educaţie](http://code.org/donate) din istorie. Fiecare dolar va fi echivalat de [donatori](http://code.org/about/donors) majori Code.org, dublând impactul.

## 3. Solicită angajatorului să se implice

[Trimite acest e-mail](/resources#email) la administrator sau CEO. Sau [da-le acest poster](/resources/hoc-one-pager.pdf).

## 4. Promovează Hour of Code în jurul tău

Recrutează o comunitate sau grup local — club de copii, scoala, biserică. Sau organizează o petrecere Hour of Code în cartierul sau zona ta.

## 5. Solicită unui oficial, ales local, sprijinul pentru organizarea Hour of Code

[Trimite acest e-mail](/resources#politicians) Primarului, Pimariei sau conducerii scolii. Sau [da-le acest poster](/resources/hoc-one-pager.pdf) şi invită-i să-ți viziteze şcoala.

<%= view 'popup_window.js' %>