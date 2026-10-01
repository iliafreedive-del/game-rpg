// Алтарь с медальоном Ордена: ступенчатое основание, чаша, над ней парит латунный медальон с руной Бездны.
import altar from './altar.js';
export default { id: 'altar_medallion', kind: 'prop', outline: false,
  build(kit) {
    const { THREE, PAL, part, merge } = kit, base = altar.build.call(this, kit);
    base.root.add(new THREE.Mesh(merge([part(new THREE.CylinderGeometry(0.2, 0.2, 0.05, 16), PAL.brass, [0, 1.65, 0], [Math.PI / 2, 0, 0], 1, { top: 0xffe08a, tex: 'metal' }), part(new THREE.TorusGeometry(0.2, 0.025, 4, 16), PAL.brassD, [0, 1.65, 0]), part(new THREE.OctahedronGeometry(0.07, 0), PAL.abyss, [0, 1.65, 0.04], 0, [1, 1.3, 0.4], { emit: true })]), kit.propMat(this)));
    return base;
  } };
