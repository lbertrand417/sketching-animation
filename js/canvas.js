"use strict;"

// Import libraries
import * as THREE from 'three';
import { loadScene } from './init.js'
import { updateAnimation, updateTimeline, updateChildren } from './main.js'
import { autoSelect, randomOrientation, targetOrientation, synchronize, randomTiming, paste, deletePath, retrieveObject } from './selection.js'
import { resize, project3D, worldPos, localPos } from './utils.js';
import { retime, getCycles, computeCycle } from './utilsArray.js';
import { GUI } from '../node_modules/dat.gui/build/dat.gui.module.js'
import { MyPath } from './myPath.js';

var settings = {
    root: false,
    links: true,
    axes: false,
    speeds: false,
    rawPath: false,
    cleanedPath: false,
    effectorPath: false,
    path: true,
    scenes: "Test1",
    draw: false,
    cleanPath: false,
    originalPath: originalPath,
    autoGenerate: cycleWithInput,
    autoGenerate2: cycleWithEffector,
    autoSelect: autoSelect,
    paste: paste,
    delete: deletePath,
    randomOrientation: randomOrientation,
    target: targetOrientation,
    sync: synchronize,
    randomTiming: randomTiming,
    curveTiming: false,
    targetVSparam: 2,
    ownVSparam: 2,
    alpha: true,
    theta: false,
    parentVS: false,
    parentVSparam: 25,
    name: "Default",
    save: saveToTXT,
    load: loadFromJSON,
    next: next,
    previous: previous
}

const gui = new GUI()
const sceneFolder = gui.addFolder('Scenes')
sceneFolder.add(settings, 'scenes', [ 'Basic', 'Orientation', 'Scale', 'Bones', 'Anemone', 'Flower', 'Pole', 'Test1', 'Test2', 'Levels' ] )
    .name("Scenes").onChange(function (value) {
    loadScene(value);
});
sceneFolder.add(settings, 'autoSelect').name("Auto Select")
sceneFolder.add(settings, 'paste').name("Paste")
sceneFolder.add(settings, 'delete').name("Delete")
sceneFolder.open();

const pathFolder = gui.addFolder('Path');
pathFolder.add(settings, 'cleanPath').name("Clean Path")
pathFolder.add(settings, 'originalPath').name("Original Path")
pathFolder.add(settings, 'autoGenerate').name("Cycle using input")
pathFolder.add(settings, 'autoGenerate2').name("Cycle using effector")
pathFolder.open()

function originalPath() {
    console.log("hey")
    for(let k = 0; k < selectedObjects.length; k++) {
        selectedObjects[k].path.positions = [...selectedObjects[k].path.cleanPositions];
        selectedObjects[k].path.timings = [...selectedObjects[k].path.cleanTimings];
        // Update cycle display

        // Create a cycle with the path
        let tempT = [...selectedObjects[k].path.timings];
        for (let i = tempT.length - 2; i > 0; i--) {
            selectedObjects[k].path.timings.push(selectedObjects[k].path.timings[selectedObjects[k].path.timings.length - 1] + (tempT[i + 1] - tempT[i]));
            selectedObjects[k].path.positions.push(selectedObjects[k].path.positions[i].clone());
        }

        selectedObjects[k].display.updatePath();
    }
}

function cycleWithInput() {
    for(let k = 0; k < selectedObjects.length; k++) {
        //console.log(selectedObjects[k].path.cleanPositions[0].clone());
        let cycles = getCycles(selectedObjects[k].path.cleanPositions);
        // Update cycle display
        console.log(cycles);
        let cycle = computeCycle(selectedObjects[k].path.cleanPositions, selectedObjects[k].path.cleanTimings, cycles);
        selectedObjects[k].path.positions = cycle.pos;
        selectedObjects[k].path.timings = cycle.t;

        // Create a cycle with the path
        let tempT = [...selectedObjects[k].path.timings];
        for (let i = tempT.length - 2; i > 0; i--) {
            selectedObjects[k].path.timings.push(selectedObjects[k].path.timings[selectedObjects[k].path.timings.length - 1] + (tempT[i + 1] - tempT[i]));
            selectedObjects[k].path.positions.push(selectedObjects[k].path.positions[i].clone());
        }

        selectedObjects[k].display.updatePath();
    }
}

