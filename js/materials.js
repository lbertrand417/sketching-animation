import * as THREE from 'three';

/* TODO: rn the code uses the global material variable but we should instead use the variable of the MyDisplay class
so that objects have tjeir individual material*/
var materials = {
    unselected : new THREE.MeshPhongMaterial( { color: 0xeb4034, transparent : false, opacity : 0.2 }),
    selected : new THREE.MeshPhongMaterial( { color: 0x28faa4, transparent : false, opacity : 0.2 }), // First selected object's material
    selectedBis : new THREE.MeshPhongMaterial( { color: 0x1246bf }), // Other selected object's material
    effector : new THREE.MeshBasicMaterial( {
        color: new THREE.Color( 0x88ff88 ),
        depthTest: false,
        depthWrite: false,
        transparent: true
    } ),
    links : new THREE.MeshBasicMaterial( {
        color: new THREE.Color( 0x8888ff ),
        depthTest: false,
        depthWrite: false,
        transparent: true
    } ),
    root : new THREE.MeshBasicMaterial( {
        color: new THREE.Color( 0xff8888 ),
        depthTest: false,
        depthWrite: false,
        transparent: true
    } ),
    path : new THREE.LineBasicMaterial( { color: 0x0000ff }),
    timing : new THREE.PointsMaterial({ color: 0xff0000, size: 2 })
};

export { materials }
