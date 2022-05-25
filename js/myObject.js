import * as THREE from 'three';
import { MyPath } from './myPath.js'
import { MyDisplay } from './myDisplay.js'
import { computeAngleAxis, getLocal, fromLocalToGlobal } from './utils.js'
import { isSelected } from './selection.js'

class MyObject {
    constructor(mesh, height, bones, restAxis, level, materials) {
        this._mesh = mesh;
        this._bones = bones;

        let restBones = [];
        let restBone = new THREE.Bone();
        //restBone.matrix.copy(bones[0].matrixWorld)
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
        return this._mesh.geometry.attributes.skinIndex;
    }

    get skinWeight() {
        return this._mesh.geometry.attributes.skinWeight;
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

    bend(worldRotation) {
        //this.reset();

        let quaternions = [];

        for(let i = 1; i < this.lengthBones - 1; i++) {
        //for(let i = 1; i < this.effector + 1; i++) {
        //for(let i = this.lengthBones - 2; i < this.lengthBones - 1; i++) {
            // Put axis in parent space
            let localAxis = getLocal(worldRotation.axis, this.bones[i-1])
    
            // Compute quaternion
            // On peut parametrer les angles mais il faut que sum(theta_i) = theta
            let q = new THREE.Quaternion();
            q.setFromAxisAngle(localAxis, 2 * worldRotation.angle / (this.effector + 1));

            quaternions.push(q);
            this.bones[i].applyQuaternion(q);

            this.bones[i].updateMatrixWorld(true);
        }
        
        return quaternions;
    }

    velocitySkinning() {
        const positionAttribute = this.positions;

        let vertex = new THREE.Vector3();
        let skinWeight = new THREE.Vector4();
        let skinIndex = new THREE.Vector4();

        for ( let vertexIndex = 0; vertexIndex < positionAttribute.count; vertexIndex ++ ) {
            vertex.fromBufferAttribute( positionAttribute, vertexIndex );
            vertex = parent.mesh.localToWorld(vertex.clone()); // World space

            // Faut appliquer le transform ? et faire le skinning soit meme j'en ai bien peur :(

            skinIndex.fromBufferAttribute( this.skinIndex, vertexIndex);
		    skinWeight.fromBufferAttribute( this.skinWeight, vertexIndex );

            skinIndex.filter(x => this.skinWeight[x] > 0);
            let minIndex = Math.min(skinIndex);

            if (minIndex >= this.effector) {
                const child = new THREE.Vector3();
                child.setFromMatrixPosition(this.bones[this.effector + 1].matrixWorld);
                let worldRotation = computeAngleAxis(this.bones[this.effector], child, vertex)
                let localAxis = getLocal(worldRotation.axis, this.bones[this.effector]);
                let w = localAxis.clone().multiplyScalar(worldRotation.angle);

                this.bones[this.effector].worldToLocal(vertex);
                let v = w.clone().cross(vertex);
                let alpha = - param * v.length();

                let R4 = new THREE.Matrix4();
                R4.makeRotationAxis(localAxis, alpha);
                let R = new THREE.Matrix3();
                R.setFromMatrix4(R4);
                
            }
        }
    }

    updateBones(target) {
        this.reset();
        const effector = new THREE.Vector3();
        effector.setFromMatrixPosition(this.bones[this.effector + 1].matrixWorld);
        console.log('e', effector);
        console.log('t', target);
        console.log(this.bones[0])
        let worldRotation = computeAngleAxis(this.bones[0], effector, target);
        let quaternions = this.bend(worldRotation);
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
            this.linkMaterial(i, this._display.materials.links.clone());
        }
        if (this.effector != null && isSelected(this)) {
            this.linkMaterial(this.path.effector, this._display.materials.effector.clone());
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