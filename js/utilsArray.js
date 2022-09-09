"use strict;"

// Import libraries
import * as THREE from 'three';

import { worldPos, computeAngleAxis, interpolate } from './utils.js';

function fromLocalToGlobal(positions, object, index) {
    let globalPos = [];
    for(let i = 0; i < positions.length; i++) {
        let p = positions[i].clone();
        let newPos = worldPos(p, object, object.bones, index);
        globalPos.push(newPos);
    }
    return globalPos;
}

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

function retime(time, position) {
    // Retiming and reposition
    let tempPos = [];
    let tempT = [];

    //console.log();

    let dt = 16;
    let t = time[0] - (time[0] % 16);
    console.log(t);
    while (t < time[0]) {
        t += dt;
    }

    //while (t <= Math.round(time[time.length - 1]) + 16) {
    while (t <= Math.round(time[time.length - 1])) {
        let info = findInArray(t, time);
        //console.log(info);
        if(info.i + 1 < position.length) {
            tempPos.push(interpolate(position[info.i], position[info.i + 1], info.alpha));
        } else {
            console.log("coucou")
            tempPos.push(position[info.i]);
        }

        tempT.push(t);
        t += dt;
    }

    return { tempPos, tempT }
}

function filter(p, t, filterSize) {
    let positions = [];
    let timings = [];
    for(let i = 0; i < p.length; i++) {
        let subPosArray = p.slice(Math.max(i - filterSize, 0), Math.min(p.length - 1, i + filterSize));
        let posBar = new THREE.Vector3();
        for(let i = 0; i < subPosArray.length; i++) {
            posBar.add(subPosArray[i]);
        }
        posBar.multiplyScalar(1 / subPosArray.length);
        positions.push(posBar);

        let subTimingsArray = t.slice(Math.max(i - filterSize, 0), Math.min(t.length - 1, i + filterSize));
        let timingBar = 0;
        for(let i = 0; i < subTimingsArray.length; i++) {
            timingBar += subTimingsArray[i];
        }
        timingBar /= subTimingsArray.length;
        timings.push(timingBar);
    }

    return { positions, timings };
}

function extractCurves(positions, timings) {
    console.log(positions)
    const localSize = 5;

    let axis = new THREE.Vector3();

    let curves = [];

    let i = 0;
    while(i < positions.length) {
        let angle = - Infinity;
        let leftPosBar = positions[i].clone();

        let j = i + 1;
        //let localCount = 0;
        let notFound = true;
        while(j < positions.length && notFound) {
            let rightPosBar = positions[j].clone();

            let worldRotation = computeAngleAxis(new THREE.Vector3(), leftPosBar, rightPosBar);
            if (worldRotation.angle > angle) {
                //console.log('i', i)
                angle = worldRotation.angle;
                j++;
            } else {
                //console.log('j', j);
                let check = true;
                /*let tempWorldRotation = computeAngleAxis(new THREE.Vector3(), leftPosBar, positions[j - 1].clone());
                let maxLocal = tempWorldRotation.angle;*/
                for(let l = j; l < Math.min(j + localSize, positions.length); l++) {
                    let worldRotation = computeAngleAxis(new THREE.Vector3(), leftPosBar, positions[l].clone());
                    if(worldRotation.angle > angle) {
                        check = false;
                    }
                }
                console.log(check);

                if(check) {
                    //curves.push({"beginning": i, "end": j - 1, "angle": angle, "axis": axis});
                    let slicePos = positions.slice(i, j);
                    let sliceT = timings.slice(i, j);
                    curves.push({"beginning": i, "end": j - 1, "unsyncPos": slicePos, "unsyncT": sliceT, "syncPos": slicePos, "syncT": sliceT});
                    angle = - Infinity;
                    i = j;
                    notFound = false;
                    //j = positions.length;
                } else {
                    j++;
                }
                /*if(localCount == localSize){
                    axis = positions[j - localSize].clone().sub(positions[i]);
                    axis.normalize();
                    curves.push({"beginning": i, "end": (j - 1) - localSize, "angle": angle, "axis": axis});
                    angle = - Infinity;
                    i = j - localSize;
                    j = positions.length;
                } else {
                    j++;
                    localCount++;
                }*/
            }
        }
        //console.log('hey')

        if(j == positions.length) {
            let slicePos = positions.slice(i, j);
            let sliceT = timings.slice(i, j);
            //curves.push({"beginning": i, "end": j - 1, "angle": angle, "axis": axis});
            curves.push({"beginning": i, "end": j - 1, "unsyncPos": slicePos, "unsyncT": sliceT, "syncPos": slicePos, "syncT": sliceT});
            i = positions.length;
        }

        /*if(localCount != localSize) {
            axis = positions[j - localCount - 1].clone().sub(positions[i]);
            axis.normalize();
            curves.push({"beginning": i, "end": j - localCount - 1, "angle": angle, "axis": axis});
            i = positions.length;
        }*/
    }

    console.log(curves);

    return curves;
}

