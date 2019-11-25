import {getProjectDatabase} from './firebaseUtils';
import _ from 'lodash';

export function getColumnsRef(database, tableName) {
  return database.child(`metadata/tables/${tableName}/columns`);
}

/**
 * @param {string} tableName
 * @param {string} columnName
 * @returns {Firebase} A reference to the column with the specified name, or null if
 * none exists.
 */
export function getColumnRefByName(tableName, columnName) {
  return getColumnsRef(getProjectDatabase(), tableName)
    .once('value')
    .then(columnsSnapshot => {
      const columns = columnsSnapshot.val();
      const key = _.findKey(
        columns,
        column => column.columnName === columnName
      );
      if (key) {
        return getColumnsRef(getProjectDatabase(), tableName).child(key);
      }
      return Promise.resolve();
    });
}

// TODO: De-dupe this function with getColumnNamesFromRecords() below
export function parseColumnsFromRecords(records) {
  const columnNames = [];
  Object.keys(records).forEach(id => {
    const record = JSON.parse(records[id]);
    Object.keys(record).forEach(column => {
      if (columnNames.indexOf(column) === -1) {
        columnNames.push(column);
      }
    });
  });
  return columnNames;
}

export function getColumnNamesFromRecords(records) {
  const columnNames = ['id'];
  Object.keys(records).forEach(id => {
    const record = JSON.parse(records[id]);
    Object.keys(record).forEach(columnName => {
      if (columnNames.indexOf(columnName) === -1) {
        columnNames.push(columnName);
      }
    });
  });
  return columnNames;
}

export function addColumnName(tableName, columnName) {
  return getColumnRefByName(tableName, columnName).then(columnRef => {
    if (!columnRef) {
      return getColumnsRef(getProjectDatabase(), tableName)
        .push()
        .set({columnName});
    }
    return Promise.resolve();
  });
}

export function deleteColumnName(tableName, columnName) {
  return getColumnRefByName(tableName, columnName).then(columnRef => {
    if (columnRef) {
      return columnRef.set(null);
    }
    return Promise.resolve();
  });
}

export function renameColumnName(tableName, oldName, newName) {
  return getColumnRefByName(tableName, oldName).then(columnRef => {
    if (columnRef) {
      return columnRef.set({columnName: newName});
    } else {
      return getColumnsRef(getProjectDatabase(), tableName)
        .push()
        .set({columnName: newName});
    }
  });
}

/**
 * @param {string} tableName
 * @returns {Promise} Promise containing an array of column names.
 * Gets a one-time snapshot of the column names for the given table at
 * /<channelId>/metadata/tables/<tableName>/columns
 */
export function getColumnNamesSnapshot(tableName) {
  const columnsRef = getColumnsRef(getProjectDatabase(), tableName);
  return columnsRef.once('value').then(snapshot => {
    const columnsData = snapshot.val() || {};
    return _.values(columnsData).map(column => column.columnName);
  });
}

/**
 * @param database
 * @param {string} tableName
 * @param callback
 * Sets up a listener on /<channelId>/metadata/tables/<tableName>/columns and calls the
 * provided callback whenever the columns change.
 */
export function onColumnsChange(database, tableName, callback) {
  getColumnsRef(database, tableName).on('value', snapshot => {
    const columnsData = snapshot.val() || {};
    const columnNames = _.values(columnsData).map(column => column.columnName);
    callback(columnNames);
  });
}

/**
 *
 * @param {string} tableName
 * @param {Array.<string>} existingColumnNames
 * @returns {*}
 */
export function addMissingColumns(tableName) {
  return getColumnNamesSnapshot(tableName).then(existingColumnNames => {
    const recordsRef = getProjectDatabase().child(
      `storage/tables/${tableName}/records`
    );
    return recordsRef.once('value').then(snapshot => {
      const recordsData = snapshot.val() || {};
      getColumnNamesFromRecords(recordsData).forEach(columnName => {
        if (!existingColumnNames.includes(columnName)) {
          getColumnsRef(getProjectDatabase(), tableName)
            .push()
            .set({columnName});
        }
      });
    });
  });
}
