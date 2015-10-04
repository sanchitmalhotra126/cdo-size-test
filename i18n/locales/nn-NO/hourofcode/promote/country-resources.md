* * *

title: <%= hoc_s(:title_country_resources) %> layout: wide nav: promote_nav

* * *

<%= view :signup_button %>

<% if @country == 'la' %>

# Recursos

## Vídeos <iframe width="560" height="315" src="https://www.youtube.com/embed/HrBh2165KjE" frameborder="0" allowfullscreen></iframe>
<

p>[**¿Por qué todos tienen que aprender a programar? Participá de la Hora del Código en Argentina (5 min)**](https://www.youtube.com/watch?v=HrBh2165KjE)

<% elsif @country == 'uk' %>

# How-to Guide for Organizations

## Use this handout to recruit corporations

[<img width="500" height="300" src="<%= localized_image('/images/corporations.png') %>" />](<%= localized_file('/files/corporations.pdf') %>)

## 1) Prøv leksjonane sjølv:

We’ll host a variety of fun, hour-long tutorials, created by a variety of partners. New tutorials are coming to kick off the Hour of Code before <%= campaign_date('full') %>.

**For alle leksjonane i Kodetimen gjeld:**

  * Require minimal prep-time for organizers
  * Er tilrettelagt for at elevane skal arbeide på eiga hand, i eige tempo og tilpasset eige ferdigheitsnivå

[![](https://uk.code.org/images/tutorials.png)](https://uk.code.org/learn)

## 2) Planlegg det du treng av utstyr - datamaskiner er valfrie

The best Hour of Code experience will be with Internet-connected computers. But you don’t need a computer for every participant, and can even do the Hour of Code without a computer at all.

  * **Prøv ut leksjonane på elevane sine datamaskiner eller nettbrett.**Ver viss på at dei fungerer sikkeleg med lyd og video.
  * **Sjekk ut gratulasjons-sida** for å sjå kva elevane vil få sjå når dei er ferdige. 
  * **Provide headphones for your group**, or ask students to bring their own, if the tutorial you choose works best with sound.

## 3) Planlegg ut frå tilgjengeleg utstyr

  * **Ikkje nok maskiner til alle elevane?** Prøv [parprogrammering](http://www.ncwit.org/resources/pair-programming-box-power-collaborative-learning). When participants partner up, they help each other and rely less on the teacher.
  * **Er internettlinja treg?** Planlegg å vise videoane for heile klassa samla, slik at alle elev ikkje lastar ned kvar sin video. Eller prøv dei leksjonene som ikkje treng tilgang til nettet.

## 4) For å inspirere elevane - Vis ein video!

Vis elevane ein inspirerande video for å dra i gang Kodetimen. For eksempel:

  * Bill Gates, Mark Zuckerberg og NBA stjerna Chris Bosh var med i den opprinnelge lanseringsvideoen for Code.org (Det finns versjonar på [eit minutt](https://www.youtube.com/watch?v=qYZF6oIZtfc), [5 minutt](https://www.youtube.com/watch?v=nKIu9yen5nc) og [9 minutt](https://www.youtube.com/watch?v=dU1xS07N-FA))
  * The [Hour of Code 2013 launch video](https://www.youtube.com/watch?v=FC5FbmsH4fw), or the [Hour of Code 2014 video](https://www.youtube.com/watch?v=96B5-JGA9EQ)
  * [President Obama oppfordrar alle elevar til å lære datavitskap](https://www.youtube.com/watch?v=6XvmhE1J9PY)

**Gi ein kort introduksjon for å gi elevane tenning!**

<% else %>

# Flere ressurser kommer snart!

<% end %>

<%= view :signup_button %>