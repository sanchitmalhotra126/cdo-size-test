---
title: App Lab Docs
embedded_layout: simple_embedded
---

[name]

## getText_josh(id)

[/name]


[category]

Category: UI Controls

[/category]

[description]

[short_description]

Get the text from a specified element.

[/short_description]

[/description]

### Examples
____________________________________________________

[example]


<pre>
getText(button1);
</pre>

[/example]

____________________________________________________

[example]

**Basic Example**

Getting the state of a checkbox:

<pre>
checkbox("checkbox1", true);                // Create a checked checkbox with id checkbox1
var isChecked = getChecked("checkbox1");    // isChecked will be assigned the boolean value true

console.log("The value of isChecked is " + isChecked);
</pre>

[/example]

____________________________________________________

[example]

**Interactive Example**

Many websites have a registration page where users are asked to accept the terms of service by checking a checkbox.

<pre>
checkbox("checkbox1", false);
textLabel("label1", "I accept the terms of service");

button("button1", "Register");                            // Create a "Register" button.

onEvent("button1", "click", function(){                   // Whenever the "Register" button is clicked ...

  var acceptedTermsOfService = getChecked("checkbox1");   // Get a boolean indicating whether the checkbox is checked or not.

  if(acceptedTermsOfService){                             // Based on the boolean, write a message to the screen.
    write("OK");
  } else {
    write("You must accept the terms of service");
  }
});
</pre>


[/example]

____________________________________________________


[syntax]

### Syntax
<pre>
checkbox(id, checked);
</pre>

[/syntax]

[parameters]

### Parameters

| Name  | Type | Required? | Description |
|-----------------|------|-----------|-------------|
| id | String | Yes | A unique identifier for the checkbox. The id is used for referencing the created checkbox. For example, getting the checkbox's state (checked/unchecked).  |
| checked | Boolean | No | Indicates the initial state (checked/unchecked) of the checkbox. Default value: `false`.  |

[/parameters]

[returns]

### Returns
No return value.

[/returns]

[tips]

### Tips

The checkbox can also be used in design mode.

[/tips]

[bug]

Found a bug in the documentation? Let us know at documentation@code.org

[/bug]

<%= view :applab_docs_common %>
