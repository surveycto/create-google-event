# Create Google Calendar event

![](extras/create-google-event.png)

## Description

This field plug-in can create google calendar events for you in SurveyCTO Collect. 


[![Download now](extras/download-button.png)](https://github.com/codimcc/create-google-event/raw/just-browser/create-google-event.fieldplugin.zip)

## How to use

1. Download the sample form [extras/sample-form](https://github.com/codimcc/create-google-event/raw/just-browser/extras/sample-form/google%20calendar%20event%20sample.xlsx) from this repo and upload it to your SurveyCTO server.
1. Download the [create-google-event.fieldplugin.zip](https://github.com/codimcc/create-google-event/raw/just-browser/phone-call-dialer.fieldplugin.zip) file from this repo, and attach it to the sample form on your SurveyCTO server.
1. Make sure to provide the correct parameters (see below).

## Parameters

| Key | Value |
| --- | --- |
| `title` | **Required**. Event title. |
| `description` | **Optional**. The event description |
| `startDate`| **Date part required**. Date and time in YYYY-MM-DD HH:MM format or date in YYYY-MM-DD format if it is an all-day or multi-day event.|
| `endDate`| **Optional**. if not specified defaults to the same as the start date and time plus one hour if a time part is specified. If specified, must be the same as or later than the start date and time, and if the start date and time only has a date part then the end date and time must not include a time part. 
| `guests`| **Optional**. A commas-separated list of valid email addresses to invite to the event. |
| `eventTimezone`| **Optional**. By default current time zone from the Android OS or browser. |
| `eventLocation` | **Optional**. Adding an address into the location field enables features such as "time to leave" or displaying a map with the directions. |
| `eventRepeatFrequency`| **Optional**. String value [daily, weekly, monthly, yearly]. If not specified then **repeatWeekDays** and **repeatWeekDays** will be ignored |
| `eventRepeatDays`| **Optional**. [Sun Mon Tue Wed Thu Fri Sat] specified in a space-separated list.
| `repeatEnd`| **Optional**. Specify either an integer for number of occurrences or a date in YYYY-MM-DD format.|

## More resources

* **Sample form**  
[extras/test-form](https://github.com/codimcc/create-google-event/raw/just-browser/extras/sample-form/Create%20google%20event%20sample.xlsx)
* **Developer documentation**  
Instructions and resources for developing your own field plug-ins.  
[https://github.com/surveycto/Field-plug-in-resources](https://github.com/surveycto/Field-plug-in-resources)
* **User documentation**  
How to get started using field plug-ins in your SurveyCTO form.  
[https://docs.surveycto.com/02-designing-forms/03-advanced-topics/06.using-field-plug-ins.html](https://docs.surveycto.com/02-designing-forms/03-advanced-topics/06.using-field-plug-ins.html)

* **List of available timezones** 
[https://en.wikipedia.org/wiki/List_of_tz_database_time_zones](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones) 