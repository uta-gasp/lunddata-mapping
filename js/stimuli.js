const fs = require('fs');

const Page = require('./page.js');
const Word = require('./word.js');

const args = require('./args.js');

module.exports = class Stimuli {

    static readPages( dataFolder ) {
        const pages = read( dataFolder + 'stimuli/AOIlistAll.txt' );
        if (!pages) {
            return null;
        }

        pages.forEach( page => {
            page.detectMissingLines();
            page.correctRows();
        });

        return pages;
    }

};

function read( filename ) {
    const pages = [];
    let buffer;

    try {
        buffer = fs.readFileSync( filename, 'utf8' );
    }
    finally {
        if (!buffer) {
            return console.error( `Cannot read ${filename}` );
        }
    }

    const data = buffer.toString();
    const rows = data.split( '\r\n' );

    if (args.named.verbose) {
        console.log('stimuli, rows:', rows.length);
    }

    let words = [];
    pages.push( new Page( words ) );

    rows.forEach( row => {
        if (row[0] === '#') {
            return;
        }

        const values = row.split( '\t' );
        if (values.length !== 9) {
            return;
        }

        const pageID = +values[0];
        if (pageID > pages.length) {
            words = [];
            pages.push( new Page( words ) );
        }

        const word = new Word(
            +values[1], // x1
            +values[2], // y1
            +values[3], // x2
            +values[4], // y2
            +values[6], // col
            +values[7], // row
            values[8]   // text
        );

        words.push( word );
    });

    if (args.named.verbose) {
        console.log('pages, count:', pages.length);
    }

    return pages;
}

