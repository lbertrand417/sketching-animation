import * as THREE from 'three';
import { MyPath } from './myPath.js'
import { MyDisplay } from './myDisplay.js'
import { computeAngleAxis, getLocal, fromLocalToGlobal } from './utils.js'
import { isSelected } from './selection.js'
import { Vector3 } from 'three';

class MyObject {
    constructor(skinnedMesh, mesh, height, bones, restAxis, level, materials) {
        this._mesh = skinnedMesh;
        this._skinnedMesh = skinnedMesh;
        this._bones = bones;

        //this.updateVertices();

        this._angularSpeed = new THREE.Vector3();

        let restBones = [];
        let restBone = new THREE.Bone();
        restBone.position.setFromMatrixPosition(bones[0].matrixWorld);
        restBone.quaternion.setFromRotationMatrix(bones[0].matrixWorld)
        restBone.updateMatrixWorld(true);
        restBones.push(restBone)

        for(let i = 1; i < this.bones.length; i++) {
            restBone = bones[i].clone();
            restBones[i - 1].add(restBone);
            restBones.push(restBone);
        }

        this._restPose = {
            geometry : this._skinnedMesh.geometry.clone(),
            height : height,
            bones : restBones,
            axis : restAxis
        }

        this._level = level;

        this._parent = { 
            index : 0,
            offsetPos : new THREE.Vector3(),
            offsetQ : new THREE.Quaternion()
        };

        this._path = new MyPath();
        this._buffers = [];

        this._display = new MyDisplay(this, materials);
    }

    get mesh() {
        return this._mesh;
    }

    set material(m) {
        this._mesh.material = m;
    }

    get positions() {
        return this._mesh.geometry.attributes.position;
    }

    get skinIndex() {
        return this._skinnedMesh.geometry.attributes.skinIndex;
    }

    get skinWeight() {
        return this._skinnedMesh.geometry.attributes.skinWeight;
    }

    get bones() {
        return this._bones;
    }

    get lengthBones() {
        return this._bones.length;
    }

    get height() {
        return this._restPose.height;
    }

    get restBones() {
        return this._restPose.bones;
    }

    get restAxis() {
        return this._restPose.axis;
    }

    get level() {
        return this._level;
    }

    get isParent() {
        return this._level == 0;
    }

    get parent() {
        return this._parent;
    }

    get path() {
        return this._path;
    }

    get lengthPath() {
        return this._path.positions.length;
    }

    get buffers() {
        return this._buffers;
    }

    get effector() {
        return this._path.effector;
    }

    set effector(e) {
        this._path.effector = e;
    }

    get target() {
        return this._path.target;
    }

    set target(t) {
        this._path.target = t;
    }

    get hasTarget() {
        return !(this._path.target == null);
    }

    get links() {
        return this._display.links;
    }

    get lengthLinks() {
        return this._display.links.length;
    }

    linkMaterial(i, material) {
        this._display.links[i].material = material;
    }

    get root() {
        return this._display.root;
    }

    get skeletonHelper() {
        return this._display.skeleton;
    }

    get axesHelpers() {
        return this._display.axes;
    }

    get lengthAxes() {
        return this._display.axes.length;
    }

    get pathDisplay() {
        return this._display.path;
    }


    get timingDisplay() {
        return this._display.timing;
    }

    distanceToRoot(point) {
        let pos = new THREE.Vector3();
    
        pos.setFromMatrixPosition(point.matrixWorld);
        this._bones[0].worldToLocal(pos);
        let distance = pos.distanceTo(new THREE.Vector3(0,0,0));
        
        return distance;
    }

    reset() {
        for (let i = 0; i < this.bones.length; i++) {
            this.bones[i].quaternion.copy(this._restPose.bones[i].quaternion);
            this.bones[i].updateMatrixWorld(true);
        }
    }

    updateVertices() {
        console.log("update vertices");
        // Retrieve skinned vertices
        const skinnedPositionAttribute = this._skinnedMesh.geometry.attributes.position;

        let vertex = new THREE.Vector3();

        const P = this.positions.array;

        for ( let vertexIndex = 0; vertexIndex < skinnedPositionAttribute.count; vertexIndex ++ ) {
            vertex.fromBufferAttribute( skinnedPositionAttribute, vertexIndex );
            this._skinnedMesh.boneTransform(vertexIndex, vertex);

            P[3 * vertexIndex] = vertex.x;
            P[3 * vertexIndex + 1] = vertex.y;
            P[3 * vertexIndex + 2] = vertex.z;
        }

        this._mesh.geometry.attributes.position.needsUpdate = true;
        this._mesh.geometry.computeBoundingBox();
        this._mesh.geometry.computeBoundingSphere();
    }

