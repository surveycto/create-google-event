/* global getPluginParameter, fieldProperties, setAnswer */

var title = getPluginParameter('title')
var description = getPluginParameter('description')
var startDate = getPluginParameter('start_date')
var endDate = getPluginParameter('end_date')
var guests = getPluginParameter('guests')
var eventLocation = getPluginParameter('location')
var eventTimezone = getPluginParameter('timezone')
var eventRepeatFrequency = getPluginParameter('repeat_freq')
var eventRepeatDays = getPluginParameter('repeat_days')
var repeatEnd = getPluginParameter('repeat_end')

if (title == null) {
  title = ''
}

if (description == null) {
  description = ''
}

var nextHalfHour // Declared up here, since might be used by endDate
if (!isValidDate(startDate)) { // If not defined, then default to the next half-hour
  var now = Date.now()
  var date = new Date(now)
  var ms = date.getMilliseconds()
  var second = date.getSeconds()
  var minute = date.getMinutes()
  var stringMinute

  if (minute > 30) {
    minute -= 30
    stringMinute = '00'
  } else {
    stringMinute = '30'
  }

  var timeSubtract = ms + (second * 1000) + (minute * 60000)
  nextHalfHour = now - timeSubtract + 1800000
  var scheduleTime = new Date(nextHalfHour)

  // YYYY-MM-DD HH:MM
  startDate = String(scheduleTime.getFullYear()) + '-' + pad(scheduleTime.getMonth()) + '-' + pad(scheduleTime.getDate()) + ' ' + pad(scheduleTime.getHours()) + ':' + stringMinute
}

if (!isValidDate(endDate)) {
  var startVar = new Date(startDate)
  var endFull = startVar.getTime() // Unix time
  if (startDate.length === 16) {
    endFull += 3600000
  } else {
    var tz = startVar.getTimezoneOffset()
    endFull += 86400000 + (tz * 60000)
  }

  var newDate = new Date(endFull)
  endDate = String(newDate.getFullYear()) + '-' + pad(newDate.getMonth() + 1) + '-' + pad(newDate.getDate())

  if (startDate.length === 16) {
    endDate += ' ' + pad(newDate.getHours()) + ':' + pad(newDate.getMinutes())
  }
}

if (guests == null) {
  guests = ''
}

if (eventLocation == null) {
  eventLocation = ''
}

if (eventTimezone == null) {
  eventTimezone = ''
}

if (eventRepeatFrequency == null) {
  eventRepeatFrequency = ''
}

if (eventRepeatDays == null) {
  eventRepeatDays = ''
}

if (repeatEnd == null) {
  repeatEnd = ''
}

var rrule = ''

var btnCreateEvent = document.getElementById('btn-create-event')
var statusContainer = document.getElementById('status-container')
var currentAnswer = fieldProperties.CURRENT_ANSWER || ''
var errorMessages = []
var allDayEvent = false

validateParameters()

if (errorMessages.length > 0) {
  document.getElementById('btn-create-event').style.display = 'none'

  if (errorMessages.length === 1) statusContainer.innerHTML = errorMessages[0]

  if (errorMessages.length > 1) statusContainer.innerHTML = 'Please correct following errors:<br>' + errorMessages.join('<br>')
} else {
  document.getElementById('btn-create-event').style.display = ''
  statusContainer.innerHTML = 'Press to create event:'
}

displayParameters()

// define what the 'Create Event' button does
if (!fieldProperties.READONLY) {
  var params = 'text=' + title + '&details=' + description + '&location=' + eventLocation + '&dates=' + formatDateISO(startDate) + '/' + formatDateISO(endDate) + '&ctz=' + eventTimezone + '&add=' + guests + (rrule ? '&recur=RRULE:' + rrule : '')
  var url = 'https://calendar.google.com/calendar/render?action=TEMPLATE&' + params

  btnCreateEvent.setAttribute('href', url)
  btnCreateEvent.onclick = function () {
    saveResponse('success')
  }
} else {
  btnCreateEvent.classList.add('disabled')
}

function displayParameters () {
  document.getElementById('txt-title').innerHTML = title
  document.getElementById('txt-description').innerHTML = description
  document.getElementById('txt-start').innerHTML = startDate
  document.getElementById('txt-end').innerHTML = allDayEvent ? '' : endDate
  document.getElementById('txt-location').innerHTML = eventLocation
  document.getElementById('txt-timezone').innerHTML = eventTimezone
  document.getElementById('txt-guests').innerHTML = guests

  // For clarity, no need to display "Event repeat frequency" and "Event repeat days", as only one will be effective at one time
  document.getElementById('txt-frequency').innerHTML = eventRepeatFrequency ? eventRepeatFrequency : eventRepeatDays

  document.getElementById('txt-rend').innerHTML = repeatEnd
}

