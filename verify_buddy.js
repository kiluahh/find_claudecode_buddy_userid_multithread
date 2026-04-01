#!/usr/bin/env bun

/**
 * 验证userID是否生成指定条件的宠物
 * 用法: bun verify_buddy.js <userID> [条件]
 */

const SALT = 'friend-2026-401';

// 常量定义
const RARITIES = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
const RARITY_WEIGHTS = {
  common: 60,
  uncommon: 25,
  rare: 10,
  epic: 4,
  legendary: 1,
};

const SPECIES = [
  'duck', 'goose', 'blob', 'cat', 'dragon', 'octopus', 'owl',
  'penguin', 'turtle', 'snail', 'ghost', 'axolotl', 'capybara',
  'cactus', 'robot', 'rabbit', 'mushroom', 'chonk'
];

const EYES = ['·', '✦', '×', '◉', '@', '°'];
const HATS = ['none', 'crown', 'tophat', 'propeller', 'halo', 'wizard', 'beanie', 'tinyduck'];

const STAT_NAMES = ['DEBUGGING', 'PATIENCE', 'CHAOS', 'WISDOM', 'SNARK'];

const RARITY_FLOOR = {
  common: 5,
  uncommon: 15,
  rare: 25,
  epic: 35,
  legendary: 50,
};

// 从companion.ts复制的算法
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(s) {
  if (typeof Bun !== 'undefined') {
    return Number(BigInt(Bun.hash(s)) & 0xffffffffn);
  }
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

function rollRarity(rng) {
  const total = Object.values(RARITY_WEIGHTS).reduce((a, b) => a + b, 0);
  let roll = rng() * total;
  for (const rarity of RARITIES) {
    roll -= RARITY_WEIGHTS[rarity];
    if (roll < 0) return rarity;
  }
  return 'common';
}

function rollStats(rng, rarity) {
  const floor = RARITY_FLOOR[rarity];
  const peak = pick(rng, STAT_NAMES);
  let dump = pick(rng, STAT_NAMES);
  while (dump === peak) dump = pick(rng, STAT_NAMES);

  const stats = {};
  for (const name of STAT_NAMES) {
    if (name === peak) {
      stats[name] = Math.min(100, floor + 50 + Math.floor(rng() * 30));
    } else if (name === dump) {
      stats[name] = Math.max(1, floor - 10 + Math.floor(rng() * 15));
    } else {
      stats[name] = floor + Math.floor(rng() * 40);
    }
  }
  return stats;
}

function generateCompanion(userId) {
  const key = userId + SALT;
  const rng = mulberry32(hashString(key));

  const rarity = rollRarity(rng);
  const bones = {
    rarity,
    species: pick(rng, SPECIES),
    eye: pick(rng, EYES),
    hat: rarity === 'common' ? 'none' : pick(rng, HATS),
    shiny: rng() < 0.01,
    stats: rollStats(rng, rarity),
  };
  return { bones, inspirationSeed: Math.floor(rng() * 1e9) };
}

function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.log('用法: bun verify_buddy.js <userID> [条件]');
    console.log('示例: bun verify_buddy.js 1234... --rarity legendary --species cat');
    process.exit(1);
  }

  const userId = args[0];
  const conditions = {};

  // 简单参数解析
  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--rarity' && args[i + 1]) {
      conditions.rarity = args[i + 1];
      i++;
    } else if (args[i] === '--species' && args[i + 1]) {
      conditions.species = args[i + 1];
      i++;
    } else if (args[i] === '--shiny') {
      conditions.shiny = true;
    } else if (args[i] === '--eye' && args[i + 1]) {
      conditions.eye = args[i + 1];
      i++;
    } else if (args[i] === '--hat' && args[i + 1]) {
      conditions.hat = args[i + 1];
      i++;
    }
  }

  console.log(`验证userID: ${userId.substring(0, 16)}...`);
  console.log('条件:', conditions);

  const result = generateCompanion(userId);
  const { bones, inspirationSeed } = result;

  console.log('\n生成的宠物:');
  console.log('稀有度:', bones.rarity);
  console.log('物种:', bones.species);
  console.log('眼睛:', bones.eye);
  console.log('帽子:', bones.hat);
  console.log('闪亮:', bones.shiny ? '是' : '否');
  console.log('属性:');
  for (const [stat, value] of Object.entries(bones.stats)) {
    console.log(`  ${stat}: ${value}`);
  }
  console.log(`灵感种子: ${inspirationSeed}`);

  // 检查条件
  let matched = true;
  console.log('\n条件检查:');
  if (conditions.rarity && bones.rarity !== conditions.rarity) {
    console.log(`  ❌ 稀有度: ${bones.rarity} !== ${conditions.rarity}`);
    matched = false;
  } else if (conditions.rarity) {
    console.log(`  ✅ 稀有度: ${bones.rarity}`);
  }

  if (conditions.species && bones.species !== conditions.species) {
    console.log(`  ❌ 物种: ${bones.species} !== ${conditions.species}`);
    matched = false;
  } else if (conditions.species) {
    console.log(`  ✅ 物种: ${bones.species}`);
  }

  if (conditions.eye && bones.eye !== conditions.eye) {
    console.log(`  ❌ 眼睛: ${bones.eye} !== ${conditions.eye}`);
    matched = false;
  } else if (conditions.eye) {
    console.log(`  ✅ 眼睛: ${bones.eye}`);
  }

  if (conditions.hat && bones.hat !== conditions.hat) {
    console.log(`  ❌ 帽子: ${bones.hat} !== ${conditions.hat}`);
    matched = false;
  } else if (conditions.hat) {
    console.log(`  ✅ 帽子: ${bones.hat}`);
  }

  if (conditions.shiny !== undefined && bones.shiny !== conditions.shiny) {
    console.log(`  ❌ 闪亮: ${bones.shiny} !== ${conditions.shiny}`);
    matched = false;
  } else if (conditions.shiny !== undefined) {
    console.log(`  ✅ 闪亮: ${bones.shiny}`);
  }

  console.log('\n' + (matched ? '✅ 宠物匹配所有条件!' : '❌ 宠物不匹配条件'));
}

if (require.main === module) {
  main();
}