"use strict;"

import * as THREE from 'three';
import { materials } from './materials.js';
import { worldPos, computeAngleAxis } from './utils.js';
import { barycenter, createCycle } from './utilsArray.js';
import { updateAnimation, updateChildren } from './main.js'
import { retrieveObject } from './selection.js'

/**
 * Replace the trajectory with the original (but cleaned) input of the user.
 */
function originalPath() {
    for(let k = 0; k < selectedObjects.length; k++) {
        // Retrieve clean positions and timings
        selectedObjects[k].path.positions = [...selectedObjects[k].path.cleanPositions];
        selectedObjects[k].path.timings = [...selectedObjects[k].path.cleanTimings];

        // Create a cycle with the path
        createCycle(selectedObjects[k].path.positions, selectedObjects[k].path.timings);

        // Update display
        selectedObjects[k].display.updatePath();
    }
}

/**
 * Apply an average filter on positions and timings arrays to reduce noise in the input.
 * @param {Array<THREE.Vector3>} p - Positions
 * @param {Array<number>} t - Timings
 * @param {number} filterSize - Size of the filter
 * @returns Filtered positions (positions) and timings (timings)
 */
function filter(p, t, filterSize) {
    let positions = [];
    let timings = [];
    for(let i = 0; i < p.length; i++) {
        //  Retrieve neighbors' positions
        let subPosArray = p.slice(Math.max(i - filterSize, 0), Math.min(p.length - 1, i + filterSize));

        // Compute mean position
        let posBar = new THREE.Vector3();
        for(let i = 0; i < subPosArray.length; i++) {
            posBar.add(subPosArray[i]);
        }
        posBar.multiplyScalar(1 / subPosArray.length);
        positions.push(posBar);

        // Retrieve neighbors' timings
        let subTimingsArray = t.slice(Math.max(i - filterSize, 0), Math.min(t.length - 1, i + filterSize));

        // Compute mean timing
        let timingBar = 0;
        for(let i = 0; i < subTimingsArray.length; i++) {
            timingBar += subTimingsArray[i];
        }
        timingBar /= subTimingsArray.length;
        timings.push(timingBar);
    }

    return { positions, timings };
}

/**
 * Extract forward/backward curves from a stroke
 * TODO: rn no processing of timings, we take the timings of the curve with max angle
 * @param {Array<THREE.Vector3>} positions - Positions
 * @param {Array<number>} timings - Timings (currently not used)
 * @returns The extracted curves (curves) in the following format:
 * [{"beginning": index of the first point of the curve in positions, 
 * "end": index of the first point of the curve in positions, 
 * "angle": angle btw beginning-rootBone-end, 
 * "axis": normal to the plan formed by beginning-rootBone-end points}]
 */
function extractCurves(positions, timings) {
    const localSize = 5; // Size of the neighborhood 

    let axis = new THREE.Vector3();
    let curves = [];

    let i = 0;
    while(i < positions.length) {
        let angle = - Infinity;
        let leftPosBar = positions[i].clone();

        // Find the closest point which maximize the angle positions[i]-rootBone-positions[j]
        let j = i + 1;
        let notFound = true; // true while we didn't find the next local maxima
        while(j < positions.length && notFound) {
            let rightPosBar = positions[j].clone();

            // Compute angle
            let worldRotation = computeAngleAxis(new THREE.Vector3(), leftPosBar, rightPosBar);

            if (worldRotation.angle > angle) { // If angle is bigger, continue
                angle = worldRotation.angle;
                j++;
            } else { // If angle is smaller

                // Check whether it is the max in its neighborhood 
                let check = true;
                for(let l = j; l < Math.min(j + localSize, positions.length); l++) {
                    let worldRotation = computeAngleAxis(new THREE.Vector3(), leftPosBar, positions[l].clone());
                    if(worldRotation.angle > angle) {
                        check = false;
                    }
                }

                if(check) { // If it is the max, add the curve
                    axis = positions[j - 1].clone().sub(positions[i]);
                    axis.normalize();
                    curves.push({"beginning": i, "end": j - 1, "angle": angle, "axis": axis});
                    angle = - Infinity;
                    i = j;
                    notFound = false;
                } else { // If not, continue
                    j++;
                }
            }
        }

        // Add the last curve
        if(j == positions.length) {
            axis = positions[j - 1].clone().sub(positions[i]);
            axis.normalize();
            curves.push({"beginning": i, "end": j - 1, "angle": angle, "axis": axis});
            i = positions.length;
        }
    }

    return curves;
}

/**
 * Paste the trajectory of the first selected object to other selected ones.
 */
