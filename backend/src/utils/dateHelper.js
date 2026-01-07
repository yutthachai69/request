// backend/src/utils/dateHelper.js

// Import the new library
const moment = require('moment-timezone');

/**
 * Gets the current time in the 'Asia/Bangkok' timezone and returns it as a native Date object.
 * This is the definitive fix for the timezone issue.
 * @returns {Date}
 */
const getCurrentBangkokTime = () => {
  // Use moment-timezone to get the current time in Bangkok and convert it to a JS Date object
  return moment.tz('Asia/Bangkok').toDate();
};

module.exports = {
  getCurrentBangkokTime,
};