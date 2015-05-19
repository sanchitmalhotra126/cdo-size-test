var netsim_locale = {lc:{"ar":function(n){
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
v:function(d,k){netsim_locale.c(d,k);return d[k]},
p:function(d,k,o,l,p){netsim_locale.c(d,k);return d[k] in p?p[d[k]]:(k=netsim_locale.lc[l](d[k]-o),k in p?p[k]:p.other)},
s:function(d,k,p){netsim_locale.c(d,k);return d[k] in p?p[d[k]]:p.other}};
(window.blockly = window.blockly || {}).netsim_locale = {
"a_and_b":function(d){return "A/B"},
"addPacket":function(d){return "Adicionar Pacote"},
"addRouter":function(d){return "Adicionar roteador"},
"appendCountToTitle":function(d){return netsim_locale.v(d,"title")+" ("+netsim_locale.v(d,"count")+")"},
"ascii":function(d){return "ASCII"},
"autoDnsUsageMessage":function(d){return "Nó DNS automático\nUso: GET hostname [hostname [hostname ...]]"},
"binary":function(d){return "Binário"},
"bitCounter":function(d){return netsim_locale.v(d,"x")+"/"+netsim_locale.v(d,"y")+" bits"},
"bits":function(d){return "Bits"},
"buttonAccept":function(d){return "Aceitar"},
"buttonCancel":function(d){return "Cancelar"},
"buttonJoin":function(d){return "Inscrever"},
"clear":function(d){return "Limpar"},
"collapse":function(d){return "Fechar"},
"connect":function(d){return "Conectar"},
"connected":function(d){return "Conectado"},
"connectedToNodeName":function(d){return "Conectado a "+netsim_locale.v(d,"nodeName")},
"connectingToNodeName":function(d){return "Conectando a "+netsim_locale.v(d,"nodeName")},
"connectToANode":function(d){return "Conectar a um nó"},
"connectToAPeer":function(d){return "Conectar a um par"},
"connectToARouter":function(d){return "Conectar a um roteador"},
"decimal":function(d){return "Decimal"},
"defaultNodeName":function(d){return "[New Node]"},
"disconnected":function(d){return "Desconectado"},
"dns":function(d){return "DNS"},
"dnsMode":function(d){return "Modo DNS"},
"dnsMode_AUTOMATIC":function(d){return "Automático"},
"dnsMode_MANUAL":function(d){return "Manual"},
"dnsMode_NONE":function(d){return "Nenhum"},
"dropdownPickOne":function(d){return "-- ESCOLHER UM --"},
"encoding":function(d){return "Codificação"},
"expand":function(d){return "Abrir"},
"from":function(d){return "De"},
"hex":function(d){return "Hex"},
"hexadecimal":function(d){return "Hexadecimal"},
"incomingConnectionRequests":function(d){return "Solicitações de conexão de entrada"},
"infinity":function(d){return "Infinito"},
"instructions":function(d){return "Instruções"},
"joinSection":function(d){return "Participar da seção"},
"lobby":function(d){return "Lobby"},
"lobbyInstructionsForPeers":function(d){return "Encontre seu parceiro na lista à direita e clique no botão \"Inscrever\" próximo ao seu nome para criar uma requisição de conexão."},
"lobbyInstructionsForRouters":function(d){return "Clique no botão \"Inscrever\" próximo de qualquer roteador para ser adicionado ao roteador. Crie um novo roteador para se inscrever clicando no botão \"Adicionar roteador\"."},
"lobbyInstructionsGeneral":function(d){return "Conecte-se a um roteador ou par para começar a usar o simulador."},
"lobbyIsEmpty":function(d){return "Ninguém está aqui ainda."},
"lobbyStatusWaitingForOther":function(d){return netsim_locale.v(d,"spinner")+" Esperando por "+netsim_locale.v(d,"otherName")+" para conectar... ("+netsim_locale.v(d,"otherStatus")+")"},
"lobbyStatusWaitingForYou":function(d){return "Esperando por você..."},
"logStatus_dropped":function(d){return "Desconectado"},
"logStatus_success":function(d){return "Êxito"},
"markAsRead":function(d){return "Marcar como lido"},
"message":function(d){return "Mensagem"},
"myDevice":function(d){return "Meu dispositivo"},
"myName":function(d){return "Meu nome"},
"myPrivateNetwork":function(d){return "Minha rede privada"},
"mySection":function(d){return "Minha seção"},
"number":function(d){return "Número"},
"numBitsPerPacket":function(d){return netsim_locale.v(d,"x")+" bits por pacote"},
"numBitsPerChunk":function(d){return netsim_locale.v(d,"numBits")+" bits por parte"},
"notConnected":function(d){return "Não conectado"},
"onBeforeUnloadWarning":function(d){return "Você será desconectado da simulação."},
"outgoingConnectionRequests":function(d){return "Solicitações de conexão de saída"},
"_of_":function(d){return " de "},
"packet":function(d){return "Pacote"},
"packetInfo":function(d){return "Informações do pacote"},
"pickASection":function(d){return "Escolher uma seção"},
"readWire":function(d){return "Ler fio"},
"receiveBits":function(d){return "Receber bits"},
"receivedMessageLog":function(d){return "Registro de mensagem recebida"},
"removePacket":function(d){return "Remover pacote"},
"router":function(d){return "Roteador"},
"routerStatus":function(d){return "Conectado a "+netsim_locale.v(d,"connectedClients")+".  Espaço para mais "+netsim_locale.v(d,"remainingSpace")+"."},
"routerStatusFull":function(d){return "Conectado a "+netsim_locale.v(d,"connectedClients")+". Não há mais espaço."},
"routerStatusNoConnections":function(d){return "Ninguém se conectou ainda.  Conecte até "+netsim_locale.v(d,"maximumClients")+" pessoas."},
"routerTab_bandwidth":function(d){return "Largura de banda"},
"routerTab_memory":function(d){return "Memória"},
"routerTab_stats":function(d){return "Estatísticas"},
"routerX":function(d){return "Roteador "+netsim_locale.v(d,"x")},
"send":function(d){return "Enviar"},
"sendAMessage":function(d){return "Enviar uma mensagem"},
"sendBits":function(d){return "Enviar bits"},
"sentBitsLog":function(d){return "Registro de bits enviado"},
"sentMessageLog":function(d){return "Enviar registro de mensagem"},
"setName":function(d){return "Definir nome"},
"setWire":function(d){return "Definir fio"},
"setWireToValue":function(d){return "Definir fio com o valor "+netsim_locale.v(d,"value")},
"shareThisNetwork":function(d){return "Compartilhar esta rede"},
"size":function(d){return "Tamanho"},
"status":function(d){return "Status"},
"to":function(d){return "Para"},
"unknownNode":function(d){return "Nó desconhecido"},
"unlimited":function(d){return "Ilimitado"},
"waitingForNodeToConnect":function(d){return "Esperando por "+netsim_locale.v(d,"node")+" para fazer a conexão..."},
"workspaceHeader":function(d){return "Simulador de internet"},
"xOfYPackets":function(d){return netsim_locale.v(d,"x")+" de "+netsim_locale.v(d,"y")},
"xSecondPerPulse":function(d){return netsim_locale.v(d,"x")+" segundo por pulso"},
"xSecondsPerPulse":function(d){return netsim_locale.v(d,"x")+" segundos por pulso"},
"x_Gbps":function(d){return netsim_locale.v(d,"x")+"Gbps"},
"x_Mbps":function(d){return netsim_locale.v(d,"x")+"Mbps"},
"x_Kbps":function(d){return netsim_locale.v(d,"x")+"Kbps"},
"x_bps":function(d){return netsim_locale.v(d,"x")+"bps"},
"x_GBytes":function(d){return netsim_locale.v(d,"x")+"GB"},
"x_MBytes":function(d){return netsim_locale.v(d,"x")+"MB"},
"x_KBytes":function(d){return netsim_locale.v(d,"x")+"MB"},
"x_Bytes":function(d){return netsim_locale.v(d,"x")+"B"},
"x_bits":function(d){return netsim_locale.v(d,"x")+"B"}};