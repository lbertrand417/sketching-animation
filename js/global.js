"use strict;"

var global = {
    camera : null,
    renderer : null,
    scene : null,
    sketch : {
        isClean : true,
        positions: [],
        //tangents: [],
        timings: [],
        root: null,
        mesh : null
    },
    animation : {
        isAnimating : false,
        starTime : new Date().getTime(),
        stop : false,
        maxTimeline : 100,
    },
};

// Store mesh info
var objects = []; // Details
var parent = null; // Parent mesh

var materials;

// Store selectionable effectors
var effectors = [];

// Store selected objects
var selectedObjects = [];

