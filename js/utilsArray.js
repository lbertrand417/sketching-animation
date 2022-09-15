"use strict;"

import * as THREE from 'three';
import { MyObject } from './myObject.js';
import { worldPos, interpolate } from './utils.js';

/**
 * Transfer all elements of the array from the local space to the world space
 * @param {Array<THREE.Vector3>} positions - The positions in local space
 * @param {MyObject} object - The object whose space belongs to
 * @param {number} index - The index of the bone the local frame belongs to
 * @returns 
 */
function fromLocalToGlobal(positions, object, index) {
    let globalPos = [];
    for(let i = 0; i < positions.length; i++) {
        let p = positions[i].clone(); // Local position
        let newPos = worldPos(p, object, object.bones, index); // World position
        globalPos.push(newPos);
    }
    return globalPos;
}

/**
 * Resize the curve to a given size. The distance btw each point
 * is constant.
 * @param {Array<THREE.Vector3>} array - Positions of the curve in world frame
 * @param {number} segmentSize - Size btw 2 points in the curve
 */
function resizeCurve(array, segmentSize) {
    for (let i = 1; i < array.length; i++) {
        let diff = array[i].clone().sub(array[i-1]);
        let axis = diff.clone().normalize();
        let distanceOffset = segmentSize - diff.length();

        for (let j = i; j < array.length; j++) {
            array[j].add(axis.clone().multiplyScalar(distanceOffset));
        }
    }
}

// Find closest point in an array (return i st value in [array[i], array[i+1]])
/**
 * Find the place where a value should be placed in a sorted array.
 * @param {number} value - Value we want to insert
 * @param {Array<number>} array - The array we want to insert it in
 * @returns The index of the previous value in the array (array[i] <= value <= array[i+1]) and 
 * a parameter alpha for interpolation purposes.
 * alpha = 0 ==> value = array[i]
 * alpha = 1 ==> value = array[i+1]
 */
function findInArray(value, array) {
    let i = 0;
    let alpha = 0;
    while (i < array.length - 1) {
        if(value >= array[i] && value <= array[i + 1]) {
            alpha = (value - array[i]) / (array[i + 1] - array[i]);
            return { i, alpha };
        } else {
            i++;
        }
    }
    i = array.length - 1;
    return { i, alpha };
}

/**
 * Compute the barycenter
 * @param {Array} array - Array 
 * @returns The barycenter
 */
function barycenter(array) {
    let bar;
    if (array.length != 0 && array[0].isVector3) {
        bar = new THREE.Vector3();
        for(let i = 0; i < array.length; i++) {
            bar.add(array[i]);
        }
        bar.divideScalar(array.length);
    } else {
        bar = 0;
        for(let i = 0; i < array.length; i++) {
            bar += array[i];
        }
        bar /= array.length;
    }

    return bar;
}

/**
 * Retime the timings so that it fits the given timestep (here, 16ms). 
 * Also interpolate the positions to fit the new timings.
 * @param {Array<number>} time - Timings
 * @param {Array<THREE.Vector3>} position - Positions
 * @returns The retimed positions (tempPos) and timings (tempT)
 */
function retime(time, position) {
    let tempPos = [];
    let tempT = [];

    // Find the first timing based on the timings input
    let dt = 16;
    let t = time[0] - (time[0] % 16);
    console.log(t);
    while (t < time[0]) {
        t += dt;
    }

    while (t <= Math.round(time[time.length - 1])) {
        let info = findInArray(t, time);
        if(info.i + 1 < position.length) {
            tempPos.push(interpolate(position[info.i], position[info.i + 1], info.alpha));
        } else {
            tempPos.push(position[info.i]);
        }

        tempT.push(t);
        t += dt;
    }

    return { tempPos, tempT }
}

/**
 * Duplicate and mirror the arrays to build a cyclic trajectory
 * @param {Array<THREE.Vector3>} positions - Positions
 * @param {Array<number>} timings - Timings
 */
function createCycle(positions, timings) {
    let tempT = [...timings];
    for (let i = tempT.length - 2; i > 0; i--) {
        timings.push(timings[timings.length - 1] + (tempT[i + 1] - tempT[i]));
        positions.push(positions[i].clone());
    }
}

export { fromLocalToGlobal, resizeCurve, findInArray, barycenter, retime, createCycle }

