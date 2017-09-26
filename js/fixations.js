const fs = require('fs');

const args = require('./args.js');

class Fixation {
    constructor( ts, duration, x, y, wordID, col, row, text ) {
        this.ts = ts;
        this.duration = duration;
        this.x = x;
        this.y = y;
        this.wordID = wordID;
        this.row = row;
        this.col = col;
        this.text = text;
    }
}

module.exports = class Fixations {

    static read( filename ) {
        const fixations = [];
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
                +values[0],     // ts
                +values[1],     // duraiton
                +values[2 + shiftAfter2],   // x
                +values[3 + shiftAfter2],   // y
                +values[4 + shiftAfter2],   // wordID
                values[5 + shiftAfter2] === 'NaN' ? -1 : +values[5 + shiftAfter2],  // col
                values[6 + shiftAfter2] === 'NaN' ? -1 : +values[6 + shiftAfter2],  // row
                values[7 + shiftAfter2] // text
            );
            fixations.push( fixation );
        });

        //console.log('\tfixations, count:', fixations.length);

        return fixations;
    }

    static save( fixations, path, filename, pageID ) {
        const records = ['startT    duration    X (pix) Y (pix) AOIid   wordInRowNo lineNo  word'];

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

        const page = padFront( '' + pageID, 4, '0' );

        const folder = path.join( '' );
        if ( !fs.existsSync( folder ) ) {
            path.reduce( (acc, item) => {
                const newFolder = acc + item;
                if (!fs.existsSync( newFolder )) {
                    fs.mkdirSync( newFolder );
                }
                return newFolder;
            }, '' );
        }

        filename = filename + '_' + page + '_mapped.png.txt';

        fs.writeFileSync( folder + filename, records.join( '\r\n' ));

        // fs.writeFile( folder + filename, records.join( '\r\n' ), (err, fd) => {
        //  if (err) {
        //      console.error( 'Cannote write to the file', filename, ':', err.code );
        //  }
        // });
    }

};

function padFront( text, requiredLength, padChar ) {
    while (text.length < requiredLength) {
        text = padChar + text;
    }
    return text;
}
