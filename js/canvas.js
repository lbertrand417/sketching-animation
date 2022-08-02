"use strict;"

// Import libraries
import * as THREE from 'three';
import { loadScene } from './init.js'
import { updateAnimation, updateTimeline, updateChildren } from './main.js'
import { autoSelect, randomOrientation, targetOrientation, synchronize, randomTiming, paste, deletePath, retrieveObject } from './selection.js'
import { resize, project3D, worldPos, localPos, retime, reverse } from './utils.js';
import { GUI } from '../node_modules/dat.gui/build/dat.gui.module.js'
import { MyPath } from './myPath.js';

var settings = {
    root: false,
    links: true,
    axes: false,
    speeds: false,
    path: true,
    scenes: "Test1",
    draw: false,
    cleanPath: false,
    autoSelect: autoSelect,
    paste: paste,
    delete: deletePath,
    randomOrientation: randomOrientation,
    target: targetOrientation,
    sync: synchronize,
    randomTiming: randomTiming,
    curveTiming: false,
    targetVSparam: 2,
    //ownVSparam: 5,
    ownVSparam: 3,
    //parentVSparam: 25,
    parentVS: false,
    parentVSparam: 25,
    reverse: reverse,
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
    switch (value) {
        case "Basic":
            loadScene(5);
            break;
        case "Orientation":
            loadScene(1);
            break;
        case "Scale":
            loadScene(3);
            break;
        case "Bones":
            loadScene(4);
            break;
        case "Anemone":
            loadScene(2);
            break;
        case "Flower":
            loadScene(6);
            break;
        case "Pole":
            loadScene(7);
            break;
        case "Test1":
            loadScene(8);
            break;
        case "Test2":
            loadScene(9);
            break;
        case "Levels":
            loadScene(10);
            break;
        default:
            break;
    }
});
/*sceneFolder.add(settings, 'draw').name("Draw").onChange(function (value) {
    if (value) {
        settings.curveTiming = false;
        updateGUI(gui);
    }
    drawingCanvas()
});*/
sceneFolder.add(settings, 'cleanPath').name("Clean Path")
sceneFolder.add(settings, 'autoSelect').name("Auto Select")
sceneFolder.add(settings, 'paste').name("Paste")
sceneFolder.add(settings, 'delete').name("Delete")
sceneFolder.open();

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
paramFolder.add(settings, 'reverse').name('Reverse')
//paramFolder.open();

const displayFolder = gui.addFolder('Display')
displayFolder.add(settings, 'root').name("Root").onChange(function (value) {
    for(let k = 0; k < objects.length; k++) {
        objects[k].root.visible = settings.root;
    }
}); 
displayFolder.add(settings, 'links').name("Links").onChange(function (value) {
    for(let k = 0; k < objects.length; k++) {
        let visible = Math.ceil(objects[k].links.length / 5);
        for(let i = objects[k].links.length - 1; i >= 0; i-= visible) {
            objects[k].links[i].visible = settings.links;
        }
    }
}); 
displayFolder.add(settings, 'axes').name("Axes helper").onChange(function (value) {
    for(let k = 0; k < objects.length; k++) {
        for(let i = 0; i < objects[k].lengthAxes; i++) {
            objects[k].axesHelpers[i].visible = settings.axes;
        }
    }
}); 
displayFolder.add(settings, 'speeds').name("Speeds").onChange(function (value) {
    for(let k = 0; k < objects.length; k++) {
        for(let i = 0; i < objects[k].lengthLinks; i++) {
            objects[k].speedDisplay[i].visible = settings.speeds;
        }
        objects[k].axisDisplay.visible = settings.speeds;
    }
}); 
displayFolder.add(settings, 'path').name("Path").onChange(function (value) {
    for(let k = 0; k < objects.length; k++) {
        objects[k].pathDisplay.visible = settings.path;
        objects[k].timingDisplay.visible = settings.path;
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
                /*let pos = objects[orig].restBones[effectorIndex + 1].position.clone();
                pos = worldPos(pos, objects[orig], objects[orig].restBones, effectorIndex);
                let distance = objects[orig].distanceToRoot(pos);
                distance = scale * distance;
                objects[objectsToPaste[i].objectIndex].updateEffector(distance);*/

                objects[objectsToPaste[i].objectIndex].path.paste(origPath, scale);
                objects[objectsToPaste[i].objectIndex].display.updatePath();
            }
        }

        if (action == "delete") {
            let pathToDelete = state["delete"];

            for(let k = 0; k < pathToDelete.length; k++) {
                let objectIndex = pathToDelete[k].objectIndex;

                objects[objectIndex].path.positions = [];
                objects[objectIndex].path.VSpositions = [];
                objects[objectIndex].path.timings = [];
        
                for(let i = 1; i < objects[objectIndex].bones.length; i++) {
                    let boneQ = objects[objectIndex].restBones[i].quaternion.clone();
                    //console.log('restPose', bonePos)
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
    updateAnimation(parseInt(this.value));

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