function cycleWithEffector() {
    for(let k = 0; k < selectedObjects.length; k++) {
        let cycles = getCycles(selectedObjects[k].path.effectorPositions);
        // Update cycle display
        console.log(cycles);
        let cycle = computeCycle(selectedObjects[k].path.effectorPositions, selectedObjects[k].path.cleanTimings, cycles);
        selectedObjects[k].path.positions = cycle.pos;
        selectedObjects[k].path.timings = cycle.t;

        // Create a cycle with the path
        let tempT = [...selectedObjects[k].path.timings];
        for (let i = tempT.length - 2; i > 0; i--) {
            selectedObjects[k].path.timings.push(selectedObjects[k].path.timings[selectedObjects[k].path.timings.length - 1] + (tempT[i + 1] - tempT[i]));
            selectedObjects[k].path.positions.push(selectedObjects[k].path.positions[i].clone());
        }

        selectedObjects[k].display.updatePath();
    }
}

const orientationFolder = gui.addFolder('Orientation');
orientationFolder.add(settings, 'randomOrientation').name("Random")
orientationFolder.add(settings, 'target').name("Target")
//orientationFolder.open()

const timingFolder = gui.addFolder('Timing');
timingFolder.add(settings, 'sync').name("Synchronize")
timingFolder.add(settings, 'randomTiming').name("Random");
timingFolder.add(settings, 'curveTiming').name("Curve").onChange(function (value) {
    if (value) {
        settings.draw = false;
        updateGUI(gui);
    }
    drawingCanvas();
})
//timingFolder.open();

const paramFolder = gui.addFolder("Parameters")
paramFolder.add(settings, 'targetVSparam', 0, 10).step(0.1).name("Target VS"); 
paramFolder.add(settings, 'ownVSparam', 0, 10).step(0.1).name("Own VS"); 
paramFolder.add(settings, 'alpha').name("Alpha").onChange(function (value) {
        settings.theta = !value;
        updateGUI(gui);
});
paramFolder.add(settings, 'theta').name("Theta").onChange(function (value) {
    settings.alpha = !value;
    updateGUI(gui);
}); 
paramFolder.add(settings, 'parentVS').name("Activate parent VS").onChange(function (value) {
    if(!value) {
        for (let k = 0; k < objects.length; k++) {
            for(let i = 0; i < objects[k].bones.length; i++) {
                objects[k].bones[i].quaternion.copy(objects[k].lbs[i].quaternion)
            }
        }
    }
}); 
paramFolder.add(settings, 'parentVSparam', 0, 50).step(0.1).name("Parent VS"); 
//paramFolder.open();

const displayFolder = gui.addFolder('Display')
displayFolder.add(settings, 'root').name("Root").onChange(function (value) {
    for(let k = 0; k < objects.length; k++) {
        objects[k].root.visible = value;
    }
}); 
displayFolder.add(settings, 'links').name("Links").onChange(function (value) {
    for(let k = 0; k < objects.length; k++) {
        let visible = Math.ceil(objects[k].links.length / 5);
        for(let i = objects[k].links.length - 1; i >= 0; i-= visible) {
            objects[k].links[i].visible = value;
        }
    }
}); 
displayFolder.add(settings, 'axes').name("Axes helper").onChange(function (value) {
    for(let k = 0; k < objects.length; k++) {
        for(let i = 0; i < objects[k].lengthAxes; i++) {
            objects[k].axesHelpers[i].visible = value;
        }
    }
}); 
displayFolder.add(settings, 'speeds').name("Speeds").onChange(function (value) {
    for(let k = 0; k < objects.length; k++) {
        for(let i = 0; i < objects[k].lengthLinks; i++) {
            objects[k].speedDisplay[i].visible = value;
        }
        objects[k].axisDisplay.visible = value;
    }
}); 
displayFolder.add(settings, 'rawPath').name("Raw Path").onChange(function (value) {
    for(let k = 0; k < objects.length; k++) {
        objects[k].display.rawPath.visible = value;
    }
}); 
displayFolder.add(settings, 'cleanedPath').name("Clean Path").onChange(function (value) {
    for(let k = 0; k < objects.length; k++) {
        objects[k].display.cleanPath.visible = value;
    }
}); 
displayFolder.add(settings, 'effectorPath').name("Raw Effector Path").onChange(function (value) {
    for(let k = 0; k < objects.length; k++) {
        objects[k].display.effectorPath.visible = value;
    }
}); 
displayFolder.add(settings, 'path').name("Path").onChange(function (value) {
    for(let k = 0; k < objects.length; k++) {
        objects[k].pathDisplay.visible = value;
        objects[k].timingDisplay.visible = value;
    }
}); 

