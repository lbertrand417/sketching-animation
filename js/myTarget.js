import * as THREE from 'three';
import { materials } from './materials.js'
import { worldPos } from './utils.js'

/**
 * Class describing a target, that is an object that attract object trajectories
 */
class MyTarget {

    // --------------- CONSTRUCTOR ---------------
    /**
     * Instantiate a MyTarget object
     * @param {THREE.Vector3} pos - Position of the target
     */
    constructor(pos) {
        // Initialize the mesh of the target point
        let sphereGeometry = new THREE.SphereGeometry( 1, 16, 8 );
        this._mesh = new THREE.Mesh(sphereGeometry, materials.root.clone());
        this._mesh.position.set(pos.x, pos.y, pos.z);
        this._mesh.updateWorldMatrix(false, false);
        this._pos = pos;

        this._targeted = []; // Objects attracted to the target
    }

    // --------------- GETTER/SETTER ---------------

    get mesh() { return this._mesh; }
    get pos() { return this._pos; }
    set pos(p) { this._pos = p; 
            this._mesh.position.set(this.pos.x, this.pos.y, this.pos.z)}
    // Note: Right now all objects must have the same parent
    get targeted() { return this._targeted; } 

    // --------------- FUNCTIONS ---------------

    /**
     * Rotate the object path around its rest axis so that the end of the path is the closest to the target
     */
    targetAttraction() {
        for (let i = 0; i < this.targeted.length; i++) {
            // Try multiple rotation and compute the distance to the target point
            let dt = 2 * Math.PI / 50; // Theta step
            let theta = 0;
            let distances = [];
            while (theta < 2 * Math.PI) {
                let localPos = this.targeted[i].path.positions[Math.floor(this.targeted[i].lengthPath / 2)].clone(); // Local position

                // Rotate
                localPos.applyAxisAngle(this.targeted[i].restAxis, theta);

                // Compute the distance to the target
                let globalPos = worldPos(localPos, this.targeted[i], this.targeted[i].bones, 0); // World position
                let distance = globalPos.distanceTo(this.targeted[i].target.pos);
                distances.push(distance);
                theta += dt;
            }

            // Retrieve the angle of the minimal distance
            const min = Math.min(...distances);
            const index = distances.indexOf(min);
            theta = index * dt;

            // Apply the final rotation
            this.targeted[i].path.offsetOrientation(this.targeted[i].restAxis, theta)

            // Update path display
            this.targeted[i].display.updatePath();
            this.targeted[i].display.updateTiming();
        }
    }
}

export { MyTarget }