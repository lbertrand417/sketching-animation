"use strict;"

// Import libraries
import * as THREE from 'three';
import { materials } from './materials.js';
import { MyObject } from './myObject.js';

// Resize window
function resize(e) {
    console.log("resize");

    let canvas2D = document.getElementById('canvas'); // 2D sketch canvas
    canvas2D.width = window.innerWidth;
    canvas2D.height = window.innerHeight;
    let ctx = canvas2D.getContext('2d');

    ctx.canvas.width = window.innerWidth;
    ctx.canvas.height = window.innerHeight;
    global.renderer.setSize(window.innerWidth, window.innerHeight);
}

// Compute world angle and axis between effector-origin and target-origin vectors
function computeAngleAxis(origin, effector, target) { 
    // Get world rotation vectors
    let n = target.clone().sub(origin);
    n.normalize();
    let t = new THREE.Vector3();
    t.copy(effector);
    t.sub(origin);
    t.normalize();
 
    // Compute rotation axis
    let axis = new THREE.Vector3();
    axis.crossVectors(t, n);
    axis.normalize();
 
    // Compute world rotation angle
    let angle = t.dot(n);
    angle = Math.acos(angle);

    if (isNaN(angle)) {
        angle = 0;
        axis = new THREE.Vector3();
    }
 
    return { angle, axis };
}

// Put global axis in local space 
function localDir(axis, bones, index) {
    let local = axis.clone();
    for (let i = 0; i <= index; i++) {
        local.applyQuaternion(bones[i].quaternion.clone().invert());
    }   

    return local;
}

function rotate(axis, angle, origin) {
    // Compute quaternion
    let q = new THREE.Quaternion();
    q.setFromAxisAngle(axis, angle);
    origin.applyQuaternion(q);
    origin.updateWorldMatrix(false, false);
}

// TODO: A enlever parce que utilisé qu'une fois
function fromLocalToGlobal(positions, object, index) {
    let globalPos = [];
    for(let i = 0; i < positions.length; i++) {
        let p = positions[i].clone();
        let newPos = worldPos(p, object, object.bones, index);
        globalPos.push(newPos);
    }
    return globalPos;
}


function worldPos(point, object, bones, index) {
    let globalPos = point.clone();
    for (let i = index; i >= 0; i--) {
        globalPos.applyMatrix4(bones[i].matrix);
    }
    globalPos.applyMatrix4(object.mesh.matrix);

    return globalPos;
}

function localPos(point, object, bones, index) {
    let pos = point.clone();
    pos.applyMatrix4(object.mesh.matrix.clone().invert());
    for (let i = 0; i <= index; i++) {
        // Replace by quaternion as bones don't translate?
        pos.applyMatrix4(bones[i].matrix.clone().invert());
    }

    return pos;
}

function project3D(e, canvas, p) {
    let pos = { x: 0, y: 0 }; // last known position
    let mouse = {x: 0, y: 0}; // mouse position

    let rect = canvas.getBoundingClientRect();
    pos.x = e.clientX - rect.left;
    pos.y = e.clientY - rect.top;

    e.preventDefault();
    mouse.x = (pos.x / canvas.width) * 2 - 1;
    mouse.y = - (pos.y/ canvas.height) * 2 + 1;

    let vector = new THREE.Vector3(mouse.x, mouse.y, 0); // In camera space
    vector.unproject( global.camera );

    // Direction to point
    let dir = vector.sub( global.camera.position )
    dir.normalize();

    const p0 = global.camera.position; // Global camera position

    const n = new THREE.Vector3(0,0,0);
    global.camera.getWorldDirection(n);  // normale au plan

    const tI = ((p.clone().sub(p0)).dot(n) ) / ( dir.dot(n) );
    const pI = (dir.clone().multiplyScalar(tI)).add(p0); // le point d'intersection

    return pI;
}

function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min;
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

function interpolate(p1, p2, alpha) {
    if (p1.isVector3) {
        return p1.clone().multiplyScalar(1 - alpha).add(p2.clone().multiplyScalar(alpha))
    } else {
        return (1 - alpha) * p1 + alpha * p2;
    }
}

function getVertex(object, index) {
    const positionAttribute = object.positions;

    let vertex = new THREE.Vector3();
    vertex.fromBufferAttribute(positionAttribute, index); // Rest pose local position
    object.mesh.boneTransform(index, vertex) // Find actual local position of the vertex (skinning) 
    vertex.applyMatrix4(object.mesh.matrix);
    //object.mesh.localToWorld(vertex); // World space

    return vertex;
}

// WRONG
function getWorldQuaternion(object, bones, index) {
    let worldQ = new THREE.Quaternion();
    for (let i = index - 1; i >= 0; i--) {
        worldQ.multiply(bones[i].quaternion);
    }
    worldQ.multiply(object.mesh.quaternion);

    return worldQ;
}

