* * *

title: Thanks for signing up to host an Hour of Code! layout: wide

social: "og:title": "<%= hoc\_s(:meta\_tag\_og\_title) %>" "og:description": "<%= hoc\_s(:meta\_tag\_og\_description) %>" "og:image": "http://<%=request.host%>/images/hour-of-code-2014-video-thumbnail.jpg" "og:image:width": 1705 "og:image:height": 949 "og:url": "http://<%=request.host%>" "og:video": "https://youtube.googleapis.com/v/srH1OEKB2LE"

"twitter:card": player "twitter:site": "@codeorg" "twitter:url": "http://<%=request.host%>" "twitter:title": "<%= hoc\_s(:meta\_tag\_twitter\_title) %>" "twitter:description": "<%= hoc\_s(:meta\_tag\_twitter\_description) %>" "twitter:image:src": "http://<%=request.host%>/images/hour-of-code-2014-video-thumbnail.jpg" "twitter:player": 'https://www.youtubeeducation.com/embed/srH1OEKB2LE?iv\_load\_policy=3&rel=0&autohide=1&showinfo=0' "twitter:player:width": 1920

## "twitter:player:height": 1080

<% facebook = {:u=>"http://#{request.host}/us"}

twitter = {:url=>"http://hourofcode.com", :related=>'codeorg', :hashtags=>'', :text=>hoc\_s(:twitter\_default\_text)} twitter[:hashtags] = 'HourOfCode' unless hoc\_s(:twitter\_default\_text).include? '#HourOfCode' %>

# Obrigado por inscrever-se para sediar a Hora do Código!

**TODO** organizador da Hora do Código receberá 10 GB de espaço no Dropbox ou US$10 de crédito no Skype como agradecimento. [Detalhes][1]

 [1]: /prizes

<% if @country == 'us' %>

Get your [whole school to participate][2] for a chance for big prizes for your entire school.

 [2]: /us/prizes

<% end %>

## 1. Espalhe a notícia

Fale aos seus amigos sobre o #HoraDoCódigo.

<%= view :share_buttons, facebook:facebook, twitter:twitter %>

<% if @country == 'us' %>

## 2. Peça para sua escola oferecer uma Hora do Código

[Send this email][3] or [give this handout to your principal][4]. Quando toda a escola estiver participando, [inscreva-se para ganhar US$10.000 em tecnologia para sua escola][1] e desafie outras escolas de sua região a participar.

 [3]: /resources#email
 [4]: /files/schools-handout.pdf

<% else %>

## 2. Peça para sua escola oferecer uma Hora do Código

[Send this email][3] or give [this handout][4] to your principal.

<% end %>

## 3. Peça para seu chefe para participar

[Envie este email][3] para seu gerente, ou para seu Diretor Executivo. Ou [entregue este folheto a eles][5].

 [5]: /resources/hoc-one-pager.pdf

## 4. Promova a Hora do Código em sua comunidade

Reúna um grupo local — clube de escoteiros, igreja, universidade, grupo de veteranos ou sindicato. Ou ofereça uma "festa" Hora do Código para sua vizinhança.

## 5. Peça a um oficial eleito para apoiar a Hora do Código

[Envie este e-mail][3] para seu prefeito, Câmara Municipal ou conselho escolar. Ou [entregue este folheto][5] e convide-os a visitar sua escola.

<%= view 'popup_window.js' %>