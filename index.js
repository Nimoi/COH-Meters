var config = require('./config.json')
var moment = require('moment');

var fs = require('fs'),
    bite_size = 256,
    readbytes = 0,
    file;

getLatestLog();

var logs = {
	stack: [],
	total: 0,
	hour: 0,
	minute: 0,
};

function getLatestLog() {
	fs.readdir(config.path, function(err, items) {
		let latestLog = items.sort().filter((record) => {
			return record.indexOf('chatlog') > -1;
		}).pop();
		if (latestLog === '') {
			throw 'Could not find a chatlog file.';
		}
		let path = config.path + latestLog;
		fs.open(path, 'r', function(err, fd) { file = fd; readsome(); });
	});
}

function readsome() {
    var stats = fs.fstatSync(file);
    if(stats.size<readbytes+1) {
	// No new data
        setTimeout(readsome, 1000);
    }
    else {
        fs.read(file, new Buffer.alloc(bite_size), 0, bite_size, readbytes, processsome);
    }
}

//2020-03-30 20:58:01 You hit Blood Brother Slugger with your Gleaming Blast for 25.46 points of Energy damage.
function processsome(err, bytecount, buff) {
    //console.log('Read', bytecount);

	let lines = buff.toString('utf-8', 0, bytecount);
	parseLines(lines);

    readbytes+=bytecount;
    process.nextTick(readsome);
}

function parseLines(lines) {
	lines.split(/\r?\n/).forEach((line) => {
		parseLine(line);
	});
}

function parseLine(line) {
	let timestampMatches = getTimestamp(line);
	if (! getTimestamp(line)) {
		return false;
	}

	let timestamp = timestampMatches.pop();
	line = line.replace(timestamp,'').trim();

	if (! hasHit(line)) {
		return false;
	}

	let damage = getDamage(line);
	if (! damage) {
		return false;
	}

	let damageType = getDamageType(line);
	if (! damageType) {
		return false;
	}
	
	logs.stack.push({
		timestamp: timestamp,
		damage: damage,
		damageType: damageType
	});
	showTotals(logs);
}

function getTimestamp(line) {
	let regex = /^([0-9]{2,4})-([0-1][0-9])-([0-3][0-9])(?:( [0-2][0-9]):([0-5][0-9]):([0-5][0-9]))/g;
	if (line.length < 20) {
		return false;
	}
	let match = line.match(regex);
	if (match === null) {
		return false;
	}
	return match;
}

function hasHit(line) {
	return line.startsWith('You hit ');
}

function getDamage(line) {
	let start = ' for ';
	let end = ' points of ';
	let matches = getMatchesBetweenStrings(line,start,end);
	if (! matches || matches.length < 2) {
		return false;
	}
	let damage = parseFloat(matches[1]);
	if (! damage) {
		return false;
	}
	return damage;
}

function getDamageType(line) {
	let start = ' points of ';
	let end = ' damage.';
	let matches = getMatchesBetweenStrings(line,start,end);
	if (! matches || matches.length < 2) {
		return false;
	}
	return matches[1];
}

function getMatchesBetweenStrings(str,start,end) {
	return str.match(new RegExp(start + "(.*)" + end));
}

function showTotals() {
	let total = getDamageTotal(logs.stack);

	let now = new Date();
	let oneHourAgo = moment().subtract(1, 'hours');
	let hour = getDamageTotal(filterRecords(logs.stack, oneHourAgo));

	let oneMinuteAgo = moment().subtract(1, 'minutes');
	let minute = getDamageTotal(filterRecords(logs.stack, oneMinuteAgo));

	let data = printFormat('Today', total);
	if (Object.keys(hour).length) {
		data += printFormat('Last Hour', hour);
	}
	if (Object.keys(minute).length) {
		data += printFormat('Last Minute', minute);
	}

	printTotals(data);
}

function printTotals(input) {
	const numberOfLines = (input.match(/\n/g) || []).length;
	process.stdout.clearScreenDown();
	process.stdout.write(input);
	process.stdout.cursorTo(0);
	process.stdout.moveCursor(0, -numberOfLines);
}

function printFormat(title, record) {
	let data = `${title}: \n`;
	for (type in record) {
		data += `${type}: ${record[type].toFixed(2)} \n`;
	};
	data += '\n';
	return data;
}

function getDamageTotal(arr) {
	return arr.reduce((carry, record) => {
		if (! carry.hasOwnProperty(record.damageType)) {
			carry[record.damageType] = 0;
		}
		carry[record.damageType] += record.damage;
		carry['Total'] += record.damage;
		return carry;
	}, {'Total':0});
}

function filterRecords(arr,date) {
	return arr.filter((record) => {
		if (record.timestamp.length < 19) {
			// TODO: what is happening here?
			return false;
		}
		let timestamp = moment(record.timestamp);
		if (! timestamp.isValid()) {
			return false;
		}
		return timestamp.isSameOrAfter(date);
	});
}
