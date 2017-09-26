module.exports = class Word {
    constructor( x1, y1, x2, y2, col, row, text ) {
        this.x = x1;
        this.y = y1;
        this.width = x2 - x1;
        this.height = y2 - y1;
        this.row = row;
        this.col = col;
        this.text = text;
    }
}
