---
title: Full Team
nav: about_nav
---
# Full Team

<%= view :about_headshots, people:DB[:cdo_team].where(kind_s:'team'), :columns=>3 %>

<a id="extended"></a>
## Extended Team
<%= view :about_people, people:DB[:cdo_team].where(kind_s:'extended_active') %>

### Thank you to our extended team of [Lead Translators](http://code.org/translators)!

## Special Thanks to
<%= view :about_people, people:DB[:cdo_team].where(kind_s:'extended_inactive') %>


