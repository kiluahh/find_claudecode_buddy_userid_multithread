#!/usr/bin/env bun

/**
 * Buddy宠物userID暴力搜索工具 - 多线程版
 * 使用Worker Threads并行搜索，最大化CPU利用率
 * 需要先安装bun，然后在控制台输入下面的启动命令。不适合用node启动，算法不一样。
 * 用法: bun find_buddy_userid_multithread.js [选项]
 * 得到id后，在"C:\Users\用户名\.claude.json"修改id，并删除companion字段的信息。
 * 保存后重启claudecode
 */

const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const os = require('os');

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

// ================ 用户可配置的搜索条件 ================
// 在这里直接修改条件值，或通过命令行参数覆盖
// 数据类型说明:
//   rarity:   字符串，可选值: 'common', 'uncommon', 'rare', 'epic', 'legendary'
//   species:  字符串，可选值: 'duck', 'goose', 'blob', 'cat', 'dragon', 'octopus', 'owl', 'penguin', 'turtle', 'snail', 'ghost', 'axolotl', 'capybara', 'cactus', 'robot', 'rabbit', 'mushroom', 'chonk'
//   shiny:    布尔值，true表示只搜索闪亮宠物，false表示只搜索非闪亮宠物，undefined表示不限制
//   eye:      字符串，可选值: '·', '✦', '×', '◉', '@', '°' （注意：眼睛符号是单个字符，复制时请勿添加空格）
//   hat:      字符串，可选值: 'none', 'crown', 'tophat', 'propeller', 'halo', 'wizard', 'beanie', 'tinyduck'
//             注意：稀有度为'common'时帽子固定为'none'，如果同时设置rarity: 'common'和hat非none，将永远无法匹配
//   minStats: 对象，指定每个属性的最小值，例如 {DEBUGGING: 50, PATIENCE: 30}
//             属性名必须全大写：DEBUGGING, PATIENCE, CHAOS, WISDOM, SNARK
// 传说级好属性：100，89，89，85，54。不按顺序，不考虑物种、闪光、眼睛、帽子，在32线程电脑需要18秒左右
// 传说级属性：100，89，89，86，54。不按顺序，不考虑物种、闪光、眼睛、帽子，在32线程电脑需要40秒左右
// 传说级好属性：100，89，89，87，54。不按顺序，不考虑物种、闪光、眼睛、帽子，在32线程电脑需要22秒左右
//传说级属性：100，89，89，88，54。不按顺序，不考虑物种、闪光、眼睛、帽子，在32线程电脑需要88秒左右
//预计最高属性是100，89，89，89，54
const CONFIG = {
  // 稀有度条件，设置为null或undefined表示不限制
  rarity: 'legendary',
  // 物种条件，设置为null或undefined表示不限制
  species: 'duck',
  // 闪亮条件，true=只搜索闪亮，false=只搜索非闪亮，undefined=不限制
  // 注意：普通版默认值为true（只搜索闪亮宠物）
  shiny: true,
  // 眼睛条件，设置为null或undefined表示不限制
  eye: '✦',
  // 帽子条件，设置为null或undefined表示不限制
  hat: null,
  // 最小属性条件，设置为null或undefined表示不限制
  minStats: {DEBUGGING: 100},
};





