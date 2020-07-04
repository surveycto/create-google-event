/* global getPluginParameter, fieldProperties, launchIntent, setAnswer */

var isAndroid = (document.body.className.indexOf('android-collect') >= 0)
var title = getPluginParameter('title');
var description = getPluginParameter('description');
var startDate = getPluginParameter('startDate')
var endDate = getPluginParameter('endDate')
var guests = getPluginParameter('guests')
var eventLocation = getPluginParameter('eventLocation')
var eventTimezone = getPluginParameter('eventTimezone')
var eventRepeatFrequency = getPluginParameter('eventRepeatFrequency')
var eventRepeatDays = getPluginParameter('eventRepeatDays')
var repeatEnd = getPluginParameter('repeatEnd')

var startDateEpoch,endDateEpoch, rrule = ''

var btnCreateEvent = document.getElementById('btn-create-event')
var statusContainer = document.getElementById('status-container')
var currentAnswer = fieldProperties.CURRENT_ANSWER || ''
var errorMessages = []
var allDayEvent = false

validateParameters()

if (errorMessages.length > 0){
  document.getElementById('btn-create-event').style.display = "none";

  if (errorMessages.length === 1) statusContainer.innerHTML = errorMessages[0];  

  if (errorMessages.length > 1) statusContainer.innerHTML = 'Please correct following errors:<br>' + errorMessages.join('<br>');  

  
}else{

  document.getElementById('btn-create-event').style.display = "";
  statusContainer.innerHTML = 'Click on the calendar icon to create the event';

}

displayParameters()

// define what the 'Create Event' button does
if (!fieldProperties.READONLY) {
 
  var params = 'text='+title+'&details='+description+'&location='+eventLocation+'&dates='+formatDateISO(startDate)+'/'+formatDateISO(endDate)+'&ctz='+eventTimezone +'&add=' + guests + (rrule ? '&recur=RRULE:'+rrule : '')
  var url = 'https://calendar.google.com/calendar/render?action=TEMPLATE&'+params

  btnCreateEvent.setAttribute('href', url)
  btnCreateEvent.onclick = function () {
    
    saveResponse('success')

  }
 
} else {
  btnCreateEvent.classList.add('disabled')
}


function displayParameters(){

  document.getElementById('txt-title').innerHTML = title
  document.getElementById('txt-description').innerHTML = description
  document.getElementById('txt-start').innerHTML = startDate
  document.getElementById('txt-end').innerHTML = allDayEvent ? '' : endDate    
  document.getElementById('txt-location').innerHTML = eventLocation
  document.getElementById('txt-timezone').innerHTML = eventTimezone
  document.getElementById('txt-guests').innerHTML = guests
  
  //For clarity, no need to display "Event repeat frequency" and "Event repeat days", as only one will be effective at one time
  document.getElementById('txt-frequency').innerHTML = eventRepeatFrequency ? eventRepeatFrequency : eventRepeatDays 

  document.getElementById('txt-rend').innerHTML = repeatEnd
  
}

function validateParameters() {

  var results = ""

  title = title.trim()
  startDate = startDate.trim()
  eventRepeatFrequency = eventRepeatFrequency.trim()
  eventRepeatDays = eventRepeatDays.trim()
  repeatEnd = repeatEnd.trim()

  try {

    if (title === '' && startDate !== '') errorMessages.push("Event Title is required to create an event")
    if (title !== '' & startDate === '') errorMessages.push("Event Start date is required to create an event")
    if (title === '' && startDate === '') errorMessages.push("Required parameters are missing. Both the title and a start date are required to create an event")

    validateStartEndDates()

    validateListOfGuests()

    //set default tz if not provided
    if (!eventTimezone) eventTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    validateRepeatFrequency()

    validateEventRepeatDays()

    //if eventRepeatFrequency submitted then translate eventRepeatFrequency, repeatEnd, eventRepeatDays to rrule
    if (eventRepeatFrequency) {
      if (eventRepeatFrequency.toLowerCase() === "daily") {
        rrule = "FREQ=DAILY";
      }
      if (eventRepeatFrequency.toLowerCase() === "weekly") {
        rrule = "FREQ=WEEKLY";
      }
      if (eventRepeatFrequency.toLowerCase() === "monthly") {
        rrule = "FREQ=MONTHLY";
      }
      if (eventRepeatFrequency.toLowerCase() === "yearly") {
        rrule = "FREQ=YEARLY";
      }

      /*
        Should "Event repeat frequency" and "Event repeat days" both be specified, 
        in the user interface (specified below), "Event repeat days" should be listed as "Overridden by event repeat frequency".
      */
      /*
        For clarity, no need to display "Event repeat frequency" and "Event repeat days", as only one will be effective at one time
      */
      //eventRepeatDays = "Overridden by event repeat frequency"
      eventRepeatDays = ""

    }
    /*
    When "Event repeat days" is specified and "Event repeat frequency" is blank, it should be interpreted as "repeating every week on the specified days".  
    "Event repeat days" should not be contingent on a value being specified for "Event repeat frequency"
    */
    else if (eventRepeatFrequency === '' && eventRepeatDays !==''){

      rrule = "FREQ=WEEKLY";

      var eventRepeatDaysMapped = mapWeekDays(eventRepeatDays)
      eventRepeatDaysMapped = eventRepeatDaysMapped.replace(/\s/g,',')


      rrule += ";BYDAY=" + eventRepeatDaysMapped

    }

      //You can use either COUNT or UNTIL to specify the end of the event recurrence. Don't use both in the same rule.
      if ((eventRepeatFrequency !=='' || eventRepeatDays !== '') && repeatEnd !== '') {
        const parsed = Number(repeatEnd);
        //if parsed then use as COUNT
        if (!isNaN(parsed)) {
          rrule += ";COUNT=" + parsed;

          //otherwise use as UNTIL date
        } else {

          if (!isValidDate(repeatEnd)){
            errorMessages.push("Repeat end date is invalid")
          }else{
          rrule += ";UNTIL=" + formatDate(repeatEnd);
          }
        }
      }


  } catch (err) {

    errorMessages.push(err)

  }
}

