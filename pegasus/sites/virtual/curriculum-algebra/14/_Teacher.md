---
title: Eval Boolean Operators
view: page_curriculum
theme: none
---

<%
lesson_id = 'alg14'
lesson = DB[:cdo_lessons].where(id_s:lesson_id).first
%>

<%= partial('../docs/_header', :lesson => lesson) %>

[summary]

## Teaching Summary
### **Getting Started**
 
1) [Introduction](#GetStarted)  

### **Eval: Boolean Operators**  

2) [Online Puzzles](#Activity1)

[/summary]

[together]

# Teaching Guide

## Materials, Resources and Prep

### For the Teacher
- [Lesson slide deck](https://docs.google.com/a/code.org/presentation/d/1hWgXUeeBMh_ah8GUTBshhy_5GAbiIwNj87M-8MkVJH4/edit#slide=id.g63497456e_010/)

## Getting Started

### <a name="GetStarted"></a> 1) Introduction

Creating some simple booleans and some more complex expressions prior to the progressions is an excellent warm-up activity.  Some examples have been included in the slide deck.  The slide deck also has extra practice related to expressions that the students will have seen in the puzzles.

[/together]

[together]

## Activity: Eval Design Recpie
### <a name="Activity1"></a> 2) Online Puzzles

Head to [MSM stage 14](http://studio.code.org/s/algebra/stage/14/puzzle/1) in Code Studio to get started programming.

[/together]

<%= partial('../docs/_footer', :lesson => lesson) %>