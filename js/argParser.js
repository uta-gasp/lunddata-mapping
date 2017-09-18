module.exports = class ArgParser {
    static get array() {
        return process.argv.slice( 2 );
    }

    static get named() {
        const result = {};
        process.argv.slice( 2 ).forEach( arg => {
            if (arg.indexOf( '=' ) >= 0) {
                const parts = arg.split( '=' );
                result[ parts[0] ] = parts[1]; //.replace( /^(\"?)(.*)(\"?)$/, '$1' );
            }
            else {
                result[ arg ] = true;
            }
        } );
        return result;
    }

    static hasRequired( argDescriptors ) {
        const args = ArgParser.named;
        let result = true;
        for (let name in argDescriptors) {
            const argDescriptor = argDescriptors[ name ];
            if (argDescriptor.required && args[ name ] === undefined) {
                result = false;
                break;
            }
        }
        return result;
    }

    static printInfo( argDescriptors ) {
        console.log( '' );
        console.log( 'Usage' );
        console.log( '$ node index.js <param>[=<value>] [<param>[=<value>] ...]' );
        console.log( '' );
        console.log( 'Params:' );
        console.log( '' );
        for (let name in argDescriptors) {
            const argDescriptor = argDescriptors[ name ];
            console.log( `  ${name} ${argDescriptor.required ? '[required]' : ''}` );
            console.log( `      ${argDescriptor.description}` );
            if (argDescriptor.values) {
                console.log( `      Values:` );
                for (let key in argDescriptor.values) {
                    console.log( `      - ${key}: ${argDescriptor.values[key]}` );
                }
            }
            console.log( '' );
        }
        console.log( 'Example:' );
        console.log( '$ node index.js source=wrapped distorted' );
        console.log( '    parses distorted data in ./data/wrapped/AOIfixs/**/*.txt' );
    }
}