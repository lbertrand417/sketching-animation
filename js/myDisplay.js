import * as THREE from 'three';
import { worldPos } from './utils.js'
import { fromLocalToGlobal } from './utilsArray.js';
import { isSelected } from './selection.js'

/**
 * Class displaying a mesh and other useful info (links, speeds, axes,...) of an object in the scene
 */
class MyDisplay {
    // --------------- CONSTRUCTOR ---------------

    /**
     * Instantiate a MyDisplay object
     * @param {MyObject} object - The object to display
     * @param {Object} materials - Materials used to display object in the scene (an example is given in material.js)
     */
    constructor(object, materials) {
        this._object = object;
        this._materials = materials;

        // Geometry used for links, root, effector...
        let sphereGeometry = new THREE.SphereGeometry( 1, 16, 8 );

        // Objects representing the joint of the skeleton
        // NOTE: the array of links has one element less than the array of bones because it doesn't display the root joint
        this._links = []; 
        this._speeds = []; // Speeds computed during VS/h-VS
        for(let i = 1; i < object.bones.length; i++) {
            // Initialize links
            let link = new THREE.Mesh( sphereGeometry, materials.links.clone());
            let pos = object.bones[i].position.clone(); // Local position of bone i
            pos = worldPos(pos, object, object.bones, i-1); // World position
            link.position.set(pos.x, pos.y, pos.z);
            link.visible = false;
            link.updateWorldMatrix(false, false);
            this._links.push(link);

            // Initialize speeds
            const lineMaterial = new THREE.LineBasicMaterial( { color: 0x000000 } );
            const geometry = new THREE.BufferGeometry().setFromPoints([]);
            const line = new THREE.Line( geometry, lineMaterial );
            line.visible = false;
            this._speeds.push(line)        
        }

        // Display a small amount of the links
        let visible = Math.ceil(this._links.length / 5);
        for(let i = this._links.length - 1; i >= 0; i-= visible) {
            this._links[i].visible = true;
        }

        // Initialize rotation axis of the bending
        const lineMaterial2 = new THREE.LineBasicMaterial( { color: 0xff0000 } );
        const geometry2 = new THREE.BufferGeometry().setFromPoints([]);
        this._axis = new THREE.Line( geometry2, lineMaterial2 );
    
        // Initialize root joint
        this._root = new THREE.Mesh( sphereGeometry, materials.root.clone() );
        let pos = object.bones[0].position.clone(); // Local position of the root
        pos = worldPos(pos, object, object.bones, -1); // World position
        this._root.position.set(pos.x, pos.y, pos.z);
        this._root.updateWorldMatrix(false, false);

        this._axes = [];
        for (let i = 0; i < object.lengthBones; i++) {
            let axesHelper = new THREE.AxesHelper( 10 );
            object.bones[i].add(axesHelper);
            axesHelper.updateWorldMatrix(false, false);
            axesHelper.visible = false;
            this._axes.push(axesHelper);
        }

        // Initialize raw path (user input without filtering)
        const rawPathGeometry = new THREE.BufferGeometry().setFromPoints([]);
        this._rawPath = new THREE.Line(rawPathGeometry, materials.path.clone());

        // Initialize clean Path (user input with filtering but without cycle)
        const cleanPathGeometry = new THREE.BufferGeometry().setFromPoints([]);
        this._cleanPath = new THREE.Line(cleanPathGeometry, materials.path.clone());

        // Initialize effector path (path of the effector when following the final trajectory)
        const effectorPathGeometry = new THREE.BufferGeometry().setFromPoints([]);
        this._effectorPath = new THREE.Line(effectorPathGeometry, materials.path.clone());

        // Initialize the final path (the followed by the object)
        const pathGeometry = new THREE.BufferGeometry().setFromPoints([]);
        this._path = new THREE.Line(pathGeometry, materials.path.clone());
    
        // Initialize the timing point (showing where we're at on the path)
        const timingGeometry = new THREE.BufferGeometry().setFromPoints([]);
        this._timing = new THREE.Points( timingGeometry, materials.timing.clone() );

    }

    // --------------- GETTER/SETTER ---------------

    get materials() { return this._materials; }
    get links() { return this._links; }
    get root() { return this._root; }
    get axes() { return this._axes; }

    get rawPath() { return this._rawPath; }
    get cleanPath() { return this._cleanPath; }
    get effectorPath() { return this._effectorPath; }
    get path() { return this._path; }
    get timing() { return this._timing; }
    get speeds() { return this._speeds; }
    get axis() { return this._axis; }

    // --------------- FUNCTIONS ---------------

    /**
     * Update the positions of the links meshes
     */
    updateLinks() {
        // Update links position
        for(let i = 0; i < this.links.length; i++) {
            // Uncomment to display the joints of the final deformation
            let pos = this._object.bones[i+1].position.clone(); // Local position of bone i+1
            pos = worldPos(pos, this._object, this._object.bones, i); // World position
            this.links[i].position.set(pos.x, pos.y, pos.z);
            this.links[i].updateWorldMatrix(false, false);

            // Uncomment to display the joints of the lbs deformation
            /*let pos = this._object.lbs[i+1].position.clone(); // Local position of lbs bone i+1
            pos = worldPos(pos, this._object, this._object.lbs, i); // World position
            this.links[i].position.set(pos.x, pos.y, pos.z);
            this.links[i].updateWorldMatrix(false, false);*/

            // Uncomment to display the joints of the h-VS deformation
            /*let pos = this._object.parent.motion[i+1].position.clone(); // Local position of h-VS bone i+1
            pos = worldPos(pos, this._object, this._object.parent.motion, i); // World position
            this.links[i].position.set(pos.x, pos.y, pos.z);
            this.links[i].updateWorldMatrix(false, false);*/
        }

        // Update root joint
        let pos = this._object.bones[0].position.clone(); // Local position of the root
        pos = worldPos(pos, this._object, this._object.bones, -1); // World position
        this.root.position.set(pos.x, pos.y, pos.z);
        this._root.updateWorldMatrix(false, false);
    }

    /**
     * Update the display of the path
     */
    updatePath() {
        // Update the raw path display
        let rawGlobalPos = fromLocalToGlobal(this._object.path.rawPositions, this._object, 0); // World positions
        this._rawPath.geometry = new THREE.BufferGeometry().setFromPoints(rawGlobalPos);

        // Update the clean path display
        let cleanGlobalPos = fromLocalToGlobal(this._object.path.cleanPositions, this._object, 0); // World positions
        this._cleanPath.geometry = new THREE.BufferGeometry().setFromPoints(cleanGlobalPos);

        // Update the effector path display
        let effectorGlobalPos = fromLocalToGlobal(this._object.path.effectorPositions, this._object, 0); // World positions
        this._effectorPath.geometry = new THREE.BufferGeometry().setFromPoints(effectorGlobalPos);

        // Update the final path display
        let globalPos = fromLocalToGlobal(this._object.path.positions, this._object, 0); // World positions
        this.path.geometry = new THREE.BufferGeometry().setFromPoints(globalPos);
    }

    /**
     * Update the timing point showing the current position in the trajectory
     */
    updateTiming() {
        if (this._object.lengthPath != 0) {
            let globalPos = this._object.path.currentPosition.clone(); // Local position of the trajectory point
            globalPos = worldPos(globalPos, this._object, this._object.bones, 0); // World position
            this.timing.geometry = new THREE.BufferGeometry().setFromPoints([globalPos]);
        } else {
            this.timing.geometry = new THREE.BufferGeometry().setFromPoints([]);
        }
    }
}

export { MyDisplay }