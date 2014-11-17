---
from: '"Hadi Partovi (Code.org)" <hadi_partovi@code.org>'
subject: Thanks for signing up to host an Hour of Code!
view: none
theme: none
---
<% hostname = CDO.canonical_hostname('hourofcode.com') %>

# Thanks for signing up to host an Hour of Code!

**EVERY** Hour of Code organizer will receive 10 GB of Dropbox space or $10 of Skype credit as a thank you. [Details](http://<%= hostname %>/prizes)

<% if @country == 'us' %>

Get your [whole school to participate](http://<%= hostname %>/whole-school) for a chance for big prizes for your entire school.

<% end %>

## 1. Spread the word
Tell your friends about the #HourOfCode.

<% if @country == 'us' %>

## 2. Ask your whole school to offer an Hour of Code
[Send this email](http://<%= hostname %>/resources#email) or [give this handout to your principal](http://<%= hostname %>/files/schools-handout.pdf). Once your school is on board, [enter to win $10,000 worth of technology for your school](http://<%= hostname %>/prizes) and challenge other schools in your area to get on board.

<% else %>

## 2. Ask your whole school to offer an Hour of Code
[Send this email](http://<%= hostname %>/resources#email) or give [this handout](http://<%= hostname %>/files/schools-handout.pdf) to your principal.

<% end %>

## 3. Ask your employer to get involved
[Send this email](http://<%= hostname %>/resources#email) to your manager, or the CEO. Or [give them this handout](http://<%= hostname %>/resources/hoc-one-pager.pdf).

## 4. Promote Hour of Code within your community
Recruit a local group — boy/girl scouts club, church, university, veterans group or labor union. Or host an Hour of Code "block party" for your neighborhood.

## 5. Ask a local elected official to support the Hour of Code
[Send this email](http://<%= hostname %>/resources#politicians) to your mayor, city council, or school board. Or [give them this handout](http://<%= hostname %>/resources/hoc-one-pager.pdf) and invite them to visit your school.

<% if @country == 'ro' %>

Multumim ca ne-ai anuntat despre evenimentul tau! Anunta-ne daca doresti informatii suplimentare sau daca ai intrebari. Hai sa facem istorie impreuna!

Echipa Hour of Code Romania
hoc@adfaber.org

<% end %>

<hr/>

Code.org is a 501c3 non-profit. Our address is 1301 5th Ave, Suite 1225, Seattle, WA, 98101. Don't like these emails? [Unsubscribe](<%= unsubscribe_link %>).

![](<%= tracking_pixel %>)
