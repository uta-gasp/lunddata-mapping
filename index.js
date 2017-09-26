'use strict';

require('mock-local-storage');

const fs = require('fs');
const path = require('path');

const Stimuli = require('./js/stimuli.js');
const Participants = require('./js/participants.js');
const MatchRate = require('./js/matchRate.js');
const Fixations = require('./js/fixations.js');

const argsStructure = require('./js/argsStructure.js');
const args = require('./js/args.js');

if (!args.hasRequired( argsStructure ) ) {
    return args.printInfo( argsStructure );
}

let mapper;
let SGWM;
const isSGWM = args.named.mode !== 'old';

if (isSGWM) {
    SGWM = require('../../_Web/GaSP/sgwm.js/build/sgwm.module.js');
    mapper = new SGWM();
}
else {
    mapper = require('../../_Web/GaSP/Reading/src/js/staticFit.js').StaticFit;
}

const FIX_FOLDER = 'AOIfixs/';
const DATA_FOLDER = './data/' + (args.named.source ? `${args.named.source}/` : '');
const OUTPUT_FOLDER = 'mapped/';

// Parameters
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
function main() {
    const pages = Stimuli.readPages( DATA_FOLDER );
    if (!pages) {
        return console.error( 'aborted' );
    }

    const success = parseFolder( pages, DATA_FOLDER );
    if (!success) {
        console.log( '\tparsing subfolders...' );
        const folders = getSubfolders( DATA_FOLDER + FIX_FOLDER )
        let count = 0;
        const results = folders.map( (folder, i) => {
            if ((!args.named.max || count < args.named.max) && (!args.named.skip || i >= args.named.skip)) {
                count++;
                return parseFolder( pages, DATA_FOLDER, folder + '/' );
            }
        });

        const summaryFilename = DATA_FOLDER + OUTPUT_FOLDER + 'mapping.txt';
        saveSummary( results, folders, summaryFilename );
    }
}

function parseFolder( pages, dataFolder, subfolder ) {
	const output = [ dataFolder + (subfolder ? subfolder : ''), 'file\twords\tlines' ];
    const outputFolder = [ dataFolder + OUTPUT_FOLDER ];
    if (subfolder) {
        outputFolder.push( subfolder );
    }

    console.log( `======= ${dataFolder}${subfolder ? subfolder : ''} =======` );

    const fixationsFolder = [ dataFolder, FIX_FOLDER, subfolder ].join('');
    const participants = Participants.getIDs( fixationsFolder );
    if (!participants) {
        console.log( '\tno files' );
        return null;
    }

	const grandAverageMatchRate = new MatchRate();

    const result = [];
    let isValid = true;

	participants.forEach( (participant, pi) => {
        if (!isValid) {
            return;
        }

        const averageMatchRate = new MatchRate();

        if (args.named.verbose) {
    		console.log( `======= ${participant} =======` );
    		console.log( `file\t\twords\tlines` );
        }

		Participants.readParticipantData( pages, fixationsFolder, participant );

		pages.forEach( (page, index) => {
            if (!page.fixations) {
                isValid = false;
                return console.log( `\tNo fixations in '${page.filename}'. Aborted.` );
            }

            let fixations;
            if (isSGWM) {
                fixations = mapper.map( page ).fixations;
            }
            else {
                mapper.map( page );
                fixations = page.fixations;
            }

			Fixations.save( fixations, outputFolder, participant, index + 1 );

			const matchRate = getMatchRate( fixations );
			averageMatchRate.add( matchRate );

			output.push( page.filename + '\t' + matchRate.toString() );
            if (args.named.verbose) {
	       		console.log( `${page.id}`, '\t\t', matchRate.toString() );
            }

            result.push({
                words: matchRate.words.toFixed(3),
                lines: matchRate.lines.toFixed(3),
            });
		});

        if (isValid) {
	        grandAverageMatchRate.add( averageMatchRate );
            if (args.named.verbose) {
        		console.log( participant, '\t', averageMatchRate.toString() );
            }
        }
	});

    if (isValid) {
    	output.push( '\nGRAND AVG\t' + grandAverageMatchRate.toString() );
        if (args.named.verbose) {
        	console.log( '\nGRAND AVG:\t', grandAverageMatchRate.toString() );
        }

    	saveToFile( output, outputFolder.join( '' ) + 'mapping.txt' );
    }

    return isValid ? result : null;
}

function getSubfolders( folder ) {
    const isDirectory = source => fs.lstatSync( source ).isDirectory()
    return fs.readdirSync( folder ).filter( name => isDirectory( path.join( folder, name ) ) );
}

function getMatchRate( fixations ) {
	const result = new MatchRate();
	fixations.forEach( fixation => {
		const row = fixation.line === undefined ? -1 : fixation.line + 1;
		const col = !fixation.word ? -1 : fixation.word.index + 1;
		result.add( fixation.col === col, fixation.row === row );
	});

	return result;
}

function saveSummary( results, folders, filename ) {
    const dataFilenames = fs.readdirSync( DATA_FOLDER + FIX_FOLDER + folders[0] + '/' );

    // list-mode
    const result = results.map( (result, i) => {
        if (!result) {
            return null;
        }
        const folder = folders[ i ];
        return dataFilenames.map( (dataFilename, index) => {
            const value = result[ index ];
            return `${folder}\t${dataFilename}\t${value.words}\t${value.lines}`;
        }).join( '\r\n' );
    }).filter( _ => _ ) ;  // filter nulls out

    result.unshift( [ 'case', 'filename', 'word', 'line' ].join( '\t' ) );

    // table-mode

    // const result = dataFilenames.map( (dataFilename, index) => {
    //     return results.map( (result, i) => {
    //             const folder = folders[ i ];
    //             const value = result ? result[ index ] : null;
    //             if (!value) {
    //                 return null;
    //             }
    //             return `${folder}\t${dataFilename}\t${value.words}\t${value.lines}`;
    //         }).filter( _ => _ ).join( '\r\n' ) ;  // filter nulls out
    // });

    // result.unshift( folders.filter( (_, i) => results[i] ).map( _ => 'case\tfilename\tword\tline' ).join( '\t' ) );

    saveToFile( result, filename );
}

function saveToFile( data, filename ) {
	const str = data.join( '\r\n' );
    fs.writeFileSync( filename, str );
}