const downloadFolder = gui.addFolder('File');
downloadFolder.add(settings, 'name').name("Name")
downloadFolder.add(settings, 'save').name("Download");
downloadFolder.add(settings, "load").name("Load");
downloadFolder.add(settings, "next").name("Next");
//downloadFolder.add(settings, "previous").name("Previous");
downloadFolder.open();

function updateGUI (targetGui)
{
    for (let i in targetGui.__folders) {
        let subGui = targetGui.__folders[i];
        for (let j in subGui.__controllers) {
            subGui.__controllers[j].updateDisplay();
        }
    }
}


async function loadFromJSON() {
    let name = settings.name + "_" + settings.scenes;

    await fetch('./tests/' + name + "_positions.txt")
    .then(response => { return response.json(); })
    .then(data => {
        // Work with JSON data here
        console.log(data[0]);
        console.log(data.length)
        savePathPositions = []
        for(let i = 0; i < data.length; i++) {
            let path = []
            for(let j = 0; j < data[i].length; j++) {
                path.push(new THREE.Vector3(data[i][j]['x'], data[i][j]['y'], data[i][j]['z']));
            }
            savePathPositions.push(path);
        }
        //savePathPositions = data;
    }).catch(err => {
        // Do something for an error here
        console.log("One setting might be wrong");
        console.log("Name", settings.name);
        console.log("Scene", settings.scenes);
        console.log(err);
    });

    await fetch('./tests/' + name + "_timings.txt")
    .then(response => { return response.json(); })
    .then(data => {
        // Work with JSON data here
        console.log(data);
        savePathTimings = data;
    }).catch(err => {
        // Do something for an error here
        console.log("One setting might be wrong");
        console.log("Name", settings.name);
        console.log("Scene", settings.scenes);
        console.log(err);
    });

    await fetch('./tests/' + name + "_history.txt")
    .then(response => { return response.json(); })
    .then(data => {
        // Work with JSON data here
        console.log(data);
        saveHistory = data;
    }).catch(err => {
        // Do something for an error here
        console.log("One setting might be wrong");
        console.log("Name", settings.name);
        console.log("Scene", settings.scenes);
        console.log(err);
    });

    if (saveHistory.length != 0) {
        indexHistory = -1;
        indexPath = -1;
        next();        
    }
  
}

function saveToTXT() {
    // TODO Add index of objects + name of the scene
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(savePathPositions, null, 2)], {
        type: "text/plain"
    }));
    a.setAttribute("download", settings.name + "_" + settings.scenes + "_positions.txt");
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    const b = document.createElement("a");
    b.href = URL.createObjectURL(new Blob([JSON.stringify(savePathTimings, null, 2)], {
        type: "text/plain"
    }));
    b.setAttribute("download", settings.name + "_" + settings.scenes + "_timings.txt");
    document.body.appendChild(b);
    b.click();
    document.body.removeChild(b);

    const c = document.createElement("a");
    c.href = URL.createObjectURL(new Blob([JSON.stringify(saveHistory, null, 2)], {
        type: "text/plain"
    }));
    c.setAttribute("download", settings.name + "_" + settings.scenes + "_history.txt");
    document.body.appendChild(c);
    c.click();
    document.body.removeChild(c);
}

