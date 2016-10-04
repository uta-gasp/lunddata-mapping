class Page {
	constructor( words ) {
		this.words = words;
		this.missingLines = [];

		this.fixations = [];
		this.id = 0;
		this.filename = '';
	}

	detectMissingLines() {
		let currentLineIndex = 0;
		this.words.forEach( word => {
			if (word.row > currentLineIndex + 1) {
				this.missingLines.push( word.row - 1 );
			}
			currentLineIndex = word.row;
		});
	}

	correctMappedLines() {
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