function paste() {
    // Retrieve info to store it in the historic
    let indexesPaste = [];
    let indexes = retrieveObject(selectedObjects[0].links[selectedObjects[0].effector]);
    indexesPaste.push(indexes)

    // Paste the trajectory to all objects
    for (let k = 1; k < selectedObjects.length; k++) {
        let scale = selectedObjects[k].height / selectedObjects[0].height; // Compute the ratio to fit the new object

        // Update the effector in the new object based on the distance to the root
        if (selectedObjects[k].effector != null) {
            selectedObjects[k].linkMaterial(selectedObjects[k].effector, materials.links.clone());
        }
        let pos = selectedObjects[0].restBones[selectedObjects[0].effector + 1].position.clone(); // Local rest position of the effector
        pos = worldPos(pos, selectedObjects[0], selectedObjects[0].restBones, selectedObjects[0].effector); // World rest position
        let distance = selectedObjects[0].distanceToRoot(pos);
        distance = scale * distance;
        selectedObjects[k].updateEffector(distance);
        selectedObjects[k].linkMaterial(selectedObjects[k].effector, materials.effector.clone());

        // Retrieve info to store it in the historic
        let indexes = retrieveObject(selectedObjects[k].links[selectedObjects[k].effector]);
        indexesPaste.push(indexes)
        
        // Paste the trajectory
        selectedObjects[k].path.paste(selectedObjects[0].path, scale);

        // Update display if needed
        if(selectedObjects[k].lengthPath != 0) {
            let currentTime = selectedObjects[0].currentTime;
            updateAnimation(currentTime, selectedObjects[k]);
            selectedObjects[k].display.updatePath();
            selectedObjects[k].display.updateLinks();
            selectedObjects[k].display.updateTiming();
        }
    }

    // Save info in historic
    saveHistoric.push({"paste": indexesPaste});
}

/**
 * Delete the trajectory of the selected objects
 */
function deletePath() {
    let indexesDelete = [];

    for(let k = 0; k < selectedObjects.length; k++) {
        // Retrieve info to store it in the historic
        let indexes = retrieveObject(selectedObjects[k].links[selectedObjects[k].effector]);
        indexesDelete.push(indexes)

        selectedObjects[k].path.delete();
    }

    // Save info in historic
    saveHistoric.push({"delete": indexesDelete});
}

/**
 * 
 * @param {Array<THREE.Vector3>} positions - Positions
 * @param {Array<number>} timings - Timings
 * @param {Array<Object>} curves - Extracted curves
 * @returns Positions (pos) and timings (t) of the generated cycle
 */
