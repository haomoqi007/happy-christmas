const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

let width, height;
let particles = [];
let targets = { tree: [], text: [] };
let state = 'tree';

// --- 配置 ---
const config = {
    particleCount: 1200, // 粒子数量要足够多
    particleSize: 3, // 灯珠大小
    transitionSpeed: 0.04, // 变换速度
    fluctuation: 2, // 波动幅度
    treeWidthRatio: 0.6,
    treeHeightRatio: 0.8
};

function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
}

// --- 核心：生成图2风格的蓝白光色 ---
function getBlueWhiteColor() {
    const rand = Math.random();
    let r, g, b, a = 0.8 + Math.random() * 0.2;
    if (rand < 0.7) {
        // 70% 概率是蓝色调 (模仿图中的主色)
        r = 50 + Math.random() * 50;
        g = 180 + Math.random() * 75;
        b = 255;
    } else {
        // 30% 概率是亮白色/青色 (模仿图中的亮点)
        r = 220 + Math.random() * 35;
        g = 240 + Math.random() * 15;
        b = 255;
    }
    return `rgba(${Math.floor(r)}, ${Math.floor(g)}, ${Math.floor(b)}, ${a})`;
}

// --- 粒子类 ---
class Particle {
    constructor(index) {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        // 随机大小，增加真实感
        this.size = config.particleSize * (0.7 + Math.random() * 0.6); 
        this.color = getBlueWhiteColor(); // 使用蓝白色调
        this.targetIndex = index;
        this.offset = Math.random() * 100; // 随机波动相位
    }

    update(time) {
        let targetList = (state === 'tree') ? targets.tree : targets.text;
        // 循环使用目标点，确保所有粒子都有去处
        let target = targetList[this.targetIndex % targetList.length];

        if (target) {
            // 缓动飞向目标
            this.x += (target.x - this.x) * config.transitionSpeed;
            this.y += (target.y - this.y) * config.transitionSpeed;
        }

        // 原地呼吸波动，永不静止
        this.x += Math.sin(time * 0.004 + this.offset) * 0.3;
        this.y += Math.cos(time * 0.004 + this.offset) * 0.3;
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        // --- 关键：添加发光效果，模仿LED灯珠 ---
        ctx.shadowBlur = 8; // 光晕半径
        ctx.shadowColor = this.color; // 光晕颜色同粒子颜色
        ctx.fill();
        ctx.shadowBlur = 0; // 重置，避免影响性能
    }
}

// --- 生成圣诞树目标点 ---
function createTreePoints() {
    const points = [];
    const treeH = height * config.treeHeightRatio;
    const treeW = width * config.treeWidthRatio;
    const startY = height/2 + treeH/2; // 树底
    const startX = width/2;

    for (let i = 0; i < config.particleCount; i++) {
        const hRatio = Math.random(); // 0(顶) -> 1(底)
        const y = startY - hRatio * treeH;
        const currentW = hRatio * treeW;
        const x = startX + (Math.random() - 0.5) * currentW;
        points.push({ x, y });
    }
    targets.tree = points;
}

// --- 关键：生成文字目标点 (使用一种更稳定的方法) ---
function createTextPoints() {
    // 使用一个巨大的虚拟画布来确保字能写下
    const vSize = 1000; 
    const vCanvas = document.createElement('canvas');
    vCanvas.width = vSize;
    vCanvas.height = vSize / 2;
    const vCtx = vCanvas.getContext('2d');

    // 巨型粗体字
    vCtx.font = 'bold 300px sans-serif'; 
    vCtx.fillStyle = '#fff';
    vCtx.textAlign = 'center';
    vCtx.textBaseline = 'middle';
    vCtx.fillText("圣诞快乐", vSize / 2, vSize / 4);

    const imageData = vCtx.getImageData(0, 0, vSize, vSize/2).data;
    const points = [];
    // 密集扫描
    const step = 4; 

    for (let y = 0; y < vSize/2; y += step) {
        for (let x = 0; x < vSize; x += step) {
            // 只要有点不透明就认为是要的点
            if (imageData[(y * vSize + x) * 4 + 3] > 50) {
                // 计算缩放比例，把巨型字缩放到屏幕合适大小
                const scale = Math.min(width, height) / vSize * 1.8;
                points.push({
                    x: width/2 + (x - vSize/2) * scale,
                    y: height/2 + (y - vSize/4) * scale
                });
            }
        }
    }

    // 如果万一还是失败了（几乎不可能），至少显示一个方块阵列
    if (points.length === 0) {
        console.error("文字生成完全失败，使用方块兜底");
        for(let i=0; i<config.particleCount; i++){
            points.push({
                x: width/2 + (Math.random()-0.5)*width*0.5,
                y: height/2 + (Math.random()-0.5)*height*0.2
            });
        }
    }
    targets.text = points;
}

// --- 动画循环 ---
let startTime = null;
function animate(timestamp) {
    if (!startTime) startTime = timestamp;
    const progress = timestamp - startTime;

    // 使用半透明黑色清空屏幕，制造一点点拖尾效果，更有光感
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, width, height);

    // 3.5秒后开始变字
    if (state === 'tree' && progress > 3500) {
        state = 'text';
    }

    particles.forEach(p => {
        p.update(timestamp);
        p.draw();
    });

    requestAnimationFrame(animate);
}

// --- 初始化 ---
function init() {
    resize();
    createTreePoints();
    createTextPoints();
    
    particles = [];
    // 创建足量的粒子
    for (let i = 0; i < config.particleCount; i++) {
        particles.push(new Particle(i));
    }

    startTime = null;
    state = 'tree';
    animate();
}

window.addEventListener('resize', () => {
    init(); // 窗口变了就重来
});

init();
