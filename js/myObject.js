import * as THREE from 'three';
import { MyPath } from './myPath.js'
import { MyDisplay } from './myDisplay.js'
import { settings } from './canvas.js'
import { computeAngleAxis, localDir, rotate, resizeCurve, worldPos, localPos } from './utils.js'

class MyObject {
    constructor(mesh, height, bones, restAxis, parent, materials) {
        this._mesh = mesh;
        this._bones = bones;
        this._angularSpeed = new THREE.Vector3();
        this._alpha = 0;

        this._lbs = [];
        let restBones = [];
        let parentBones = [];
        this._lbs.push(bones[0])
        restBones.push(bones[0]);
        parentBones.push(bones[0]);
        for(let i = 1; i < this.bones.length; i++) {
            let restBone = bones[i].clone();
            restBones[i - 1].add(restBone);
            restBones.push(restBone);

            let parentBone = bones[i].clone();
            parentBones[i - 1].add(parentBone);
            parentBones.push(parentBone);

            let lbsBone = bones[i].clone();
            this._lbs[i - 1].add(lbsBone);
            this._lbs.push(lbsBone);
        }      


        this._restPose = {
            height : height,
            bones : restBones,
            axis : restAxis
        }

        this._parent = { 
            object : parent,
            anchor : 0,
            offsetPos : new THREE.Vector3(),
            offsetQ : new THREE.Quaternion(),
            speed : new THREE.Vector3(),
            motion : parentBones
        };

        this._children = [];

        this._path = new MyPath();

        this._display = new MyDisplay(this, materials);
    }

    get mesh() { return this._mesh; }

    set material(m) { this._mesh.material = m; }

    get positions() { return this._mesh.geometry.attributes.position; }
    get skinIndex() { return this._mesh.geometry.attributes.skinIndex; }
    get skinWeight() { return this._mesh.geometry.attributes.skinWeight; }

    get bones() { return this._bones; }
    get lengthBones() { return this._bones.length; }
    get lbs() { return this._lbs; }

    get speed() { return this._angularSpeed; }
    set speed(s) { this._angularSpeed = s; }
    get alpha() { return this._alpha; }
    set alpha(a) { this._alpha = a; }

    get height() { return this._restPose.height; }
    get restBones() { return this._restPose.bones; }
    get restAxis() { return this._restPose.axis; }

    get parent() { return this._parent; }
    get children() { return this._children; }
    addChild(o) { this._children.push(o); }

    get path() { return this._path; }
    get lengthPath() { return this._path.positions.length; }
    get effector() { return this._path.effector; }
    set effector(e) { this._path.effector = e; }
    get target() { return this._path.target; }
    set target(t) { this._path.target = t; }
    get hasTarget() { return !(this._path.target == null); }

    get display() { return this._display; }
    get links() { return this._display.links; }
    get lengthLinks() { return this._display.links.length; }
    linkMaterial(i, material) { this._display.links[i].material = material; }
    get root() { return this._display.root; }
    get skeletonHelper() { return this._display.skeleton }
    get axesHelpers() { return this._display.axes; }
    get lengthAxes() { return this._display.axes.length;}
    get pathDisplay() { return this._display.path; }
    get timingDisplay() { return this._display.timing; }
    get speedDisplay() { return this._display.speeds; }
    get axisDisplay() { return this._display.axis; }

    // Point as global variable
    distanceToRoot(point) {
        point = localPos(point, this, this.restBones, 0);
        let distance = point.distanceTo(new THREE.Vector3(0,0,0));
        
        return distance;
    }

    reset(bones) {
        for (let i = 0; i < bones.length; i++) {
            bones[i].quaternion.copy(this._restPose.bones[i].quaternion);
            bones[i].updateWorldMatrix(false, false); // Important
        }
    }

    ownVS() {
        //console.log('own VS')
        let sommeAlpha = 0;
        for (let i = this.effector + 2; i < this.lengthBones; i++) {
            let w = this._angularSpeed;
            let n = w.clone().normalize();

            let currentPos = this.bones[i].position.clone();
            currentPos = worldPos(currentPos, this, this.bones, i - 1);
            const points = [];
            points.push(currentPos.clone());

            let origin = this.bones[this.effector + 1].position.clone();
            origin = worldPos(origin, this, this.bones, this.effector);

            let v = w.clone().cross(currentPos.clone().sub(origin));

            let new_pos = currentPos.clone().add(v.clone().multiplyScalar(10));
            points.push(new_pos.clone());

            //this._display.speeds[i - 1].geometry = new THREE.BufferGeometry().setFromPoints(points);
            
            let param = settings.ownVSparam / 10;
            let theta = - param * v.length();
            
            let q = new THREE.Quaternion();
            let N = this.lengthBones - (this.effector + 1) - 1;
            let alpha = 2 * N * theta / (N + 1) - sommeAlpha;
            sommeAlpha += alpha
            n.applyQuaternion(this.bones[0].quaternion.clone().invert());
            q.setFromAxisAngle(n, alpha);        


            // Here we apply q on bones[e + 1] space on bones[i - 1] which is not coherent (TO CHANGE)
            this.bones[i - 1].applyQuaternion(q);
            this.bones[i - 1].updateWorldMatrix(false, false);
        }
    }

