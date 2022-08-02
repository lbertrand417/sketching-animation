"use strict;"
var global = {
    camera : null,
    renderer : null,
    scene : null,
    sketch : {
        isClean : true,
        positions: [],
        timings: [],
        root: null,
        mesh : null
    },
    animation : {
        isAnimating : false,
        currentTime : 0,
        startTime : new Date().getTime(),
        stop : false,
        maxTimeline : 100,
    }
};

// Store mesh info
var objects = []; // All parts of the mesh

var root = null; // Parent mesh

// Store selected objects
var selectableObjects = []
var selectedObjects = [];

var targets = [];

// History
var savePathPositions = [];
var savePathTimings = [];
var saveHistory = [];
var indexHistory = 0;
var indexPath = 0;

var drawingLine;
