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

// Store all objects with their info
var objects = [];

// Store selected objects
var selectedObjects = [];