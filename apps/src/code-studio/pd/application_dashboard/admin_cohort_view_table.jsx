import React, {PropTypes} from 'react';
import {Table, sort} from 'reactabular';
import color from '@cdo/apps/util/color';
import {Button} from 'react-bootstrap';
import {orderBy} from 'lodash';
import { StatusColors } from './constants';
import moment from 'moment';
import wrappedSortable from '@cdo/apps/templates/tables/wrapped_sortable';

const styles = {
  table: {
    width: '100%'
  },
  statusCellCommon: {
    padding: '5px'
  },
  statusCell: StatusColors
};

export default class AdminCohortViewTable extends React.Component {
  static propTypes = {
    data: PropTypes.array.isRequired
  };

  static contextTypes = {
    router: PropTypes.object
  };

  constructor(props) {
    super(props);
    this.constructColumns();

    // default
    let sortColumnIndex = 0;
    let direction = 'desc';

    this.state = {
      sortingColumns: {
        [sortColumnIndex]: {
          direction,
          position: 0
        }
      }
    };
  }

  constructColumns() {
    const sortable = wrappedSortable(
      this.getSortingColumns,
      this.onSort,
      {
        container: {whiteSpace: 'nowrap'},
        default: {color: color.light_gray}
      }
    );

    this.columns = [
      {
        property: 'date_accepted',
        header: {
          label: 'Date Accepted',
          transforms: [sortable]
        },
        cell: {
          format: this.formatDate
        }
      }, {
        property: 'applicant_name',
        header: {
          label: 'Name',
          transforms: [sortable]
        }
      }, {
        property: 'district_name',
        header: {
          label: 'School District',
          transforms: [sortable]
        }
      }, {
        property: 'school_name',
        header: {
          label: 'School Name',
          transforms: [sortable]
        }
      }, {
        property: 'email',
        header: {
          label: 'Email',
          transforms: [sortable]
        }
      }, {
        property: 'assigned_workshop',
        header: {
          label: 'Assigned Workshop',
          transforms: [sortable]
        }
      }, {
        property: 'registered_workshop',
        header: {
          label: 'Registered Workshop',
          transforms: [sortable]
        },
        cell: {
          format: this.formatBoolean
        }
      }, {
        property: 'id',
        header: {
          label: 'View Application'
        },
        cell: {
          format: this.formatViewButton
        }
      }
    ];
  }

  getSortingColumns = () => this.state.sortingColumns || {};

  onSort = (selectedColumn) => {
    const sortingColumns = sort.byColumn({
      sortingColumns: this.state.sortingColumns,
      // Custom sortingOrder removes 'no-sort' from the cycle
      sortingOrder: {
        FIRST: 'asc',
        asc: 'desc',
        desc: 'asc'
      },
      selectedColumn
    });

    this.setState({sortingColumns});
  };

  // Format dates as abbreviated month and day, e.g. "Mar 9"
  formatDate = (iso8601Date) => moment(iso8601Date).format("MMM D");

  formatBoolean = (bool) => bool ? "Yes" : "No";

  formatViewButton = (id, {rowData}) => {
    if (!rowData.type.startsWith("Pd::Application")) {
      return null;
    }

    return (
      <Button
        bsSize="xsmall"
        href={this.context.router && this.context.router.createHref(`/${id}`)}
        onClick={this.handleViewClick.bind(this, id)}
      >
        View Application
      </Button>
    );
  };

  handleViewClick = (id, event) => {
    event.preventDefault();
    this.context.router.push(`/${id}`);
  };

  render() {
    const rows = this.props.data;

    const {sortingColumns} = this.state;
    const sortedRows = sort.sorter({
      columns: this.columns,
      sortingColumns,
      sort: orderBy
    })(rows);

    return (
      <Table.Provider
        id="cohort-view"
        className="pure-table table-striped"
        columns={this.columns}
        style={styles.table}
      >
        <Table.Header />
        <Table.Body rows={sortedRows} rowKey="id"/>
      </Table.Provider>
    );
  }
}
