var appLocale = {lc:{"ar":function(n){
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
},"da":function(n){return n===1?"one":"other"},"de":function(n){return n===1?"one":"other"},"el":function(n){return n===1?"one":"other"},"es":function(n){return n===1?"one":"other"},"et":function(n){return n===1?"one":"other"},"eu":function(n){return n===1?"one":"other"},"fa":function(n){return "other"},"fi":function(n){return n===1?"one":"other"},"fil":function(n){return n===0||n==1?"one":"other"},"fr":function(n){return Math.floor(n)===0||Math.floor(n)==1?"one":"other"},"he":function(n){return n===1?"one":"other"},"hi":function(n){return n===0||n==1?"one":"other"},"hr":function(n){
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
v:function(d,k){appLocale.c(d,k);return d[k]},
p:function(d,k,o,l,p){appLocale.c(d,k);return d[k] in p?p[d[k]]:(k=appLocale.lc[l](d[k]-o),k in p?p[k]:p.other)},
s:function(d,k,p){appLocale.c(d,k);return d[k] in p?p[d[k]]:p.other}};
(window.blockly = window.blockly || {}).appLocale = {
"atHoneycomb":function(d){return "はちのす"},
"atFlower":function(d){return "はな"},
"avoidCowAndRemove":function(d){return "うしにぶつからないように つちをかたづけよう"},
"continue":function(d){return "続行"},
"dig":function(d){return "つちをかたづける"},
"digTooltip":function(d){return "つちをかたづける"},
"dirE":function(d){return "東"},
"dirN":function(d){return "北"},
"dirS":function(d){return "S"},
"dirW":function(d){return "西"},
"doCode":function(d){return "実行"},
"elseCode":function(d){return "他"},
"fill":function(d){return "あなをうめる"},
"fillN":function(d){return appLocale.v(d,"shovelfuls")+"かい あなをうめる"},
"fillStack":function(d){return appLocale.v(d,"shovelfuls")+"つのあなをうめる"},
"fillSquare":function(d){return "しかくのなかを ぬる"},
"fillTooltip":function(d){return "つちを１かい おく"},
"finalLevel":function(d){return "おめでとうございます ！最後のパズルを解決しました。"},
"flowerEmptyError":function(d){return "このはなには みつがないよ。"},
"get":function(d){return "取得"},
"heightParameter":function(d){return "高さ"},
"holePresent":function(d){return "あながある"},
"honey":function(d){return "はちみつをつくる"},
"honeyAvailable":function(d){return "はちみつ"},
"honeyTooltip":function(d){return "はなのみつを はちみつにする"},
"honeycombFullError":function(d){return "はちのすは いっぱいになりました。はちみつをつくれません。"},
"ifCode":function(d){return "もし"},
"ifInRepeatError":function(d){return "「くり返し」ブロックの中に「もし」ブロックが必要です。分からなくなったら、1つ前のレベルに戻って、「もし」ブロックがどのように動くのかを確認しましょう。"},
"ifPathAhead":function(d){return "もし先に道があれば"},
"ifTooltip":function(d){return "指定した方向に道がある場合は、いくつかのアクションを行います。"},
"ifelseTooltip":function(d){return "指定した方向にパスがある場合は、最初のブロックにアクションを行います。それ以外の場合は、2 番目のブロックにアクションを行います。"},
"ifFlowerTooltip":function(d){return "はなや はちのすがあるときにだけ、どうぐをつかいます。"},
"ifelseFlowerTooltip":function(d){return "はなや はちのすがあるときにだけ、うえのどうぐをつかいます。ないときには、したのどうぐをつかいます。"},
"insufficientHoney":function(d){return "どうぐをただしくつかうことができたね！ でも、はちみつがたりないよ！"},
"insufficientNectar":function(d){return "どうぐをただしくつかうことができたね！ でも、はなのみつがたりないよ！"},
"make":function(d){return "つくる"},
"moveBackward":function(d){return "うしろにすすむ"},
"moveEastTooltip":function(d){return "いっぽみぎにうごくよ。"},
"moveForward":function(d){return "前方に移動します。"},
"moveForwardTooltip":function(d){return "私を前方に 1スペース 移動させてください。"},
"moveNorthTooltip":function(d){return "いっぽうえにうごくよ。"},
"moveSouthTooltip":function(d){return "いっぽしたにうごくよ。"},
"moveTooltip":function(d){return "いっぽまえかうしろにうごくよ。"},
"moveWestTooltip":function(d){return "ひだりに1つうごかしてください。"},
"nectar":function(d){return "はなのみつをとる"},
"nectarRemaining":function(d){return "はなのみつ"},
"nectarTooltip":function(d){return "はなのみつをとるよ。"},
"nextLevel":function(d){return "おめでとうございます ！このパズルを完了しました。"},
"no":function(d){return "いいえ"},
"noPathAhead":function(d){return "道がふさがれています"},
"noPathLeft":function(d){return "左に道がありません"},
"noPathRight":function(d){return "右に道がありません"},
"notAtFlowerError":function(d){return "ここでは、はなのみつをとれないよ。"},
"notAtHoneycombError":function(d){return "ここでは、はちみつをつくれないよ。"},
"numBlocksNeeded":function(d){return "このパズルは%1個のブロックで解けます。"},
"pathAhead":function(d){return "前に道があります。"},
"pathLeft":function(d){return "もし左に道があるときは\n"},
"pathRight":function(d){return "もし右に道があるときは"},
"pilePresent":function(d){return "山があります。"},
"putdownTower":function(d){return "タワーを置く"},
"removeAndAvoidTheCow":function(d){return "うしにぶつからないように つちをかたづける"},
"removeN":function(d){return appLocale.v(d,"shovelfuls")+"かい つちをかたづける"},
"removePile":function(d){return "つちをかたづける"},
"removeStack":function(d){return appLocale.v(d,"shovelfuls")+"かい つちをかたづける"},
"removeSquare":function(d){return "正方形を削除します。"},
"repeatCarefullyError":function(d){return "くりかえすどうぐのなかで、２かいすすむ、１かいほうこうをかえるといいね。そのあとに、もういっかい ほうこうをかえるといいよ。"},
"repeatUntil":function(d){return "までを繰り返します"},
"repeatUntilBlocked":function(d){return "前に道がある間"},
"repeatUntilFinish":function(d){return "完了するまで繰り返し行います"},
"step":function(d){return "ステップ"},
"totalHoney":function(d){return "ぜんぶのはちみつ"},
"totalNectar":function(d){return "ぜんぶのはなのみつ"},
"turnLeft":function(d){return "左に曲がる"},
"turnRight":function(d){return "右に回転"},
"turnTooltip":function(d){return "私を左もしくは右に90 度曲がらせてください。"},
"uncheckedCloudError":function(d){return "くものなかにあるのは、もしかしたらはなですか？ はちのすですか？ どうぐをつかってしらべよう。"},
"uncheckedPurpleError":function(d){return "むらさきのはなに、みつがあるかどうか。どうぐをつかってしらべてみよう。"},
"whileMsg":function(d){return "以下の間"},
"whileTooltip":function(d){return "終点に到着するまで、とりかこんだアクションを繰り返してください。"},
"word":function(d){return "単語を見つけます"},
"yes":function(d){return "はい"},
"youSpelled":function(d){return "あなたのスペル"}};