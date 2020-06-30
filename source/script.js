/* global getPluginParameter, fieldProperties, launchIntent, setAnswer 

## PARAMETERS
* Title (required)
* Description (optional)
* Start date & time (date part required): date and time in “YYYY-MM-DD HH:MM” format or date in “YYYY-MM-DD” format if it is an all-day or multi-day event.
* End date and time (optional): if not specified defaults to the same as the start date and time plus one hour if a time part is specified. 
  If specified, must be the same as or later than the start date and time, and 
  if the start date and time only has a date part then the end date and time must not include a time part. 
  (Should reject bad arguments with clear error messages in the UI.)

* Timezone (optional): default = current time zone from the Android OS or browser.
* Location (optional)
* Event repeat frequency (optional): day, month, year
* Event repeat days (optional)
* Event repeat end (optional): specify either an integer for number of occurrences or a date in YYYY-MM-DD format.
*/

var isAndroid = (document.body.className.indexOf('android-collect') >= 0)
var title = getPluginParameter('title');
var description = getPluginParameter('description');
var startDate = getPluginParameter('startDate')
var endDate = getPluginParameter('endDate')
var eventLocation = getPluginParameter('eventLocation')
var eventTimezone = getPluginParameter('eventTimezone')
var repeatFrequency = getPluginParameter('repeatFrequency')
var repeatWeekDays = getPluginParameter('repeatWeekDays')
var repeatEnd = getPluginParameter('repeatEnd')

var startDateEpoch,endDateEpoch, rrule = ''

var btnCreateEvent = document.getElementById('btn-create-event')
var statusContainer = document.getElementById('status-container')
var currentAnswer = fieldProperties.CURRENT_ANSWER || ''

// define what the 'Create Event' button does
if (!fieldProperties.READONLY) {
 
  btnCreateEvent.onclick = function () {
    launchUsingBrowser()
  }
 
} else {
  btnCreateEvent.classList.add('disabled')
}

const v = validateParameters()

if (!v){
  document.getElementById('btn-create-event').style.display = "none";
  
}else{

  document.getElementById('btn-create-event').style.display = "";
  statusContainer.innerHTML = 'Click on the calendar icon to create the event';

}

displayParameters()

function displayParameters(){

  document.getElementById('txt-title').innerHTML = title
  document.getElementById('txt-description').innerHTML = description
  document.getElementById('txt-start').innerHTML = startDate
  document.getElementById('txt-end').innerHTML = endDate    
  document.getElementById('txt-location').innerHTML = eventLocation
  document.getElementById('txt-timezone').innerHTML = eventTimezone
  document.getElementById('txt-frequency').innerHTML = repeatFrequency
  document.getElementById('txt-wd').innerHTML = repeatWeekDays
  document.getElementById('txt-rend').innerHTML = repeatEnd
  
}

function validateParameters() {
  try {

    if (!title) {
      statusContainer.innerHTML = "Please provide event title";
      return false;
    }

    if (!validateStartEndDates()) return false

    //set default tz if not provided
    if (!eventTimezone) eventTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    //if repeatFrequency submitted then translate repeatFrequency, repeatEnd, repeatWeekDays to rrule
    if (repeatFrequency) {
      if (repeatFrequency.toLowerCase() === "daily") {
        rrule = "FREQ=DAILY";
      }
      if (repeatFrequency.toLowerCase() === "weekly") {
        rrule = "FREQ=WEEKLY";
      }
      if (repeatFrequency.toLowerCase() === "monthly") {
        rrule = "FREQ=MONTHLY";
      }
      if (repeatFrequency.toLowerCase() === "yearly") {
        rrule = "FREQ=YEARLY";
      }

      //You can use either COUNT or UNTIL to specify the end of the event recurrence. Don't use both in the same rule.
      if (repeatEnd) {
        const parsed = Number(repeatEnd);
        //if parsed then use as COUNT
        if (!isNaN(parsed)) {
          rrule += ";COUNT=" + parsed;

          //otherwise use as UNTIL date
        } else {
          rrule += ";UNTIL=" + formatDate(repeatEnd);
        }
      }

      // SO MO TU WE TH FR SA
      if (repeatWeekDays) {
        rrule += ";BYDAY=" + repeatWeekDays.toUpperCase();
      }
    }

    return true;

  } catch (err) {

    statusContainer.innerHTML = err;

    return false;
  }
}

