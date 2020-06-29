/* global getPluginParameter, fieldProperties, launchIntent, setAnswer */

/*
## PARAMETERS
* Title (required)
* Description (optional)
* Start date & time (date part required): date and time in “YYYY-MM-DD HH:MM” format or date in “YYYY-MM-DD” format if it is an all-day or multi-day event.
* End date and time (optional): if not specified defaults to the same as the start date and time plus one hour if a time part is specified. If specified, must be the same as or later than the start date and time, and if the start date and time only has a date part then the end date and time must not include a time part. (Should reject bad arguments with clear error messages in the UI.)
* Timezone (optional): default = current time zone from the Android OS or browser.
* Location (optional)
* Guests (optional)
* Calendar ID / Name (optional): If not specified, the default calendar is to be used.
* Event repeat frequency (optional): day, month, year
* Event repeat days (optional)
* Event repeat end (optional): specify either an integer for number of occurrences or a date in YYYY-MM-DD format.
* Notification 1 (optional): Minutes before event. Notification option for Android and email for web.
- Notification 2 (optional): Minutes before event. Notification option for Android and email for web.
*/

var isAndroid = (document.body.className.indexOf('android-collect') >= 0)
var title = getPluginParameter('title');
var description = getPluginParameter('description');
var startDate = getPluginParameter('startDate')
var endDate = getPluginParameter('endDate')
var eventLocation = getPluginParameter('eventLocation')
var eventTimezone = getPluginParameter('eventTimezone')
var guests = getPluginParameter('guests')
var calendarId = getPluginParameter('calendarId')
var repeatFrequency = getPluginParameter('repeatFrequency')
var repeatWeekDays = getPluginParameter('repeatWeekDays')
var repeatEnd = getPluginParameter('repeatEnd')

var startDateEpoch,endDateEpoch, rrule = ''

var btnCreateEvent = document.getElementById('btn-create-event')
var btnCreateEvent2 = document.getElementById('btn-create-event2')
var statusContainer = document.getElementById('status-container')
var currentAnswer = fieldProperties.CURRENT_ANSWER || ''

// define what the 'Create Event' button does
if (!fieldProperties.READONLY) {
 if (isAndroid) {
  btnCreateEvent.onclick = function () {
      launchUsingAndroidIntent()
    }
  } else {

    launchUsingBrowser()
  }
} else {
  btnCreateEvent.classList.add('disabled')
}

btnCreateEvent2.onclick = function () {
  launchUsingBrowser()
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

    if (!startDate) {
      statusContainer.innerHTML = "Please provide event start date";

      return false;
    }

    startDateEpoch = new Date(startDate).getTime();
    endDateEpoch = new Date(endDate).getTime();

    if (!eventTimezone) {
      eventTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    }

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

    if (!calendarId)  calendarId = 0

    return true;

  } catch (err) {

    statusContainer.innerHTML = err;

    return false;
  }
}

// Define how to store the response
function saveResponse (result) {

  var params = [title,description,startDate,endDate,eventLocation,eventTimezone,guests,calendarId,repeatFrequency,repeatEnd,repeatWeekDays].join(';')
  
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

mobile url
https://calendar.google.com/calendar/gp#~calendar:view=e&text=

web url
https://calendar.google.com/calendar/render?action=TEMPLATE&
*/

function launchUsingBrowser(){
  
  var params = 'text='+title+'&details='+description+'&location='+eventLocation+
  '&dates='+formatDateISO(startDate)+'/'+formatDateISO(endDate)+
  '&ctz'+eventTimezone+(rrule ? '&recur=RRULE:'+rrule : '')

  var url = 'https://calendar.google.com/calendar/render?action=TEMPLATE&'+params

  //btnCreateEvent2.setAttribute('href', url)

  window.open(url)
  //btnCreateEvent2.onclick = function () {  saveResponse('success') }
  
}

function launchUsingAndroidIntent () {

  // set the parameters for the intent
 
  var params = {
    uri_data: 'content://com.android.calendar/events',
    /*****/
    beginTime: (new Date("6/30/2021, 3:45:00 PM GMT+4")).getTime(),
    endTime: (new Date("6/30/2021, 4:00:00 PM GMT+4")).getTime(),
    /*****/    
    title: title,
    description: description
/*
    eventLocation: eventLocation,
    eventTimezone: eventTimezone ,
    guestsCanSeeGuests: parseInt(guests),
    rrule: rrule,
    calendar_id: calendarId
*/
  }

  // Launches the 'android.intent.action.INSERT' intent using the parameters above.
  launchIntent('android.intent.action.INSERT', params, function (error, result) {
    // Something went wrong while launching the intent.
    if (error) {
      saveResponse(error)
      statusContainer.innerHTML = error
    } else {
      saveResponse('success')
      statusContainer.innerHTML = 'Success!'
    }
  })
}

function formatDate(date) {

  var year = "",
    month = "",
    day = "";

  try {
    var d = new Date(date);

    (month = "" + (d.getMonth() + 1)),
      (day = "" + d.getDate()),
      (year = d.getFullYear());

    if (month.length < 2) month = "0" + month;
    if (day.length < 2) day = "0" + day;
  } catch (err) {
    statusContainer.innerHTML = err;
  } finally {
    return [year, month, day].join("");
  }
}

function pad(number) {
  if (number < 10) {
    return "0" + number;
  }
  return number;
}

function formatDateISO(date) {
  //20201231T223000Z
  var result = "";
  try {
    var d = new Date(date);
    result =
      d.getUTCFullYear() +
      pad(d.getUTCMonth() + 1) +
      pad(d.getUTCDate()) +
      "T" +
      pad(d.getUTCHours()) +
      pad(d.getUTCMinutes()) +
      (d.getUTCMilliseconds() / 1000).toFixed(2).slice(3, 5) +
      "Z";
  } catch (err) {
    statusContainer.innerHTML = err;
  } finally {
    return result;
  }
}

