import * as THREE from 'three';
import { MyPath } from './myPath.js'
import { MyDisplay } from './myDisplay.js'
import { fromLocalToGlobal } from './utils.js'
import { isSelected } from './selection.js'
import { Vector3 } from 'three';

class MyObject {
    constructor(mesh, height, bones, restAxis, level, materials) {
        this._mesh = mesh;
        this._bones = bones;

        this._simulation = {
            paramaters : {
                dt : 0.016,
                K : 1.0,
                m : 1,
                mu : 40.0,
                L0 : height / (bones.length - 2)
            },
            positions : [],
            velocity : [],
            forces : []           
        }

        for (let i = 0; i < this.bones.length; i++) {
            let vector = new Vector3(0, 0, 0);
            vector.setFromMatrixPosition(bones[i].matrixWorld);
            this._simulation.positions.push(vector);
            this._simulation.velocity.push(new Vector3(0, 0, 0))
            this._simulation.forces.push(new Vector3(0, 0, 0))
        }

        this._restPose = {
            height : height,
            bones : bones,
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

    updateBones(worldRotation) {
        for(let i = 1; i <= this.effector; i++) {
            // Put axis in parent space
            let parentBone = this.bones[i-1];
            let parentPos = new THREE.Vector3();
            let invParentQ = new THREE.Quaternion();
            let parentScale = new THREE.Vector3();
            parentBone.matrixWorld.decompose(parentPos, invParentQ, parentScale);
            invParentQ.invert();
            let localAxis = worldRotation.axis.clone().applyQuaternion(invParentQ);
    
            // Compute quaternion
            // On peut parametrer les angles mais il faut que sum(theta_i) = theta
            let q = new THREE.Quaternion();
            q.setFromAxisAngle(localAxis, worldRotation.angle / this.effector);
            this.bones[i].applyQuaternion(q);
        }
    }

    // Mass spring
    updateForces(force) {
        console.log("update forces");
        const mu = this._simulation.paramaters.mu;
        const K = this._simulation.paramaters.K;
        const m = this._simulation.paramaters.m / this.bones.length;
        const L0 = this._simulation.paramaters.L0;

        console.log('L0', L0)

        //this._simulation.forces = Array(this.bones.length).fill(new Vector3(0, 0, 0));

        //console.log(this._simulation.positions);
        for (let i = 1; i < this.bones.length; i++) {
            this._simulation.forces[i].set(0,0,0);

            // Drawing force
            /*if (i == this.effector) {
                this._simulation.forces[i].add(force.clone().multiplyScalar(m));
                console.log('drawing force', force.clone().multiplyScalar(m))
            }*/
            console.log(this._simulation.forces[i])

            // Drag
            /*this._simulation.forces[i].add(this._simulation.velocity[i].clone().multiplyScalar(-mu * m));
            console.log ('drag force', this._simulation.velocity[i].clone().multiplyScalar(-mu * m));*/

            // Spring forces
            // i, i + 1
            if(i + 1 < this.bones.length) {
                //console.log(this._simulation.positions[i + 1])
                const u = this._simulation.positions[i + 1].clone().sub(this._simulation.positions[i]);
                u.normalize();
                this._simulation.forces[i].add(u.clone().multiplyScalar(K * (this._simulation.positions[i + 1].distanceTo(this._simulation.positions[i]) - L0)));
                console.log(this._simulation.positions[i + 1].distanceTo(this._simulation.positions[i]))
                console.log(L0)
            }

            // i, i - 1
            if(i - 1 > 0) {
                const u = this._simulation.positions[i - 1].clone().sub(this._simulation.positions[i]);
                u.normalize();
                this._simulation.forces[i].add(u.clone().multiplyScalar(K * (this._simulation.positions[i - 1].distanceTo(this._simulation.positions[i]) - L0)));
            }

            // i, i + 2
            if(i + 2 < this.bones.length) {
                const u = this._simulation.positions[i + 2].clone().sub(this._simulation.positions[i]);
                u.normalize();
                this._simulation.forces[i].add(u.clone().multiplyScalar(K * (this._simulation.positions[i + 2].distanceTo(this._simulation.positions[i]) - 2 * L0)));
            }

            // i, i - 2
            if(i - 2 > 0) {
                const u = this._simulation.positions[i - 2].clone().sub(this._simulation.positions[i]);
                u.normalize();
                this._simulation.forces[i].add(u.clone().multiplyScalar(K * (this._simulation.positions[i - 2].distanceTo(this._simulation.positions[i]) - 2 * L0)));
            }

            console.log('position', this._simulation.positions[i].clone())
            console.log('velocity', this._simulation.velocity[i].clone())
            console.log('force', this._simulation.forces[i].clone());
        }
    }

    updatePV(constraint) {
        console.log("update PV");
        const m = this._simulation.paramaters.m / (this.bones.length - 2);
        for (let i = 1; i < this.bones.length; i++) {
            this._simulation.velocity[i].add(this._simulation.forces[i].clone().multiplyScalar(this._simulation.paramaters.dt / m));
            this._simulation.positions[i].add(this._simulation.velocity[i].clone().multiplyScalar(this._simulation.paramaters.dt));

            //this.links[i-1].position.set(this._simulation.positions[i].x, this._simulation.positions[i].y, this._simulation.positions[i].z);
        }

        this._simulation.positions[this._simulation.positions.length - 1].set(constraint.x, constraint.y, constraint.z);
        this._simulation.positions[1].set(this._simulation.positions[0].x, this._simulation.positions[0].y, this._simulation.positions[0].z)
        this._simulation.velocity[1].set(0, 0, 0);

        for (let i = 1; i < this.bones.length; i++) {
            this.links[i-1].position.set(this._simulation.positions[i].x, this._simulation.positions[i].y, this._simulation.positions[i].z);
        }

        //console.log('position', [...this._simulation.positions])
        //console.log('velocity', [...this._simulation.velocity])
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
        }

        for(let i = 0; i < this.lengthLinks; i++) {
            this.links[i].position.setFromMatrixPosition(this.bones[i+1].matrixWorld);
            this.linkMaterial(i, this._display.materials.links.clone());
        }
        if (this.effector != null && isSelected(this)) {
            this.linkMaterial(this.path.effector, this._display.materials.effector.clone());
        }

        this.root.position.setFromMatrixPosition(this.bones[0].matrixWorld);
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