import React, { useEffect, useState } from 'react';
import MaterialTable from 'material-table';
import Container from '@material-ui/core/Container';
import TextField from '@material-ui/core/TextField';
import Button from '@material-ui/core/Button';
import { makeStyles } from '@material-ui/core/styles';
import { getRecords, postRecord, putRecord, deleteRecord, exportRecords, setParams } from '../../store/reducers/record';
import { showSnack } from '../../store/reducers/snack';
import { compose } from 'redux';
import { connect } from "react-redux";
import Blob from 'blob';
import FileSaver from 'file-saver';
import PropTypes from 'prop-types';
import PreferredHoursForm from '../../components/PreferredHoursForm';
import Snack from '../../components/Snack';
import ExportFilter from '../../components/ExportFilter';
import Roles from '../../data/role';
import Grid from '@material-ui/core/Grid';
import TablePagination from '@material-ui/core/TablePagination';
import UserAsyncSelector from '../../components/UserAsyncSelector';
import { getFullName } from '../../lib/lib';
import DateFnsUtils from '@date-io/date-fns';
import {
  MuiPickersUtilsProvider,
  DatePicker
} from '@material-ui/pickers';

const useStyles = makeStyles((theme) => ({
  paper: {
    marginTop: theme.spacing(8)
  },
  margin: {
    margin: theme.spacing(2, 0)
  }
}));

const validate = (values, role) => {
  const errors = {};
  const requiredFields = [
    'date',
    'note',
    'hour'
  ];
  requiredFields.forEach(field => {
    if (!values[field]) {
      errors[field] = `${field.charAt(0).toUpperCase(0) + field.slice(1)} required.`;
    }
  });
  if (values.hour < 1 || values.hour > 24 ) {
    errors.hour = "Hour sould be between 1 and 24.";
  }
  if (role === Roles.ADMIN && values.user && !values.user._id) {
    errors.user = `User required.`;
  }
  if (role === Roles.ADMIN && !values.user) {
    errors.user = `User required.`;
  }
  const message = Object.keys(errors).reduce((prev, cur) => (prev += ' ' + errors[cur]), '');
  return message;
};