function next() {
    if (indexHistory < saveHistory.length - 1) {
        indexHistory += 1;

        let state = saveHistory[indexHistory];
        console.log(state)
        let action = Object.keys(state)[0];
        
        if(action == "path") {
            indexPath += 1;

            let objectIndex = state["path"]["objectIndex"];

            objects[objectIndex].effector = state["path"]["linkIndex"];

            let positions = savePathPositions[indexPath];
            let timings = savePathTimings[indexPath];
            objects[objectIndex].path.update(positions, timings)
            objects[objectIndex].display.updatePath();
        }

        if (action == "paste") {
            let objectsToPaste = state["paste"];

            // Retrieve path to paste (= path of the first selected object)
            let orig = objectsToPaste[0].objectIndex;
            console.log('orig', orig);
            let effectorIndex = objectsToPaste[0].linkIndex; // Not the same for each object
            let origPath = new MyPath();

            let subPathIndex = 0;
            for(let i = 0; i < indexHistory; i++) {
                let subState = saveHistory[i];
                let subAction = Object.keys(subState)[0];
                if(subAction == "path") {
                    console.log(subState["path"]);
                    if(subState["path"]["objectIndex"] == orig) {
                        origPath.effector = subState["path"]["linkIndex"];
                        let positions = savePathPositions[subPathIndex];
                        let timings = savePathTimings[subPathIndex];
                        origPath.update(positions, timings);
                    } 
                    subPathIndex += 1;
                }
            }

            // Paste the path to other selected objects
            for(let i = 1; i < objectsToPaste.length; i++) {
                let scale = objects[objectsToPaste[i].objectIndex].height / objects[orig].height; // scale
                objects[objectsToPaste[i].objectIndex].effector = objectsToPaste[i].linkIndex;

                objects[objectsToPaste[i].objectIndex].path.paste(origPath, scale);
                objects[objectsToPaste[i].objectIndex].display.updatePath();
            }
        }

        if (action == "delete") {
            let pathToDelete = state["delete"];

            for(let k = 0; k < pathToDelete.length; k++) {
                let objectIndex = pathToDelete[k].objectIndex;

                objects[objectIndex].path.positions = [];
                objects[objectIndex].path.timings = [];
        
                for(let i = 1; i < objects[objectIndex].bones.length; i++) {
                    let boneQ = objects[objectIndex].restBones[i].quaternion.clone();
                    objects[objectIndex].bones[i].quaternion.copy(boneQ);
                    objects[objectIndex].lbs[i].quaternion.copy(boneQ);
        
                    objects[objectIndex].bones[i].updateWorldMatrix(false, false)
                    objects[objectIndex].lbs[i].updateWorldMatrix(false, false)
        
                    updateChildren(objects[objectIndex], new THREE.Vector3())
                }
        
                objects[objectIndex].display.updatePath();
                objects[objectIndex].display.updateLinks();
            }

        }
    }
}

function previous() {
    if (indexHistory > 0) {
        indexHistory -= 1;
        let state = saveHistory[indexHistory];
        let action = Object.keys(state)[0];
        if (action == "path") {
            indexPath -= 1;
        }
    }
}


// SKETCH CANVAS
let refTime = new Date().getTime(); // Time when we start drawing the line
let pos = { x: 0, y: 0 }; // last known position

let canvas2D = document.getElementById('canvas'); // 2D sketch canvas
canvas2D.width = window.innerWidth;
canvas2D.height = window.innerHeight;
let ctx = canvas2D.getContext('2d');

// TIMELINE
const playButton = document.getElementById("play");
playButton.addEventListener("click", () => {
    global.animation.isAnimating = true;
    if(global.animation.stop) {
        global.animation.currentTime = parseInt(timeline.min);
    } 
});

const pauseButton = document.getElementById("pause");
pauseButton.addEventListener("click", () => {
    global.animation.isAnimating = false;
    global.animation.stop = false;
});

const stopButton = document.getElementById("stop");
stopButton.addEventListener("click", () => {
    global.animation.isAnimating = false;
    global.animation.stop = true;
});

// Update animation when moving the timeline
var timeline = document.getElementById("timeline");
timeline.oninput = function() {
    console.log('timeline', this.value)
    global.animation.currentTime = parseInt(this.value); // Faux: ajouter à current time la diff entre previous et next timeline??
    updateAnimation(parseInt(this.value), root);

    for (let k = 0; k < objects.length; k++) {
        objects[k].display.updateLinks();
        objects[k].display.updatePath();
        objects[k].display.updateTiming();
    }
} 


