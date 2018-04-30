import React, {Component, PropTypes} from 'react';
import {connect} from 'react-redux';
import i18n from "@cdo/locale";
import {Table, sort} from 'reactabular';
import wrappedSortable from '../tables/wrapped_sortable';
import {tableLayoutStyles, sortableOptions} from "../tables/tableConstants";
import Immutable from 'immutable';
import orderBy from 'lodash/orderBy';
import Button from '../Button';
import BaseDialog from '../BaseDialog';
import DialogFooter from "../teacherDashboard/DialogFooter";
import {sectionsNameAndId} from '@cdo/apps/templates/teacherDashboard/teacherSectionsRedux';
import {startTransferringStudents, transferStudents} from './manageStudentsRedux';

const PADDING = 20;
const TABLE_WIDTH = 300;
const DIALOG_WIDTH = 800;
const INPUT_WIDTH = 225;
const CHECKBOX_CELL_WIDTH = 50;
const OTHER_TEACHER = "otherTeacher";
const COPY = "copy";

const styles = {
  dialog: {
    padding: PADDING,
    width: DIALOG_WIDTH,
    marginLeft: -(DIALOG_WIDTH / 2)
  },
  container: {
    display: 'flex'
  },
  table: {
    width: TABLE_WIDTH
  },
  checkboxCell: {
    width: CHECKBOX_CELL_WIDTH,
    textAlign: 'center'
  },
  checkbox: {
    margin: 0
  },
  rightColumn: {
    flex: 1,
    paddingLeft: PADDING,
    paddingRight: PADDING
  },
  label: {
    paddingTop: PADDING / 2
  },
  input: {
    marginLeft: PADDING / 2
  },
  sectionInput: {
    marginLeft: PADDING / 2,
    width: INPUT_WIDTH
  },
  radioOption: {
    paddingLeft: PADDING / 2
  }
};

export const DEFAULT_STATE = {
  isDialogOpen: false
};

class MoveStudents extends Component {
  static propTypes = {
    studentData: PropTypes.arrayOf(
      React.PropTypes.shape({
        id: PropTypes.number.isRequired,
        name: PropTypes.string.isRequired,
      })
    ).isRequired,
    transferData: PropTypes.object.isRequired,

    // redux provided
    sections: PropTypes.arrayOf(
      PropTypes.shape({
        name: PropTypes.string.isRequired,
        id: PropTypes.number.isRequired
      }).isRequired
    ),
    startTransferringStudents: PropTypes.func.isRequired,
    transferStudents: PropTypes.func.isRequired
  };

  state = DEFAULT_STATE;

  openDialog = () => {
    this.setState({isDialogOpen: true});
  };

  closeDialog = () => {
    this.setState({...DEFAULT_STATE});
  };

  getStudentIds = () => {
    return this.props.studentData.map(s => s.id);
  };

  areAllSelected = () => {
    return Immutable.Set(this.props.transferData.selectedIds).isSuperset(this.getStudentIds());
  };

  toggleSelectAll = () => {
    let selectedIds = [];

    if (!this.areAllSelected()) {
      selectedIds = this.getStudentIds();
    }

    this.props.startTransferringStudents({selectedIds});
  };

  toggleStudentSelected = (studentId) => {
    let selectedIds = [...this.props.transferData.selectedIds];

    if (selectedIds.includes(studentId)) {
      const studentIndex = selectedIds.indexOf(studentId);
      selectedIds.splice(studentIndex, 1);
    } else {
      selectedIds.push(studentId);
    }

    this.props.startTransferringStudents({selectedIds});
  };

  selectedStudentHeaderFormatter = () => {
    return (
      <input
        style={styles.checkbox}
        type="checkbox"
        checked={this.areAllSelected()}
        onChange={this.toggleSelectAll}
      />
    );
  };

  selectedStudentFormatter = (_, {rowData}) => {
    const isChecked = this.props.transferData.selectedIds.includes(rowData.id);

    return (
      <input
        style={styles.checkbox}
        type="checkbox"
        checked={isChecked}
        onChange={() => this.toggleStudentSelected(rowData.id)}
      />
    );
  };

  getColumns = (sortable) => {
    return [
      {
        property: 'selected',
        header: {
          label: '',
          format: this.selectedStudentHeaderFormatter,
          props: {
            style: {
              ...tableLayoutStyles.headerCell,
              ...styles.checkboxCell
          }}
        },
        cell: {
          format: this.selectedStudentFormatter,
          props: {
            style: {
              ...tableLayoutStyles.cell,
              ...styles.checkboxCell
          }}
        }
      }, {
        property: 'name',
        header: {
          label: i18n.name(),
          props: {
            style: {
              ...tableLayoutStyles.headerCell
          }},
          transforms: [sortable]
        },
        cell: {
          props: {
            style: {
              ...tableLayoutStyles.cell
          }}
        }
      }
    ];
  };

  getSortingColumns = () => {
    return this.state.sortingColumns || {};
  };

