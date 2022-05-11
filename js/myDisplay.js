import * as THREE from 'three';

class MyDisplay {
    constructor(object, materials) {
        let sphereGeometry = new THREE.SphereGeometry( 1, 16, 8 );

        this._links = [];
        for(let i = 1; i < object.bones.length; i++) {
            let link = new THREE.Mesh( sphereGeometry, materials.links.clone() );
            link.position.setFromMatrixPosition(object.bones[i].matrixWorld);
            link.visible = true;
            //allObjects.push(boneDisplay);
            this._links.push(link);
        }
    
        this._root = new THREE.Mesh( sphereGeometry, materials.root.clone() );
        this._root.position.setFromMatrixPosition(object.bones[0].matrixWorld); // From cylinder local space to world
        this._root.visible = true;
        //allObjects.push(rootDisplay);

        this._skeleton = new THREE.SkeletonHelper( object.bones[0] );
        //let boneContainer = new THREE.Group();
        //boneContainer.add( object.bones[0] );
        this._skeleton.visible = true;
        //allObjects.push(skeletonHelper);
        //allObjects.push(boneContainer);

        this._axes = [];
        for (let i = 0; i < object.lengthBones; i++) {
            let axesHelper = new THREE.AxesHelper( 10 );
            object.bones[i].add(axesHelper);
            axesHelper.visible = true;
            this._axes.push(axesHelper);
        }

        const pathGeometry = new THREE.BufferGeometry().setFromPoints([]);
        this._path = new THREE.Line(pathGeometry, materials.unselectedpath.clone());
        //allObjects.push(pathDisplay);
    
        const timingGeometry = new THREE.BufferGeometry().setFromPoints([]);
        this._timing = new THREE.Points( timingGeometry, materials.timing.clone() );
        //allObjects.push(timingDisplay);
    }

    get links() {
        return this._links;
    }

    get root() {
        return this._root;
    }

    get skeleton() {
        return this._skeleton;
    }

    get axes() {
        return this._axes;
    }

    get path() {
        return this._path;
    }

    get timing() {
        return this._timing;
    }
}

export { MyDisplay }