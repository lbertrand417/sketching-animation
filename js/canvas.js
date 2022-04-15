"use strict;"

// Import libraries
import * as THREE from 'three';
import { ObjectSpaceNormalMap } from 'three';
import { updatePath, project3D, getRandomInt, addSelectedObject } from './utils.js';

// SKETCH CANVAS
let refTime = new Date().getTime(); // Time when we start drawing the line
let pos = { x: 0, y: 0 }; // last known position
let mouse = {x: 0, y: 0}; // mouse position

let canvas2D = document.getElementById('canvas'); // 2D sketch canvas
canvas2D.width = window.innerWidth;
canvas2D.height = window.innerHeight;
let ctx = canvas2D.getContext('2d');


window.addEventListener('resize', resize);
canvas2D.addEventListener('mousemove', draw);
canvas2D.addEventListener('mousedown', setPosition);
canvas2D.addEventListener('mouseup', updateScene);
canvas2D.style.display = "none";

const drawButton = document.getElementById("draw");
drawButton.addEventListener("click", drawingCanvas);

const pasteButton = document.getElementById("paste");
pasteButton.addEventListener("click", pastePath);

const offsetButton = document.getElementById("offset");
offsetButton.addEventListener("click", offsetTiming);

const selectButton = document.getElementById("select");
selectButton.addEventListener("click", autoSelect);

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
    const pI = project3D(e, canvas2D, p);

    global.sketch.positions.push(pI);
    global.sketch.timings.push(new Date().getTime() - refTime);
}

function updateScene(e) {
    global.sketch.isClean = false;
    
    updatePath();

    ctx.clearRect(0, 0, canvas2D.width, canvas2D.height); // Clear the 2D canvas
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

// Resize window
function resize(e) {
    console.log("resize");
    ctx.canvas.width = window.innerWidth;
    ctx.canvas.height = window.innerHeight;
    global.renderer.setSize(window.innerWidth, window.innerHeight);
}

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

            console.log(selectedObjects[0].path.positions.length)
            // Put positions in local space
            for(let i = 0; i < selectedObjects[0].path.positions.length; i++) {
                let rootPos = new THREE.Vector3();
                let rootQ = new THREE.Quaternion();
                let invRootQ = new THREE.Quaternion();
                let rootScale = new THREE.Vector3();

                // Retrieve local position (wrt root of original object)
                let localPos = selectedObjects[0].path.positions[i].clone();
                selectedObjects[0].bones[0].worldToLocal(localPos); // Converts to local point info (local info equal for both objects)
                selectedObjects[k].path.positions.push(selectedObjects[k].bones[0].localToWorld(localPos)); // Put it back to global world
            }

        // Print 3D path
        if(selectedObjects[k].path.positions.length != 0) {
            console.log("print");
            selectedObjects[k].display.path.geometry = new THREE.BufferGeometry().setFromPoints(selectedObjects[k].path.positions);
        }
    }
}

function offsetTiming(event) {
    for(let k = 0; k < selectedObjects.length; k++) {
        console.log(selectedObjects[k].path.timings);
        let randomOffset = getRandomInt(0, 700);
        console.log(randomOffset);
        selectedObjects[k].path.timings = selectedObjects[k].path.timings.map( function(value) { 
            return value + randomOffset; 
        } );
        console.log(selectedObjects[k].path.timings);
    }

    if (selectedObjects.length != 0) {
        timeline.min = selectedObjects[0].path.timings[0];
        timeline.max = selectedObjects[0].path.timings[selectedObjects[0].path.timings.length - 1];
    }
}

function autoSelect(event) {
    console.log("auto select");
    for(let k = 0; k < objects.length; k++) {
        addSelectedObject(objects[k].display.effector, false);
    }
}