function RecordsList(props){
  const classes = useStyles();
  const {
    getRecords,
    records,
    postRecord,
    showSnack,
    putRecord,
    deleteRecord,
    info,
    exportRecords,
    setParams,
    params,
    count
  } = props;
  const columns = [
    { title: 'No', render: rowData => rowData && rowData.tableData.id + 1 + params.page * params.rowsPerPage, disableClick: true, editable: 'never' },
    // eslint-disable-next-line react/display-name
    { title: 'Date', field: 'date', type: 'date', defaultSort: 'desc', editComponent: props => (
      <MuiPickersUtilsProvider utils={DateFnsUtils}
        locale={props.dateTimePickerLocalization}>
        <DatePicker
          format="MM/dd/yyyy"
          value={props.value || null}
          onChange={(date) => props.onChange(date)}
          clearable
          placeholder="Date"
          maxDate={new Date()}
          InputProps={{
            style: {
              fontSize: 13
            }
          }}
        />
      </MuiPickersUtilsProvider>
    ) },
    { title: 'Note', field: 'note' },
    // eslint-disable-next-line react/display-name
    { title: 'Hour', field: 'hour', type: 'numeric', editComponent: props => (
      <TextField
        placeholder='Hour'
        type='number'
        fullWidth
        inputProps={{
          min: 1,
          max:24,
          step: 1,
          style: { fontSize: 13 }
        }}
        // eslint-disable-next-line react/prop-types
        value={props.value ? props.value : ''}
        // eslint-disable-next-line react/prop-types
        onChange={e => props.onChange(e.target.value)}
      />
    ) }
  ];

  if(info.role === Roles.ADMIN) {
    columns.push(
      {
        hidden: info.role <= Roles.MANAGER ? true : false,
        editable: 'always',
        title: 'User',
        customSort: (a, b) => (getFullName(a.user)
          .localeCompare(getFullName(b.user))),
        render: rowData => rowData && rowData.user && getFullName(rowData.user),
        field: 'user',
        initialEditValue: info.role <= Roles.MANAGER ? info : {},
        // eslint-disable-next-line react/display-name
        editComponent: props => {
          return (
            <UserAsyncSelector
              // eslint-disable-next-line react/prop-types
              value={props.value}
              // eslint-disable-next-line react/prop-types
              onChange={(e, value) => props.onChange(value)}
            />
          );
        }
      }
    );
  }
  const [open, setOpen] = useState(false);

  const handleOpenDialog = () => {
    setOpen(true);
  };

  const handleCloseDialog = () => {
    setOpen(false);
  };

  useEffect(() => {
    getRecords({ params });
  }, [params, getRecords]);

  const exportRecordsInHtml = (records) => {
    const fileName = "Time Records Export";
    let captionText = '';
    if(params.from && params.to) {
      captionText = `Time Records from ${params.from.toLocaleDateString()} to ${params.to.toLocaleDateString()}`;
    } else if(params.from) {
      captionText = `Time Records from ${params.from.toLocaleDateString()}`;
    } else if(params.to) {
      captionText = `Time Records before ${params.to.toLocaleDateString()}`;
    } else {
      captionText = `All Time Records`;
    }

    let content = [`<style>
      body {
        text-align: center;
      }
      table {
        margin: auto;
        margin-top: 100px;
        width: 80%;
      }
      table, th ,td {
        border: 1px solid black;
        border-collapse: collapse;
      }
      th, td {
        padding: 5px;
        text-align: left;
      }
      caption {
        font-size: 20px;
        margin-bottom: 10px;
      }
      </style>
      <table>
      <caption>${captionText}</caption>
      <tr><th>No</th><th>Date</th><th>Total time</th><th>Notes</th></tr>`];
    const recordContent = records.map((record, index) => {
      const note = record.note.join('<br/>');
      return `<tr>
      <td style="width:20px">${index + 1}</td>
      <td>${new Date(record._id).toLocaleDateString()}</td>
      <td>${record.hour}</td>
      <td>${note}</td></tr>`;
    });
    content = content.concat(recordContent, ['</table>']);
    const blob = new Blob(content, { type: 'text/html' });
    FileSaver.saveAs(blob, fileName);
  };

  const handleExportData = () => {
    exportRecords({ 
      params,
      success: (res) => {
        exportRecordsInHtml(res.data.records);
      }
    });
  };

  const isUnderPreferredWorkingHours = ( date ) => {
    const recordsByDate = records.filter((record) => record.date === date);
    let totalHours = 0;
    recordsByDate.forEach((record) => totalHours += record.hour);
    return totalHours;
  };
  const defaultOptions = {
    search: false,
    actionsColumnIndex: -1,
    pageSize: params.rowsPerPage,
    sorting: false
  };

  if(info && info.role <= Roles.MANAGER) {
    defaultOptions.rowStyle = rowData => ({
      backgroundColor: (isUnderPreferredWorkingHours(rowData.date) > info.preferredWorkingHours ? '#4caf50' : '#f44336')
    });
  }

  const handleChangePage = (event, newPage) => {
    setParams({ page: newPage });
  };

  const handleChangeRowsPerPage = (event, callBack) => {
    setParams({ rowsPerPage: parseInt(event.target.value, 10), page: 0 });
    callBack(event);
  };

  return (
    <Container component="main">
      <div className={classes.paper}>
        <Snack/>
        {info && info.role <= 1 &&
          <Button variant="contained" color="primary" onClick={handleOpenDialog} className={classes.margin}>
            Set Preferred Working Hours
          </Button>
        }
        <Grid container spacing={2} alignItems='flex-end' className={classes.margin}>
          <Grid item xs={12} sm={8}>
            <ExportFilter allowUser={info.role === Roles.ADMIN}/>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Button variant="contained" color="primary" onClick={handleExportData}>
              Export the filtered times
            </Button>
          </Grid>
        </Grid>
        <MaterialTable
          title="Time Records"
          options={defaultOptions}
          columns={columns}
          data={records}
          components={{
            // eslint-disable-next-line react/display-name
            Pagination: props => {
              return (
                <TablePagination
                  {...props}
                  count={count}
                  rowsPerPage={params.rowsPerPage}
                  page={params.page}
                  onChangePage={handleChangePage}
                  onChangeRowsPerPage={
                    // eslint-disable-next-line react/prop-types
                    (event) => handleChangeRowsPerPage(event, props.onChangeRowsPerPage)
                  }
                />
              );
            }
          }}
          localization={{
            pagination: {
              labelDisplayedRows: `${params.page * params.rowsPerPage + 1}-${Math.min((params.page + 1) * params.rowsPerPage, count)} of ${count}`
            }
          }}
          editable={{
            onRowAdd: (newData) => new Promise((resolve, reject) => {
              const message = validate(newData, info.role);
              if(message) {
                reject();
                showSnack({ message: message, status: 'error', duration: 6000 });
                return;
              }
              setTimeout(() => {
                postRecord({
                  body: {
                    hour: newData.hour,
                    note: newData.note,
                    date: newData.date,
                    user: newData.user ? newData.user._id : null
                  },
                  success: () => {
                    resolve();
                    getRecords({ params });
                    showSnack({ message: "Time Record created.", status: 'success' });
                  },
                  fail: (err) => {
                    reject();
                    showSnack({ message: err.response.data, status: 'error' });
                  }
                });
              }, 600);
            }),
            onRowUpdate: (newData) => {
              return new Promise((resolve, reject) => {
                const message = validate(newData, info.role);
                if(message) {
                  reject();
                  showSnack({ message: message, status: 'error', duration: 6000 });
                  return;
                }
                setTimeout(() => {
                  putRecord({
                    id: newData._id,
                    body: {
                      hour: newData.hour,
                      note: newData.note,
                      date: newData.date,
                      user: newData.user._id
                    },
                    success: () => {
                      resolve();
                      getRecords({ params });
                      showSnack({ message: "Time Record updated.", status: 'success' });
                    },
                    fail: (err) => {
                      reject();
                      showSnack({ message: err.response.data, status: 'error' });
                    }
                  });
                }, 600);
              });
            },
            onRowDelete: (oldData) =>
              new Promise((resolve, reject) => {
                setTimeout(() => {
                  deleteRecord({
                    id: oldData._id,
                    success: () => {
                      resolve();
                      getRecords({ params });
                      showSnack({ message: "Time Record removed.", status: 'success' });
                    },
                    fail: (err) => {
                      reject();
                      showSnack({ message: err.response.data, status: 'error' });
                    }
                  });
                }, 600);
              })
          }}
        />
      </div>
      <PreferredHoursForm open={open} handleClose={handleCloseDialog}/>
    </Container>
  );
}

RecordsList.propTypes = {
  getRecords: PropTypes.func.isRequired,
  postRecord: PropTypes.func.isRequired,
  putRecord: PropTypes.func.isRequired,
  deleteRecord: PropTypes.func.isRequired,
  records: PropTypes.array.isRequired,
  showSnack: PropTypes.func.isRequired,
  setParams: PropTypes.func.isRequired,
  params: PropTypes.object.isRequired,
  exportRecords: PropTypes.func.isRequired,
  count: PropTypes.number.isRequired,
  info: PropTypes.object.isRequired
};

const mapStateToProps = state => ({
  records: state.record.records,
  params: state.record.params,
  count: state.record.count,
  info: state.auth.me
});

const mapDispatchToProps = {
  getRecords: getRecords,
  postRecord: postRecord,
  showSnack: showSnack,
  putRecord: putRecord,
  deleteRecord: deleteRecord,
  exportRecords: exportRecords,
  setParams: setParams
};

export default compose(
  connect(mapStateToProps, mapDispatchToProps)
)(RecordsList);