function mapWeekDays(str){
  
var mapObj = { Sun:"SU",  Mon:"MO",  Tue:"TU",  Wed: "WE",  Thu: "TH",  Fri: "FR",  Sat: "SA" };

str = str.replace(/Sun|Mon|Tue|Wed|Thu|Fri|Sat/gi, function(matched){ return mapObj[matched]; });

return str

}

function validateStartEndDates() {

  var sd = new Date(startDate);
  var ed = new Date(endDate);

  //Start date & time (date part required): date and time in “YYYY-MM-DD HH:MM” format or date in “YYYY-MM-DD” format if it is an all-day or multi-day event.
  if (startDate && !isValidDate(startDate)) {

    errorMessages.push("Provided start date value is invalid")

  } 
  else if(isValidDate(startDate) && !isValidDate(endDate)) {
    //if not specified defaults to the same as the start date
    //if the start date and time only has a date part then the end date and time must not include a time part.
    if (sd.getUTCHours() === 0 && sd.getUTCMinutes() === 0) {

      allDayEvent = true
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
  } 
  
  if (isValidDate(startDate) && isValidDate(endDate))
  {
    //If specified, must be the same as or later than the start date and time, and
    if (ed < sd) {

      errorMessages.push("End date must be equal to or greater than the start date")

    }
  }
}

function validateListOfGuests() {

  if (!guests.trim()) return

  var s = guests.split(",");
  var errors = []

  for (var i = 0; i < s.length; i++) {

    var exp = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

    if (!exp.test(s[i].trim())) {
      errors.push(s[i].trim())
    }
  }

  if (errors.length > 0){
    errorMessages.push("Invalid guest emails: " + errors.join(',') + ';')
  }

}

function validateRepeatFrequency(){

  if (eventRepeatFrequency.trim() === '') return

  var freq = ['daily','weekly','monthly', 'yearly']

  if (!freq.includes(eventRepeatFrequency.toLowerCase())){
    errorMessages.push("Invalid event repeat frequency value: " + eventRepeatFrequency)
  }


}
function validateEventRepeatDays(){

  if (eventRepeatDays.trim() === '') return

  var days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
  var s = eventRepeatDays.split(" ");
  var errors = []

  for (var i = 0; i < s.length; i++) {

    if (!days.includes(s[i])) {
      errors.push(s[i])
    }
  }

  if (errors.length > 0){
    errorMessages.push("Invalid event repeat days: " + errors.join(',') + ';')
  }

}

// Define how to store the response
function saveResponse (result) {

  var params = [title,description,startDate,endDate,eventLocation,guests,eventTimezone,eventRepeatFrequency,repeatEnd,eventRepeatDays].join(';')
  
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
  
  var params = 'text='+title+'&details='+description+'&location='+eventLocation+'&dates='+formatDateISO(startDate)+'/'+formatDateISO(endDate)+'&ctz='+eventTimezone +'&add=' + guests + (rrule ? '&recur=RRULE:'+rrule : '')

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

  if (navigator.userAgent.match(/(iPhone|iPod|iPad)/) != null){

    //change format from YYYY-MM-DD HH:MM to MM/DD/YYYY HH:MM
    var dateParts = d.substring(0,10).split('-');
    var timePart = d.substr(11);
    d = dateParts[1] + '/' + dateParts[2] + '/' + dateParts[0] + ' ' + timePart;
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

