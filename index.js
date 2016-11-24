'use strict';

const fs = require('fs');

const staticFit = require('../../_Web/GaSP/Reading/src/js/staticFit.js').StaticFit;

const MatchRate = require('./matchRate.js');
const Page = require('./page.js');

// Parameters
const DATA_FOLDER = './data/';
const OUTPUT_FOLDER = 'mapped/';

staticFit.settings({
	logging: false,
	fitThreshold: 15,
	marginX: 150,
	marginY: 150,
	skimmigThresholdX: 400,
	skimmigThresholdY: 35,
	emptyLineDetectionFactor: 1.6,
	correctForEmptyLines: true,
	maxLinearGradient: 0.12,
	//minDurationMerging: 0,
	//minDurationRemoving: 0,
	//dropShortSets: false,
	minInterfixDist: 40 // let's join some close fixations
});

main( DATA_FOLDER );

// Implementation
function Word (x1, y1, x2, y2, col, row, text) {
	this.x = x1;
	this.y = y1;
	this.width = x2 - x1;
	this.height = y2 - y1;
	this.row = row;
	this.col = col;
	this.text = text;
}

function Fixation (ts, duration, x, y, wordID, col, row, text) {
	this.ts = ts;
	this.duration = duration;
	this.x = x;
	this.y = y;
	this.wordID = wordID;
	this.row = row;
	this.col = col;
	this.text = text;
}

function main( dataFolder ) {
	let output = [ dataFolder, 'file\twords\tlines' ];

	console.log( `======= ${dataFolder} =======` );
	let pages = readStimuli( dataFolder + 'stimuli/AOIlistAll.txt' );
	pages.forEach( page => {
		page.detectMissingLines();
		page.correctRows();
	});

	let participants = readParticipants( dataFolder + 'AOIfixs/' );

	let grandAverageMatchRate = new MatchRate();

	participants.forEach( (participant, pi) => {
		console.log( `======= ${participant} =======` );
		console.log( `file\t\twords\tlines` );

		readParticipantData( pages, dataFolder + 'AOIfixs/', participant);

		let averageMatchRate = new MatchRate();

		pages.forEach( (page, index) => {
			// if (pi === 0 && index == 15) {
			// 	debugger;
			// }
			staticFit.map( page );
			saveFixations( page.fixations, dataFolder + OUTPUT_FOLDER, participant, index + 1 );

			let matchRate = getMatchRate( page.fixations );
			averageMatchRate.add( matchRate );

			output.push( page.filename + '\t' + matchRate.toString() );
			console.log( `${page.id}`, '\t\t', matchRate.toString() );
		});

		grandAverageMatchRate.add( averageMatchRate );

		console.log( participant, '\t', averageMatchRate.toString() );
	});

	output.push( '\nGRAND AVG\t' + grandAverageMatchRate.toString() );
	console.log( '\nGRAND AVG:\t', grandAverageMatchRate.toString() );

	saveMapping( output, dataFolder + OUTPUT_FOLDER + 'mapping.txt' );
}

function readStimuli( filename ) {
	let pages = [];
	let buffer;

	try {
		buffer = fs.readFileSync( filename, 'utf8' );
	} finally {
		if (!buffer) {
			return console.error( `Cannot read ${filename}` );
		}
	}

	let data = buffer.toString();
	let rows = data.split( '\r\n' );
	console.log('stimuli, rows:', rows.length);

	let words = [];
	pages.push( new Page( words ) );

	rows.forEach( row => {
		if (row[0] === '#') {
			return;
		}

		let values = row.split( '\t' );
		if (values.length !== 9) {
			return;
		}

		let pageID = +values[0];
		if (pageID > pages.length) {
			words = [];
			pages.push( new Page( words ) );
		}

		let word = new Word(
			+values[1],	// x1
			+values[2],	// y1
			+values[3],	// x2
			+values[4],	// y2
			+values[6],	// col
			+values[7],	// row
			values[8]	// text
		);

		words.push( word );
	});

	console.log('pages, count:', pages.length);

	return pages;
}

