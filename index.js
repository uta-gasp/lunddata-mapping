'use strict';

/// Args /////////////////////////
const argsStructure = {
    'mode': {
        required: false,
        description: 'mapping algorithm',
        values: {
            '[no value]': 'SGWM',
            'old': 'staticFit from Reading project',
        },
    },
    'source': {
        required: true,
        description: 'subfolder in "./data", which contains "AOIfixs" and "stimuli" subfolders',
        values: {
            '[folder]': 'a folder name',
        },
    },
    'distorted': {
        required: false,
        description: 'a flag indicating than columns 5 and 6 contain distorted coordinates',
    },
}

//////////////////////////////////

require('mock-local-storage');

const fs = require('fs');
const path = require('path');

const MatchRate = require('./js/matchRate.js');
const Page = require('./js/page.js');
const args = require('./js/argParser.js');
if (!args.hasRequired( argsStructure ) ) {
    return args.printInfo( argsStructure );
}

const isSGWM = args.named.mode !== 'old';
let mapper;

if (isSGWM) {
    var SGWM = require('../../_Web/GaSP/sgwm.js/build/sgwm.module.js');
    mapper = new SGWM();
}
else {
    mapper = require('../../_Web/GaSP/Reading/src/js/staticFit.js').StaticFit;
}

// Parameters
const DATA_FOLDER = './data/' + (args.named.source ? `${args.named.source}/` : '');
const OUTPUT_FOLDER = 'mapped/';

if (mapper.settings) {
    mapper.settings({
        logging: false,
        fitThreshold: 15,
        marginX: 150,
        marginY: 150,
        skimmigThresholdX: 400,
        skimmigThresholdY: 35,
        emptyLineDetectionFactor: 1.6,
        correctForEmptyLines: true,
        maxLinearGradient: 0.15,
        minDurationMerging: 0,
        minDurationRemoving: 0,
        //dropShortSets: false,
        minInterfixDist: 0 // let's join some close fixations
    });
}
else if (isSGWM) {
    let settings = new SGWM.FixationProcessorSettings();
    settings.location.enabled = false;
    settings.duration.enabled = false;
    settings.save();

    settings = new SGWM.SplitToProgressionsSettings();
    settings.bounds = {	// in size of char height
        left: -0.5,
        right: 8,
        verticalChar: 2,
        verticalLine: 0.6
    };
    settings.angle = Math.sin( 15 * Math.PI / 180 );
    settings.save();

    settings = new SGWM.ProgressionMergerSettings();
    settings.minLongSetLength = 3;
    settings.fitThreshold = 0.28;		// fraction of the interline distance
    settings.maxLinearGradient = 0.15;
    settings.removeSingleFixationLines = false;
    settings.correctForEmptyLines = true;
    settings.currentLineSupportInCorrection = 0.0;
    settings.emptyLineDetectorFactor = 1.6;
    settings.intelligentFirstLineMapping = true;
    settings.save();

    settings = new SGWM.WordMapperSettings();
    settings.wordCharSkipStart = 3;
    settings.wordCharSkipEnd = 6;
    settings.scalingDiffLimit = 0.9;
    settings.rescaleFixationX = false;
    settings.partialLengthMaxWordLength = 2;
    settings.effectiveLengthFactor = 0.7;
    settings.ignoreTransitions = false;
    settings.save();
}

main();


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

function main() {
    const success = parseFolder( DATA_FOLDER );
    if (!success) {
        const folders = getSubfolders( DATA_FOLDER + 'AOIfixs/' )
        const outputs = folders.map( (folder, i) => {
            // if (i < 2)
            return parseFolder( DATA_FOLDER, folder + '/' );
        });

        const dataFiles = fs.readdirSync( DATA_FOLDER + 'AOIfixs/' + folders[0] + '/' );
        const result = dataFiles.map( (filename, index) => {
            // return filename + '\t' + outputs.map( (output, i) => i < 2 ? output[ index ].toString() : '\t' ).join( '\t' );
            return filename + '\t' + outputs.map( output => output[ index ].toString() ).join( '\t' );
        });

        result.unshift( 'Filename\t' + folders.map( _ => 'word\tline' ).join( '\t' ) );
        result.unshift( '\t' + folders.join( '\t\t' ) );

        saveMapping( result, DATA_FOLDER + OUTPUT_FOLDER + 'mapping.txt' );
    }
}