function validateStartEndDates() {

  var sd = new Date(startDate);
  var ed = new Date(endDate);

  //Start date & time (date part required): date and time in “YYYY-MM-DD HH:MM” format or date in “YYYY-MM-DD” format if it is an all-day or multi-day event.
  if (!isValidDate(startDate)) {
    statusContainer.innerHTML = "Please provide valid start date";

    return false;
  }

  if (!isValidDate(endDate)) {
    //if not specified defaults to the same as the start date
    //if the start date and time only has a date part then the end date and time must not include a time part.
    if (sd.getUTCHours() === 0 && sd.getUTCMinutes() === 0) {
      ed = sd;
      ed = ed.setTime(ed.getTime() + 86400000); //add 24h
      endDate = formatDate(ed,'YYYY-MM-DD');

    }

    //and time plus one hour if a time part is specified.
    if (sd.getUTCHours() !== 0 || sd.getUTCMinutes() !== 0) {
      ed = sd;
      ed = ed.setTime(ed.getTime() + 60 * 60 * 1000);
      endDate = formatDate(ed,'YYYY-MM-DD HH:MM');
    }
  } else {
    //If specified, must be the same as or later than the start date and time, and
    if (ed < sd) {
      statusContainer.innerHTML =
        "End date must be the same or later than Start date.";
      return false;
    }
  }

  return true
}

// Define how to store the response
function saveResponse (result) {

  var params = [title,description,startDate,endDate,eventLocation,eventTimezone,repeatFrequency,repeatEnd,repeatWeekDays].join(';')
  
  if (result === 'success') {
    var successResponse = '[' + new Date().toLocaleString() + '] The following parameters were used: ' + params + '.\n'
    currentAnswer += successResponse
    setAnswer(currentAnswer)
  } else {
    var failResponse = '[' + new Date().toLocaleString() + '] Failure with following parameters: ' + params + '.\n'
    currentAnswer += failResponse
    setAnswer(currentAnswer)
  }
}


/*
a list of all known parameters
https://github.com/InteractionDesignFoundation/add-event-to-calendar-docs/blob/master/services/google.md
*/

function launchUsingBrowser(){
  
  var params = 'text='+title+'&details='+description+'&location='+eventLocation+'&dates='+formatDateISO(startDate)+'/'+formatDateISO(endDate)+'&ctz'+eventTimezone+(rrule ? '&recur=RRULE:'+rrule : '')

  var url = 'https://calendar.google.com/calendar/render?action=TEMPLATE&'+params

  window.open(url)

  saveResponse('success')
  
}

function isValidDate(d) {

  var f1=/[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[1-2][0-9]|3[0-1]) (2[0-3]|[01][0-9]):[0-5][0-9]/;
  var f2=/[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[1-2][0-9]|3[0-1])/;

  if(!d.match(f1) && !d.match(f2)){
     return false
  }

  d = new Date(d)

  return d instanceof Date && !isNaN(d);
}

function formatDate(date, f = "YYYYMMDD") {
  var year = "",
    month = "",
    day = "",
    hh = "",
    mm = "";
  var result = "";

  try {
    var d = new Date(date);

    year = d.getFullYear();
    month = pad(d.getMonth() + 1);
    day = pad(d.getDate());
    hh = pad(d.getHours());
    mm = pad(d.getMinutes());

    if (f === "YYYYMMDD") {
      result = [year, month, day].join("");
    }

    if (f === "YYYY-MM-DD") {
      result = [year, month, day].join("-");
    }

    if (f === "YYYY-MM-DD HH:MM") {
      result = [year, month, day].join("-") + " " + [hh, mm].join(":");
    }
  } catch (err) {
    statusContainer.innerHTML = err;
  } finally {
    return result;
  }
}

function pad(number) {
  if (number < 10) {
    return "0" + number;
  }
  return number;
}

function formatDateISO(date) {

  //YYYYMMDDTHHMMSSZ

  var result = "";
  try {
    var d = new Date(date);

    if (d.getUTCHours() === 0 & d.getUTCMinutes() === 0)
    {
    result = d.getUTCFullYear() + pad(d.getUTCMonth() + 1) + pad(d.getUTCDate());
    }

    if (d.getUTCHours()>0 || d.getUTCMinutes()>0)
    {
    result =
      d.getUTCFullYear() +
      pad(d.getUTCMonth() + 1) +
      pad(d.getUTCDate()) +
      "T" +
      pad(d.getUTCHours()) +
      pad(d.getUTCMinutes()) +
      (d.getUTCMilliseconds() / 1000).toFixed(3).slice(3, 5) +
      "Z";
    }

  } catch (err) {

    statusContainer.innerHTML = err;

  } finally {

    return result;

  }
}