// Display/Undisplay the 2D canvas when clicking on the Draw button
function drawingCanvas(e) {
    //if(selectedObjects.length > 0) {
        console.log("drawing Canvas");
        if(settings.draw || settings.curveTiming) {
            canvas2D.style.display = "block";
        } else {
            canvas2D.style.display = "none";
        }
    //}
}



// CANVAS
window.addEventListener('resize', resize);
canvas2D.addEventListener('mousemove', draw);
canvas2D.addEventListener('mousedown', setPosition);
canvas2D.addEventListener('mouseup', updateScene);
canvas2D.style.display = "none";

// Draw a line in 2D canvas
function draw(e) {
    // mouse left button must be pressed
    if (e.buttons !== 1) return;

    ctx.beginPath(); // begin

    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#c0392b';

    ctx.moveTo(pos.x, pos.y); // from
    setPosition(e);

    let rect = canvas2D.getBoundingClientRect();
    pos.x = e.clientX - rect.left;
    pos.y = e.clientY - rect.top;
    ctx.lineTo(pos.x, pos.y); // to

    ctx.stroke(); // draw it!
}

function setPosition(e) {
    if(e.type == "mousedown") {
        refTime = new Date().getTime();
        global.animation.isAnimating = false;

        let rect = canvas2D.getBoundingClientRect();
        pos.x = e.clientX - rect.left;
        pos.y = e.clientY - rect.top;
    }
    if (!global.sketch.isClean) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        global.sketch.positions = [];
        global.sketch.timings = [];
        global.sketch.isClean = true;
    }

    let pI;
    if(settings.curveTiming || selectedObjects.length == 0) {
        pI = project3D(e, canvas2D, new THREE.Vector3());
    } else {
        let p = selectedObjects[0].bones[selectedObjects[0].path.effector + 1].position.clone();
        p = worldPos(p, selectedObjects[0], selectedObjects[0].bones, selectedObjects[0].path.effector);
        pI = project3D(e, canvas2D, p);
        pI = localPos(pI.clone(), selectedObjects[0], selectedObjects[0].bones, 0);
    }
    

    global.sketch.positions.push(pI);
    global.sketch.timings.push(new Date().getTime() - refTime);
}

function updateScene(e) {
    global.sketch.isClean = false;
    
    if(settings.curveTiming) {
        let retimed = retime(global.sketch.timings, global.sketch.positions);

        for (let k = 0; k < selectedObjects.length; k++) {
            let effector = selectedObjects[k].bones[selectedObjects[k].path.effector + 1].position.clone();
            effector = worldPos(effector, selectedObjects[k], selectedObjects[k].bones, selectedObjects[k].path.effector);
            let d = Infinity;
            let closestId = 0;
            for(let i = 0; i < retimed.tempPos.length; i++) {
                let new_d = effector.distanceTo(retimed.tempPos[i]);
                if (new_d < d) {
                    closestId = i;
                    d = new_d;
                }
            }
            console.log('id', closestId)
            let timingoffset = retimed.tempT[closestId];

            console.log('old timings', selectedObjects[k].path.timings)
            selectedObjects[k].path.offsetTiming(timingoffset);
            console.log('new timings', selectedObjects[k].path.timings)

            drawingCanvas();
        }
    } else {
        if (selectedObjects.length > 0) {
            let indexes = retrieveObject(selectedObjects[0].links[selectedObjects[0].effector]);
            saveHistory.push({"path": indexes})
            selectedObjects[0].path.update(global.sketch.positions, global.sketch.timings);

            // Display path
            selectedObjects[0].display.updatePath(); 
        }
    }

    // Update timeline 
    updateTimeline();

    // Start animation
    global.animation.isAnimating = true;
    global.animation.startTime = new Date().getTime();

    // find closest effector

    ctx.clearRect(0, 0, canvas2D.width, canvas2D.height); // Clear the 2D canvas
}

export { settings }