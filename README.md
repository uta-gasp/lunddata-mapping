# LundData mapping

Maps gaze data collected and annotated in Lund and displays the mapping accuracy statistics

## Install

Clone the package using git:

    git clone https://github.com/uta-gasp/lunddata-mapping.git
    cd lunddata-mapping

## Dependencies

 * [NodeJS](https://nodejs.org/)
 * [`staticFit.js`](https://github.com/uta-gasp/reading/blob/master/src/js/staticFit.js) from Reading project. Download the file and ensure that 
 `mapper = require(.../staticFit.js).StaticFit;` from `index.js` in the current project contains the correct path.
 * [`sgwm.module.js`](https://github.com/uta-gasp/sgwm/blob/master/build/sgwm.module.js) from SGWM project. Download the file and ensure that 
 `SGWM = require(.../sgwm.module.js);` from `index.js` in the current project contains the correct path.

## Data preparation

Data should be placed into the ./data folder within the project directory. Expected data folder structure:

    data/
        NAME/
            AOIfixs/
                PID_SID.PNG.txt     // PID = participant ID, SID = stimuli ID
                ...
            stimuli/
                AOIlistAll.txt

Distorted data should be grouped in folders inside `AOIfixs/` folder:

    data/
        NAME/
            AOIfixs/
                bPincushion0.00/
                    PID_SID.PNG.txt     // PID = participant ID, SID = stimuli ID
                    ...
                ...
            stimuli/
                AOIlistAll.txt

# Run

Run in console:

    node index.js [params]

Parameters:

_run `node index.js` to get a list of available parameters_

For example, when mapping distorted data stored in `./data/wrapped`:

    node index.js source=wrapped distorted
