export const TILE_TYPES = {
  air: {
    id: 0,
    solid: false,
    drillTime: 0,
    color: '#000000'
  },
  dirt: {
    id: 1,
    solid: true,
    drillTime: 0.3,
    hardness: 1,
    color: '#8B4513'
  },
  rock: {
    id: 2,
    solid: true,
    drillTime: 0.8,
    hardness: 2,
    requiresDrill: 2,
    color: '#696969'
  },
  hardRock: {
    id: 3,
    solid: true,
    drillTime: 1.5,
    hardness: 3,
    requiresDrill: 4,
    color: '#2F4F4F'
  },
  coal: {
    id: 4,
    solid: true,
    drillTime: 0.3,
    ore: 'coal',
    value: 5,
    color: '#1a1a1a'
  },
  copper: {
    id: 5,
    solid: true,
    drillTime: 0.4,
    ore: 'copper',
    value: 15,
    color: '#B87333'
  },
  iron: {
    id: 6,
    solid: true,
    drillTime: 0.5,
    ore: 'iron',
    value: 30,
    color: '#C0C0C0'
  },
  silver: {
    id: 7,
    solid: true,
    drillTime: 0.6,
    ore: 'silver',
    value: 75,
    color: '#E8E8E8'
  },
  gold: {
    id: 8,
    solid: true,
    drillTime: 0.8,
    ore: 'gold',
    value: 150,
    color: '#FFD700'
  },
  platinum: {
    id: 9,
    solid: true,
    drillTime: 1.0,
    ore: 'platinum',
    value: 300,
    color: '#E5E4E2'
  },
  ruby: {
    id: 10,
    solid: true,
    drillTime: 1.2,
    ore: 'ruby',
    value: 500,
    color: '#E0115F'
  },
  emerald: {
    id: 11,
    solid: true,
    drillTime: 1.2,
    ore: 'emerald',
    value: 750,
    color: '#50C878'
  },
  diamond: {
    id: 12,
    solid: true,
    drillTime: 1.5,
    ore: 'diamond',
    value: 1500,
    color: '#B9F2FF'
  },
  lava: {
    id: 13,
    solid: false,
    hazard: 'heat',
    damage: 10,
    color: '#FF4500'
  },
  gas: {
    id: 14,
    solid: true,
    hazard: 'explosion',
    triggerRadius: 2,
    color: '#ADFF2F'
  },
};

// Helper to get tile type by name
export function getTileType(name) {
  return TILE_TYPES[name];
}

// Helper to get tile type by id
export function getTileTypeById(id) {
  return Object.values(TILE_TYPES).find(t => t.id === id) || TILE_TYPES.air;
}
