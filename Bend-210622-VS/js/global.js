"use strict;"

/*var materials = {
    unselected : new THREE.MeshPhongMaterial( { color: 0xeb4034, transparent : true, opacity : 0.8 }),
    selected : new THREE.MeshPhongMaterial( { color: 0x28faa4, transparent : true, opacity : 0.8 }),
    selectedBis : new THREE.MeshPhongMaterial( { color: 0x1246bf }),
    effector : new THREE.MeshBasicMaterial( {
        color: new THREE.Color( 0x88ff88 ),
        depthTest: false,
        depthWrite: false,
        transparent: true
    } ),
    links : new THREE.MeshBasicMaterial( {
        color: new THREE.Color( 0x8888ff ),
        depthTest: false,
        depthWrite: false,
        transparent: true
    } ),
    root : new THREE.MeshBasicMaterial( {
        color: new THREE.Color( 0xff8888 ),
        depthTest: false,
        depthWrite: false,
        transparent: true
    } ),
    unselectedpath : new THREE.LineBasicMaterial( { color: 0x0000ff }),
    timing : new THREE.PointsMaterial({ color: 0xff0000, size: 2 })
};*/


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

var parent = null; // Parent mesh

var materials;

// Store selected objects
var selectableObjects = []
var selectedObjects = [];

var targets = [];

var param = 0;

