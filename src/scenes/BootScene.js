import Phaser from 'phaser';
import { GAME_CONFIG } from '../config/GameConfig.js';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    // Create loading bar
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    const progressBar = this.add.graphics();
    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x222222, 0.8);
    progressBox.fillRect(width / 2 - 160, height / 2 - 25, 320, 50);

    const loadingText = this.add.text(Math.floor(width / 2), Math.floor(height / 2) - 50, 'Loading...', {
      fontFamily: 'monospace',
      fontSize: '16px',
      fill: '#ffffff',
    });
    loadingText.setOrigin(0.5, 0.5);

    // Loading progress
    this.load.on('progress', (value) => {
      progressBar.clear();
      progressBar.fillStyle(0xc2703a, 1);
      progressBar.fillRect(width / 2 - 150, height / 2 - 15, 300 * value, 30);
    });

    this.load.on('complete', () => {
      progressBar.destroy();
      progressBox.destroy();
      loadingText.destroy();
    });

    // Load bitmap font
    this.load.bitmapFont('pixel', 'assets/fonts/square_6x6.png', 'assets/fonts/square_6x6.xml');

    // Try to load PNG sprites
    this.load.image('shop_png', 'assets/sprites/shop.png');
    this.load.image('repairshop_png', 'assets/sprites/repairshop.png');

    // Load new rover sprites (128x128, transparent background)
    this.load.image('rover_png', 'assets/sprites/rover_128.png');
    this.load.image('rover_side', 'assets/sprites/rover_128.png');
    this.load.image('rover_front', 'assets/sprites/rover_front_new.png');
    this.load.image('rover_back', 'assets/sprites/rover_back_new.png');
    this.load.spritesheet('rover_spritesheet', 'assets/sprites/rover_128_mc16-Sheet.png', {
      frameWidth: 128,
      frameHeight: 128
    });

    // Load drill animation spritesheets
    // Side drill: 254x128 per frame, 9 frames
    this.load.spritesheet('rover_drill_spritesheet', 'assets/sprites/rover_128_mc16_drill_front-Sheet.png', {
      frameWidth: 254,
      frameHeight: 128
    });
    // Down drill: 254x254 per frame, 13 frames
    this.load.spritesheet('rover_drill_down_spritesheet', 'assets/sprites/rover_128_mc16_drill_down-Sheet.png', {
      frameWidth: 254,
      frameHeight: 254
    });
    // Up drill: 254x254 per frame, 9 frames
    this.load.spritesheet('rover_drill_up_spritesheet', 'assets/sprites/rover_128_mc16_drill_up-Sheet.png', {
      frameWidth: 254,
      frameHeight: 254
    });

    // Crack overlay for drilling: 128x128 per frame, 4 frames
    this.load.spritesheet('cracks_spritesheet', 'assets/sprites/cracks-Sheet.png', {
      frameWidth: 128,
      frameHeight: 128
    });

    // Solar panel charging animation: 254x254 per frame, 9 frames
    this.load.spritesheet('rover_solar_spritesheet', 'assets/sprites/rover_128_mc16_walking_with_solar_panel-Sheet.png', {
      frameWidth: 254,
      frameHeight: 254
    });

    // Load ladder sprite (128x128)
    this.load.image('ladder_png', 'assets/sprites/ladder.png');

    // Load elevator sprites
    this.load.image('elevator_top_png', 'assets/sprites/elevator_top.png');
    this.load.image('elevator_rope_png', 'assets/sprites/elevator_rope.png');
    this.load.image('elevator_cart_png', 'assets/sprites/elevator_cart.png');
    this.load.image('elevator_bottom_png', 'assets/sprites/elevator_bottom.png');

    // Load mars dirt texture (142x142 pixel art)
    this.load.image('mars_dirt', 'assets/sprites/mars_soil_128.png');

    // Load ore deposit textures
    this.load.image('deposit_coal', 'assets/sprites/mars_carbon_deposite_v2.png');
    this.load.image('deposit_iron', 'assets/sprites/mars_iron_deposite_v2.png');
    this.load.image('deposit_silver', 'assets/sprites/mars_silver_deposite_v2.png');
    this.load.image('deposit_gold', 'assets/sprites/mars_gold_deposite_v2.png');
    this.load.image('deposit_platinum', 'assets/sprites/mars_platin_deposite_v2.png');
    this.load.image('deposit_amethyst', 'assets/sprites/mars_ametyst_deposite_v2.png');
    this.load.image('boulder_sprite', 'assets/sprites/boulder_v2.png');

    // Load mined dirt background sprites (142x142)
    this.load.image('mined_dirt', 'assets/sprites/mined_dirt.png');
    this.load.image('mined_dirt_left_wall', 'assets/sprites/mined_dirt_left_wall.png');
    this.load.image('mined_dirt_right_wall', 'assets/sprites/mined_dirt_right_wall.png');
    this.load.image('mined_dirt_rock_below', 'assets/sprites/mined_dirt_rock_below.png');
    this.load.image('mined_dirt_rock_below_and_above', 'assets/sprites/mined_dirt_rock_below_and_above.png');
    this.load.image('mined_dirt_walls_on_each_side', 'assets/sprites/mined_dirt_walls_on_each_side.png');
    this.load.image('mined_dirt_walls_on_each_side_and_top', 'assets/sprites/mined_dirt_walls_on_each_side_and_top.png');
    this.load.image('mined_dirt_rock_below_left_corner_wall', 'assets/sprites/mined_dirt_rock_below_left_corner_wall.png');
    this.load.image('mined_dirt_rock_below_right_corner_wall', 'assets/sprites/mined_dirt_rock_below_right_corner_wall.png');
    this.load.image('mined_dirt_rock_below_left_upper_corner_shaft_on_top_only', 'assets/sprites/mined_dirt_rock_below_left_upper_corner_shaft_on_top_only.png');
    this.load.image('mined_dirt_rock_below_right_upper_corner_shaft_on_top_only', 'assets/sprites/mined_dirt_rock_below_right_upper_corner_shaft_on_top_only.png');
    this.load.image('mined_dirt_rock_below_left_upper_corner_shaft_on_top_and_below', 'assets/sprites/mined_dirt_rock_below_left_upper_corner_shaft_on_top_and_below.png');
    this.load.image('mined_dirt_rock_below_right_upper_corner_shaft_on_top_and_below', 'assets/sprites/mined_dirt_rock_below_right_upper_corner_shaft_on_top_and_below.png');
    this.load.image('mined_dirt_rock_below_left_upper_corner_shaft_on_allsides_cross', 'assets/sprites/mined_dirt_rock_below_left_upper_corner_shaft_on_allsides_cross.png');
    this.load.image('mined_dirt_rock_below_shaft_on_left_right_top', 'assets/sprites/mined_dirt_rock_below_shaft_on_left_right_top.png');
    // Pit sprites - for shaft entries from above (surface or vertical shafts)
    this.load.image('mined_dirt_rock_pit_shaft_above', 'assets/sprites/mined_dirt_rock_pit_shaft_above.png');
    this.load.image('mined_dirt_rock_pit_left_wall_and_ground_shaft_above', 'assets/sprites/mined_dirt_rock_pit_left_wall_and_broudn_shaft_above.png');
    this.load.image('mined_dirt_rock_pit_right_wall_and_ground_shaft_above', 'assets/sprites/mined_dirt_rock_pit_right_wall_and_broudn_shaft_above.png');
    // Free corner sprites - ceiling + side wall with shaft below and to the side
    this.load.image('mined_dirt_top_left_corner_free_space_around', 'assets/sprites/mined_dirt_top_left_corner_free_space_around.png');
    this.load.image('mined_dirt_top_right_corner_free_space_around', 'assets/sprites/mined_dirt_top_right_corner_free_space_around.png');
    // L-junction sprites - floor + side wall with shaft above and to the other side
    this.load.image('mined_dirt_rock_corner_L-junction-shaft_to_the_left', 'assets/sprites/mined_dirt_rock_corner_L-junction-shaft_to_the_left.png');
    this.load.image('mined_dirt_rock_corner_L-junction-shaft_to_the_right', 'assets/sprites/mined_dirt_rock_corner_L-junction-shaft_to_the_right.png');
    // Ceiling only sprite - open below, left, right
    this.load.image('mined_dirt_just_top_free_space_around', 'assets/sprites/mined_dirt_just top_free_space_around.png');

    // Track if PNGs loaded successfully
    this.load.on('filecomplete-image-shop_png', () => {
      this.shopPngLoaded = true;
    });
    this.load.on('filecomplete-image-repairshop_png', () => {
      this.repairPngLoaded = true;
    });
    this.load.on('filecomplete-image-rover_png', () => {
      this.roverPngLoaded = true;
    });
    this.load.on('filecomplete-image-rover_side', () => {
      this.roverSideLoaded = true;
    });
    this.load.on('filecomplete-image-rover_front', () => {
      this.roverFrontLoaded = true;
    });
    this.load.on('filecomplete-image-rover_back', () => {
      this.roverBackLoaded = true;
    });
    this.load.on('filecomplete-image-mars_dirt', () => {
      this.marsDirtLoaded = true;
    });
    this.load.on('filecomplete-spritesheet-rover_spritesheet', () => {
      this.roverSpritesheetLoaded = true;
      console.log('Rover spritesheet loaded successfully!');
    });
    this.load.on('filecomplete-spritesheet-rover_drill_spritesheet', () => {
      this.roverDrillSpritesheetLoaded = true;
      console.log('Rover drill spritesheet loaded successfully!');
    });
    this.load.on('filecomplete-spritesheet-rover_drill_down_spritesheet', () => {
      this.roverDrillDownSpritesheetLoaded = true;
      console.log('Rover drill down spritesheet loaded!');
    });
    this.load.on('filecomplete-spritesheet-rover_drill_up_spritesheet', () => {
      this.roverDrillUpSpritesheetLoaded = true;
      console.log('Rover drill up spritesheet loaded!');
    });
    this.load.on('filecomplete-spritesheet-cracks_spritesheet', () => {
      this.cracksSpritesheetLoaded = true;
      console.log('Cracks spritesheet loaded!');
    });
    this.load.on('filecomplete-spritesheet-rover_solar_spritesheet', () => {
      this.roverSolarSpritesheetLoaded = true;
      console.log('Rover solar spritesheet loaded!');
    });
    this.load.on('filecomplete-image-ladder_png', () => {
      this.ladderPngLoaded = true;
      console.log('Ladder sprite loaded!');
    });
    this.load.on('filecomplete-image-elevator_top_png', () => {
      this.elevatorTopLoaded = true;
    });
    this.load.on('filecomplete-image-elevator_rope_png', () => {
      this.elevatorRopeLoaded = true;
    });
    this.load.on('filecomplete-image-elevator_cart_png', () => {
      this.elevatorCartLoaded = true;
    });
    this.load.on('filecomplete-image-elevator_bottom_png', () => {
      this.elevatorBottomLoaded = true;
    });

    // Track deposit sprite loading
    this.load.on('filecomplete-image-deposit_coal', () => {
      this.depositCoalLoaded = true;
    });
    this.load.on('filecomplete-image-deposit_iron', () => {
      this.depositIronLoaded = true;
    });
    this.load.on('filecomplete-image-deposit_silver', () => {
      this.depositSilverLoaded = true;
    });
    this.load.on('filecomplete-image-deposit_gold', () => {
      this.depositGoldLoaded = true;
    });
    this.load.on('filecomplete-image-deposit_platinum', () => {
      this.depositPlatinumLoaded = true;
    });
    this.load.on('filecomplete-image-deposit_amethyst', () => {
      this.depositAmethystLoaded = true;
    });
    this.load.on('filecomplete-image-boulder_sprite', () => {
      this.boulderSpriteLoaded = true;
    });
  }

  create() {
    // Generate all textures
    this.generateTileTextures();
    this.generateBuildingTextures();

    // Use PNG rover sprites if loaded, otherwise generate procedurally
    if (this.roverPngLoaded || this.roverSpritesheetLoaded) {
      // Create texture alias from PNG sprite for static use
      if (this.roverPngLoaded) {
        this.textures.addImage('rover', this.textures.get('rover_png').getSourceImage());
      }

      // Create animations from spritesheet (128x128, 3 frames for rolling wheels)
      // Frames 0-2: drive animation (wheel rotation)
      this.anims.create({
        key: 'rover_drive',
        frames: this.anims.generateFrameNumbers('rover_spritesheet', { start: 0, end: 2 }),
        frameRate: 10,  // Smooth wheel rotation
        repeat: -1,
        yoyo: false
      });
      // Drill animations - normalized to loop in ~0.8 seconds (matches dirt drill time)
      // Side: 9 frames, Down: 13 frames, Up: 9 frames
      const DRILL_LOOP_TIME = 0.8; // seconds per animation loop

      // Drill animation - side (9 frames)
      if (this.roverDrillSpritesheetLoaded) {
        const sideFps = Math.round(9 / DRILL_LOOP_TIME); // 15 fps
        this.anims.create({
          key: 'rover_drill_right',
          frames: this.anims.generateFrameNumbers('rover_drill_spritesheet', { start: 0, end: 8 }),
          frameRate: sideFps,
          repeat: -1
        });
        this.anims.create({
          key: 'rover_drill_left',
          frames: this.anims.generateFrameNumbers('rover_drill_spritesheet', { start: 0, end: 8 }),
          frameRate: sideFps,
          repeat: -1
        });
      } else {
        this.anims.create({
          key: 'rover_drill_left',
          frames: [{ key: 'rover_spritesheet', frame: 0 }],
          frameRate: 1,
          repeat: 0
        });
        this.anims.create({
          key: 'rover_drill_right',
          frames: [{ key: 'rover_spritesheet', frame: 0 }],
          frameRate: 1,
          repeat: 0
        });
      }
      // Drill animation - down (13 frames)
      if (this.roverDrillDownSpritesheetLoaded) {
        const downFps = Math.round(13 / DRILL_LOOP_TIME); // 22 fps
        this.anims.create({
          key: 'rover_drill_down',
          frames: this.anims.generateFrameNumbers('rover_drill_down_spritesheet', { start: 0, end: 12 }),
          frameRate: downFps,
          repeat: -1
        });
      } else {
        this.anims.create({
          key: 'rover_drill_down',
          frames: [{ key: 'rover_spritesheet', frame: 0 }],
          frameRate: 1,
          repeat: 0
        });
      }
      // Drill animation - up (9 frames)
      if (this.roverDrillUpSpritesheetLoaded) {
        const upFps = Math.round(9 / DRILL_LOOP_TIME); // 15 fps
        this.anims.create({
          key: 'rover_drill_up',
          frames: this.anims.generateFrameNumbers('rover_drill_up_spritesheet', { start: 0, end: 8 }),
          frameRate: upFps,
          repeat: -1
        });
      } else {
        this.anims.create({
          key: 'rover_drill_up',
          frames: [{ key: 'rover_spritesheet', frame: 0 }],
          frameRate: 1,
          repeat: 0
        });
      }
      // Crack overlay animation (4 frames) - controlled by DrillSystem based on progress
      if (this.cracksSpritesheetLoaded) {
        this.anims.create({
          key: 'cracks',
          frames: this.anims.generateFrameNumbers('cracks_spritesheet', { start: 0, end: 3 }),
          frameRate: 4, // Will be overridden dynamically
          repeat: 0
        });
      }
      this.anims.create({
        key: 'rover_jetpack_anim',
        frames: [{ key: 'rover_spritesheet', frame: 0 }],
        frameRate: 1,
        repeat: 0
      });

      // Solar panel animations (254x254 sprite, 9 frames)
      if (this.roverSolarSpritesheetLoaded) {
        // Deploy animation: frames 0-4, takes ~1 second
        this.anims.create({
          key: 'rover_solar_deploy',
          frames: this.anims.generateFrameNumbers('rover_solar_spritesheet', { start: 0, end: 4 }),
          frameRate: 5,
          repeat: 0
        });
        // Wiggle animation: frames 5-8, loops while charging
        this.anims.create({
          key: 'rover_solar_wiggle',
          frames: this.anims.generateFrameNumbers('rover_solar_spritesheet', { start: 5, end: 8 }),
          frameRate: 4,
          repeat: -1
        });
        // Retract animation: frames 4-0 (reverse deploy)
        this.anims.create({
          key: 'rover_solar_retract',
          frames: this.anims.generateFrameNumbers('rover_solar_spritesheet', { start: 4, end: 0 }),
          frameRate: 8,
          repeat: 0
        });
      }
      console.log('Loaded rover spritesheet with 3-frame rolling animation!');
    } else {
      this.generateRoverTexture();
    }

    // Store PNG load status for GameScene to use
    this.registry.set('pngSprites', {
      shop: this.shopPngLoaded || false,
      repair: this.repairPngLoaded || false,
      rover: this.roverPngLoaded || this.roverSpritesheetLoaded || false,
      roverSide: this.roverSideLoaded || false,
      roverFront: this.roverFrontLoaded || false,
      roverBack: this.roverBackLoaded || false,
      marsDirt: this.marsDirtLoaded || false,
      roverSpritesheet: this.roverSpritesheetLoaded || false,
      roverDrillSpritesheet: this.roverDrillSpritesheetLoaded || false,
      roverDrillDownSpritesheet: this.roverDrillDownSpritesheetLoaded || false,
      roverDrillUpSpritesheet: this.roverDrillUpSpritesheetLoaded || false,
      cracksSpritesheet: this.cracksSpritesheetLoaded || false,
      roverSolarSpritesheet: this.roverSolarSpritesheetLoaded || false,
    });

    // Initialize game data if not exists
    if (!this.registry.get('gameData')) {
      this.registry.set('gameData', {
        money: 100, // Start with some money
        upgrades: {
          drillSpeed: 0,
          drillPower: 0,
          batteryCapacity: 0,
          cargoBay: 0,
          hullArmor: 0,
          wheelTraction: 0,
          headlights: 0,
          thrusters: 0,
        },
        inventory: [
          { type: 'ladder', quantity: 10 },
          { type: 'platform', quantity: 5 },
          { type: 'torch', quantity: 3 },
        ],
        cargo: [],
      });
    }

    this.scene.start('MenuScene');
  }

  generateTileTextures() {
    const tileSize = GAME_CONFIG.TILE_SIZE;

    // Use mars_dirt.png for dirt if loaded
    if (this.marsDirtLoaded && this.textures.exists('mars_dirt')) {
      this.textures.addImage('tile_dirt', this.textures.get('mars_dirt').getSourceImage());
      // Also use for surface with tint
      this.textures.addImage('tile_surface', this.textures.get('mars_dirt').getSourceImage());
    }

    // Use ladder.png for ladder tiles if loaded
    if (this.ladderPngLoaded && this.textures.exists('ladder_png')) {
      this.textures.addImage('tile_ladder', this.textures.get('ladder_png').getSourceImage());
    }

    // Use elevator sprites if loaded
    if (this.elevatorTopLoaded && this.textures.exists('elevator_top_png')) {
      this.textures.addImage('tile_elevatorTop', this.textures.get('elevator_top_png').getSourceImage());
    }
    if (this.elevatorRopeLoaded && this.textures.exists('elevator_rope_png')) {
      this.textures.addImage('tile_elevatorRope', this.textures.get('elevator_rope_png').getSourceImage());
    }
    if (this.elevatorCartLoaded && this.textures.exists('elevator_cart_png')) {
      this.textures.addImage('tile_elevatorCar', this.textures.get('elevator_cart_png').getSourceImage());
    }
    if (this.elevatorBottomLoaded && this.textures.exists('elevator_bottom_png')) {
      this.textures.addImage('tile_elevatorBottom', this.textures.get('elevator_bottom_png').getSourceImage());
    }

    // Use deposit sprites if loaded
    if (this.depositCoalLoaded && this.textures.exists('deposit_coal')) {
      this.textures.addImage('tile_coal', this.textures.get('deposit_coal').getSourceImage());
    }
    if (this.depositIronLoaded && this.textures.exists('deposit_iron')) {
      this.textures.addImage('tile_iron', this.textures.get('deposit_iron').getSourceImage());
    }
    if (this.depositSilverLoaded && this.textures.exists('deposit_silver')) {
      this.textures.addImage('tile_silver', this.textures.get('deposit_silver').getSourceImage());
    }
    if (this.depositGoldLoaded && this.textures.exists('deposit_gold')) {
      this.textures.addImage('tile_gold', this.textures.get('deposit_gold').getSourceImage());
    }
    if (this.depositPlatinumLoaded && this.textures.exists('deposit_platinum')) {
      this.textures.addImage('tile_platinum', this.textures.get('deposit_platinum').getSourceImage());
    }
    if (this.depositAmethystLoaded && this.textures.exists('deposit_amethyst')) {
      // Use amethyst for ruby (purple gem)
      this.textures.addImage('tile_ruby', this.textures.get('deposit_amethyst').getSourceImage());
    }
    if (this.boulderSpriteLoaded && this.textures.exists('boulder_sprite')) {
      this.textures.addImage('tile_boulder', this.textures.get('boulder_sprite').getSourceImage());
    }

    const colors = {
      surface: 0xc2703a,
      dirt: 0x8b4513,
      rock: 0x696969,
      hardRock: 0x2f4f4f,
      coal: 0x1a1a1a,
      iron: 0xc0c0c0,
      silver: 0xe8e8e8,
      gold: 0xffd700,
      platinum: 0xe5e4e2,
      ruby: 0xe0115f,
      emerald: 0x50c878,
      diamond: 0xb9f2ff,
      lava: 0xff4500,
      gas: 0xadff2f,
      ladder: 0x8b4513,
      platform: 0x666666,
      torch: 0xffaa00,
      elevator: 0x444488,
      teleporter: 0x8800ff,
      boulder: 0x555555,
      crystal: 0x00ffff,
      elevatorTop: 0x3366aa,
      elevatorRope: 0x445588,
      elevatorCar: 0x4477cc,
      elevatorBottom: 0x3366aa,
    };

    for (const [name, color] of Object.entries(colors)) {
      // Skip if we already loaded the PNG version
      if ((name === 'dirt' || name === 'surface') && this.marsDirtLoaded) {
        continue;
      }
      if (name === 'ladder' && this.ladderPngLoaded) {
        continue;
      }
      if (name === 'elevatorTop' && this.elevatorTopLoaded) {
        continue;
      }
      if (name === 'elevatorRope' && this.elevatorRopeLoaded) {
        continue;
      }
      if (name === 'elevatorCar' && this.elevatorCartLoaded) {
        continue;
      }
      if (name === 'elevatorBottom' && this.elevatorBottomLoaded) {
        continue;
      }
      // Skip ores if PNG deposits loaded
      if (name === 'coal' && this.depositCoalLoaded) {
        continue;
      }
      if (name === 'iron' && this.depositIronLoaded) {
        continue;
      }
      if (name === 'silver' && this.depositSilverLoaded) {
        continue;
      }
      if (name === 'gold' && this.depositGoldLoaded) {
        continue;
      }
      if (name === 'platinum' && this.depositPlatinumLoaded) {
        continue;
      }
      if (name === 'ruby' && this.depositAmethystLoaded) {
        continue;
      }
      if (name === 'boulder' && this.boulderSpriteLoaded) {
        continue;
      }

      const graphics = this.make.graphics({ x: 0, y: 0, add: false });

      // Main tile color with slight gradient
      graphics.fillStyle(color, 1);
      graphics.fillRect(0, 0, tileSize, tileSize);

      // Add texture/noise for visual interest
      const darkerColor = Phaser.Display.Color.ValueToColor(color).darken(20).color;
      graphics.fillStyle(darkerColor, 0.5);
      for (let i = 0; i < 8; i++) {
        const x = Math.floor(Math.random() * tileSize);
        const y = Math.floor(Math.random() * tileSize);
        graphics.fillRect(x, y, 3, 3);
      }

      // Highlight
      const lighterColor = Phaser.Display.Color.ValueToColor(color).lighten(20).color;
      graphics.fillStyle(lighterColor, 0.3);
      graphics.fillRect(2, 2, tileSize - 4, 2);
      graphics.fillRect(2, 2, 2, tileSize - 4);

      // Border
      graphics.lineStyle(1, 0x000000, 0.4);
      graphics.strokeRect(0, 0, tileSize, tileSize);

      // Special rendering for ores - add sparkle
      if (['gold', 'silver', 'platinum', 'ruby', 'emerald', 'diamond'].includes(name)) {
        graphics.fillStyle(0xffffff, 0.8);
        graphics.fillRect(tileSize / 4, tileSize / 4, 3, 3);
        graphics.fillRect(tileSize * 3 / 4, tileSize / 2, 2, 2);
      }

      // Special rendering for boulder - add cracks and darker border
      if (name === 'boulder') {
        // Darker border to show it's special
        graphics.fillStyle(0x333333, 1);
        graphics.fillRect(0, 0, tileSize, 4);
        graphics.fillRect(0, 0, 4, tileSize);
        graphics.fillRect(tileSize - 4, 0, 4, tileSize);
        graphics.fillRect(0, tileSize - 4, tileSize, 4);
        // Crack lines
        graphics.lineStyle(2, 0x444444, 0.8);
        graphics.beginPath();
        graphics.moveTo(tileSize * 0.2, tileSize * 0.3);
        graphics.lineTo(tileSize * 0.5, tileSize * 0.5);
        graphics.lineTo(tileSize * 0.4, tileSize * 0.8);
        graphics.strokePath();
        graphics.beginPath();
        graphics.moveTo(tileSize * 0.6, tileSize * 0.2);
        graphics.lineTo(tileSize * 0.7, tileSize * 0.6);
        graphics.strokePath();
      }

      // Special rendering for crystal - bright sparkles
      if (name === 'crystal') {
        // Multiple sparkle points
        graphics.fillStyle(0xffffff, 1);
        graphics.fillRect(tileSize / 3, tileSize / 4, 4, 4);
        graphics.fillRect(tileSize * 2 / 3, tileSize / 2, 4, 4);
        graphics.fillRect(tileSize / 2, tileSize * 3 / 4, 3, 3);
        graphics.fillRect(tileSize / 4, tileSize * 2 / 3, 3, 3);
        // Glow effect
        graphics.fillStyle(0x88ffff, 0.5);
        graphics.fillRect(tileSize / 3 - 2, tileSize / 4 - 2, 8, 8);
        graphics.fillRect(tileSize * 2 / 3 - 2, tileSize / 2 - 2, 8, 8);
      }

      // Special rendering for elevator components
      if (name === 'elevatorTop') {
        // Anchor bracket
        graphics.fillStyle(0x222266, 1);
        graphics.fillRect(tileSize / 4, tileSize / 2, tileSize / 2, tileSize / 4);
        graphics.fillStyle(0x666699, 1);
        graphics.fillRect(tileSize / 3, tileSize / 2 - 4, tileSize / 3, 8);
      }

      if (name === 'elevatorRope') {
        // Rope/cable - thin vertical line
        graphics.fillStyle(0x334466, 1);
        graphics.fillRect(tileSize / 2 - 4, 0, 8, tileSize);
      }

      if (name === 'elevatorCar') {
        // Platform car
        graphics.fillStyle(0x2255aa, 1);
        graphics.fillRect(4, tileSize / 4, tileSize - 8, tileSize / 2);
        // Rails on sides
        graphics.fillStyle(0x3366bb, 1);
        graphics.fillRect(8, 4, 4, tileSize - 8);
        graphics.fillRect(tileSize - 12, 4, 4, tileSize - 8);
      }

      // Special rendering for lava - add glow effect
      if (name === 'lava') {
        graphics.fillStyle(0xffff00, 0.4);
        graphics.fillRect(4, 4, tileSize - 8, tileSize - 8);
      }

      // Special rendering for ladder
      if (name === 'ladder') {
        graphics.fillStyle(0x5a3510, 1);
        graphics.fillRect(4, 0, 4, tileSize);
        graphics.fillRect(tileSize - 8, 0, 4, tileSize);
        graphics.fillRect(4, 6, tileSize - 8, 3);
        graphics.fillRect(4, 16, tileSize - 8, 3);
        graphics.fillRect(4, 26, tileSize - 8, 3);
      }

      graphics.generateTexture(`tile_${name}`, tileSize, tileSize);
      graphics.destroy();
    }

    // Generate air (transparent/dark background)
    const airGraphics = this.make.graphics({ x: 0, y: 0, add: false });
    airGraphics.fillStyle(0x1a1a2e, 1);
    airGraphics.fillRect(0, 0, tileSize, tileSize);
    airGraphics.generateTexture('tile_air', tileSize, tileSize);
    airGraphics.destroy();

    // Generate fog of war textures
    // Unexplored (completely dark)
    const unexploredGraphics = this.make.graphics({ x: 0, y: 0, add: false });
    unexploredGraphics.fillStyle(0x000000, 1);
    unexploredGraphics.fillRect(0, 0, tileSize, tileSize);
    unexploredGraphics.generateTexture('fog_unexplored', tileSize, tileSize);
    unexploredGraphics.destroy();

    // Explored but not visible (dim)
    const exploredGraphics = this.make.graphics({ x: 0, y: 0, add: false });
    exploredGraphics.fillStyle(0x000000, 0.6);
    exploredGraphics.fillRect(0, 0, tileSize, tileSize);
    exploredGraphics.generateTexture('fog_explored', tileSize, tileSize);
    exploredGraphics.destroy();
  }

  generateRoverTexture() {
    const size = GAME_CONFIG.TILE_SIZE;
    const graphics = this.make.graphics({ x: 0, y: 0, add: false });

    // Body
    graphics.fillStyle(0xffaa00, 1);
    graphics.fillRect(4, 8, size - 8, 12);

    // Cabin/top
    graphics.fillStyle(0xdd8800, 1);
    graphics.fillRect(8, 4, size - 16, 6);

    // Wheels
    graphics.fillStyle(0x444444, 1);
    graphics.fillCircle(8, 24, 5);
    graphics.fillCircle(size - 8, 24, 5);

    // Wheel hubs
    graphics.fillStyle(0x666666, 1);
    graphics.fillCircle(8, 24, 2);
    graphics.fillCircle(size - 8, 24, 2);

    // Solar panel
    graphics.fillStyle(0x4488ff, 1);
    graphics.fillRect(6, 2, size - 12, 3);

    // Antenna
    graphics.fillStyle(0xcccccc, 1);
    graphics.fillRect(size - 6, 0, 2, 6);

    graphics.generateTexture('rover', size, size);
    graphics.destroy();

    // Drilling version
    const drillGraphics = this.make.graphics({ x: 0, y: 0, add: false });

    // Same body
    drillGraphics.fillStyle(0xffaa00, 1);
    drillGraphics.fillRect(4, 8, size - 8, 12);
    drillGraphics.fillStyle(0xdd8800, 1);
    drillGraphics.fillRect(8, 4, size - 16, 6);
    drillGraphics.fillStyle(0x444444, 1);
    drillGraphics.fillCircle(8, 24, 5);
    drillGraphics.fillCircle(size - 8, 24, 5);
    drillGraphics.fillStyle(0x4488ff, 1);
    drillGraphics.fillRect(6, 2, size - 12, 3);

    // Drill
    drillGraphics.fillStyle(0x888888, 1);
    drillGraphics.fillTriangle(size / 2, size, size / 2 - 4, 20, size / 2 + 4, 20);

    drillGraphics.generateTexture('rover_drill', size, size);
    drillGraphics.destroy();

    // Jetpack version
    const jetGraphics = this.make.graphics({ x: 0, y: 0, add: false });

    // Same body
    jetGraphics.fillStyle(0xffaa00, 1);
    jetGraphics.fillRect(4, 8, size - 8, 12);
    jetGraphics.fillStyle(0xdd8800, 1);
    jetGraphics.fillRect(8, 4, size - 16, 6);
    jetGraphics.fillStyle(0x444444, 1);
    jetGraphics.fillCircle(8, 24, 5);
    jetGraphics.fillCircle(size - 8, 24, 5);
    jetGraphics.fillStyle(0x4488ff, 1);
    jetGraphics.fillRect(6, 2, size - 12, 3);

    // Thruster flames
    jetGraphics.fillStyle(0xff6600, 1);
    jetGraphics.fillTriangle(8, 28, 4, size, 12, size);
    jetGraphics.fillTriangle(size - 8, 28, size - 12, size, size - 4, size);
    jetGraphics.fillStyle(0xffff00, 1);
    jetGraphics.fillTriangle(8, 28, 6, size - 4, 10, size - 4);
    jetGraphics.fillTriangle(size - 8, 28, size - 10, size - 4, size - 6, size - 4);

    jetGraphics.generateTexture('rover_jetpack', size, size);
    jetGraphics.destroy();
  }

  generateBuildingTextures() {
    const tileSize = GAME_CONFIG.TILE_SIZE;

    // Shop building (3x3 tiles)
    const shopWidth = tileSize * 3;
    const shopHeight = tileSize * 3;
    const shopGraphics = this.make.graphics({ x: 0, y: 0, add: false });

    // Main building
    shopGraphics.fillStyle(0x4488ff, 1);
    shopGraphics.fillRect(0, tileSize, shopWidth, shopHeight - tileSize);

    // Roof
    shopGraphics.fillStyle(0x2266dd, 1);
    shopGraphics.fillTriangle(shopWidth / 2, 0, 0, tileSize, shopWidth, tileSize);

    // Door
    shopGraphics.fillStyle(0x222222, 1);
    shopGraphics.fillRect(shopWidth / 2 - 10, shopHeight - 24, 20, 24);

    // Windows
    shopGraphics.fillStyle(0xaaddff, 0.7);
    shopGraphics.fillRect(10, tileSize + 10, 20, 16);
    shopGraphics.fillRect(shopWidth - 30, tileSize + 10, 20, 16);

    // Sign
    shopGraphics.fillStyle(0xffdd00, 1);
    shopGraphics.fillRect(shopWidth / 2 - 20, tileSize + 4, 40, 12);

    shopGraphics.generateTexture('building_shop', shopWidth, shopHeight);
    shopGraphics.destroy();

    // Repair building
    const repairGraphics = this.make.graphics({ x: 0, y: 0, add: false });

    repairGraphics.fillStyle(0xff4444, 1);
    repairGraphics.fillRect(0, tileSize, shopWidth, shopHeight - tileSize);

    repairGraphics.fillStyle(0xcc2222, 1);
    repairGraphics.fillTriangle(shopWidth / 2, 0, 0, tileSize, shopWidth, tileSize);

    repairGraphics.fillStyle(0x222222, 1);
    repairGraphics.fillRect(shopWidth / 2 - 12, shopHeight - 28, 24, 28);

    repairGraphics.fillStyle(0xffaaaa, 0.7);
    repairGraphics.fillRect(10, tileSize + 10, 20, 16);
    repairGraphics.fillRect(shopWidth - 30, tileSize + 10, 20, 16);

    // Wrench symbol
    repairGraphics.fillStyle(0xffffff, 1);
    repairGraphics.fillRect(shopWidth / 2 - 2, tileSize + 6, 4, 16);

    repairGraphics.generateTexture('building_repair', shopWidth, shopHeight);
    repairGraphics.destroy();

    // Mine entrance (3x2 tiles)
    const entranceWidth = tileSize * 3;
    const entranceHeight = tileSize * 2;
    const entranceGraphics = this.make.graphics({ x: 0, y: 0, add: false });

    // Frame
    entranceGraphics.fillStyle(0x554433, 1);
    entranceGraphics.fillRect(0, 0, entranceWidth, 8);
    entranceGraphics.fillRect(0, 0, 8, entranceHeight);
    entranceGraphics.fillRect(entranceWidth - 8, 0, 8, entranceHeight);

    // Dark entrance hole
    entranceGraphics.fillStyle(0x111111, 1);
    entranceGraphics.fillRect(8, 8, entranceWidth - 16, entranceHeight - 8);

    // Warning lights
    entranceGraphics.fillStyle(0xffaa00, 1);
    entranceGraphics.fillCircle(16, 12, 6);
    entranceGraphics.fillCircle(entranceWidth - 16, 12, 6);

    // Support beams
    entranceGraphics.fillStyle(0x443322, 1);
    entranceGraphics.fillRect(entranceWidth / 2 - 2, 0, 4, entranceHeight);

    entranceGraphics.generateTexture('mine_entrance', entranceWidth, entranceHeight);
    entranceGraphics.destroy();
  }

}
