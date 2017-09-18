class MatchRate {
	
	constructor() {
		this._words = 0;
		this._lines = 0;
		this._count = 0;
	}

	add (matchRate, sameLine) {
		if (sameLine === undefined) {
			this._words += matchRate.words;
			this._lines += matchRate.lines;
		}
		else {	// matchRate -> sameWordIndex
			this._words += matchRate && sameLine ? 1 : 0;
			this._lines += sameLine ? 1 : 0;
		}
		this._count++;
	}

	get words () {
		return this._count > 0 ? this._words / this._count : 0;
	}

	get lines () {
		return this._count > 0 ? this._lines / this._count : 0;
	}

	toString () {
		return `${this.words.toFixed(3)}\t${this.lines.toFixed(3)}`;
	}
}

module.exports = MatchRate;