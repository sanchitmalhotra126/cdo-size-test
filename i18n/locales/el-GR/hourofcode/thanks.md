* * *

title: Σας ευχαριστούμε για την εγγραφή σας! layout: ευρεία

social: "og:title": "<%= hoc\_s(:meta\_tag\_og\_title) %>" "og:description": "<%= hoc\_s(:meta\_tag\_og\_description) %>" "og:image": "http://<%=request.host%>/images/hour-of-code-2014-video-thumbnail.jpg" "og:image:width": 1705 "og:image:height": 949 "og:url": "http://<%=request.host%>" "og:video": "https://youtube.googleapis.com/v/srH1OEKB2LE"

"twitter:card": player "twitter:site": "@codeorg" "twitter:url": "http://<%=request.host%>" "twitter:title": "<%= hoc\_s(:meta\_tag\_twitter\_title) %>" "twitter:description": "<%= hoc\_s(:meta\_tag\_twitter\_description) %>" "twitter:image:src": "http://<%=request.host%>/images/hour-of-code-2014-video-thumbnail.jpg" "twitter:player": 'https://www.youtubeeducation.com/embed/srH1OEKB2LE?iv\_load\_policy=3&rel=0&autohide=1&showinfo=0' "twitter:player:width": 1920 "twitter:player:height": 1080

* * *

<% facebook = {:u=>"http://#{request.host}/us"}

twitter = {:url=>"http://hourofcode.com", :related=>'codeorg', :hashtags=>'', :text=>hoc\_s(:twitter\_default\_text)} twitter[:hashtags] = 'HourOfCode' unless hoc\_s(:twitter\_default\_text).include? '#HourOfCode' %>

# Ευχαριστούμε που γράφτηκες για να πραγματοποιήσεις μια Ώρα του Κώδικα!

**ΚΑΘΕ** διοργανωτής μιας Ώρας του Κώδικα θα λάβει 10 GB χώρο στο Dropbox ή 10$ μονάδες Skype σαν ευχαριστήριο δώρο. [Λεπτομέρειες](/prizes)

<% if @country == 'us' %>

Βοηθείστε [όλο το σχολείο σας](/us/prizes) να συμμετάσχει και να έχει την ευκαρία να διεκδικήσει μεγάλα βραβεία.

<% end %>

## 1. Διάδωσέ το

Πες στους φίλους σου για την Ώρα του Κώδικα #HourOfCode.

<%= view :share_buttons, facebook:facebook, twitter:twitter %>

<% if @country == 'us' %>

## 2. Ζήτησε από το σχολείο σου να προσφέρει Μια Ώρα Κώδικα

[Στείλτε αυτό το Ηλεκτρονικό Μήνυμα](/resources#email) ή [δώστε αυτό το φυλλάδιο στο Διευθυντή σας](/files/schools-handout.pdf). Από τη στιγμή που θα εγγραφείτε, το σχολείο σας [μπορεί να διεκδικήσει τεχνολογικό εξοπλισμό αξίας 10000$ ](/prizes) και να προκαλέσει και άλλα σχολεία της περιοχής να συμμετάσχουν και να διεκδικήσουν.

<% else %>

## 2. Ζήτησε από το σχολείο σου να προσφέρει Μια Ώρα Κώδικα

[Στείλετε αυτό το μήνυμα](/resources#email) ή δώστε [αυτό το φυλλάδιο](/files/schools-handout.pdf) στο διευθυντή σας.

<% end %>

## 3. Ζήτα το από τον εργοδότη σου

[Στείλε αυτό το email](/resources#email) στον προιστάμενό σου. ή [δώστου αυτό το φυλλάδιο](/resources/hoc-one-pager.pdf).

## 4. Προώθησε την Ώρα του Κώδικα στην περιοχή σου

Φτιάξε ένα τμήμα για — ένα σώμα προσκόπων, μια ενορία, ένα πανεπιστήμιο, μια ενώση εργαζομένων. Ή κάνε μια Ώρα του Κώδικα για τη γειτονιά σου.

## 5. Ζήτα από ένα τοπικό άρχοντα να υποστηρίξει μια Ώρα του Κώδικα

[Στείλετε αυτό το μήνυμα](/resources#politicians) στο δήμαρχο, το Δημοτικό Συμβούλιο, ή τη Σχολική Επιτροπή. Ή [ δώστους αυτό το φυλλάδιο](/resources/hoc-one-pager.pdf) και να καλέσέ τους να επισκεφτούν το σχολείο σου.

<%= view 'popup_window.js' %>