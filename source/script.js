/* global getPluginParameter, fieldProperties, launchIntent, setAnswer */

var isAndroid = (document.body.className.indexOf('android-collect') >= 0)
var title = getPluginParameter('title');
var description = getPluginParameter('description');
var start_date = getPluginParameter('start_date')
var end_date = getPluginParameter('end_date')
var guests = getPluginParameter('guests')
var location = getPluginParameter('location')
var timezone = getPluginParameter('timezone')
var frequency = getPluginParameter('frequency')
var repeat_days = getPluginParameter('repeat_days')
var end = getPluginParameter('repeat_end')

var start_dateEpoch,end_dateEpoch, rrule = ''

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
 
  var params = 'text='+title+'&details='+description+'&location='+location+'&dates='+formatDateISO(start_date)+'/'+formatDateISO(end_date)+'&ctz='+timezone +'&add=' + guests + (rrule ? '&recur=RRULE:'+rrule : '')
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
  document.getElementById('txt-start').innerHTML = start_date
  document.getElementById('txt-end').innerHTML = allDayEvent ? '' : end_date    
  document.getElementById('txt-location').innerHTML = location
  document.getElementById('txt-timezone').innerHTML = timezone
  document.getElementById('txt-guests').innerHTML = guests
  
  //For clarity, no need to display "Event repeat frequency" and "Event repeat days", as only one will be effective at one time
  document.getElementById('txt-frequency').innerHTML = frequency ? frequency : repeat_days 

  document.getElementById('txt-rend').innerHTML = repeat_end
  
}

function validateParameters() {

  var results = ""

  title = title.trim()
  start_date = start_date.trim()
  frequency = frequency.trim()
  repeat_days = repeat_days.trim()
  repeat_end = repeat_end.trim()

  try {

    if (title === '' && start_date !== '') errorMessages.push("Event Title is required to create an event")
    if (title !== '' & start_date === '') errorMessages.push("Event Start date is required to create an event")
    if (title === '' && start_date === '') errorMessages.push("Required parameters are missing. Both the title and a start date are required to create an event")

    validateStartend_dates()

    validateListOfGuests()

    //set default tz if not provided
    if (!timezone) timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    validateRepeatFrequency()

    validaterepeat_days()

    //if frequency submitted then translate frequency, repeat_end, repeat_days to rule
    if (frequency) {
      if (frequency.toLowerCase() === "daily") {
        rrule = "FREQ=DAILY";
      }
      if (frequency.toLowerCase() === "weekly") {
        rrule = "FREQ=WEEKLY";
      }
      if (frequency.toLowerCase() === "monthly") {
        rrule = "FREQ=MONTHLY";
      }
      if (frequency.toLowerCase() === "yearly") {
        rrule = "FREQ=YEARLY";
      }

      /*
        Should "Event repeat frequency" and "Event repeat days" both be specified, 
        in the user interface (specified below), "Event repeat days" should be listed as "Overridden by event repeat frequency".
      */
      /*
        For clarity, no need to display "Event repeat frequency" and "Event repeat days", as only one will be effective at one time
      */
      //repeat_days = "Overridden by event repeat frequency"
      repeat_days = ""

    }
    /*
    When "Event repeat days" is specified and "Event repeat frequency" is blank, it should be interpreted as "repeating every week on the specified days".  
    "Event repeat days" should not be contingent on a value being specified for "Event repeat frequency"
    */
    else if (frequency === '' && repeat_days !==''){

      rrule = "FREQ=WEEKLY";

      var repeat_daysMapped = mapWeekDays(repeat_days)
      repeat_daysMapped = repeat_daysMapped.replace(/\s/g,',')


      rrule += ";BYDAY=" + repeat_daysMapped

    }

      //You can use either COUNT or UNTIL to specify the end of the event recurrence. Don't use both in the same rule.
      if ((frequency !=='' || repeat_days !== '') && repeat_end !== '') {
        const parsed = Number(repeat_end);
        //if parsed then use as COUNT
        if (!isNaN(parsed)) {
          rrule += ";COUNT=" + parsed;

          //otherwise use as UNTIL date
        } else {

          if (!isValidDate(repeat_end)){
            errorMessages.push("Repeat end date is invalid")
          }else{
          rrule += ";UNTIL=" + formatDate(repeat_end);
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

function validateStartend_dates() {

  var sd = new Date(start_date);
  var ed = new Date(end_date);

  //Start date & time (date part required): date and time in “YYYY-MM-DD HH:MM” format or date in “YYYY-MM-DD” format if it is an all-day or multi-day event.
  if (start_date && !isValidDate(start_date)) {

    errorMessages.push("Provided start date value is invalid")

  } 
  else if(isValidDate(start_date) && !isValidDate(end_date)) {
    //if not specified defaults to the same as the start date
    //if the start date and time only has a date part then the end date and time must not include a time part.
    if (sd.getUTCHours() === 0 && sd.getUTCMinutes() === 0) {

      allDayEvent = true
      ed = sd;
      ed = ed.setTime(ed.getTime() + 86400000); //add 24h
      end_date = formatDate(ed,'YYYY-MM-DD');

    }

    //and time plus one hour if a time part is specified.
    if (sd.getUTCHours() !== 0 || sd.getUTCMinutes() !== 0) {
      ed = sd;
      ed = ed.setTime(ed.getTime() + 60 * 60 * 1000);
      end_date = formatDate(ed,'YYYY-MM-DD HH:MM');
    }
  } 
  
  if (isValidDate(start_date) && isValidDate(end_date))
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

  if (frequency.trim() === '') return

  var freq = ['daily','weekly','monthly', 'yearly']

  if (!freq.includes(frequency.toLowerCase())){
    errorMessages.push("Invalid event repeat frequency value: " + frequency)
  }


}
function validaterepeat_days(){

  if (repeat_days.trim() === '') return

  var days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
  var s = repeat_days.split(" ");
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

  var params = [title,description,start_date,end_date,location,guests,timezone,frequency,repeat_end,repeat_days].join(';')
  
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
  
  var params = 'text='+title+'&details='+description+'&location='+location+'&dates='+formatDateISO(start_date)+'/'+formatDateISO(end_date)+'&ctz='+timezone +'&add=' + guests + (rrule ? '&recur=RRULE:'+rrule : '')

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