function parseFolder( dataFolder, subfolder ) {
	const output = [ dataFolder + (subfolder ? subfolder : ''), 'file\twords\tlines' ];
    const outputFolder = [ dataFolder + OUTPUT_FOLDER ];
    if (subfolder) {
        outputFolder.push( subfolder );
    }

    console.log( `======= ${dataFolder}${subfolder ? subfolder : ''} =======` );

    const AOIfixsFolder = dataFolder + 'AOIfixs/' + (subfolder ? subfolder : '');
    const participants = readParticipants( AOIfixsFolder );
    if (!(participants instanceof Array)) {
        console.log( '  no files, now parsing subfolder...' );
        return null;
    }

	const pages = readStimuli( dataFolder + 'stimuli/AOIlistAll.txt' );
	pages.forEach( page => {
		page.detectMissingLines();
		page.correctRows();
	});

	const grandAverageMatchRate = new MatchRate();

    const result = [];
	participants.forEach( (participant, pi) => {
		console.log( `======= ${participant} =======` );
		console.log( `file\t\twords\tlines` );

		readParticipantData( pages, AOIfixsFolder, participant);

		const averageMatchRate = new MatchRate();

		pages.forEach( (page, index) => {
			//if (pi !== 0 || index != 4) {
            //    return;
			//}

            let fixations;
            if (isSGWM) {
                const result = mapper.map( page );
                fixations = result.fixations;
            }
            else {
                mapper.map( page );
                fixations = page.fixations;
            }

			saveFixations( fixations, outputFolder, participant, index + 1 );

			const matchRate = getMatchRate( fixations );
			averageMatchRate.add( matchRate );

			output.push( page.filename + '\t' + matchRate.toString() );
			console.log( `${page.id}`, '\t\t', matchRate.toString() );

            result.push( matchRate );
		});

		grandAverageMatchRate.add( averageMatchRate );

		console.log( participant, '\t', averageMatchRate.toString() );
	});

	output.push( '\nGRAND AVG\t' + grandAverageMatchRate.toString() );
	console.log( '\nGRAND AVG:\t', grandAverageMatchRate.toString() );

	saveMapping( output, outputFolder.join( '' ) + 'mapping.txt' );

    return result;
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
	let dataFiles = fs.readdirSync( dataFolder );
    if (dataFiles.some( filename => !filename.endsWith( '.txt' ) )) {
        return null;
    }

    dataFiles = dataFiles.filter( filename => filename.endsWith( '.txt' ) );

	const result = [];
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

    const shiftAfter2 = args.named.distorted ? 2 : 0;
	rows.forEach( (row, index) => {
		if (index === 0) {
			return;
		}

		const values = row.split( '\t' );
		if (values.length < 8) {
			return;
		}

		const fixation = new Fixation(
			+values[0],		// ts
			+values[1], 	// duraiton
			+values[2 + shiftAfter2], 	// x
			+values[3 + shiftAfter2], 	// y
			+values[4 + shiftAfter2], 	// wordID
			values[5 + shiftAfter2] === 'NaN' ? -1 : +values[5 + shiftAfter2],	// col
			values[6 + shiftAfter2] === 'NaN' ? -1 : +values[6 + shiftAfter2], 	// row
			values[7 + shiftAfter2]	// text
		);
		fixations.push( fixation );
	});

	//console.log('\tfixations, count:', fixations.length);

	return fixations;
}

function saveFixations( fixations, path, filename, pageID ) {
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

    const folder = path.join( '' );
	if ( !fs.existsSync( folder ) ) {
	//if ( !(fs.accessSync( folder ) | fs.constants.F_OK) ) {
        path.reduce( (acc, item) => {
            const newFolder = acc + item;
            if (!fs.existsSync( newFolder )) {
                fs.mkdirSync( newFolder );
            }
            return newFolder;
        }, '' );
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

function getSubfolders( folder ) {
    const isDirectory = source => fs.lstatSync( source ).isDirectory()
    return fs.readdirSync( folder ).filter( name => isDirectory( path.join( folder, name ) ) );
}