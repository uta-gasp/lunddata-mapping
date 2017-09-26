module.exports = {
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
    'skip': {
        required: false,
        description: 'skips one or more subfolders from the beginning',
        values: {
            '<n>': 'number of folders to skip',
        },
    },
    'max': {
        required: false,
        description: 'max number of subfolders to parse',
        values: {
            '<n>': 'number of folders to parse',
        },
    },
    'verbose': {
        required: false,
        description: 'if set, generates a verbose output',
    },
};
