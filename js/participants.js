const fs = require('fs');

const Fixations = require('./fixations.js');

module.exports = class Participants {

    static getIDs( dataFolder ) {
        let dataFiles = fs.readdirSync( dataFolder );
        if (dataFiles.some( filename => !filename.endsWith( '.txt' ) )) {
            return null;
        }

        dataFiles = dataFiles.filter( filename => filename.endsWith( '.txt' ) );

        const result = [];
        let currentParticipant = '';

        dataFiles.forEach( filename => {
            const participant = getParticipantID( filename );
            if (participant !== currentParticipant) {
                result.push( participant );
                currentParticipant = participant;
            }
        });

        return result;
    }

    static readParticipantData( pages, dataFolder, participant ) {
        const dataFiles = fs.readdirSync( dataFolder ).filter( filename => {
            return filename.startsWith( participant );
        });

        dataFiles.sort( (a, b) => {
            return getPageID( a ) - getPageID( b );
        });

        dataFiles.forEach( (dataFile, index) => {
            const pageID = getPageID( dataFile );
            const page = pages[ pageID - 1 ];
            page.fixations = Fixations.read( dataFolder + dataFile );
            page.id = pageID;
            page.filename = dataFile;
            page.correctMappedLines();
        });
    }

};

function getParticipantID( filename ) {
    return filename.split( '_' )[0];
}

function getPageID( filename ) {
    return +getFileNameTrunk( filename ).split( '_' )[1];
}

function getFileNameTrunk( filename ) {
    return filename
        .split( '/' ).pop()
        .split( '.' )[0];
}
