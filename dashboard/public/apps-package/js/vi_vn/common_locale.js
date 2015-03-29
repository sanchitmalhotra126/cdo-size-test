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
"and":function(d){return "và"},
"booleanTrue":function(d){return "đúng"},
"booleanFalse":function(d){return "sai"},
"blocks":function(d){return "khối"},
"blocklyMessage":function(d){return "Blockly"},
"catActions":function(d){return "Các hành động"},
"catColour":function(d){return "Màu sắc"},
"catLogic":function(d){return "Logic"},
"catLists":function(d){return "Danh sách"},
"catLoops":function(d){return "Vòng lặp"},
"catMath":function(d){return "thuật toán"},
"catProcedures":function(d){return "Các hàm"},
"catText":function(d){return "văn bản"},
"catVariables":function(d){return "Các biến"},
"clearPuzzle":function(d){return "Clear Puzzle"},
"clearPuzzleConfirm":function(d){return "This will delete all blocks and reset the puzzle to its start state."},
"clearPuzzleConfirmHeader":function(d){return "Are you sure you want to clear the puzzle?"},
"codeMode":function(d){return "Code"},
"codeTooltip":function(d){return "Xem mã \"JavaScript\" đã được tạo ra."},
"continue":function(d){return "Tiếp tục"},
"designMode":function(d){return "Design"},
"designModeHeader":function(d){return "Design Mode"},
"dialogCancel":function(d){return "Huỷ"},
"dialogOK":function(d){return "Đồng ý"},
"directionNorthLetter":function(d){return "Bắc"},
"directionSouthLetter":function(d){return "Nam"},
"directionEastLetter":function(d){return "Đông"},
"directionWestLetter":function(d){return "Tây"},
"dropletBlock_addOperator_description":function(d){return "Add two numbers"},
"dropletBlock_andOperator_description":function(d){return "Logical AND of two booleans"},
"dropletBlock_arcLeft_description":function(d){return "Move the turtle in a counterclockwise arc using the specified number of degrees and radius"},
"dropletBlock_arcRight_description":function(d){return "Move the turtle in a clockwise arc using the specified number of degrees and radius"},
"dropletBlock_assign_x_description":function(d){return "Reassign a variable"},
"dropletBlock_button_description":function(d){return "Create a button and assign it an element id"},
"dropletBlock_callMyFunction_description":function(d){return "Use a function without an argument"},
"dropletBlock_callMyFunction_n_description":function(d){return "Use a function with argument"},
"dropletBlock_changeScore_description":function(d){return "Thêm vào hoặc bớt đi một điểm từ số điểm đang có."},
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
"dropletBlock_onEvent_description":function(d){return "Execute code in response to the specified event."},
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
"dropletBlock_setBackground_description":function(d){return "Thiết lập hình nền"},
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
"dropletBlock_setSprite_description":function(d){return "Sets the actor image"},
"dropletBlock_setSpriteEmotion_description":function(d){return "Sets the actor mood"},
"dropletBlock_setSpritePosition_description":function(d){return "Instantly moves an actor to the specified location."},
"dropletBlock_setSpriteSpeed_description":function(d){return "Sets the speed of an actor"},
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
"dropletBlock_throw_description":function(d){return "Throws a projectile from the specified actor."},
"dropletBlock_turnLeft_description":function(d){return "Turn the turtle counterclockwise by the specified number of degrees"},
"dropletBlock_turnRight_description":function(d){return "Turn the turtle clockwise by the specified number of degrees"},
"dropletBlock_turnTo_description":function(d){return "Turn the turtle to the specified direction (0 degrees is pointing up)"},
"dropletBlock_updateRecord_description":function(d){return "Updates a record, identified by record.id."},
"dropletBlock_vanish_description":function(d){return "Vanishes the actor."},
"dropletBlock_whileBlock_description":function(d){return "Repeat something while a condition is true"},
"dropletBlock_write_description":function(d){return "Create a block of text"},
"end":function(d){return "kết thúc"},
"emptyBlocksErrorMsg":function(d){return "Miếng ghép được \"Lặp lại\" hay \"Nếu\" cần có những miếng ghép bên trong để hoạt động. Đảm bảo là miếng gạch đó khớp hoàn toàn phần ở trong của miếng gạch kia."},
"emptyFunctionBlocksErrorMsg":function(d){return "Khối \"hàm\"  cần có các khối lệnh bên trong để khiến nó hoạt động."},
"errorEmptyFunctionBlockModal":function(d){return "Cần các khối bên trong định nghĩa về chức năng của bạn. Chọn \"Chỉnh sửa\" và đặt các khối bên trong khối màu xanh lá cây."},
"errorIncompleteBlockInFunction":function(d){return "Chọn \"Chỉnh sửa\" để đảm bảo rằng bạn không thiếu khối nào trong định nghĩa chức năng của bạn."},
"errorParamInputUnattached":function(d){return "Hãy nhớ đính một khối vào mỗi thông số input trên khối chức năng trong không gian làm việc của bạn."},
"errorUnusedParam":function(d){return "Bạn thêm một khối tham số, nhưng đã không sử dụng nó trong định nghĩa. Đảm bảo rằng bạn sử dụng tham số của bạn bằng cách nhấp vào \"chỉnh sửa\" và đặt khối tham số bên trong các khối màu xanh lá cây."},
"errorRequiredParamsMissing":function(d){return "Thiết lập một tham số cho các chức năng của bạn bằng cách nhấp vào \"chỉnh sửa\" và thêm các tham số cần thiết. Kéo các khối tham số mới vào định nghĩa chức năng của bạn."},
"errorUnusedFunction":function(d){return "Bạn vừa thiết lập một chức năng, nhưng chưa bao giờ sử dụng nó trong không gian làm việc của bạn! Nhấn vào \"Chức năng\" trong hộp công cụ và đảm bảo rằng bạn sẽ sử dụng nó trong chương trình của bạn."},
"errorQuestionMarksInNumberField":function(d){return "Thử thay thế \"???\" với một giá trị."},
"extraTopBlocks":function(d){return "Bạn có các khối tự do. Ý của bạn là để đính kèm chúng vào khối \"khi chạy\"?"},
"finalStage":function(d){return "Chúc mừng. Bạn vừa hoàn thành xong bước cuối cùng."},
"finalStageTrophies":function(d){return "Chúc mừng! Bạn vừa hoàn thành bước cuối cùng và dành danh hiệu "+locale.p(d,"numTrophies",0,"vi",{"one":"a trophy","other":locale.n(d,"numTrophies")+" trophies"})+"."},
"finish":function(d){return "Hoàn Thành"},
"generatedCodeInfo":function(d){return "Các trường đại học hàng đầu cũng dạy lập trình dựa trên \"khối lệnh\" (block) (như: "+locale.v(d,"berkeleyLink")+", "+locale.v(d,"harvardLink")+"). Tuy nhiên, để hổ trợ, các \"khối lệnh\" cũng được hiển thị trong ngôn ngữ JavaScript, ngôn ngữ lập trình thông dụng nhất:"},
"hashError":function(d){return "Xin lỗi, '%1' không tương ứng với bất kì chương trình đã lưu."},
"help":function(d){return "Trợ Giúp"},
"hintTitle":function(d){return "Gợi ý:"},
"jump":function(d){return "nhảy"},
"keepPlaying":function(d){return "Keep Playing"},
"levelIncompleteError":function(d){return "Bạn đã dùng tất cả các khối cần thiết, nhưng không đúng cách."},
"listVariable":function(d){return "danh sách"},
"makeYourOwnFlappy":function(d){return "Tự tạo game Flappy Bird của riêng bạn"},
"missingBlocksErrorMsg":function(d){return "Thử dùng một hoặc nhiều khối được cho để giải quyết câu này."},
"nextLevel":function(d){return "Chúc mừng! Bạn đã hoàn thành câu số "+locale.v(d,"puzzleNumber")+"."},
"nextLevelTrophies":function(d){return "Chúc mừng! Bạn đã hoàn thành Câu đố "+locale.v(d,"puzzleNumber")+" và chiến thắng "+locale.v(d,"numTrophies")+"."},
"nextStage":function(d){return "Chúc mừng! Bạn đã hoàn thành xong "+locale.v(d,"stageName")+"."},
"nextStageTrophies":function(d){return "Chúc mừng! Bạn đã vượt qua vòng "+locale.v(d,"stageName")+" và giành được "+locale.p(d,"numTrophies",0,"vi",{"one":"a trophy","other":locale.n(d,"numTrophies")+" trophies"})+"."},
"numBlocksNeeded":function(d){return "Chúc mừng! Bạn đã hoàn thành câu đố "+locale.v(d,"puzzleNumber")+". Nhưng bạn thật sự chỉ cần "+locale.p(d,"numBlocks",0,"vi",{"one":"1 block","other":locale.n(d,"numBlocks")+" blocks"})+" khối thôi ."},
"numLinesOfCodeWritten":function(d){return "Bạn vừa mới viết "+locale.p(d,"numLines",0,"vi",{"one":"1 dòng","other":locale.n(d,"numLines")+" dòng"})+" mã!"},
"play":function(d){return "Bắt đầu chơi"},
"print":function(d){return "In"},
"puzzleTitle":function(d){return "Câu đố thứ "+locale.v(d,"puzzle_number")+" trong số "+locale.v(d,"stage_total")+" câu"},
"repeat":function(d){return "lặp lại"},
"resetProgram":function(d){return "Thiết lập lại"},
"runProgram":function(d){return "Chạy"},
"runTooltip":function(d){return "Chạy chương trình được thiết kế bởi các khối lệnh trong khung làm việc."},
"score":function(d){return "Ghi điểm/điểm số"},
"showCodeHeader":function(d){return "Xem mã"},
"showBlocksHeader":function(d){return "Hiển thị khối"},
"showGeneratedCode":function(d){return "Xem mã"},
"stringEquals":function(d){return "Chuỗi =?"},
"subtitle":function(d){return "một môi trường lập trình trực quan"},
"textVariable":function(d){return "văn bản"},
"tooFewBlocksMsg":function(d){return "Bạn đang sử dụng tất cả các loại khối lệnh cần thiết, nhưng hãy thử sử dụng các loại khối lệnh khác để hoàn thành câu đố."},
"tooManyBlocksMsg":function(d){return "Câu đố này có thể được giải quyết với <x id='START_SPAN'/><x id='END_SPAN'/> khối lệnh."},
"tooMuchWork":function(d){return "Bạn làm tôi phải làm quá nhiều việc! Bạn làm ơn thử làm cho nó ít hơn được không?"},
"toolboxHeader":function(d){return "các khối"},
"openWorkspace":function(d){return "Hoạt động ra sao"},
"totalNumLinesOfCodeWritten":function(d){return "Thời gian tổng cộng: "+locale.p(d,"numLines",0,"vi",{"one":"1 dòng","other":locale.n(d,"numLines")+" dòng"})+" của mã chương trình."},
"tryAgain":function(d){return "Thử lại"},
"hintRequest":function(d){return "Xem gợi ý"},
"backToPreviousLevel":function(d){return "Chơi lại màn trước"},
"saveToGallery":function(d){return "Lưu vào bộ sưu tập"},
"savedToGallery":function(d){return "Đã lưu trong bộ sưu tập!"},
"shareFailure":function(d){return "Xin lỗi, chúng tôi không chia sẻ chương trình này."},
"workspaceHeader":function(d){return "Lắp ráp các khối của bạn ở đây: "},
"workspaceHeaderJavaScript":function(d){return "Nhập thuật toán JavaScript của bạn ở đây"},
"workspaceHeaderShort":function(d){return "Không gian làm việc:"},
"infinity":function(d){return "Vô cùng"},
"rotateText":function(d){return "Xoay thiết bị của bạn."},
"orientationLock":function(d){return "Tắt khóa hướng trong cài đặt thiết bị."},
"wantToLearn":function(d){return "Bạn muốn học lập trình?"},
"watchVideo":function(d){return "Xem Video"},
"when":function(d){return "Khi nào"},
"whenRun":function(d){return "Khi chạy"},
"tryHOC":function(d){return "Học thử Hour of Code"},
"signup":function(d){return "Đăng ký cho khóa học mở đầu"},
"hintHeader":function(d){return "Đây là một số mẹo:"},
"genericFeedback":function(d){return "Nhìn xem bằng cách nào bạn kết thúc và hãy cố gắng sửa chương trình của bạn."},
"toggleBlocksErrorMsg":function(d){return "Bạn cần phải sửa một lỗi trong chương trình của bạn trước khi nó được hiển thị thành các khối."},
"defaultTwitterText":function(d){return "Check out what I made"}};