    bend(worldRotation) {
        for(let i = 1; i < this.lengthBones - 1; i++) {
        //for(let i = 1; i < this.effector + 1; i++) {
        //for(let i = this.lengthBones - 2; i < this.lengthBones - 1; i++) {
            // Put axis in parent space
            let localAxis = getLocal(worldRotation.axis, this.bones[i-1])
    
            // Compute quaternion
            let q = new THREE.Quaternion();
            q.setFromAxisAngle(localAxis, 2 * worldRotation.angle / (this.effector + 1));
            this.bones[i].applyQuaternion(q);

            this.bones[i].updateMatrixWorld(true);
        }
    }

    /*velocitySkinning() {
        const currentPositions = this.positions;

        let currentPos = new THREE.Vector3();
        let skinWeight = new THREE.Vector4();
        let skinIndex = new THREE.Vector4();

        const P = this.positions.array;


        for ( let vertexIndex = 0; vertexIndex < currentPositions.count; vertexIndex ++ ) {
            currentPos.fromBufferAttribute( currentPositions, vertexIndex );

            skinIndex.fromBufferAttribute( this.skinIndex, vertexIndex);
		    skinWeight.fromBufferAttribute( this.skinWeight, vertexIndex);

            const skinIndexArray = skinIndex.toArray();
            const skinWeightArray = skinWeight.toArray();

            let minIndex = Infinity;

            for (let i = 0; i < 4; i++) {
                if (skinWeightArray[i] > Math.pow(10, -3) && skinIndexArray[i] < minIndex) {
                    minIndex = skinIndexArray[i];
                }
            }

            if (minIndex >= this.effector + 1) {
                let w = this._angularSpeed;
                let n = w.clone().normalize();

                this.bones[this.effector + 1].worldToLocal(currentPos);

                let v = w.clone().cross(currentPos);
                let alpha = - param * v.length();
                //let alpha = - 0.5 * v.length();

                let R4 = new THREE.Matrix4();
                R4.makeRotationAxis(n, alpha);
                let R = new THREE.Matrix3();
                R.setFromMatrix4(R4);

                const Id = new THREE.Matrix3().identity();
                let d = currentPos.clone().applyMatrix3(R);

                
                this.bones[this.effector + 1].localToWorld(d);

                P[3 * vertexIndex] = d.x;
                P[3 * vertexIndex + 1] = d.y;
                P[3 * vertexIndex + 2] = d.z;
            }
        }

        this._mesh.geometry.attributes.position.needsUpdate = true;
        this._mesh.geometry.computeBoundingBox();
        this._mesh.geometry.computeBoundingSphere();
    }*/

    velocitySkinning() {
        for (let i = this.effector + 2; i < this.lengthBones; i++) {
            let w = this._angularSpeed;
            let n = w.clone().normalize();

            let currentPos = new THREE.Vector3();
            currentPos.setFromMatrixPosition(this.bones[i].matrixWorld);
            this.bones[this.effector + 1].worldToLocal(currentPos);

            let v = w.clone().cross(currentPos);
            let alpha = - param * v.length();
            //let alpha = - 0.5 * v.length();

            let q = new THREE.Quaternion();
            q.setFromAxisAngle(n, alpha);

            this.bones[i - 1].applyQuaternion(q);

            this.bones[i - 1].updateMatrixWorld(true);

            /*let R4 = new THREE.Matrix4();
            R4.makeRotationAxis(n, alpha);

            
            q.setFromRotationMatrix(R4);*/

            /*let R = new THREE.Matrix3();
            R.setFromMatrix4(R4);*/
        }

    }