    parentVS() {
        //console.log('parent VS')
        let parent = this._parent.object;
        let speed = this._parent.speed;

        let bones = this._parent.motion;
        this.reset(bones);

        let newPosArray = [];
        let speeds = [];

        let rootPos = this._restPose.bones[0].position.clone();
        rootPos = worldPos(rootPos, this, this._restPose.bones, -1);
        let origin = parent.bones[0].position.clone();
        origin = worldPos(origin, parent, parent.bones, -1);

        for (let i = 2; i < this.lengthBones; i++) {
            let w = speed.clone();
            let n = w.clone().normalize();


            let currentPos = this._restPose.bones[i].position.clone();
            currentPos = worldPos(currentPos, this, this._restPose.bones, i-1);


            let detailDiff =  currentPos.clone().sub(rootPos);
            let parentDiff = currentPos.clone().sub(origin);

            // Retrieve main bone of the correspondant vertex in parent mesh
            let corIndex = this._parent.anchor;
            let skinWeight = new THREE.Vector4();
            let skinIndex = new THREE.Vector4();
            skinIndex.fromBufferAttribute( parent.skinIndex, corIndex );
            skinWeight.fromBufferAttribute( parent.skinWeight, corIndex );

            let arrayMaxIndex = function(array) {
                return array.indexOf(Math.max.apply(null, array));
            };
            

            let skinWeightArray = [];
            skinWeight.toArray(skinWeightArray);
            let weightMaxIndex = arrayMaxIndex(skinWeightArray);
            let boneIndex = skinIndex.getComponent(weightMaxIndex);

            // Compute speed of the detail bone
            let v = w.clone().cross(parentDiff).multiplyScalar(boneIndex * detailDiff.length());
            speeds.push(v);

            let param = settings.parentVSparam / 10000
            //let theta = - param * v.length();
            let theta = - param * v.length();

            let R4 = new THREE.Matrix4();
            R4.makeRotationAxis(n, theta);
            let R = new THREE.Matrix3();
            R.setFromMatrix4(R4);

            // Compute displacement
            let d = parentDiff.clone().applyMatrix3(R);
            d.sub(parentDiff);

            // Compute new position
            let newPos = currentPos.clone().add(d);
            newPosArray.push(newPos);
        }

        // Rescale the curve for volume conservation
        let segmentSize = this._restPose.height / (this.lengthBones - 2);
        resizeCurve(newPosArray, segmentSize);


        // Bend each bone so that it follow the curve
        for (let i = 2; i < this.lengthBones; i++) {
            this.links[i - 1].position.copy(newPosArray[i - 2]);

            let effector = bones[i].position.clone();
            effector = worldPos(effector, this, bones, i-1);
            let origin = bones[i-1].position.clone();
            origin = worldPos(origin, this, bones, i-2);
            let worldRotation = computeAngleAxis(origin, effector, newPosArray[i-2]);
            let localAxis = localDir(worldRotation.axis, bones, i-2);
            rotate(localAxis, worldRotation.angle, bones[i-1])

            const points = [];
            effector = bones[i].position.clone();
            effector = worldPos(effector, this, bones, i-1);
            points.push(effector.clone());
            points.push(effector.clone().add(speeds[i - 2].clone().divideScalar(10)));

            this._display.speeds[i - 1].geometry = new THREE.BufferGeometry().setFromPoints(points);
        }
    }

    // Optimiser pour ne pas avoir à faire de copies des bones + ca crée pleins de bugs de faire comme ca ?
    getSpeed(origin, oldPos, newPos) {
        let originPos = this.bones[origin].position.clone();
        originPos = worldPos(originPos, this, this.bones, origin - 1);
        let worldRotation = computeAngleAxis(originPos, oldPos, newPos);

        let points = [];
        points.push(originPos.clone());
        points.push(originPos.clone().add(worldRotation.axis.clone().multiplyScalar(10)));
        this._display.axis.geometry = new THREE.BufferGeometry().setFromPoints(points);

        let speed = new THREE.Vector3(0,0,0);
        if (!isNaN(worldRotation.angle)) {
            speed = worldRotation.axis.clone().multiplyScalar(worldRotation.angle);
        }

        return speed;
    }

    bend(bones, target) {
        this.reset(bones);
        let effector = bones[this.effector + 1].position.clone();
        effector = worldPos(effector, this, bones, this.effector);
        let origin = bones[0].position.clone();
        origin = worldPos(origin, this, bones, -1);
        let worldRotation = computeAngleAxis(origin, effector, target);
        for(let i = 1; i < this.lengthBones - 1; i++) {
            let localAxis = localDir(worldRotation.axis, bones, i-1)
            let angle = 2 * worldRotation.angle / (this.effector + 1)
            rotate(localAxis, angle, bones[i]);
        }
    } 
    
    blend() {
        for (let i = 0; i < this.lengthBones; i++) {
            let q1 = this.bones[i].quaternion.clone();
            let q2 = this._parent.motion[i].quaternion.clone();

            let q = q1.clone().slerp(q2, this.alpha);


            this.bones[i].quaternion.copy(q);
            this.bones[i].updateWorldMatrix(false, false);
        }
    }

    updateEffector(distance) {
        // compute length btw effector and root of the active object
        // find the link that has the closest length
        // Take into account the scale factor btw the 2 shapes
        let res = 0;
        let bonePos = this.bones[0].position.clone();
        let current_d = bonePos.distanceTo(new THREE.Vector3(0,0,0));
        for (let i = 1; i < this.lengthLinks; i++) {
            bonePos = this.restBones[i+1].position.clone();
            bonePos = worldPos(bonePos, this, this.restBones, i);
            bonePos = localPos(bonePos, this, this.restBones, 0);
            let new_d = bonePos.distanceTo(new THREE.Vector3(0,0,0));
    
            if (Math.abs(new_d - distance) < Math.abs(current_d - distance)) {
                res = i;
                current_d = new_d;
            }
        }
        this.effector = res;

        this.display.updateLinks();
    }

}

export { MyObject }