function computeCycle(positions, timings, curves) {
    // Retrieve angles
    let angles = curves.map(value => value.angle);

    // Retrieve the index of the curve that has the max angle
    // which will be used as the BASE
    // TODO: Replace with indexOf
    let maxAngleIndex;
    let maxAngle = 0;
    for(let i = 0; i < angles.length; i++) {
        if(angles[i] > maxAngle) {
            maxAngleIndex = i;
            maxAngle = angles[i];
        }
    }

    // Compute barycenter of the base
    let baseCurve = positions.slice(curves[maxAngleIndex].beginning, curves[maxAngleIndex].end + 1)
    let baseBar = barycenter(baseCurve);

    // Compute barycenter of the full input
    let bar = barycenter(positions);


    let baseDiff = baseBar.clone().sub(bar); // Distance btw full path barycenter and the base curve one

    // --------------- CREATE CLUSTERS ---------------

    /* Create clusters of points: The idea is to find, for each point of each curve
    a corresponding point in the base. Rn only base on the distance but it could be based on distance
    and timing.*/
    // Initialize the array
    let clusters = Array(curves[maxAngleIndex].end - curves[maxAngleIndex].beginning + 1);
    for(let i = 0; i < clusters.length; i++) {
        clusters[i] = [];
    }

    for(let k = 0; k < curves.length; k++) {
        // Compute barycenter of the curve
        let tempCurve = positions.slice(curves[k].beginning, curves[k].end + 1)
        let tempBar = barycenter(tempCurve);

        let difference = tempBar.clone().sub(bar); // Distance btw full path barycenter and the studied curve one

        // Display the studied curve (centered around the full path barycenter)
        /*var randomColor = "#" + Math.floor(Math.random()*16777215).toString(16);
        let cyclePos = positions.slice(curves[k].beginning, curves[k].end + 1);
        for(let i = 0; i < cyclePos.length; i++) {
            cyclePos[i] = cyclePos[i].clone().sub(difference);
        }
        let globalCyclePos = fromLocalToGlobal(cyclePos, selectedObjects[0], 0);
        const pathGeometry = new THREE.BufferGeometry().setFromPoints(globalCyclePos);
        let cycleMaterial = new THREE.MeshBasicMaterial( {
            color: new THREE.Color(randomColor),
            depthTest: false,
            depthWrite: false,
            transparent: true
        } )
        const path = new THREE.Line(pathGeometry, cycleMaterial);
        scene.add(path);*/

        if (k == maxAngleIndex) { // If the curve is the base
            for(let i = 0; i < clusters.length; i++) {
                clusters[i].push(positions[i + curves[k].beginning].clone().sub(difference));
            }
        } else { // If not, for each point of the curve, find its corresponding point in the base
            for(let i = curves[k].beginning; i <= curves[k].end; i++) {
                let tempPos = positions[i].clone().sub(difference); // Center around the barycenter of the full input
                let correspondence = 0;
                let d = Infinity;
                for(let j = curves[maxAngleIndex].beginning; j <= curves[maxAngleIndex].end; j++) {
                    let tempBasePos = positions[j].clone().sub(baseDiff); // Center around the barycenter of the full input

                    // Update correspodence if closer
                    let newD = tempPos.distanceTo(tempBasePos);
                    if(newD <= d) {
                        correspondence = j;
                        d = newD;
                    }
                }

                // Add the centered point to the right cluster
                clusters[correspondence - curves[maxAngleIndex].beginning].push(tempPos);
            }
        }
    }

    // --------------- COMPUTE AVERAGE CYCLE ---------------

    let pos = [];
    for(let i = 0; i < clusters.length; i++) {
        // Display cluster of points
        /*var randomColor = "#" + Math.floor(Math.random()*16777215).toString(16);
        let points = clusters[i];
        let globalCyclePos = fromLocalToGlobal(points, selectedObjects[0], 0);
        const pathGeometry = new THREE.BufferGeometry().setFromPoints(globalCyclePos);
        let cycleMaterial = new THREE.PointsMaterial( {
            color: new THREE.Color(randomColor),
            depthTest: false,
            depthWrite: false,
            transparent: true
        } )
        const path = new THREE.Points(pathGeometry, cycleMaterial);
        scene.add(path);*/

        // Compute barycenter
        let posMean = new THREE.Vector3();
        for(let j = 0; j < clusters[i].length; j++) {
            posMean.add(clusters[i][j]);
        }
        posMean.divideScalar(clusters[i].length);
        pos.push(posMean);
    }

    // TODO: Average timings as well
    let t = timings.slice(curves[maxAngleIndex].beginning, curves[maxAngleIndex].end + 1);

    return { pos, t };
}

/**
 * Generate a cycle for all selected objects based on the user input (which is mostly a multiple cycles input)
 */
function cycleWithInput() {
    for(let k = 0; k < selectedObjects.length; k++) {
        if(selectedObjects[k].lengthPath != 0) {
            // Extract forward/backward curves
            let curves = extractCurves(selectedObjects[k].path.cleanPositions, selectedObjects[k].path.cleanTimings);

            // Generate the path
            let cycle = computeCycle(selectedObjects[k].path.cleanPositions, selectedObjects[k].path.cleanTimings, curves);
            selectedObjects[k].path.positions = cycle.pos;
            selectedObjects[k].path.timings = cycle.t;

            // Create a cycle with the path
            createCycle(selectedObjects[k].path.positions, selectedObjects[k].path.timings);

            // Update display
            selectedObjects[k].display.updatePath();
        }
    }
}

/**
 * Generate a cycle for all selected objects based on the trajectory of the effector when following
 * the user input (which is mostly a multiple cycles input)
 */
function cycleWithEffector() {
    for(let k = 0; k < selectedObjects.length; k++) {
        if (selectedObjects[k].lengthPath != 0) {
            // Extract forward/backward curves
            let curves = extractCurves(selectedObjects[k].path.effectorPositions, selectedObjects[k].path.cleanTimings);

            // Generate the path
            let cycle = computeCycle(selectedObjects[k].path.effectorPositions, selectedObjects[k].path.cleanTimings, curves);
            selectedObjects[k].path.positions = cycle.pos;
            selectedObjects[k].path.timings = cycle.t;

            // Create a cycle with the path
            createCycle(selectedObjects[k].path.positions, selectedObjects[k].path.timings);

            // Update display
            selectedObjects[k].display.updatePath();
        }
    }
}





export { originalPath, filter, extractCurves, paste, deletePath, computeCycle, cycleWithInput, cycleWithEffector }