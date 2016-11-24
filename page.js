class Page {
	constructor( words ) {
		this.words = words;
		this.missingLines = [];
		this.maxLineID = 0;

		this.fixations = [];
		this.id = 0;
		this.filename = '';

		this.applyCorrection = false;
	}

	detectMissingLines() {
		let currentLineIndex = 0;
		this.words.forEach( word => {
			if (word.row > currentLineIndex + 1) {
				this.missingLines.push( word.row - 1 );
			}
			currentLineIndex = word.row;
		});
		this.maxLineID = currentLineIndex - 1;
	}

	correctRows() {
		if (!this.applyCorrection) {
			return;
		}

		let currentWordRow = 0;
		let currentLine = 0;

		this.words.forEach( word => {
			if (word.row != currentWordRow) {
				currentWordRow = word.row;
				currentLine += 1;
			}
			word.row = currentLine;
		});
	}

	correctMappedLines() {
		if (!this.applyCorrection) {
			return;
		}

		if (this.missingLines.length === 0) {
			return;
		}

		this.fixations.forEach( fixation => {
			this.missingLines.forEach( missingLine => {
				if (fixation.row > missingLine) {
					fixation.row -= 1;
				}
			});
		});
	}
}

module.exports = Page;