  // The user requested a new sorting column. Adjust the state accordingly.
  onSort = (selectedColumn) => {
    this.setState({
      sortingColumns: sort.byColumn({
        sortingColumns: this.state.sortingColumns,
        // Custom sortingOrder removes 'no-sort' from the cycle
        sortingOrder: {
          FIRST: 'asc',
          asc: 'desc',
          desc: 'asc'
        },
        selectedColumn
      })
    });
  };

  renderOptions = () => {
    let options = this.props.sections.map(section => <option key={section.id} value={section.id}>{section.name}</option>);
    options.push(<option key={OTHER_TEACHER} value={OTHER_TEACHER}>{i18n.otherTeacher()}</option>);

    return options;
  };

  onChangeSection = (event) => {
    const sectionValue = event.target.value;
    let newTransferData;

    if (sectionValue === OTHER_TEACHER) {
      newTransferData = {
        otherTeacherSelected: true,
        selectedSectionId: null
      };
    } else {
      newTransferData = {
        otherTeacherSelected: false,
        selectedSectionId: parseInt(sectionValue)
      };
    }

    this.props.startTransferringStudents({...newTransferData});
  };

  onChangeTeacherSection = (event) => {
    this.props.startTransferringStudents({
      otherTeacherSectionValue: event.target.value
    });
  };

  onChangeMoveOrCopy = (event) => {
    this.props.startTransferringStudents({
      copy: event.target.value === COPY
    });
  };

  transfer = () => {
    const {transferData} = this.props;
    let newSectionCode;

    if (transferData.otherTeacherSelected) {
      newSectionCode = transferData.otherTeacherSectionValue;
    } else {
      // TODO: newSectionCode = section code chosen from dropdown
    }

    this.props.transferStudents(transferData.selectedIds, newSectionCode, transferData.copy);
  };

  render() {
    // Define a sorting transform that can be applied to each column
    const sortable = wrappedSortable(this.getSortingColumns, this.onSort, sortableOptions);
    const columns = this.getColumns(sortable);
    const sortingColumns = this.getSortingColumns();

    const sortedRows = sort.sorter({
      columns,
      sortingColumns,
      sort: orderBy,
    })(this.props.studentData);

    const {isDialogOpen} = this.state;
    const {transferData} = this.props;

    return (
      <div>
        <Button
          onClick={this.openDialog}
          color={Button.ButtonColor.gray}
          text={i18n.moveStudents()}
        />
        <BaseDialog
          useUpdatedStyles
          isOpen={isDialogOpen}
          style={styles.dialog}
          handleClose={this.closeDialog}
        >
          <div style={styles.container}>
            <Table.Provider
              columns={columns}
              style={styles.table}
            >
              <Table.Header />
              <Table.Body rows={sortedRows} rowKey="id" />
            </Table.Provider>
            <div style={styles.rightColumn}>
              <div>{i18n.selectStudentsToMove()}</div>
              <label
                htmlFor="sections"
                style={styles.label}
              >
                {`${i18n.moveToSection()}:`}
              </label>
              <select
                name="sections"
                style={styles.input}
                onChange={this.onChangeSection}
              >
                {this.renderOptions()}
              </select>
              {transferData.otherTeacherSelected &&
                <div>
                  <label
                    htmlFor="sectionCode"
                    style={styles.label}
                  >
                    {`${i18n.enterSectionCode()}:`}
                  </label>
                  <input
                    required
                    name="sectionCode"
                    style={styles.sectionInput}
                    value={transferData.otherTeacherSectionValue}
                    onChange={this.onChangeTeacherSection}
                    placeholder={i18n.sectionCodePlaceholder()}
                  />
                  <label style={styles.label}>{i18n.bothSectionsQuestion()}</label>
                  <label style={styles.input}>
                    <input
                      type="radio"
                      value={COPY}
                      checked={transferData.copy}
                      onChange={this.onChangeMoveOrCopy}
                    />
                    <span style={styles.radioOption}>{i18n.copyStudentsConfirm()}</span>
                  </label>
                  <label style={styles.input}>
                    <input
                      type="radio"
                      value="move"
                      checked={!transferData.copy}
                      onChange={this.onChangeMoveOrCopy}
                    />
                    <span style={styles.radioOption}>{i18n.moveStudentsConfirm()}</span>
                  </label>
                </div>
              }
            </div>
          </div>
          <DialogFooter>
            <Button
              text={i18n.dialogCancel()}
              onClick={this.closeDialog}
              color={Button.ButtonColor.gray}
            />
            <Button
              text={i18n.moveStudents()}
              onClick={this.transfer}
              color={Button.ButtonColor.orange}
            />
          </DialogFooter>
        </BaseDialog>
      </div>
    );
  }
}

export const UnconnectedMoveStudents = MoveStudents;

export default connect(state => ({
  sections: sectionsNameAndId(state.teacherSections)
}), dispatch => ({
  startTransferringStudents(transferData) {
    dispatch(startTransferringStudents(transferData));
  },
  transferStudents(studentIds, currentSectionCode, newSectionCode, copyStudents) {
    dispatch(transferStudents(studentIds, currentSectionCode, newSectionCode, copyStudents));
  }
}))(MoveStudents);
