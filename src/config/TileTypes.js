export const TILE_TYPES = {
  air: {
    id: 0,
    solid: false,
    drillTime: 0,
    color: 0x000000,
  },
  surface: {
    id: 15,
    solid: true,
    drillTime: 0,
    color: 0xc2703a,
    surface: true,
  },
  dirt: {
    id: 1,
    solid: true,
    drillTime: 0.8,  // 1 animation pass
    hardness: 1,
    color: 0x8b4513,
  },
  rock: {
    id: 2,
    solid: true,
    drillTime: 1.6,  // 2 animation passes
    hardness: 2,
    requiresDrill: 2,
    color: 0x696969,
  },
  hardRock: {
    id: 3,
    solid: true,
    drillTime: 2.4,  // 3 animation passes
    hardness: 3,
    requiresDrill: 3,
    color: 0x2f4f4f,
  },
  coal: {
    id: 4,
    solid: true,
    drillTime: 0.8,  // 1 pass (same as dirt)
    hardness: 1,
    ore: 'coal',
    value: 5,
    color: 0x1a1a1a,
  },
  iron: {
    id: 5,
    solid: true,
    drillTime: 0.8,  // 1 pass
    hardness: 1,
    ore: 'iron',
    value: 15,
    color: 0xc0c0c0,
  },
  silver: {
    id: 7,
    solid: true,
    drillTime: 1.6,  // 2 passes
    hardness: 2,
    ore: 'silver',
    value: 75,
    color: 0xe8e8e8,
  },
  gold: {
    id: 8,
    solid: true,
    drillTime: 1.6,  // 2 passes
    hardness: 2,
    ore: 'gold',
    value: 150,
    color: 0xffd700,
  },
  platinum: {
    id: 9,
    solid: true,
    drillTime: 1.6,  // 2 passes
    hardness: 2,
    ore: 'platinum',
    value: 300,
    color: 0xe5e4e2,
  },
  ruby: {
    id: 10,
    solid: true,
    drillTime: 2.4,  // 3 passes
    hardness: 3,
    ore: 'ruby',
    value: 500,
    color: 0xe0115f,
  },
  emerald: {
    id: 11,
    solid: true,
    drillTime: 2.4,  // 3 passes
    hardness: 3,
    ore: 'emerald',
    value: 750,
    color: 0x50c878,
  },
  diamond: {
    id: 12,
    solid: true,
    drillTime: 3.2,  // 4 passes
    hardness: 3,
    ore: 'diamond',
    value: 1500,
    color: 0xb9f2ff,
  },
  lava: {
    id: 13,
    solid: false,
    hazard: 'heat',
    damage: 10,
    color: 0xff4500,
  },
  gas: {
    id: 14,
    solid: true,
    hazard: 'explosion',
    triggerRadius: 2,
    color: 0xadff2f,
  },
  ladder: {
    id: 20,
    solid: false,
    climbable: true,
    placed: true,
    color: 0x8b4513,
  },
  platform: {
    id: 21,
    solid: true,
    oneWay: true,
    placed: true,
    color: 0x666666,
  },
  torch: {
    id: 22,
    solid: false,
    light: true,
    lightRadius: 4,
    placed: true,
    color: 0xffaa00,
  },
  elevator: {
    id: 23,
    solid: true,
    interactive: true,
    placed: true,
    color: 0x444488,
  },
  teleporter: {
    id: 24,
    solid: false,
    interactive: true,
    placed: true,
    color: 0x8800ff,
  },
  boulder: {
    id: 25,
    solid: true,
    drillTime: 3.2,  // 4 passes - very hard
    hardness: 4,     // Requires drill level 3 OR explosive tip
    unstable: true,  // Falls if unsupported
    color: 0x555555,
  },
  crystal: {
    id: 26,
    solid: true,
    drillTime: 0.8,  // Easy to mine once found
    hardness: 1,
    ore: 'crystal',
    value: 2000,     // Very valuable!
    color: 0x00ffff,
  },
  elevatorTop: {
    id: 27,
    solid: false,
    placed: true,
    elevatorPart: 'top',
    color: 0x3366aa,
  },
  elevatorRope: {
    id: 28,
    solid: false,
    placed: true,
    elevatorPart: 'rope',
    color: 0x445588,
  },
  elevatorCar: {
    id: 29,
    solid: true,
    placed: true,
    elevatorPart: 'car',
    rideable: true,
    color: 0x4477cc,
  },
  elevatorBottom: {
    id: 30,
    solid: false,
    placed: true,
    elevatorPart: 'bottom',
    color: 0x3366aa,
  },
};

export function getTileType(name) {
  return TILE_TYPES[name];
}

export function getTileTypeById(id) {
  return Object.values(TILE_TYPES).find(t => t.id === id) || TILE_TYPES.air;
}

export function getTileTypeName(id) {
  return Object.keys(TILE_TYPES).find(key => TILE_TYPES[key].id === id) || 'air';
}
