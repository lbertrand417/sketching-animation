"use strict;"

import * as THREE from 'three';
import { updateChildren } from './main.js'
import { settings } from './gui.js'
import { select } from './selection.js'

/**
 * Load the animation info from a txt file.
 * Files should be placed in the "test" folder. There should be 3 files:
 * 
 * "name_scene_positions.txt",
 * "name_scene_timings.txt",
 * "name_scene_history.txt"
 * 
 * name is written in the gui.
 * scene is the name of the open scene.
 * 
 * NOTE: It could be interesting to work with JSON files too.
 */
async function loadFromTXT() {
    let name = settings.name + "_" + settings.scenes;

    // --------------- Retrieve position data ---------------
    await fetch('./tests/' + name + "_positions.txt")
    .then(response => { return response.json(); })
    .then(data => {
        // Store the data in the position's historic array
        savePathPositions = []
        for(let i = 0; i < data.length; i++) {
            let path = []
            for(let j = 0; j < data[i].length; j++) {
                path.push(new THREE.Vector3(data[i][j]['x'], data[i][j]['y'], data[i][j]['z']));
            }
            savePathPositions.push(path);
        }
    }).catch(err => {
        console.log("One setting might be wrong");
        console.log("Name", settings.name);
        console.log("Scene", settings.scenes);
        console.log(err);
    });

    // --------------- Retrieve timing data --------------- 
    await fetch('./tests/' + name + "_timings.txt")
    .then(response => { return response.json(); })
    .then(data => {
        // Store the data in the timing's historic array
        savePathTimings = data;
    }).catch(err => {
        console.log("One setting might be wrong");
        console.log("Name", settings.name);
        console.log("Scene", settings.scenes);
        console.log(err);
    });

    // --------------- Retrieve historic data --------------- 
    await fetch('./tests/' + name + "_history.txt")
    .then(response => { return response.json(); })
    .then(data => {
        // Store the data in the action's historic array
        saveHistoric = data;
    }).catch(err => {
        console.log("One setting might be wrong");
        console.log("Name", settings.name);
        console.log("Scene", settings.scenes);
        console.log(err);
    });

    // ---------------------------------------------

    // Show the first action stored in the file
    if (saveHistoric.length != 0) {
        indexHistoric = -1;
        indexPath = -1;
        next();        
    }
  
}

/**
 * Download the file with the historic action of the CURRENT scene.
 * Three files are dowloaded:
 * 
 * "name_scene_positions.txt": Store the positions of each drawn path
 * 
 * "name_scene_timings.txt": Store the timngs of each drawn path
 * 
 * "name_scene_history.txt": Store the actions (path, paste, delete) done by the user
 * 
 * name is what's written in the gui.
 * scene is the name of the open scene
 * 
 * The files can be found in the download folder of the computer. They must be put in the test folder
 * of the project to be opened.
 */
function saveToTXT() {
    // Create, fill and download the file with positions
    const a = document.createElement("a"); // Create
    a.href = URL.createObjectURL(new Blob([JSON.stringify(savePathPositions, null, 2)], {
        type: "text/plain"
    })); // Fill
    a.setAttribute("download", settings.name + "_" + settings.scenes + "_positions.txt");
    document.body.appendChild(a);
    a.click(); // Download
    document.body.removeChild(a);

    // Create, fill and download the file with timings
    const b = document.createElement("a");
    b.href = URL.createObjectURL(new Blob([JSON.stringify(savePathTimings, null, 2)], {
        type: "text/plain"
    }));
    b.setAttribute("download", settings.name + "_" + settings.scenes + "_timings.txt");
    document.body.appendChild(b);
    b.click();
    document.body.removeChild(b);

    // Create, fill and download the file with actions
    const c = document.createElement("a");
    c.href = URL.createObjectURL(new Blob([JSON.stringify(saveHistoric, null, 2)], {
        type: "text/plain"
    }));
    c.setAttribute("download", settings.name + "_" + settings.scenes + "_history.txt");
    document.body.appendChild(c);
    c.click();
    document.body.removeChild(c);
}

/**
 * Go through the historic and apply the next action of the loaded file.
 */
function next() {
    if (indexHistoric < saveHistoric.length - 1) {
        indexHistoric += 1;

        // Retrieve the action
        let state = saveHistoric[indexHistoric];
        let action = Object.keys(state)[0];
        
        // --------------- Drawing a path action ---------------
        if(action == "path") {
            indexPath += 1;

            // Retrieve the object whose path has been drawn
            let objectIndex = state["path"]["objectIndex"];

            // Retrieve its effector
            objects[objectIndex].effector = state["path"]["linkIndex"];
            select(objectIndex, state["path"]["linkIndex"]); // Display the object and the effector

            // Retrieve path info and update the object's path
            let positions = savePathPositions[indexPath];
            let timings = savePathTimings[indexPath];
            objects[objectIndex].path.update(positions, timings)

            // Update display
            objects[objectIndex].display.updatePath();
            objects[objectIndex].display.updateLinks();
            objects[objectIndex].display.updateTiming();  
        }

        // --------------- Paste action --------------- 
        if (action == "paste") {
            // Retrieve objects selected when pasting (the first object is the referent object and we paste on next objects)
            let objectsToPaste = state["paste"];
            let origPath = objects[objectsToPaste[0].objectIndex].path; // path of the referent object

            // Paste the path to other selected objects
            for(let i = 1; i < objectsToPaste.length; i++) {
                // Scale the path to fit object size
                let scale = objects[objectsToPaste[i].objectIndex].height / objects[objectsToPaste[0].objectIndex].height; 
                objects[objectsToPaste[i].objectIndex].effector = objectsToPaste[i].linkIndex; // Retrieve effector
                select(objectsToPaste[i].objectIndex, objectsToPaste[i].linkIndex); // Display the object and the effector

                // Paste the path
                objects[objectsToPaste[i].objectIndex].path.paste(origPath, scale);

                // Update display
                objects[objectsToPaste[i].objectIndex].display.updatePath();
                objects[objectsToPaste[i].objectIndex].display.updateLinks();
                objects[objectsToPaste[i].objectIndex].display.updateTiming();            
            }
        }

        // --------------- Delete action --------------- 
        if (action == "delete") {
            // Retrieve the paths to delete
            let pathToDelete = state["delete"];

            for(let k = 0; k < pathToDelete.length; k++) {
                let objectIndex = pathToDelete[k].objectIndex; // Object index whose path is deleted

                // Delete
                // TODO: deselect objects
                objects[objectIndex].path.delete();
            }

        }
    }
}

export { loadFromTXT, saveToTXT, next };