// ================ Worker线程代码 ================
if (!isMainThread) {
  // Worker线程的搜索逻辑
  const { conditions, workerId, totalWorkers, maxIterations, useBunHash } = workerData;

  // 调试：检查Bun是否可用（只在第一个worker输出）
  if (workerId === 0) {
    console.log(`[Worker ${workerId}] Bun available: ${typeof Bun !== 'undefined'}`);
  }

  // 优化版工具函数（与主线程相同）
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
    // 使用主线程传递的标志来决定哈希算法，确保一致性
    if (useBunHash) {
      if (typeof Bun !== 'undefined') {
        return Number(BigInt(Bun.hash(s)) & 0xffffffffn);
      } else {
        console.warn(`[Worker ${workerId}] useBunHash=true但Bun不可用，使用FNV-1a哈希`);
      }
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

  // 优化的随机userID生成
  function generateRandomUserIdFast() {
    const buffer = new Uint8Array(32);
    crypto.getRandomValues(buffer);

    const hexChars = '0123456789abcdef';
    const result = new Array(64);

    for (let i = 0; i < buffer.length; i++) {
      const byte = buffer[i];
      result[i * 2] = hexChars[byte >> 4];
      result[i * 2 + 1] = hexChars[byte & 0xf];
    }

    return result.join('');
  }

  // 流水线检查 - 必须与源代码顺序完全一致
  function checkUserIdWithPipeline(userId) {
    const key = userId + SALT;
    const rng = mulberry32(hashString(key));

    // 第1步：检查稀有度 (rollFrom第92行: const rarity = rollRarity(rng))
    const rarity = rollRarity(rng);
    if (conditions.rarity != null && rarity !== conditions.rarity) return null;

    // 第2步：检查物种 (rollFrom第95行: species: pick(rng, SPECIES))
    const species = pick(rng, SPECIES);
    if (conditions.species != null && species !== conditions.species) return null;

    // 第3步：检查眼睛 (rollFrom第96行: eye: pick(rng, EYES))
    const eye = pick(rng, EYES);
    if (conditions.eye != null && eye !== conditions.eye) return null;

    // 第4步：检查帽子 (rollFrom第97行: hat: rarity === 'common' ? 'none' : pick(rng, HATS))
    const hat = rarity === 'common' ? 'none' : pick(rng, HATS);
    if (conditions.hat != null && hat !== conditions.hat) return null;

    // 第5步：检查闪亮 (rollFrom第98行: shiny: rng() < 0.01)
    const shiny = rng() < 0.01;
    if (conditions.shiny !== undefined && shiny !== conditions.shiny) return null;

    // 第6步：生成属性 (rollFrom第99行: stats: rollStats(rng, rarity))
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

    // 第7步：检查最小属性
    if (conditions.minStats && Object.keys(conditions.minStats).length > 0) {
      for (const [stat, minValue] of Object.entries(conditions.minStats)) {
        if (stats[stat] < minValue) return null;
      }
    }

    // 灵感种子 (rollFrom第101行: inspirationSeed: Math.floor(rng() * 1e9))
    return {
      bones: { rarity, species, eye, hat, shiny, stats },
      inspirationSeed: Math.floor(rng() * 1e9),
      userId
    };
  }

  // 验证函数：用找到的userID重新生成宠物并检查条件
  function verifyUserId(userId, expectedConditions) {
    const key = userId + SALT;
    const rng = mulberry32(hashString(key));

    // 按照源代码顺序生成所有属性
    const rarity = rollRarity(rng);
    const species = pick(rng, SPECIES);
    const eye = pick(rng, EYES);
    const hat = rarity === 'common' ? 'none' : pick(rng, HATS);
    const shiny = rng() < 0.01;

    // 生成属性
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

    // 检查所有条件
    if (expectedConditions.rarity != null && rarity !== expectedConditions.rarity) {
      return { valid: false, reason: `稀有度不匹配: ${rarity} !== ${expectedConditions.rarity}` };
    }
    if (expectedConditions.species != null && species !== expectedConditions.species) {
      return { valid: false, reason: `物种不匹配: ${species} !== ${expectedConditions.species}` };
    }
    if (expectedConditions.eye != null && eye !== expectedConditions.eye) {
      return { valid: false, reason: `眼睛不匹配: ${eye} !== ${expectedConditions.eye}` };
    }
    if (expectedConditions.hat != null && hat !== expectedConditions.hat) {
      return { valid: false, reason: `帽子不匹配: ${hat} !== ${expectedConditions.hat}` };
    }
    if (expectedConditions.shiny !== undefined && shiny !== expectedConditions.shiny) {
      return { valid: false, reason: `闪亮不匹配: ${shiny} !== ${expectedConditions.shiny}` };
    }
    if (expectedConditions.minStats && Object.keys(expectedConditions.minStats).length > 0) {
      for (const [stat, minValue] of Object.entries(expectedConditions.minStats)) {
        if (stats[stat] < minValue) {
          return { valid: false, reason: `属性 ${stat} 不足: ${stats[stat]} < ${minValue}` };
        }
      }
    }

    return {
      valid: true,
      bones: { rarity, species, eye, hat, shiny, stats },
      inspirationSeed: Math.floor(rng() * 1e9)
    };
  }

  // Worker主循环
  let iterations = 0;
  const startTime = Date.now();
  const reportInterval = 10000; // 每10000次报告一次，以便及时检测最大迭代次数

  function searchLoop() {
    while (true) {
      const userId = generateRandomUserIdFast();
      const result = checkUserIdWithPipeline(userId);

      iterations++;

      // 检查是否达到该worker的最大迭代次数
      if (iterations >= maxIterations) {
        // 发送最终进度报告
        const elapsed = (Date.now() - startTime) / 1000;
        const rate = iterations / elapsed;
        parentPort.postMessage({
          type: 'progress',
          workerId,
          iterations,
          rate: Math.floor(rate),
          elapsed: Math.floor(elapsed)
        });
        break;
      }

      if (iterations % reportInterval === 0) {
        const elapsed = (Date.now() - startTime) / 1000;
        const rate = iterations / elapsed;
        parentPort.postMessage({
          type: 'progress',
          workerId,
          iterations,
          rate: Math.floor(rate),
          elapsed: Math.floor(elapsed)
        });
      }

      if (result) {
        // 验证找到的userID
        const verification = verifyUserId(result.userId, conditions);
        if (!verification.valid) {
          console.error(`[Worker ${workerId}] 验证失败: ${verification.reason}`);
          console.error(`[Worker ${workerId}] userID: ${result.userId.substring(0, 16)}...`);
          // checkUserIdWithPipeline函数有bug，继续搜索
          continue;
        }

        parentPort.postMessage({
          type: 'found',
          workerId,
          result,
          iterations,
          totalTime: (Date.now() - startTime) / 1000
        });
        return;
      }
    }
  }

  // 开始搜索
  searchLoop();
}

// ================ 主线程代码 ================
if (isMainThread) {
  function main() {
    const args = process.argv.slice(2);

    // 默认搜索条件（使用CONFIG中的值）
    const conditions = {
      rarity: CONFIG.rarity,
      species: CONFIG.species,
      shiny: CONFIG.shiny,
      eye: CONFIG.eye,
      hat: CONFIG.hat,
      minStats: CONFIG.minStats || {},
    };
    let maxIterations = 100000000000000000;
    let threadCount = Math.max(1, os.cpus().length - 1); // 留一个核心给系统

    // 参数解析
    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--rarity' && args[i + 1]) {
        conditions.rarity = args[i + 1];
        i++;
      } else if (args[i] === '--species' && args[i + 1]) {
        conditions.species = args[i + 1];
        i++;
      } else if (args[i] === '--shiny') {
        // --shiny 后面可以跟 true/false，如果没有值则默认为true
        if (args[i + 1] === 'true' || args[i + 1] === 'false') {
          conditions.shiny = args[i + 1] === 'true';
          i++;
        } else {
          conditions.shiny = true;
        }
      } else if (args[i] === '--eye' && args[i + 1]) {
        conditions.eye = args[i + 1];
        i++;
      } else if (args[i] === '--hat' && args[i + 1]) {
        conditions.hat = args[i + 1];
        i++;
      } else if (args[i] === '--min-stats' && args[i + 1]) {
        // 格式: "DEBUGGING:50,PATIENCE:30"
        const pairs = args[i + 1].split(',');
        conditions.minStats = {};
        for (const pair of pairs) {
          const [stat, value] = pair.split(':');
          if (STAT_NAMES.includes(stat)) {
            conditions.minStats[stat] = parseInt(value, 10);
          }
        }
        i++;
      } else if (args[i] === '--max-iterations' && args[i + 1]) {
        maxIterations = parseInt(args[i + 1], 10);
        i++;
      } else if (args[i] === '--threads' && args[i + 1]) {
        threadCount = parseInt(args[i + 1], 10);
        i++;
      } else if (args[i] === '--help') {
        console.log(`用法: bun ${__filename} [选项]
选项:
  --rarity <稀有度>    搜索指定稀有度 (common, uncommon, rare, epic, legendary)
  --species <物种>     搜索指定物种
  --shiny [true|false] 只搜索闪亮宠物（默认true）
  --eye <眼睛符号>     搜索指定眼睛符号 (·, ✦, ×, ◉, @, °)
  --hat <帽子>         搜索指定帽子 (none, crown, tophat, propeller, halo, wizard, beanie, tinyduck)
  --min-stats <条件>   最小属性条件，格式: "DEBUGGING:50,PATIENCE:30"
  --max-iterations <N> 最大尝试次数 (默认: 1000000)
  --threads <N>        使用的线程数 (默认: CPU核心数-1)
  --help               显示此帮助信息

示例:
  bun find_buddy_userid_multithread.js --rarity legendary --species dragon
  bun find_buddy_userid_multithread.js --rarity epic --shiny --threads 4
  bun find_buddy_userid_multithread.js --species cat --rarity rare
  bun find_buddy_userid_multithread.js --eye ✦ --hat crown
  bun find_buddy_userid_multithread.js --min-stats "DEBUGGING:80,WISDOM:70"`);
        process.exit(0);
      }
    }

    // 计算每个worker的最大迭代次数
    const maxIterationsPerWorker = Math.ceil(maxIterations / threadCount);
    console.log('多线程搜索启动...');
    console.log('搜索条件:', JSON.stringify(conditions, null, 2));
    console.log(`线程数: ${threadCount}`);
    console.log(`每个worker最大尝试次数: ${maxIterationsPerWorker.toLocaleString()}`);
    console.log('按 Ctrl+C 停止搜索\n');

    // 检查Bun是否可用（用于哈希函数一致性）
    const useBunHash = typeof Bun !== 'undefined';
    console.log(`Bun可用: ${useBunHash}`);

    const startTime = Date.now();
    let totalIterations = 0;
    let found = false;
    let workersCompleted = 0;
    const workers = [];

    // 进度报告
    let lastReportTime = Date.now();
    const reportInterval = 5000; // 5秒报告一次

    function printProgress() {
      const elapsed = (Date.now() - startTime) / 1000;
      const rate = totalIterations / elapsed;
      console.log(`总尝试: ${totalIterations.toLocaleString()} 次, 速度: ${rate.toFixed(0)} 次/秒, 耗时: ${elapsed.toFixed(1)} 秒`);
    }

    // 创建Worker
    for (let i = 0; i < threadCount; i++) {
      const worker = new Worker(__filename, {
        workerData: {
          conditions,
          workerId: i,
          totalWorkers: threadCount,
          maxIterations: maxIterationsPerWorker,
          useBunHash
        }
      });

      worker.on('message', (message) => {
        switch (message.type) {
          case 'progress':
            totalIterations += message.iterations - (worker.lastIterations || 0);
            worker.lastIterations = message.iterations;

            // 定期报告总进度
            const now = Date.now();
            if (now - lastReportTime > reportInterval) {
              printProgress();
              lastReportTime = now;
            }
            break;

          case 'found':
            if (!found) {
              found = true;
              console.log('\n' + '='.repeat(60));
              console.log(`线程 ${message.workerId} 找到匹配的userID!`);
              console.log(`该线程尝试次数: ${message.iterations}`);
              console.log(`总耗时: ${message.totalTime.toFixed(1)} 秒`);

              // 显示结果
              const { result } = message;
              console.log('='.repeat(50));
              console.log(`userID: ${result.userId.substring(0, 16)}...`);
              console.log(`稀有度: ${result.bones.rarity}`);
              console.log(`物种: ${result.bones.species}`);
              console.log(`眼睛: ${result.bones.eye}`);
              console.log(`帽子: ${result.bones.hat}`);
              console.log(`闪亮: ${result.bones.shiny ? '是' : '否'}`);
              console.log('属性:');
              for (const [stat, value] of Object.entries(result.bones.stats)) {
                console.log(`  ${stat}: ${value}`);
              }
              console.log(`灵感种子: ${result.inspirationSeed}`);
              console.log('='.repeat(50));

              console.log('\n复制以下userID到~/.claude.json的"userID"字段:');
              console.log(result.userId);
              console.log('\n注意: 需要删除"companion"字段并重启Claude执行/buddy命令重新孵化');

              // 停止所有worker
              workers.forEach(w => w.terminate());
              printProgress();
              process.exit(0);
            }
            break;
        }
      });

      worker.on('error', (err) => {
        console.error(`Worker ${i} 错误:`, err);
      });

      worker.on('exit', (code) => {
        workersCompleted++;
        if (workersCompleted === threadCount && !found) {
          console.log('\n所有worker已完成，未找到匹配的宠物');
          printProgress();
          process.exit(0);
        }
      });

      workers.push(worker);
    }

    // 处理Ctrl+C
    process.on('SIGINT', () => {
      console.log('\n收到停止信号，正在终止所有worker...');
      workers.forEach(w => w.terminate());
      printProgress();
      process.exit(0);
    });
  }

  // 运行主函数
  main();
}