function computeCycle(positions, timings, parts) {
    // Aligner les barycentres ? + rotation ?
    let angles = parts.map(value => value.angle);
    
    /*let angleMean = 0;

    for(let i = 0; i < angles.length; i++) {
        angleMean += angles[i];
    }
    angleMean /= angles.length;

    let closestAngle = 0;
    let d = Infinity;
    for(let i = 0; i < angles.length; i++) {
        if(Math.abs(angles[i] - angleMean) < d) {
            closestAngle = i;
            d = Math.abs(angles[i] - angleMean)
        }
    }*/

    let closestAngle;
    let maxAngle = 0;
    for(let i = 0; i < angles.length; i++) {
        if(angles[i] > maxAngle) {
            closestAngle = i;
            maxAngle = angles[i];
        }
    }

    //console.log(closestAngle);

    // Compute barycenter of the base
    let baseBar = new THREE.Vector3();
    for(let i = parts[closestAngle].beginning; i <= parts[closestAngle].end; i++) {
        console.log(i);
        baseBar.add(positions[i]);
    }
    baseBar.divideScalar(parts[closestAngle].end - parts[closestAngle].beginning + 1);


    let bar = new THREE.Vector3();
    for(let i = 0; i < positions.length; i++) {
        bar.add(positions[i]);
    }
    bar.divideScalar(positions.length);

    let regroupedCycle = Array(parts[closestAngle].end - parts[closestAngle].beginning + 1);
    //console.log(regroupedCycle.length);
    for(let i = 0; i < regroupedCycle.length; i++) {
        regroupedCycle[i] = [];
    }
    //console.log('closestAngle', closestAngle);
    for(let k = 0; k < parts.length; k++) {
        let tempBar = new THREE.Vector3();
        for(let i = parts[k].beginning; i <= parts[k].end; i++) {
            console.log(i)
            console.log(positions.length);
            tempBar.add(positions[i]);
        }
        tempBar.divideScalar(parts[k].end - parts[k].beginning + 1);
        let difference = tempBar.clone().sub(bar);

        /*var randomColor = "#" + Math.floor(Math.random()*16777215).toString(16);
        let cyclePos = positions.slice(parts[k].beginning, parts[k].end + 1);
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
        global.scene.add(path);*/

        //console.log('k', k);
        if (k == closestAngle) {
            //console.log('coucou')
            for(let i = 0; i < regroupedCycle.length; i++) {
                //regroupedCycle[i].push(positions[i + parts[k].beginning]);
                regroupedCycle[i].push(positions[i + parts[k].beginning].clone().sub(difference));
            }
        } else {
            // Compute barycenter
            /*let bar = new THREE.Vector3();
            for(let i = parts[k].beginning; i <= parts[k].end; i++) {
                bar.add(positions[i]);
            }
            bar.divideScalar(parts[k].end - parts[k].beginning + 1);
            let difference = bar.clone().sub(baseBar);*/

            for(let i = parts[k].beginning; i <= parts[k].end; i++) {
                //console.log('i', i)
                let tempPos = positions[i].clone().sub(difference);
                let correspondence = 0;
                let d = Infinity;
                for(let j = parts[closestAngle].beginning; j <= parts[closestAngle].end; j++) {
                    let baseDiff = baseBar.clone().sub(bar);
                    let tempBasePos = positions[j].clone().sub(baseDiff);
                    //console.log('j', j);
                    //let newD = positions[i].distanceTo(positions[j]);
                    let newD = tempPos.distanceTo(tempBasePos);
                    //console.log('newD', newD);
                    if(newD <= d) {
                        correspondence = j;
                        d = newD;
                    }
                }
                //regroupedCycle[correspondence - parts[closestAngle].beginning].push(positions[i]);
                regroupedCycle[correspondence - parts[closestAngle].beginning].push(tempPos);
            }
        }
    }

    let pos = [];
    for(let i = 0; i < regroupedCycle.length; i++) {
        /*var randomColor = "#" + Math.floor(Math.random()*16777215).toString(16);
        let points = regroupedCycle[i];
        let globalCyclePos = fromLocalToGlobal(points, selectedObjects[0], 0);
        const pathGeometry = new THREE.BufferGeometry().setFromPoints(globalCyclePos);
        let cycleMaterial = new THREE.PointsMaterial( {
            color: new THREE.Color(randomColor),
            depthTest: false,
            depthWrite: false,
            transparent: true
        } )
        const path = new THREE.Points(pathGeometry, cycleMaterial);
        global.scene.add(path);*/

        let posMean = new THREE.Vector3();
        for(let j = 0; j < regroupedCycle[i].length; j++) {
            posMean.add(regroupedCycle[i][j]);
        }
        posMean.divideScalar(regroupedCycle[i].length);
        pos.push(posMean);
    }

    let t = timings.slice(parts[closestAngle].beginning, parts[closestAngle].end + 1);
    /*console.log(angles);
    console.log("mean", angleMean);
    console.log("closest", angles[closestAngle]);*/
    console.log(regroupedCycle);
    //console.log(pos);
    //console.log(t);

    //pos = positions;
    //t = timings;

    return { pos, t };
}

export { fromLocalToGlobal, resizeCurve, findInArray, retime, filter, extractCurves, computeCycle }