    updateSpeed(oldTarget, newTarget) {
        let worldRotation = computeAngleAxis(this.bones[this.effector], oldTarget, newTarget);
        let localAxis = getLocal(worldRotation.axis, this.bones[this.effector]);
        let new_speed = new THREE.Vector3(0,0,0);

        if (!isNaN(worldRotation.angle)) {
            new_speed = localAxis.clone().multiplyScalar(worldRotation.angle);
        } else {
            console.log("coucou")
        }

        this._angularSpeed = new_speed.clone().multiplyScalar(0.1).add(this._angularSpeed.clone().multiplyScalar(1 - 0.1));


        console.log('angle', worldRotation.angle * 180 / Math.PI)
        console.log('speed', this._angularSpeed);
        console.log('value', this._angularSpeed.length())
    }

    updateBones(target) {
        this.reset();
        const effector = new THREE.Vector3();
        effector.setFromMatrixPosition(this.bones[this.effector + 1].matrixWorld);
        let worldRotation = computeAngleAxis(this.bones[0], effector, target);
        this.bend(worldRotation);
        
        this.velocitySkinning();
        //this.updateVertices();
    }

    // Initialization false
    generateBuffers() {
        this._buffers = [];
        for(let i = 0; i < this.path.positions.length; i++) {
            let oldTarget = this.path.positions[1].clone();
            if (i > 0) {
                oldTarget = this.path.positions[i - 1].clone();
            }
            this.bones[0].localToWorld(oldTarget);

            let target = this.path.positions[i].clone();
            this.bones[0].localToWorld(target);

            this.updateBones(target);
            this.updateSpeed(oldTarget, target);
        }

        for (let i = 0; i < this.path.positions.length; i++) {
            let oldTarget = this.path.positions[1].clone();
            if (i > 0) {
                oldTarget = this.path.positions[i - 1].clone();
            }
            this.bones[0].localToWorld(oldTarget);

            let target = this.path.positions[i].clone();
            this.bones[0].localToWorld(target);
            this.updateBones(target);
            //this.updateVertices();
            this.updateSpeed(oldTarget, target);
            this.velocitySkinning();
            this._buffers.push(this._mesh.geometry.clone());
        }

        console.log(this._buffers);
    }
    

    updateEffector(distance) {
        // compute length btw effector and root of the active object
        // find the link that has the closest length
        // Take into account the scale factor btw the 2 shapes
        let res = 0;
        let linkPos = new THREE.Vector3();
        linkPos.setFromMatrixPosition(this.links[0].matrixWorld);
        this.bones[0].worldToLocal(linkPos);
        let current_d = linkPos.distanceTo(new THREE.Vector3(0,0,0));
        for (let i = 1; i < this.lengthLinks; i++) {
            linkPos.setFromMatrixPosition(this.links[i].matrixWorld);
            this.bones[0].worldToLocal(linkPos);
            let new_d = linkPos.distanceTo(new THREE.Vector3(0,0,0));
    
            if (Math.abs(new_d - distance) < Math.abs(current_d - distance)) {
                res = i;
                current_d = new_d;
            }
        }
        this.effector = res;

        this.updateLinksDisplay();
    }

    // Display functions
    updateLinksDisplay() {
        // Update bones
        for(let i = 0; i < this.lengthBones; i++) {
            this.bones[i].updateMatrixWorld(true);
            this.restBones[i].updateMatrixWorld(true);
        }

        for(let i = 0; i < this.lengthLinks; i++) {
            this.links[i].position.setFromMatrixPosition(this.bones[i+1].matrixWorld);
            //this.links[i].position.setFromMatrixPosition(this.restBones[i+1].matrixWorld);
            //this.linkMaterial(i, this._display.materials.links.clone());
        }
        if (this.effector != null && isSelected(this)) {
            //this.linkMaterial(this.path.effector, this._display.materials.effector.clone());
        }

        this.root.position.setFromMatrixPosition(this.bones[0].matrixWorld);
        //this.root.position.setFromMatrixPosition(this.restBones[0].matrixWorld);
    }

    updatePathDisplay() {
        let globalPos = fromLocalToGlobal(this.path.positions, this.bones[0]);
        this._display.path.geometry = new THREE.BufferGeometry().setFromPoints(globalPos);
    }

    updateTimingDisplay() {
        if (this.lengthPath != 0) {
            let globalPos = this.bones[0].localToWorld(this.path.currentPosition);
            this._display.timing.geometry = new THREE.BufferGeometry().setFromPoints([globalPos]);
        } else {
            this._display.timing.geometry = new THREE.BufferGeometry().setFromPoints([]);
        }
    }

}

export { MyObject }