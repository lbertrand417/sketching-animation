"use strict;"

// Import libraries
import * as THREE from 'three';
import { ObjectSpaceNormalMap, Scene, Vector3 } from 'three';
import { loadScene, updatePath, fromLocalToGlobal, project3D, getRandomInt, addSelectedObject } from './utils.js';

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
        global.animation.startTime = new Date().getTime() - (timeline.min);
    } else {
        global.animation.startTime = new Date().getTime() - parseInt(timeline.value);
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

let timeline = document.getElementById("timeline");

// COMMANDS
const drawButton = document.getElementById("draw");
drawButton.addEventListener("click", drawingCanvas);

const pasteButton = document.getElementById("paste");
pasteButton.addEventListener("click", pastePath);

const timingButton = document.getElementById("timingoffset");
timingButton.addEventListener("click", offsetTiming);

const orientationButton = document.getElementById("orientationoffset");
orientationButton.addEventListener("click", offsetOrientation);

const selectButton = document.getElementById("select");
selectButton.addEventListener("click", autoSelect);

// Display/Undisplay the 2D canvas when clicking on the Draw button
function drawingCanvas(e) {
    if(selectedObjects.length > 0) {
        console.log("drawing Canvas");
        if(canvas.style.display == "none") {
            canvas2D.style.display = "block";
            drawButton.innerText = "Move camera";
        } else {
            canvas2D.style.display = "none";
            drawButton.innerText = "Draw";
        }
    }
}


function pastePath(e) {
    console.log('paste');
    for(let k = 1; k < selectedObjects.length; k++) {
            // Paste information of the selected object
            selectedObjects[k].path.positions = [];
            selectedObjects[k].path.timings = [...selectedObjects[0].path.timings];
            selectedObjects[k].path.startTime = selectedObjects[0].path.startTime; // Bug
            selectedObjects[k].path.index = selectedObjects[0].path.index;

            // Put positions in local space
            for(let i = 0; i < selectedObjects[0].path.positions.length; i++) {
                // Retrieve local position (wrt root of original object)
                let localPos = selectedObjects[0].path.positions[i].clone();

                // Scale
                let scale = selectedObjects[k].height / selectedObjects[0].height;

                localPos.multiplyScalar(scale);
                selectedObjects[k].path.positions.push(localPos); 
            }

        // Print 3D path
        if(selectedObjects[k].path.positions.length != 0) {
            console.log("print");
            let globalPos = fromLocalToGlobal(selectedObjects[k].path.positions, selectedObjects[k].bones[0])
            selectedObjects[k].display.path.geometry = new THREE.BufferGeometry().setFromPoints(globalPos);
        }
    }
}

function offsetTiming(event) {
    for(let k = 0; k < selectedObjects.length; k++) {
        let randomOffset = getRandomInt(0, selectedObjects[k].path.timings[selectedObjects[k].path.timings.length - 1]);
        selectedObjects[k].path.timings = selectedObjects[k].path.timings.map( function(value) { 
            return value + randomOffset; 
        } );
    }

    if (selectedObjects.length != 0) {
        timeline.min = selectedObjects[0].path.timings[0];
        timeline.max = selectedObjects[0].path.timings[selectedObjects[0].path.timings.length - 1];
    }
}

function offsetOrientation(event) {
    for(let k = 0; k < selectedObjects.length; k++) {
        let randomOffset = Math.random() * Math.PI * 2;

        let length = (selectedObjects[k].path.positions.length - 1) / 2 + 1;
        for(let i = 0; i < selectedObjects[k].path.positions.length ; i++) {
            let localPos = selectedObjects[k].path.positions[i].clone();
            localPos.applyAxisAngle(selectedObjects[k].restAxis, randomOffset );
            selectedObjects[k].path.positions[i] = localPos;
        }

        let globalPos = fromLocalToGlobal(selectedObjects[k].path.positions, selectedObjects[k].bones[0]);
        selectedObjects[k].display.path.geometry = new THREE.BufferGeometry().setFromPoints(globalPos);
    }
}

function autoSelect(event) {
    console.log("auto select");
    for(let k = 0; k < objects.length; k++) {
        addSelectedObject(objects[k].display.effector, false);
    }
}

// DISPLAY
const rootButton = document.getElementById("root");
rootButton.addEventListener("click", () => {
    console.log("display");
    for(let k = 0; k < objects.length; k++) {
        objects[k].display.root.visible = !objects[k].display.root.visible ;
    }
});

const effectorButton = document.getElementById("effector");
effectorButton.addEventListener("click", () => {
    console.log("display");
    for(let k = 0; k < objects.length; k++) {
        objects[k].display.effector.visible = !objects[k].display.effector.visible ;
    }
});

const linksButton = document.getElementById("links");
linksButton.addEventListener("click", () => {
    console.log("display");
    for(let k = 0; k < objects.length; k++) {
        for(let i = 0; i < objects[k].display.links.length; i++) {
            objects[k].display.links[i].visible = !objects[k].display.links[i].visible;
        }
    }
});

const bonesButton = document.getElementById("bones");
bonesButton.addEventListener("click", () => {
    console.log("display");
    for(let k = 0; k < objects.length; k++) {
        objects[k].display.skeleton.visible = !objects[k].display.skeleton.visible;
    }
});

const axesHelperButton = document.getElementById("axes");
axesHelperButton.addEventListener("click", () => {
    console.log("display");
    for(let k = 0; k < objects.length; k++) {
        for(let i = 0; i < objects[k].display.axes.length; i++) {
            objects[k].display.axes[i].visible = !objects[k].display.axes[i].visible;
        }
    }
});

const pathButton = document.getElementById("path");
pathButton.addEventListener("click", () => {
    console.log("display");
    for(let k = 0; k < objects.length; k++) {
        objects[k].display.path.visible = !objects[k].display.path.visible;
        objects[k].display.timing.visible = !objects[k].display.timing.visible;
    }
});

// SCENES
const scene1Button = document.getElementById("scene1");
scene1Button.addEventListener("click", () => {
    console.log("Scene 1");
    loadScene(1);
});

const scene2Button = document.getElementById("scene2");
scene2Button.addEventListener("click", () => {
    console.log("Scene 2");
    loadScene(2);
});

const scene3Button = document.getElementById("scene3");
scene3Button.addEventListener("click", () => {
    console.log("Scene 3");
    loadScene(3);
});

const scene4Button = document.getElementById("scene4");
scene4Button.addEventListener("click", () => {
    console.log("Scene 4");
    loadScene(4);
});


// CANVAS
window.addEventListener('resize', resize);
canvas2D.addEventListener('mousemove', draw);
canvas2D.addEventListener('mousedown', setPosition);
canvas2D.addEventListener('mouseup', updateScene);
canvas2D.style.display = "none";

// Resize window
function resize(e) {
    console.log("resize");
    ctx.canvas.width = window.innerWidth;
    ctx.canvas.height = window.innerHeight;
    global.renderer.setSize(window.innerWidth, window.innerHeight);
}

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
        for (let k = 0; k < objects.length; k++) {
            objects[k].path.index = null;
        }

        let rect = canvas2D.getBoundingClientRect();
        pos.x = e.clientX - rect.left;
        pos.y = e.clientY - rect.top;
    }
    if (!global.sketch.isClean) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        global.sketch.positions = [];
        //global.sketch.tangents = [];
        global.sketch.timings = [];
        global.sketch.isClean = true;
    }

    let p =  new THREE.Vector3(); // une position du plan
    p.setFromMatrixPosition(selectedObjects[0].bones[selectedObjects[0].bones.length - 1].matrixWorld);
    let pI = project3D(e, canvas2D, p);
    selectedObjects[0].bones[0].worldToLocal(pI);

    global.sketch.positions.push(pI);
    global.sketch.timings.push(new Date().getTime() - refTime);
}

function updateScene(e) {
    global.sketch.isClean = false;
    
    updatePath();

    ctx.clearRect(0, 0, canvas2D.width, canvas2D.height); // Clear the 2D canvas
}

