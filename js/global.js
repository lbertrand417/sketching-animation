"use strict;"

// WebGL elements
var camera = null
var renderer = null
var scene = null

// Sketching input
var sketch = {
    isClean: true, // TODO: probably removable
    positions: [], 
    timings: [],
    line3D : null // 3D line displayed when drawing
}

// Animation info
var animation = {
    isAnimating : false, // true if animation is playing
    currentTime : 0, // global timing value
    stop : false, // Detect whether it's paused or stopped
}

// Store mesh info
var objects = []; // All parts of the mesh

var root = null; // root object in the hierarchy

// Store selected objects
var selectableLinks = []; // Selectable links 
var selectedObjects = []; // Selected objects

// Array of target points
/* TODO: has to be adapted because rn works only if each object has the main body as its parent.
+ multiple bugs with it (like adding a target with an object wo path*/
var targets = [];

// Historic of actions (those are the info that are downloaded when downloading the files)
var savePathPositions = [];
var savePathTimings = [];
var saveHistoric = []; // Save the name of the action (path, paste, delete) with the corresponding objects and effector
var indexHistoric = 0; // Index used to read the history file
var indexPath = 0; // Index used to read the positions/timings file