function getRotation(object, index) {
    let skinWeight = new THREE.Vector4();
    let skinIndex = new THREE.Vector4();
    skinIndex.fromBufferAttribute( object.skinIndex, index );
    skinWeight.fromBufferAttribute( object.skinWeight, index );

    // Compute the rotation of the vertex in world space
    let Q = new THREE.Quaternion(0, 0, 0, 0); // World space
    for (let i = 0; i < 4; i++) {
        let weight = skinWeight.getComponent(i);

        if(weight != 0) {
            
            let boneIndex = skinIndex.getComponent(i);
            
            let boneQ = getWorldQuaternion(object, object.bones, boneIndex);
            boneQ = new THREE.Quaternion();
            object.bones[boneIndex].getWorldQuaternion(boneQ);
            boneQ.set(weight * boneQ.x, weight * boneQ.y, weight * boneQ.z, weight * boneQ.w);
            Q.set(Q.x + boneQ.x, Q.y + boneQ.y, Q.z + boneQ.z, Q.w + boneQ.w);
        }
    }
    Q.normalize();

    return Q;
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

function updateMatrix(object) {
    object.matrix.compose(object.position, object.quaternion, object.scale);
}

function retime(time, position) {
    // Retiming and reposition
    let tempPos = [];
    let tempT = [];

    let dt = 16;
    let t = 0;
    while (t < time[0]) {
        t += dt;
    }

    while (t <= Math.round(time[time.length - 1])) {
        let info = findInArray(t, time);
        //console.log(info);
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

function reverse() {
    selectedObjects[0].path.reverse();
}

function compareNombres(a, b) {
    return a - b;
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

function cleanPath(positions, timings) {
    let angle = - Infinity;
    let leftIndex;
    let rightIndex;
    for (let i = 0; i < positions.length; i++) {
        for (let j = i; j < positions.length; j++) {
            let worldRotation = computeAngleAxis(new THREE.Vector3(), positions[i], positions[j]);
            if (worldRotation.angle > angle) {
                leftIndex = i;
                rightIndex = j;
                angle = worldRotation.angle;
            }
        }
    }

    for(let j = 0; j < leftIndex; j++) {
        positions.shift();
        timings.shift();
        rightIndex -= 1;
    }

    for(let j = positions.length; j > rightIndex; j--) {
        positions.pop();
        timings.pop();
    }
}

function getCycles(positions, filterSize) {
    const localSize = 3;

    let angle = - Infinity;
    let axis = new THREE.Vector3();
    
    let parts = [];

    let i = 0;
    while(i < positions.length) {
        /*let leftPosArray = positions.slice(Math.max(i - filterSize, 0), Math.min(positions.length - 1, i + filterSize));
        let leftPosBar = new THREE.Vector3();
        for(let l = 0; l < leftPosArray.length; l++) {
            leftPosBar.add(leftPosArray[l]);
        }
        leftPosBar.multiplyScalar(1 / leftPosArray.length);*/
        let leftPosBar = positions[i].clone();

        let j = i + 1;
        let localCount = 0;
        while(j < positions.length) {
            //console.log('j', j);
            /*let rightPosArray = positions.slice(Math.max(j - filterSize, 0), Math.min(positions.length - 1, j + filterSize));
            let rightPosBar = new THREE.Vector3();
            for(let l = 0; l < rightPosArray.length; l++) {
                rightPosBar.add(rightPosArray[l]);
            }
            rightPosBar.multiplyScalar(1 / rightPosArray.length);*/
            let rightPosBar = positions[j].clone();

            let worldRotation = computeAngleAxis(new THREE.Vector3(), leftPosBar, rightPosBar);
            if (worldRotation.angle > angle) {
                angle = worldRotation.angle;
                j++;
            } else {
                /*if(localCount == 0) {
                    console.log('max', j - 1);
                }*/
                if(localCount == localSize){
                    axis = positions[j - localSize].clone().sub(positions[i]);
                    axis.normalize();
                    //console.log("computed", j - localSize - 1);
                    parts.push({"beginning": i, "end": (j - 1) - localSize, "angle": angle, "axis": axis});
                    angle = - Infinity;
                    i = j - localSize;
                    j = positions.length;
                } else {
                    j++;
                    localCount++;
                }
            }
        }

        if(localCount != localSize) {
            axis = positions[j - localCount - 1].clone().sub(positions[i]);
            axis.normalize();
            parts.push({"beginning": i, "end": j - localCount - 1, "angle": angle, "axis": axis});
            i = positions.length;
        }
    }

    return parts;
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
            tempBar.add(positions[i]);
        }
        tempBar.divideScalar(parts[k].end - parts[k].beginning + 1);
        let difference = tempBar.clone().sub(bar);

        var randomColor = "#" + Math.floor(Math.random()*16777215).toString(16);
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
        global.scene.add(path);

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
        var randomColor = "#" + Math.floor(Math.random()*16777215).toString(16);
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
        global.scene.add(path);

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

function getEffectorPositions(object, positions) {
    // Copy the object
    /*let bones = object.restBones;
    let tempBones = [];
    tempBones.push(bones[0]);
    for(let i = 1; i < bones.length; i++) {
        let tempBone = bones[i].clone();
        tempBones[i - 1].add(tempBone);
        tempBones.push(tempBone);
    }
    let mesh = object.mesh.clone();
    let tempObject =  new MyObject(mesh, object.height,
        tempBones, object.restAxis, object.parent.object, materials);*/

    let effectorPos = [];
    let globalEffectorPos = [];
    for(let i = 0; i < positions.length; i++) {
        let newTarget = positions[i].clone();
        object.bones[0].localToWorld(newTarget); 
        object.bend(object.bones, newTarget);

        let newPos = object.bones[object.effector + 1].position.clone();
        newPos = worldPos(newPos, object, object.bones, object.effector);
        globalEffectorPos.push(newPos.clone());
        newPos = localPos(newPos, object, object.bones, 0);
        effectorPos.push(newPos);        
    }

    /*const pathGeometry = new THREE.BufferGeometry().setFromPoints(globalEffectorPos);
    const path = new THREE.Line(pathGeometry, materials.unselectedpath.clone());
    global.scene.add(path);*/

    return effectorPos;
}

export { resize, computeAngleAxis, localDir, rotate, fromLocalToGlobal, worldPos, localPos, project3D, 
    getRandomInt, findInArray, interpolate, getVertex, getRotation, resizeCurve, updateMatrix, retime, 
    reverse, compareNombres, filter, cleanPath, getCycles, computeCycle, getEffectorPositions };