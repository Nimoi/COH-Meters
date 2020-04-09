# COH-Meters

Reads chat logs to see how much damage you are doing in City of Heroes.

## Setup

* `cd ./COH-Meters`
* `npm install`
* Update `config.json` to point `path` to the folder containing your chatlogs.
* `node .`

## Problems

* All chatlogs are combined, so there isn't a way to differentiate damage between characters. The totals you see for the last day / minute / hour are for all characters.  
* Totals are only based on the latest chatlog file which switches daily.
* I've only tested this in Windows Subsystem for Linux, so good luck.
