"use strict;"

var global = {
    camera : null,
    renderer : null,
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

const cylinderCount = 5;
const segmentHeight = 50 / 7;
const segmentCount = 7;
const height = segmentHeight * segmentCount;
const halfHeight = height * 0.5;

const sizing = {
    segmentHeight,
    segmentCount,
    height,
    halfHeight
};

// Store all objects with their info
var objects = [];

// Store selected objects
var selectedObjects = [];