function readParticipants( dataFolder ) {
	let dataFiles = fs.readdirSync( dataFolder ).filter( filename => {
		return filename.endsWith( '.txt' );
	});

	let result = [];
	let currentParticipant = '';

	dataFiles.forEach( filename => {
		let participant = getParticipantID( filename );
		if (participant !== currentParticipant) {
			result.push( participant );
			currentParticipant = participant;
		}
	});

	return result;
}

function getFileNameTrunk( filename ) {
	return filename
		.split( '/' ).pop()
		.split( '.' )[0];
}

function getPageID( filename ) {
	return +getFileNameTrunk( filename ).split( '_' )[1];
}

function getParticipantID( filename ) {
	return getFileNameTrunk( filename ).split( '_' )[0];
}

function readParticipantData( pages, dataFolder, participant ) {
	let dataFiles = fs.readdirSync( dataFolder ).filter( filename => {
		return filename.startsWith( participant );
	});

	dataFiles.sort( (a, b) => {
		return getPageID( a ) - getPageID( b );
	});

	dataFiles.forEach( (dataFile, index) => {
		let pageID = getPageID( dataFile );
		let page = pages[ pageID - 1 ];
		page.fixations = readFixations( dataFolder + dataFile );
		page.id = pageID;
		page.filename = dataFile;
		page.correctMappedLines();
	});
}

function readFixations( filename ) {
	let fixations = [];
	let buffer;

	try {
		buffer = fs.readFileSync( filename, 'utf8' );
	} finally {
		if (!buffer) {
			return console.error( `Cannot read ${filename}` );
		}
	}

	let data = buffer.toString();
	let rows = data.split( '\r\n' );

	rows.forEach( (row, index) => {
		if (index === 0) {
			return;
		}

		let values = row.split( '\t' );
		if (values.length < 8) {
			return;
		}

		let fixation = new Fixation(
			+values[0],		// ts
			+values[1], 	// duraiton
			+values[2], 	// x
			+values[3], 	// y
			+values[4], 	// wordID
			values[5] === 'NaN' ? -1 : +values[5],	// col
			values[6] === 'NaN' ? -1 : +values[6], 	// row
			values[7]	// text
		);
		fixations.push( fixation );
	});

	//console.log('\tfixations, count:', fixations.length);

	return fixations;
}

function saveFixations( fixations, folder, filename, pageID ) {
	let records = ['startT	duration	X (pix)	Y (pix)	AOIid	wordInRowNo	lineNo	word'];

	fixations.forEach( fixation => {
		records.push( [
			fixation.ts,
			fixation.duration,
			fixation._x || fixation.x ,
			fixation.y,
			fixation.wordID,
			fixation.col < 0 ? 'NaN' : fixation.col,
			fixation.row < 0 ? 'NaN' : fixation.row,
			fixation.text,
			fixation.word ? fixation.word.index + 1 : 'NaN',
			fixation.line !== undefined ? fixation.line + 1 : 'NaN'
		].join( '\t' ) );
	});

	let page = padFront( '' + pageID, 4, '0' );

	if ( !fs.existsSync( folder ) ) {
	//if ( !(fs.accessSync( folder ) | fs.constants.F_OK) ) {
		fs.mkdirSync( folder );
	}

	filename = filename + '_' + page + '_mapped.png.txt';
	fs.writeFile( folder + filename, records.join( '\r\n' ), (err, fd) => {
		if (err) {
			console.error( 'Cannote write to the file', filename, ':', err.code );
		}
	});
}

function padFront( text, requiredLength, padChar ) {
	while (text.length < requiredLength) {
		text = padChar + text;
	}
	return text;
}

function getMatchRate( fixations ) {
	let result = new MatchRate();
	fixations.forEach( fixation => {
		let row = fixation.line === undefined ? -1 : fixation.line + 1;
		let col = !fixation.word ? -1 : fixation.word.index + 1;
		result.add( fixation.col === col, fixation.row === row );
	});

	return result;
}

function saveMapping( data, filename ) {
	let str = data.join( '\r\n' );
	fs.writeFile( filename, str, (err, fd) => {
		if (err) {
			console.error( 'Cannot create the file', filename, ':', err.code );
		}
	});
}