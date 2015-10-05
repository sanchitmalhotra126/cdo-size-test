* * *

title: <%= hoc_s(:title_country_resources) %> layout: wide nav: promote_nav

* * *

<%= view :signup_button %>

<% if @country == 'la' %>

# Recursos

## Vídeos <iframe width="560" height="315" src="https://www.youtube.com/embed/HrBh2165KjE" frameborder="0" allowfullscreen></iframe>
<

p>[**Por que todos precisam aprender a programar? Participe da Hora do Código na Argentina (5 min)**](https://www.youtube.com/watch?v=HrBh2165KjE)

<% elsif @country == 'uk' %>

# How-to Guide for Organizations

## Use this handout to recruit corporations

[<img width="500" height="300" src="<%= localized_image('/images/corporations.png') %>" />](<%= localized_file('/files/corporations.pdf') %>)

## 1) Veja os tutoriais:

We’ll host a variety of fun, hour-long tutorials, created by a variety of partners. New tutorials are coming to kick off the Hour of Code before <%= campaign_date('full') %>.

**Todos os tutoriais da Hora do Código:**

  * Exigem um tempo mínimo de preparação dos organizadores
  * São autoexplicativos, o que permite que os alunos trabalhem em seu próprio ritmo e nível de habilidade

[![](https://uk.code.org/images/tutorials.png)](https://uk.code.org/learn)

## 2) Planeje suas necessidades de hardware (computadores são opcionais)

Para uma melhor experiência com a Hora do Código, o ideal são computadores conectados à internet. No entanto, não é necessário um computador por participante, e também é possível fazer a Hora do Código sem o uso de computadores.

  * **Teste os tutoriais nos computadores ou dispositivos dos alunos.** Verifique se eles funcionam da maneira adequada (com som e vídeo).
  * **Visualize a página de parabenização** para saber o que os alunos veem quando terminam. 
  * **Forneça fones de ouvido para o seu grupo** ou peça aos alunos que tragam seus próprios fones, se o tutorial escolhido funcionar melhor com som.

## 3) Programe-se com antecedência com base na tecnologia disponível

  * **Não tem dispositivos suficientes?** Use [programação em duplas](http://www.ncwit.org/resources/pair-programming-box-power-collaborative-learning). Quando os participantes trabalham em equipe, eles ajudam uns aos outros e dependem menos do professor.
  * **Tem baixa largura de banda?** Programe-se para mostrar os vídeos para a classe toda, assim os alunos não terão de fazer o download individualmente. Outra opção é trabalhar com os tutoriais offline.

## 4) Inspire seus alunos - mostre um vídeo a eles

Mostre aos alunos um vídeo inspirador para começar a Hora do Código. Exemplos:

  * O vídeo original de lançamento da Code.org, com a participação de Bill Gates, Mark Zuckerberg e o astro da NBA, Chris Bosh (há versões de [1 minuto](https://www.youtube.com/watch?v=qYZF6oIZtfc), [5 minutos](https://www.youtube.com/watch?v=nKIu9yen5nc) e [9 minutos](https://www.youtube.com/watch?v=dU1xS07N-FA))
  * The [Hour of Code 2013 launch video](https://www.youtube.com/watch?v=FC5FbmsH4fw), or the [Hour of Code 2014 video](https://www.youtube.com/watch?v=96B5-JGA9EQ)
  * [O vídeo do presidente Obama convidando todos os alunos a aprender ciência da computação](https://www.youtube.com/watch?v=6XvmhE1J9PY)

**Estimule seus alunos - faça uma breve introdução**

<% else %>

# Outros recursos em breve!

<% end %>

<%= view :signup_button %>