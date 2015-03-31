var locale = {lc:{"ar":function(n){
  if (n === 0) {
    return 'zero';
  }
  if (n == 1) {
    return 'one';
  }
  if (n == 2) {
    return 'two';
  }
  if ((n % 100) >= 3 && (n % 100) <= 10 && n == Math.floor(n)) {
    return 'few';
  }
  if ((n % 100) >= 11 && (n % 100) <= 99 && n == Math.floor(n)) {
    return 'many';
  }
  return 'other';
},"en":function(n){return n===1?"one":"other"},"bg":function(n){return n===1?"one":"other"},"bn":function(n){return n===1?"one":"other"},"ca":function(n){return n===1?"one":"other"},"cs":function(n){
  if (n == 1) {
    return 'one';
  }
  if (n == 2 || n == 3 || n == 4) {
    return 'few';
  }
  return 'other';
},"da":function(n){return n===1?"one":"other"},"de":function(n){return n===1?"one":"other"},"el":function(n){return n===1?"one":"other"},"es":function(n){return n===1?"one":"other"},"et":function(n){return n===1?"one":"other"},"eu":function(n){return n===1?"one":"other"},"fa":function(n){return "other"},"fi":function(n){return n===1?"one":"other"},"fil":function(n){return n===0||n==1?"one":"other"},"fr":function(n){return Math.floor(n)===0||Math.floor(n)==1?"one":"other"},"gl":function(n){return n===1?"one":"other"},"he":function(n){return n===1?"one":"other"},"hi":function(n){return n===0||n==1?"one":"other"},"hr":function(n){
  if ((n % 10) == 1 && (n % 100) != 11) {
    return 'one';
  }
  if ((n % 10) >= 2 && (n % 10) <= 4 &&
      ((n % 100) < 12 || (n % 100) > 14) && n == Math.floor(n)) {
    return 'few';
  }
  if ((n % 10) === 0 || ((n % 10) >= 5 && (n % 10) <= 9) ||
      ((n % 100) >= 11 && (n % 100) <= 14) && n == Math.floor(n)) {
    return 'many';
  }
  return 'other';
},"hu":function(n){return "other"},"id":function(n){return "other"},"is":function(n){
    return ((n%10) === 1 && (n%100) !== 11) ? 'one' : 'other';
  },"it":function(n){return n===1?"one":"other"},"ja":function(n){return "other"},"ko":function(n){return "other"},"lt":function(n){
  if ((n % 10) == 1 && ((n % 100) < 11 || (n % 100) > 19)) {
    return 'one';
  }
  if ((n % 10) >= 2 && (n % 10) <= 9 &&
      ((n % 100) < 11 || (n % 100) > 19) && n == Math.floor(n)) {
    return 'few';
  }
  return 'other';
},"lv":function(n){
  if (n === 0) {
    return 'zero';
  }
  if ((n % 10) == 1 && (n % 100) != 11) {
    return 'one';
  }
  return 'other';
},"mk":function(n){return (n%10)==1&&n!=11?"one":"other"},"ms":function(n){return "other"},"mt":function(n){
  if (n == 1) {
    return 'one';
  }
  if (n === 0 || ((n % 100) >= 2 && (n % 100) <= 4 && n == Math.floor(n))) {
    return 'few';
  }
  if ((n % 100) >= 11 && (n % 100) <= 19 && n == Math.floor(n)) {
    return 'many';
  }
  return 'other';
},"nl":function(n){return n===1?"one":"other"},"no":function(n){return n===1?"one":"other"},"pl":function(n){
  if (n == 1) {
    return 'one';
  }
  if ((n % 10) >= 2 && (n % 10) <= 4 &&
      ((n % 100) < 12 || (n % 100) > 14) && n == Math.floor(n)) {
    return 'few';
  }
  if ((n % 10) === 0 || n != 1 && (n % 10) == 1 ||
      ((n % 10) >= 5 && (n % 10) <= 9 || (n % 100) >= 12 && (n % 100) <= 14) &&
      n == Math.floor(n)) {
    return 'many';
  }
  return 'other';
},"pt":function(n){return n===1?"one":"other"},"ro":function(n){
  if (n == 1) {
    return 'one';
  }
  if (n === 0 || n != 1 && (n % 100) >= 1 &&
      (n % 100) <= 19 && n == Math.floor(n)) {
    return 'few';
  }
  return 'other';
},"ru":function(n){
  if ((n % 10) == 1 && (n % 100) != 11) {
    return 'one';
  }
  if ((n % 10) >= 2 && (n % 10) <= 4 &&
      ((n % 100) < 12 || (n % 100) > 14) && n == Math.floor(n)) {
    return 'few';
  }
  if ((n % 10) === 0 || ((n % 10) >= 5 && (n % 10) <= 9) ||
      ((n % 100) >= 11 && (n % 100) <= 14) && n == Math.floor(n)) {
    return 'many';
  }
  return 'other';
},"sk":function(n){
  if (n == 1) {
    return 'one';
  }
  if (n == 2 || n == 3 || n == 4) {
    return 'few';
  }
  return 'other';
},"sl":function(n){
  if ((n % 100) == 1) {
    return 'one';
  }
  if ((n % 100) == 2) {
    return 'two';
  }
  if ((n % 100) == 3 || (n % 100) == 4) {
    return 'few';
  }
  return 'other';
},"sq":function(n){return n===1?"one":"other"},"sr":function(n){
  if ((n % 10) == 1 && (n % 100) != 11) {
    return 'one';
  }
  if ((n % 10) >= 2 && (n % 10) <= 4 &&
      ((n % 100) < 12 || (n % 100) > 14) && n == Math.floor(n)) {
    return 'few';
  }
  if ((n % 10) === 0 || ((n % 10) >= 5 && (n % 10) <= 9) ||
      ((n % 100) >= 11 && (n % 100) <= 14) && n == Math.floor(n)) {
    return 'many';
  }
  return 'other';
},"sv":function(n){return n===1?"one":"other"},"ta":function(n){return n===1?"one":"other"},"th":function(n){return "other"},"tr":function(n){return n===1?"one":"other"},"uk":function(n){
  if ((n % 10) == 1 && (n % 100) != 11) {
    return 'one';
  }
  if ((n % 10) >= 2 && (n % 10) <= 4 &&
      ((n % 100) < 12 || (n % 100) > 14) && n == Math.floor(n)) {
    return 'few';
  }
  if ((n % 10) === 0 || ((n % 10) >= 5 && (n % 10) <= 9) ||
      ((n % 100) >= 11 && (n % 100) <= 14) && n == Math.floor(n)) {
    return 'many';
  }
  return 'other';
},"ur":function(n){return n===1?"one":"other"},"vi":function(n){return "other"},"zh":function(n){return "other"}},
c:function(d,k){if(!d)throw new Error("MessageFormat: Data required for '"+k+"'.")},
n:function(d,k,o){if(isNaN(d[k]))throw new Error("MessageFormat: '"+k+"' isn't a number.");return d[k]-(o||0)},
v:function(d,k){locale.c(d,k);return d[k]},
p:function(d,k,o,l,p){locale.c(d,k);return d[k] in p?p[d[k]]:(k=locale.lc[l](d[k]-o),k in p?p[k]:p.other)},
s:function(d,k,p){locale.c(d,k);return d[k] in p?p[d[k]]:p.other}};
(window.blockly = window.blockly || {}).locale = {
"and":function(d){return "และ"},
"booleanTrue":function(d){return "จริง"},
"booleanFalse":function(d){return "เท็จ"},
"blocks":function(d){return "บล็อก"},
"blocklyMessage":function(d){return "Blockly"},
"catActions":function(d){return "การดำเนินการ"},
"catColour":function(d){return "Color"},
"catLogic":function(d){return "ตรรกะ"},
"catLists":function(d){return "ลิสต์"},
"catLoops":function(d){return "ลูป"},
"catMath":function(d){return "คำนวณ"},
"catProcedures":function(d){return "ฟังก์ชัน"},
"catText":function(d){return "ข้อความ"},
"catVariables":function(d){return "ตัวแปร"},
"clearPuzzle":function(d){return "เริ่มต้นใหม่"},
"clearPuzzleConfirm":function(d){return "สิ่งนี้จะเริ่มต้นเกมใหม่ที่จุดเริ่มต้นและลบทุกบล็อกที่คุณเพิ่มหรือเปลี่ยนออกไป."},
"clearPuzzleConfirmHeader":function(d){return "คุณจะเริ่มต้นใหม่จริงๆหรือ ?"},
"codeMode":function(d){return "โปรแกรม"},
"codeTooltip":function(d){return "ดูการสร้างโค้ด JavaScript."},
"continue":function(d){return "ดำเนินการต่อไป"},
"designMode":function(d){return "Design"},
"designModeHeader":function(d){return "สถานะการออกแบบ"},
"dialogCancel":function(d){return "ยกเลิก"},
"dialogOK":function(d){return "ตกลง"},
"directionNorthLetter":function(d){return "N"},
"directionSouthLetter":function(d){return "S"},
"directionEastLetter":function(d){return "E"},
"directionWestLetter":function(d){return "W"},
"dropletBlock_addOperator_description":function(d){return "Add two numbers"},
"dropletBlock_andOperator_description":function(d){return "Logical AND of two booleans"},
"dropletBlock_arcLeft_description":function(d){return "Move the turtle in a counterclockwise arc using the specified number of degrees and radius"},
"dropletBlock_arcRight_description":function(d){return "Move the turtle in a clockwise arc using the specified number of degrees and radius"},
"dropletBlock_assign_x_description":function(d){return "Reassign a variable"},
"dropletBlock_button_description":function(d){return "Create a button and assign it an element id"},
"dropletBlock_callMyFunction_description":function(d){return "Use a function without an argument"},
"dropletBlock_callMyFunction_n_description":function(d){return "Use a function with argument"},
"dropletBlock_changeScore_description":function(d){return "เพิ่ม หรือลบ หนึ่งคะแนน."},
"dropletBlock_checkbox_description":function(d){return "Create a checkbox and assign it an element id"},
"dropletBlock_circle_description":function(d){return "Draw a circle on the active  canvas with the specified coordinates for center (x, y) and radius"},
"dropletBlock_clearCanvas_description":function(d){return "Clear all data on the active canvas"},
"dropletBlock_clearInterval_description":function(d){return "Clear an existing interval timer by passing in the value returned from setInterval()"},
"dropletBlock_clearTimeout_description":function(d){return "Clear an existing timer by passing in the value returned from setTimeout()"},
"dropletBlock_console.log_description":function(d){return "Log a message or variable to the output window"},
"dropletBlock_container_description":function(d){return "Create a division container with the specified element id, and optionally set its inner HTML"},
"dropletBlock_createCanvas_description":function(d){return "Create a canvas with the specified id, and optionally set width and height dimensions"},
"dropletBlock_createRecord_description":function(d){return "Creates a new record in the specified table."},
"dropletBlock_createRecord_param0":function(d){return "table"},
"dropletBlock_createRecord_param1":function(d){return "record"},
"dropletBlock_createRecord_param2":function(d){return "onSuccess"},
"dropletBlock_declareAssign_x_array_1_4_description":function(d){return "Create a variable and initialize it as an array"},
"dropletBlock_declareAssign_x_description":function(d){return "Create a variable for the first time"},
"dropletBlock_declareAssign_x_prompt_description":function(d){return "Create a variable and assign it a value by displaying a prompt"},
"dropletBlock_deleteElement_description":function(d){return "Delete the element with the specified id"},
"dropletBlock_deleteRecord_description":function(d){return "Deletes a record, identified by record.id."},
"dropletBlock_deleteRecord_param0":function(d){return "table"},
"dropletBlock_deleteRecord_param1":function(d){return "record"},
"dropletBlock_deleteRecord_param2":function(d){return "onSuccess"},
"dropletBlock_divideOperator_description":function(d){return "Divide two numbers"},
"dropletBlock_dot_description":function(d){return "Draw a dot in the turtle's location with the specified radius"},
"dropletBlock_drawImage_description":function(d){return "Draw an image on the active  canvas with the specified image element and x, y as the top left coordinates"},
"dropletBlock_dropdown_description":function(d){return "Create a dropdown, assign it an element id, and populate it with a list of items"},
"dropletBlock_equalityOperator_description":function(d){return "Test for equality"},
"dropletBlock_forLoop_i_0_4_description":function(d){return "Do something multiple times"},
"dropletBlock_functionParams_n_description":function(d){return "Create a function with an argument"},
"dropletBlock_functionParams_n_signatureOverride":function(d){return "Function with a Parameter"},
"dropletBlock_functionParams_none_description":function(d){return "Create a function without an argument"},
"dropletBlock_functionParams_none_signatureOverride":function(d){return "Function Definition"},
"dropletBlock_getAlpha_description":function(d){return "Gets the alpha"},
"dropletBlock_getAttribute_description":function(d){return "Gets the given attribute"},
"dropletBlock_getBlue_description":function(d){return "Gets the given blue value"},
"dropletBlock_getChecked_description":function(d){return "Get the state of a checkbox or radio button"},
"dropletBlock_getDirection_description":function(d){return "Get the turtle's direction (0 degrees is pointing up)"},
"dropletBlock_getGreen_description":function(d){return "Gets the given green value"},
"dropletBlock_getImageData_description":function(d){return "Get the ImageData for a rectangle (x, y, width, height) within the active  canvas"},
"dropletBlock_getImageURL_description":function(d){return "Get the URL associated with an image or image upload button"},
"dropletBlock_getKeyValue_description":function(d){return "Reads the value associated with the key from the remote data store."},
"dropletBlock_getRed_description":function(d){return "Gets the given red value"},
"dropletBlock_getText_description":function(d){return "Get the text from the specified element"},
"dropletBlock_getTime_description":function(d){return "Get the current time in milliseconds"},
"dropletBlock_getUserId_description":function(d){return "Gets a unique identifier for the current user of this app."},
"dropletBlock_getX_description":function(d){return "Get the turtle's x position"},
"dropletBlock_getXPosition_description":function(d){return "Get the element's x position"},
"dropletBlock_getY_description":function(d){return "Get the turtle's y position"},
"dropletBlock_getYPosition_description":function(d){return "Get the element's y position"},
"dropletBlock_greaterThanOperator_description":function(d){return "Compare two numbers"},
"dropletBlock_hide_description":function(d){return "Hide the turtle image"},
"dropletBlock_hideElement_description":function(d){return "Hide the element with the specified id"},
"dropletBlock_ifBlock_description":function(d){return "Do something only if a condition is true"},
"dropletBlock_ifElseBlock_description":function(d){return "Do something if a condition is true, otherwise do something else"},
"dropletBlock_image_description":function(d){return "Create an image and assign it an element id"},
"dropletBlock_imageUploadButton_description":function(d){return "Create an image upload button and assign it an element id"},
"dropletBlock_inequalityOperator_description":function(d){return "Test for inequality"},
"dropletBlock_innerHTML_description":function(d){return "Set the inner HTML for the element with the specified id"},
"dropletBlock_lessThanOperator_description":function(d){return "Compare two numbers"},
"dropletBlock_line_description":function(d){return "Draw a line on the active canvas from x1, y1 to x2, y2"},
"dropletBlock_mathAbs_description":function(d){return "Absolute value"},
"dropletBlock_mathMax_description":function(d){return "Maximum value"},
"dropletBlock_mathMin_description":function(d){return "Minimum value"},
"dropletBlock_mathRound_description":function(d){return "Round to the nearest integer"},
"dropletBlock_move_description":function(d){return "Move the turtle by the specified x and y coordinates"},
"dropletBlock_moveBackward_description":function(d){return "Move the turtle backward the specified distance"},
"dropletBlock_moveForward_description":function(d){return "Move the turtle forward the specified distance"},
"dropletBlock_moveTo_description":function(d){return "Move the turtle to the specified x and y coordinates"},
"dropletBlock_multiplyOperator_description":function(d){return "Multiply two numbers"},
"dropletBlock_notOperator_description":function(d){return "Logical NOT of a boolean"},
"dropletBlock_onEvent_description":function(d){return "สั่งโปรแกรมให้ทำงาน ในการตอบสนองต่อเหตุการณ์ยางอย่าง."},
"dropletBlock_onEvent_param0":function(d){return "id"},
"dropletBlock_onEvent_param1":function(d){return "event"},
"dropletBlock_onEvent_param2":function(d){return "function"},
"dropletBlock_orOperator_description":function(d){return "Logical OR of two booleans"},
"dropletBlock_penColor_description":function(d){return "Set the turtle to the specified pen color"},
"dropletBlock_penColour_description":function(d){return "Set the turtle to the specified pen color"},
"dropletBlock_penDown_description":function(d){return "Set down the turtle's pen"},
"dropletBlock_penUp_description":function(d){return "Pick up the turtle's pen"},
"dropletBlock_penWidth_description":function(d){return "Set the turtle to the specified pen width"},
"dropletBlock_playSound_description":function(d){return "Play the MP3, OGG, or WAV sound file from the specified URL"},
"dropletBlock_putImageData_description":function(d){return "Set the ImageData for a rectangle within the active  canvas with x, y as the top left coordinates"},
"dropletBlock_radioButton_description":function(d){return "Create a radio button and assign it an element id"},
"dropletBlock_randomNumber_max_description":function(d){return "Get a random number between 0 and the specified maximum value"},
"dropletBlock_randomNumber_min_max_description":function(d){return "Get a random number between the specified minimum and maximum values"},
"dropletBlock_readRecords_description":function(d){return "Reads all records whose properties match those on the searchParams object."},
"dropletBlock_readRecords_param0":function(d){return "table"},
"dropletBlock_readRecords_param1":function(d){return "searchParams"},
"dropletBlock_readRecords_param2":function(d){return "onSuccess"},
"dropletBlock_rect_description":function(d){return "Draw a rectangle on the active  canvas with x, y, width, and height coordinates"},
"dropletBlock_return_description":function(d){return "Return a value from a function"},
"dropletBlock_setActiveCanvas_description":function(d){return "Set the canvas id for subsequent canvas commands (only needed when there are multiple canvas elements)"},
"dropletBlock_setAlpha_description":function(d){return "Sets the given value"},
"dropletBlock_setAttribute_description":function(d){return "Sets the given value"},
"dropletBlock_setBackground_description":function(d){return "ตั่งค่าภาพพื้นหลัง"},
"dropletBlock_setBlue_description":function(d){return "Sets the given value"},
"dropletBlock_setChecked_description":function(d){return "Set the state of a checkbox or radio button"},
"dropletBlock_setFillColor_description":function(d){return "Set the fill color for the active  canvas"},
"dropletBlock_setGreen_description":function(d){return "Sets the given value"},
"dropletBlock_setImageURL_description":function(d){return "Set the URL for the specified image element id"},
"dropletBlock_setInterval_description":function(d){return "Continue to execute code each time the specified number of milliseconds has elapsed"},
"dropletBlock_setKeyValue_description":function(d){return "Saves the value associated with the key to the remote data store."},
"dropletBlock_setParent_description":function(d){return "Set an element to become a child of a parent element"},
"dropletBlock_setPosition_description":function(d){return "Position an element with x, y, width, and height coordinates"},
"dropletBlock_setRed_description":function(d){return "Sets the given value"},
"dropletBlock_setRGBA_description":function(d){return "Sets the given value"},
"dropletBlock_setStrokeColor_description":function(d){return "Set the stroke color for the active  canvas"},
"dropletBlock_setSprite_description":function(d){return "ติดตั้งรูปของนักแสดง"},
"dropletBlock_setSpriteEmotion_description":function(d){return "ตั้งค่าอารมณ์ของนักแสดง"},
"dropletBlock_setSpritePosition_description":function(d){return "ย้ายตัวละครไปยังตำแหน่งที่ระบุทันที"},
"dropletBlock_setSpriteSpeed_description":function(d){return "ตั้งค่าความเร็วของนักแสดง"},
"dropletBlock_setStrokeWidth_description":function(d){return "Set the line width for the active  canvas"},
"dropletBlock_setStyle_description":function(d){return "Add CSS style text to an element"},
"dropletBlock_setText_description":function(d){return "Set the text for the specified element"},
"dropletBlock_setTimeout_description":function(d){return "Set a timer and execute code when that number of milliseconds has elapsed"},
"dropletBlock_show_description":function(d){return "Show the turtle image at its current location"},
"dropletBlock_showElement_description":function(d){return "Show the element with the specified id"},
"dropletBlock_speed_description":function(d){return "Change the execution speed of the program to the specified percentage value"},
"dropletBlock_startWebRequest_description":function(d){return "Request data from the internet and execute code when the request is complete"},
"dropletBlock_subtractOperator_description":function(d){return "Subtract two numbers"},
"dropletBlock_textInput_description":function(d){return "Create a text input and assign it an element id"},
"dropletBlock_textLabel_description":function(d){return "Create a text label, assign it an element id, and bind it to an associated element"},
"dropletBlock_throw_description":function(d){return "โยนแบบโค้งจากนักแสดงที่ถูกระบุ."},
"dropletBlock_turnLeft_description":function(d){return "Turn the turtle counterclockwise by the specified number of degrees"},
"dropletBlock_turnRight_description":function(d){return "Turn the turtle clockwise by the specified number of degrees"},
"dropletBlock_turnTo_description":function(d){return "Turn the turtle to the specified direction (0 degrees is pointing up)"},
"dropletBlock_updateRecord_description":function(d){return "Updates a record, identified by record.id."},
"dropletBlock_vanish_description":function(d){return "นักแสดงที่หายไป."},
"dropletBlock_whileBlock_description":function(d){return "Repeat something while a condition is true"},
"dropletBlock_write_description":function(d){return "Create a block of text"},
"end":function(d){return "สิ้นสุด"},
"emptyBlocksErrorMsg":function(d){return "\"ทำซ้ำ\" หรือ \"ถ้า\" บล็อกจำเป็นต้องมีบล็อกอื่น ๆ ภายในจึงจะทำงาน. ตรวจสอบให้แน่ใจว่า บล็อกภายในเข้ากันอย่างถูกต้องแล้ว."},
"emptyFunctionBlocksErrorMsg":function(d){return "บล็อกหน้าที่ต้องการให้มีบล็อกอื่นๆอยู่ด้านในถึงจะทำงานได้."},
"errorEmptyFunctionBlockModal":function(d){return "มันควรจะมีบล็อกอยู่ภายในความหมายของหน้าการทำงานของโปรแกรม. คลิ่กที่ การแก้ไข และ ลาก บล็อกทั้งหลายภายในบล็อกสีเขียว."},
"errorIncompleteBlockInFunction":function(d){return "คลิ่กที่ การแก้ไข เพื่อให้แน่ใจว่า คุณไม่มีบล็อกค้างอยู่ภายในความหมายของหน้าที่การทำงาน."},
"errorParamInputUnattached":function(d){return "จำให้ได้ว่า จะต้องแนบบล็อกไปในแต่ละข้อมูลเข้าในบล็อกหน้าที่การทำงาน ในพื้นที่การทำงานของคุณ."},
"errorUnusedParam":function(d){return "คุณเพิ่มบล็อกของตัวแทนค่า แต่อย่าใช้มันในการให้ความหมาย ให้แน่ใจว่า คุณ ใช้ตัวแปรของคุณโดยการคลิ่กที่ การแก้ไข และ วางมันลงไปที่บล็อกตัวแปร ด้านใน ของบล็อกเขียว."},
"errorRequiredParamsMissing":function(d){return "สร้างพารามิเตอร์สำหรับฟังก์ชันของคุณ โดยคลิก \"แก้ไข\" และเพิ่มพารามิเตอร์ที่จำเป็น.\nลากบล็อกของพารามิเตอร์ใหม่ไปสู่นิยามของฟังก์ชัน."},
"errorUnusedFunction":function(d){return "คุณสร้างฟังก์ชัน แต่ไม่เคยใช้มันบนพื้นที่ทำงานของคุณ คลิกที่ \"ฟังก์ชัน\" ในกล่องเครื่องมือ และให้แน่ใจว่า คุณใช้ในโปรแกรมของคุณ."},
"errorQuestionMarksInNumberField":function(d){return "ลองแทน \"???\" ด้วยค่า."},
"extraTopBlocks":function(d){return "คุณมีบล็อกที่แยกออกไป คุณหมายถึง ว่าคุณจะแนบบล็อคเหล่านี้ไปที่ \"เมื่อรัน\" บล็อกหรือเปล่า ?"},
"finalStage":function(d){return "ขอแสดงความยินดี ขั้นตอนสุดท้ายสำเร็จแล้ว."},
"finalStageTrophies":function(d){return "ขอแสดงความยินดี คุณได้เสร็จสิ้นขั้นตอนสุดท้าย และชนะ "+locale.p(d,"numTrophies",0,"th",{"one":"a trophy","other":locale.n(d,"numTrophies")+" trophies"})+"."},
"finish":function(d){return "เสร็จ"},
"generatedCodeInfo":function(d){return "มหาวิทยาลัยชั้นนำสอนการเขียนโค้ดแบบ  บล็อกเบสต์   (e.g., "+locale.v(d,"berkeleyLink")+", "+locale.v(d,"harvardLink")+").  แต่ภายใต้กรอบสี่เหลี่ยมนั้น,  คุณต้องประมวลผลให้บล็อกของคุณแสดงใน ภาษาจาว่า, ซึ่งเป็นภาษาที่กว้าง และสำคัญของโลก."},
"hashError":function(d){return "ขออภัย '%1' ไม่ตรงกับโปรแกรมที่บันทึกไว้."},
"help":function(d){return "ขอความช่วยเหลือ"},
"hintTitle":function(d){return "คำแนะนำ:"},
"jump":function(d){return "กระโดด"},
"keepPlaying":function(d){return "เล่นต่อไป"},
"levelIncompleteError":function(d){return "คุณกำลังใช้ทุกสิ่งทุกอย่างที่จำเป็นของบล็อก แต่ไม่ใช่ทางที่ถูกต้อง."},
"listVariable":function(d){return "รายการ"},
"makeYourOwnFlappy":function(d){return "สร้าง Flappy เกม ไว้เป็นของเราเอง"},
"missingBlocksErrorMsg":function(d){return "ลองอย่างน้อยหนึ่งบล็อกด้านล่างเพื่อแก้ปริศนานี้."},
"nextLevel":function(d){return "ขอแสดงความยินดี คุณเสร็จสิ้นปริศนา "+locale.v(d,"puzzleNumber")+"."},
"nextLevelTrophies":function(d){return "ขอแสดงความยินดี คุณเสร็จสิ้นปริศนา "+locale.v(d,"puzzleNumber")+" และชนะ "+locale.p(d,"numTrophies",0,"th",{"one":"a trophy","other":locale.n(d,"numTrophies")+" trophies"})+"."},
"nextStage":function(d){return "เย้ ยินดีด้วย คุณผ่านด่าน "+locale.v(d,"stageName")+" แล้ว"},
"nextStageTrophies":function(d){return "เย้ ยินดีด้วย คุณผ่านด่าน "+locale.v(d,"stageName")+" แล้ว และยังได้ "+locale.p(d,"numTrophies",0,"th",{"one":"a trophy","other":locale.n(d,"numTrophies")+" trophies"})+" อีกด้วย !"},
"numBlocksNeeded":function(d){return "ขอแสดงความยินดี คุณสมบูรณ์ปริศนา "+locale.v(d,"puzzleNumber")+" (อย่างไรก็ตาม คุณสามารถใช้เฉพาะ "+locale.p(d,"numBlocks",0,"th",{"one":"1 block","other":locale.n(d,"numBlocks")+" blocks"})+".)"},
"numLinesOfCodeWritten":function(d){return "คุณเพิ่งเขียนรหัส "+locale.p(d,"numLines",0,"th",{"one":"1 บรรทัด","other":locale.n(d,"numLines")+" บรรทัด"})+"!"},
"play":function(d){return "เล่น"},
"print":function(d){return "พิมพ์"},
"puzzleTitle":function(d){return "ปริศนา "+locale.v(d,"puzzle_number")+" ของ "+locale.v(d,"stage_total")},
"repeat":function(d){return "ทำซ้ำ"},
"resetProgram":function(d){return "ตั้งค่าใหม่"},
"runProgram":function(d){return "เริ่ม"},
"runTooltip":function(d){return "เรียกใช้โปรแกรมที่กำหนด โดยบล็อกในพื้นที่ทำงาน."},
"score":function(d){return "ตะแนน"},
"showCodeHeader":function(d){return "แสดงรหัส"},
"showBlocksHeader":function(d){return "แสดงบล็อก"},
"showGeneratedCode":function(d){return "แสดงโค้ด"},
"stringEquals":function(d){return "ประโยค = ?"},
"subtitle":function(d){return "มุมมองสภาพการเขียนโปรแกรม"},
"textVariable":function(d){return "ข้อความ"},
"tooFewBlocksMsg":function(d){return "คุณได้ใช้ทุกบล็อกที่จำเป็นแล้ว แต่ลองให้บล็อกหลากหลายมากกว่านี้เพื่อให้การแก้ปัญหาสมบูรณ์แบบ."},
"tooManyBlocksMsg":function(d){return "ปัญหานี้สามารถแก้ด้วยบล็อกนี้คือ <x id='START_SPAN'/><x id='END_SPAN'/>."},
"tooMuchWork":function(d){return "คุณทำให้ฉันทำงานหนัก! คุณจะทำซ้ำให้น้อยลงได้ไหม?"},
"toolboxHeader":function(d){return "บล็อก"},
"openWorkspace":function(d){return "มันทำงานได้อย่างไร"},
"totalNumLinesOfCodeWritten":function(d){return "รวมสรุป: "+locale.p(d,"numLines",0,"th",{"one":"1 line","other":locale.n(d,"numLines")+" lines"})+" of code."},
"tryAgain":function(d){return "ลองอีกครั้ง"},
"hintRequest":function(d){return "ดูคำแนะนำ"},
"backToPreviousLevel":function(d){return "กลับไปยังระดับก่อนหน้า"},
"saveToGallery":function(d){return "จัดเก็บสู่ที่แสดงรูปภาพ"},
"savedToGallery":function(d){return "จัดเก็บสู่ที่แสดงรูปภาพเรียบร้อยแล้ว!"},
"shareFailure":function(d){return "ขออภัย เราไม่สามารถใช้โปรแกรมนี้ร่วมกันได้."},
"workspaceHeader":function(d){return "รวบรวมบล็อกของคุณที่นี่: "},
"workspaceHeaderJavaScript":function(d){return "พิมพ์ โปรแกรม JavaScript ของคุณที่นี่"},
"workspaceHeaderShort":function(d){return "พื้นที่ทำงาน: "},
"infinity":function(d){return "ไม่จำกัด"},
"rotateText":function(d){return "หมุนอุปกรณ์ของคุณ."},
"orientationLock":function(d){return "ปิดล็อควางแนวในการตั้งค่าอุปกรณ์."},
"wantToLearn":function(d){return "ต้องการศึกษาการเขียนโปรแกรมหรือ"},
"watchVideo":function(d){return "ดูวีดีโอ"},
"when":function(d){return "เมื่อ"},
"whenRun":function(d){return "เมื่อเรียกให้ทำงาน"},
"tryHOC":function(d){return "ลองใช้ Hour of Code สิ"},
"signup":function(d){return "ลงทะเบียนเพื่อทดลองเรียน"},
"hintHeader":function(d){return "นี่คือเคล็ดลับ:"},
"genericFeedback":function(d){return "ดูว่าคุณสิ้นสุดอย่างไร และพยายามที่จะแก้ไขโปรแกรมของคุณ."},
"toggleBlocksErrorMsg":function(d){return "คุณต้องแก้ไขข้อผิดพลาดในโปรแกรมของคุณก่อนที่จะไปแสดงเป็นบล็อก."},
"defaultTwitterText":function(d){return "Check out what I made"}};