import React from 'react';
import ReactDOM from 'react-dom';
import msg from '@cdo/locale';
import {getFirstParam} from '../dropletUtils';
import GetColumnParamPicker, {ParamType} from './GetColumnParamPicker';

function openModal(type, callback, table) {
  const modalDiv = document.createElement('div');
  modalDiv.setAttribute('id', 'modalDiv');
  document.body.appendChild(modalDiv);
  ReactDOM.render(
    <GetColumnParamPicker
      param={type}
      table={table}
      onChoose={option => callback(`"${option}"`)}
      onClose={() => {
        var element = document.getElementById('modalDiv');
        element.parentNode.removeChild(element);
      }}
    />,
    document.querySelector('#modalDiv')
  );
}

export function getTables() {
  return function() {
    return [
      {
        text: msg.choosePrefix(),
        display:
          '<span class="chooseAssetDropdownOption">' +
          msg.choosePrefix() +
          '</a>',
        click: callback => openModal(ParamType.TABLE, callback)
      }
    ];
  };
}

export function getColumns() {
  return function(editor) {
    const firstParam = getFirstParam('getColumn', this.parent, editor);
    const tableName = firstParam.substring(1, firstParam.length - 1);
    return [
      {
        text: msg.choosePrefix(),
        display:
          '<span class="chooseAssetDropdownOption">' +
          msg.choosePrefix() +
          '</a>',
        click: callback => openModal(ParamType.COLUMN, callback, tableName)
      }
    ];
  };
}
