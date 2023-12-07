import moment from 'moment'

export function epochToLocalDate(timeUnits) {
  return moment(timeUnits).format('YYYY-MM-DD')
};

export function epochToLocalTime(timeUnits) {
  return moment(timeUnits).format('YYYY-MM-DD HH:mm:ss')
};

export function gmtToLocalDate(time) {
  return moment.utc(time).local().format('YYYY-MM-DD')
};

export function gmtToLocalTime(time) {
  return moment.utc(time).local().format('YYYY-MM-DD HH:mm:ss')
};