// Таверна «Ржавая подкова»: двухэтажный дом (генератор _house.js) — каменный низ, фахверк, балкон, кружка на кронштейне,
// мансардные окна; на фасаде — большая вывеска с названием. Фасад — +z.
import { house, houseProxy } from './_house.js';
import { sign } from './_sign.js';
const OPTS = { w: 7.2, d: 5.0, floors: 2, balcony: true, sign: true, dormers: 2, wall: 0x8a6a48, wallTop: 0xe8cc98, roof: 0x5a2c1c, roofTop: 0xb4583a, roofTex: 'tile', shutter: 0x5a2a20, shutterL: 0xa04a3a, seed: 6 };
export default { id: 'tavern', kind: 'prop', outline: false, opts: OPTS,
  shadowProxy(kit) { return houseProxy(kit, OPTS); },
  build(kit) {
    const m = house(kit, OPTS), s = sign(kit, this, ['ТАВЕРНА', '«Ржавая подкова»'], 2.6, 0.78);
    s.position.set(OPTS.w * 0.16, 2.72, OPTS.d / 2 + 0.1); m.root.add(s);
    return m;
  } };