function validateParameters () {
  try {
    title = title.trim()
    startDate = startDate.trim()
    eventRepeatFrequency = eventRepeatFrequency.trim()
    eventRepeatDays = eventRepeatDays.trim()

    if (typeof repeatEnd !== 'string') {
      repeatEnd = String(repeatEnd)
    }
    repeatEnd = repeatEnd.trim()

    if (title === '' && startDate !== '') errorMessages.push('Event Title is required to create an event')
    if (title !== '' & startDate === '') errorMessages.push('Event Start date is required to create an event')
    if (title === '' && startDate === '') errorMessages.push('Required parameters are missing. Both the title and a start date are required to create an event')

    validateStartEndDates()

    validateListOfGuests()

    // set default tz if not provided
    if (!eventTimezone) eventTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone

    validateRepeatFrequency()

    validateEventRepeatDays()

    // if eventRepeatFrequency submitted then translate eventRepeatFrequency, repeatEnd, eventRepeatDays to rrule
    if (eventRepeatFrequency) {
      if (eventRepeatFrequency.toLowerCase() === 'daily') {
        rrule = 'FREQ=DAILY'
      }
      if (eventRepeatFrequency.toLowerCase() === 'weekly') {
        rrule = 'FREQ=WEEKLY'
      }
      if (eventRepeatFrequency.toLowerCase() === 'monthly') {
        rrule = 'FREQ=MONTHLY'
      }
      if (eventRepeatFrequency.toLowerCase() === 'yearly') {
        rrule = 'FREQ=YEARLY'
      }

      /*
        Should "Event repeat frequency" and "Event repeat days" both be specified,
        in the user interface (specified below), "Event repeat days" should be listed as "Overridden by event repeat frequency".
      */
      /*
        For clarity, no need to display "Event repeat frequency" and "Event repeat days", as only one will be effective at one time
      */
      // eventRepeatDays = "Overridden by event repeat frequency"
      eventRepeatDays = ''
    } else if (eventRepeatFrequency === '' && eventRepeatDays !== '') {
      /*
      When "Event repeat days" is specified and "Event repeat frequency" is blank, it should be interpreted as "repeating every week on the specified days".
      "Event repeat days" should not be contingent on a value being specified for "Event repeat frequency"
      */
      rrule = 'FREQ=WEEKLY'

      var eventRepeatDaysMapped = mapWeekDays(eventRepeatDays)
      eventRepeatDaysMapped = eventRepeatDaysMapped.replace(/\s/g, ',')

      rrule += ';BYDAY=' + eventRepeatDaysMapped
    }

    // You can use either COUNT or UNTIL to specify the end of the event recurrence. Don't use both in the same rule.
    if ((eventRepeatFrequency !== '' || eventRepeatDays !== '') && repeatEnd !== '') {
      const parsed = Number(repeatEnd)
      // if parsed then use as COUNT
      if (!isNaN(parsed)) {
        rrule += ';COUNT=' + parsed

        // otherwise use as UNTIL date
      } else {
        if (!isValidDate(repeatEnd)) {
          errorMessages.push('Repeat end date is invalid')
        } else {
          rrule += ';UNTIL=' + formatDate(repeatEnd)
        }
      }
    }
  } catch (err) {
    errorMessages.push(err)
  }
}

function mapWeekDays (str) {
  var mapObj = { Sun: 'SU', Mon: 'MO', Tue: 'TU', Wed: 'WE', Thu: 'TH', Fri: 'FR', Sat: 'SA' }

  str = str.replace(/Sun|Mon|Tue|Wed|Thu|Fri|Sat/gi, function (matched) { return mapObj[matched] })

  return str
}

function validateStartEndDates () {
  var sd = new Date(startDate)
  var ed = new Date(endDate)
  if (ed < sd) {
    errorMessages.push('End date must be equal to or greater than the start date')
  }
}

function validateListOfGuests () {
  if (!guests.trim()) return

  var s = guests.split(',')
  var errors = []

  for (var i = 0; i < s.length; i++) {
    var exp = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/

    if (!exp.test(s[i].trim())) {
      errors.push(s[i].trim())
    }
  }

  if (errors.length > 0) {
    errorMessages.push('Invalid guest emails: ' + errors.join(',') + ';')
  }
}

