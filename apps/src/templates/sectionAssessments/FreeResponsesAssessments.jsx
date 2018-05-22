import React, {Component, PropTypes} from 'react';
import {Table, sort} from 'reactabular';
import {tableLayoutStyles, sortableOptions} from "../tables/tableConstants";
import i18n from '@cdo/locale';
import wrappedSortable from '../tables/wrapped_sortable';
import orderBy from 'lodash/orderBy';
import MultipleChoiceAnswerCell from './MultipleChoiceAnswerCell';

export const COLUMNS = {
  STUDENT: 0,
  RESPONSE: 1,
};

const studentAnswerDataPropType = PropTypes.shape({
  id:  PropTypes.string,
  name: PropTypes.string,
  studentAnswers: PropTypes.array,
});

const answerDataPropType = PropTypes.shape({
  multipleChoiceOption: PropTypes.string,
  percentAnswered: PropTypes.number,
  isCorrectAnswer: PropTypes.bool,
});

const questionDataPropType = PropTypes.shape({
  id: PropTypes.number.isRequired,
  question: PropTypes.string.isRequired,
  answers: PropTypes.arrayOf(answerDataPropType),
  notAnswered: PropTypes.number.isRequired,
});

class FreeResponsesAssessments extends Component {
  static propTypes= {
    questionAnswerData: PropTypes.arrayOf(questionDataPropType),
    studentAnswerData: PropTypes.arrayOf(studentAnswerDataPropType)
  };

  state = {
    [COLUMNS.NAME]: {
      direction: 'desc',
      position: 0
    }
  };

  getSortingColumns = () => {
    return this.state.sortingColumns || {};
  };

  onSort = (selectedColumn) => {
    this.setState({
      sortingColumns: sort.byColumn({
        sortingColumns: this.state.sortingColumns,
        sortingOrder: {
          FIRST: 'asc',
          asc: 'desc',
          desc: 'asc',
        },
        selectedColumn
      })
    });
  };

  studentResponseColumnFormatter = (studentAnswers, {rowData, rowIndex}) => {

    let studentResponse = '';
    if(this.props.studentAnswerData[rowIndex]) {
      studentResponse = this.props.studentAnswerData[rowIndex]
      .studentAnswers.filter(( item ) => {
          if(item.question == rowData.id) {
            return true;
          }
      })[0].response;
    }

    console.log('selectStudents -->', studentResponse);
    console.log('ha', rowIndex);

    return (
      <MultipleChoiceAnswerCell
        id={rowData.id}
        displayContent={studentResponse}
      />
    );
  };

  studentNameColumnFormatter = (studentAnswers, {rowData, rowIndex}) => {
    let studentName = '';
    if(this.props.studentAnswerData[rowIndex]) {
     studentName = this.props.studentAnswerData[rowIndex].name;
    }
    console.log('ha again', rowIndex);
    console.log('selectStudents--->', studentName);

    return (
      <MultipleChoiceAnswerCell
        id={rowData.id}
        displayContent={studentName}
      />
    );
  };

  getColumns = (sortable, index) => {
    let dataColumns = [
      {
        property: 'studentName',
        header: {
          label: i18n.studentName(),
          props: {style: tableLayoutStyles.headerCell},
          transforms: [sortable],
        },
        cell: {
          format: this.studentNameColumnFormatter,
          props: {style:tableLayoutStyles.cell},
        }
      },
      {
        property: 'studentResponse',
        header: {
          label: i18n.response(),
          props: {style: tableLayoutStyles.headerCell},
        },
        cell: {
          format: this.studentResponseColumnFormatter,
          props: {style:tableLayoutStyles.cell},
        }
      },
    ];
    return dataColumns;
  };

  render() {
    // Define a sorting transform that can be applied to each column


    return (
      <div>
        {
         this.props.questionAnswerData.map((
          item, index
        ) => {
          const sortable = wrappedSortable(this.getSortingColumns, this.onSort, sortableOptions);
          const columns = this.getColumns(sortable, index);
          const sortingColumns = this.getSortingColumns();

          const sortedRows = sort.sorter({
            columns,
            sortingColumns,
            sort: orderBy,
          })([item]);


          return (
            <Table.Provider
            columns={columns}
            style={tableLayoutStyles.table}
          >
            <Table.Header />
            <Table.Body rows={sortedRows} rowKey="id" />
          </Table.Provider>
          )
        })
      }
      </div>

    );
  }
}

export default FreeResponsesAssessments;
