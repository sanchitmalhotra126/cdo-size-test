import React, {Component, PropTypes} from 'react';
import {Table, sort} from 'reactabular';
import {tableLayoutStyles, sortableOptions} from "../tables/tableConstants";
import wrappedSortable from '../tables/wrapped_sortable';
import orderBy from 'lodash/orderBy';

export const COLUMNS = {
  QUESTION: 0,
  A: 1,
  B: 2,
};

const questionAnswerDataPropType = PropTypes.shape({
  id: PropTypes.number.isRequired,
  question: PropTypes.string,
  answerOptionOne: PropTypes.string,
  answerOptionTwo: PropTypes.string,
});

class MultipleChoiceAnswerTable extends Component {
  static propTypes= {
    questionAnswerData: PropTypes.arrayOf(questionAnswerDataPropType),
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

  getColumns = (sortable) => {
    let dataColumns = [
      {
        property: 'question',
        header: {
          props: {
            style: {
            ...tableLayoutStyles.headerCell,
          }},
          transforms: [sortable],
        },
        cell: {
          format: this.nameFormatter,
          props: {
            style: {
            ...tableLayoutStyles.cell,
          }}
        }
      },
      {
        property: 'answerOptionOne',
        header: {
          props: {
            style: {
            ...tableLayoutStyles.headerCell,
            width: 90,
          }},
          transforms: [sortable],
        },
        cell: {
          format: this.ageFormatter,
          props: {
            style: {
            ...tableLayoutStyles.cell,
            width: 90,
          }}
        }
      },
      {
        property: 'answerOptionTwo',
        header: {
          props: {
            style: {
            ...tableLayoutStyles.headerCell,
            width: 120,
          }},
          transforms: [sortable],
        },
        cell: {
          format: this.genderFormatter,
          props: {
            style: {
            ...tableLayoutStyles.cell,
            width: 120,
          }}
        }
      },
    ];
    return dataColumns;
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
    })(this.props.questionAnswerData);

    return (
        <Table.Provider
          columns={columns}
          style={tableLayoutStyles.table}
        >
          <Table.Header />
          <Table.Body rows={sortedRows} rowKey="id" />
        </Table.Provider>
    );
  }
}

export default MultipleChoiceAnswerTable;