function validateRepeatFrequency () {
  if (eventRepeatFrequency.trim() === '') return

  var freq = ['daily', 'weekly', 'monthly', 'yearly']

  if (freq.indexOf(eventRepeatFrequency.toLowerCase()) === -1) {
    errorMessages.push('Invalid event repeat frequency value: ' + eventRepeatFrequency)
  }
}
function validateEventRepeatDays () {
  if (eventRepeatDays.trim() === '') return

  var days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  var s = eventRepeatDays.split(' ')
  var errors = []

  for (var i = 0; i < s.length; i++) {
    if (days.indexOf(s[i]) === -1) {
      errors.push(s[i])
    }
  }

  if (errors.length > 0) {
    errorMessages.push('Invalid event repeat days: ' + errors.join(',') + ';')
  }
}

// Define how to store the response
function saveResponse (result) {
  var params = [title, description, startDate, endDate, eventLocation, guests, eventTimezone, eventRepeatFrequency, repeatEnd, eventRepeatDays].join(';')

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
https:// github.com/InteractionDesignFoundation/add-event-to-calendar-docs/blob/master/services/google.md
*/

// The below function is note used, so it is being commented-out for now.
/* function launchUsingBrowser () {
  var params = 'text=' + title + '&details=' + description + '&location=' + eventLocation + '&dates=' + formatDateISO(startDate) + '/' + formatDateISO(endDate) + '&ctz=' + eventTimezone + '&add=' + guests + (rrule ? '&recur=RRULE:' + rrule : '')

  var url = 'https:// calendar.google.com/calendar/render?action=TEMPLATE&' + params

  window.open(url)

  saveResponse('success')
} */

function isValidDate (d) {
  if (typeof d !== 'string') {
    return false
  }
  var f1 = /[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[1-2][0-9]|3[0-1]) (2[0-3]|[01][0-9]):[0-5][0-9]/
  var f2 = /[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[1-2][0-9]|3[0-1])/

  if (!d.match(f1) && !d.match(f2)) {
    return false
  }

  if (navigator.userAgent.match(/(iPhone|iPod|iPad)/) != null) {
    // change format from YYYY-MM-DD HH:MM to MM/DD/YYYY HH:MM
    var dateParts = d.substring(0, 10).split('-')
    var timePart = d.substr(11)
    d = dateParts[1] + '/' + dateParts[2] + '/' + dateParts[0] + ' ' + timePart
  }

  d = new Date(d)

  return d instanceof Date && !isNaN(d)
}

function formatDate (date, f) {
  if (f == null) {
    f = 'YYYYMMDD'
  }

  var year = ''
  var month = ''
  var day = ''
  var hh = ''
  var mm = ''
  var result = ''

  try {
    var d = new Date(date)
    d = new Date(d.getTime() + (d.getTimezoneOffset() * 60000)) // Takes into account time zone offset

    year = d.getFullYear()
    month = pad(d.getMonth() + 1)
    day = pad(d.getDate())
    hh = pad(d.getHours())
    mm = pad(d.getMinutes())

    if (f === 'YYYYMMDD') {
      result = [year, month, day].join('')
    } else if (f === 'YYYY-MM-DD') {
      result = [year, month, day].join('-')
    } else if (f === 'YYYY-MM-DD HH:MM') {
      result = [year, month, day].join('-') + ' ' + [hh, mm].join(':')
    }
  } catch (err) {
    statusContainer.innerHTML = err
  } finally {
    return result
  }
}

function pad (number) {
  if (number < 10) {
    return '0' + number
  }
  return number
}

function formatDateISO (date) {
  // YYYYMMDDTHHMMSSZ

  var result = ''
  try {
    var d = new Date(date)

    if (d.getUTCHours() === 0 & d.getUTCMinutes() === 0) {
      result = d.getUTCFullYear() + pad(d.getUTCMonth() + 1) + pad(d.getUTCDate())
    }

    if (d.getUTCHours() > 0 || d.getUTCMinutes() > 0) {
      result =
        d.getUTCFullYear() +
        pad(d.getUTCMonth() + 1) +
        pad(d.getUTCDate()) +
        'T' +
        pad(d.getUTCHours()) +
        pad(d.getUTCMinutes()) +
        (d.getUTCMilliseconds() / 1000).toFixed(3).slice(3, 5) +
        'Z'
    }
  } catch (err) {
    statusContainer.innerHTML = err
  } finally {
    return result
  }
}
