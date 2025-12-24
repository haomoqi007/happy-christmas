const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

let width, height;
let particles = [];
let backgroundParticles = []; // 新增：背景氛围粒子
let textTargets = [];
let treeTargets = [];
let state = 'tree'; 
let particleCount = 0; 

// --- 配置 ---
const config = {
    text: '圣诞快乐',
    fontSize: 120, 
    particleSize: 3, // 稍微调大一点点，更有光感
    treeWidthRatio: 0.4,
    treeHeightRatio: 0.7,
    transitionDelay: 3000,
    transitionSpeed: 0.03, // 移动速度
    fluctuationSpeed: 0.002, // 呼吸速度 (基于时间戳，慢一点更有质感)
    fluctuationRange: 3, // 呼吸幅度 (晃动范围)
    bgColor: '#000',
    bgParticleCount: 150 // 背景星星的数量
};

function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
}

// 颜色生成逻辑 (保持之前的渐变风格)
function getColor(y) {
    const contentCenterY = height / 2;
    const yRatio = (y - contentCenterY) / (height * config.treeHeightRatio / 2);
    
    let r, g, b;
    if (yRatio < 0) { 
        // 上方蓝/白
        r = 150 + (1+yRatio) * 105;
        g = 220 + (1+yRatio) * 35;
        b = 255;
    } else {
        // 下方红/金
        r = 255;
        g = 180 - yRatio * 150;
        b = 100 - yRatio * 100;
    }
    return `rgba(${r},${g},${b}, 0.9)`; // 增加一点透明度让重叠处更亮
}

// --- 核心粒子类 (组成形状的) ---
class Particle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.treeX = x;
        this.treeY = y;
        this.textX = null;
        this.textY = null;
        this.size = config.particleSize * (0.8 + Math.random() * 0.4); // 大小随机微调
        this.color = getColor(y);
        
        // 每个粒子有自己的相位，这样波动不会整齐划一，看起来更自然
        this.randomOffset = Math.random() * 100; 
    }

    update(time) {
        let tx, ty;
        if (state === 'tree') {
            tx = this.treeX;
            ty = this.treeY;
        } else {
            tx = this.textX;
            ty = this.textY;
        }

        // 1. 飞向目标
        this.x += (tx - this.x) * config.transitionSpeed;
        this.y += (ty - this.y) * config.transitionSpeed;

        // 2. 永动逻辑：一直在目标位置附近正弦波动
        // 利用 time 加上随机偏移，让每个点动的轨迹都不一样
        this.x += Math.sin(time * config.fluctuationSpeed + this.randomOffset) * 0.5; 
        this.y += Math.cos(time * config.fluctuationSpeed + this.randomOffset) * 0.5;
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
    }
}

// --- 新增：背景氛围粒子类 (周围散落的星星) ---
class BackgroundParticle {
    constructor() {
        this.reset();
        // 初始随机位置
        this.x = Math.random() * width;
        this.y = Math.random() * height;
    }

    reset() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.size = Math.random() * 2; // 背景粒子比较小
        this.speedX = (Math.random() - 0.5) * 0.5; // 缓慢飘动
        this.speedY = (Math.random() - 0.5) * 0.5;
        this.alpha = 0.1 + Math.random() * 0.4; // 透明度
        // 偶尔偏蓝，偶尔偏白
        const isBlue = Math.random() > 0.5;
        this.color = isBlue ? `rgba(100, 200, 255, ${this.alpha})` : `rgba(255, 255, 255, ${this.alpha})`;
    }

    update() {
        this.x += this.speedX;
        this.y += this.speedY;

        // 边界检查：跑出屏幕就重置回来
        if (this.x < 0 || this.x > width || this.y < 0 || this.y > height) {
            this.reset();
        }
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
    }
}


function initTextTargets() {
    const offCanvas = document.createElement('canvas');
    offCanvas.width = width;
    offCanvas.height = height;
    const offCtx = offCanvas.getContext('2d');

    offCtx.font = `bold ${config.fontSize}px "Microsoft YaHei", sans-serif`;
    offCtx.fillStyle = '#FFFFFF';
    offCtx.textAlign = 'center';
    offCtx.textBaseline = 'middle';
    offCtx.fillText(config.text, width / 2, height / 2);

    const imageData = offCtx.getImageData(0, 0, width, height).data;
    textTargets = [];
    const step = 5; // 稍微稀疏一点，让每个点看起更清楚
    for (let y = 0; y < height; y += step) {
        for (let x = 0; x < width; x += step) {
            const index = (y * width + x) * 4;
            if (imageData[index + 3] > 128) {
                textTargets.push({ x, y });
            }
        }
    }
    particleCount = textTargets.length;
}

function initParticles() {
    particles = [];
    backgroundParticles = [];
    treeTargets = [];
    
    // 初始化树形目标
    const treeBaseY = height / 2 + (height * config.treeHeightRatio / 2);
    const treeTopY = height / 2 - (height * config.treeHeightRatio / 2);
    const treeHeight = treeBaseY - treeTopY;
    const maxTreeWidth = width * config.treeWidthRatio;

    for (let i = 0; i < particleCount; i++) {
        const y = treeTopY + Math.random() * treeHeight;
        const widthAtY = maxTreeWidth * ((y - treeTopY) / treeHeight);
        const x = width / 2 + (Math.random() - 0.5) * widthAtY;
        
        treeTargets.push({x, y});
        const p = new Particle(x, y);
        // 分配文字目标
        // 随机打乱一点，让变换过程更有趣
        const targetIndex = i % textTargets.length;
        p.textX = textTargets[targetIndex].x;
        p.textY = textTargets[targetIndex].y;
        
        particles.push(p);
    }

    // 初始化背景氛围粒子
    for (let i = 0; i < config.bgParticleCount; i++) {
        backgroundParticles.push(new BackgroundParticle());
    }
}

let startTime = null;
function animate(timestamp) {
    if (!startTime) startTime = timestamp;
    const progress = timestamp - startTime;

    // 稍微保留一点上一帧的残影，制造“拖尾”的光感 (可选，不喜欢可以改成 clearRect)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(0, 0, width, height);
    // ctx.clearRect(0, 0, width, height); // 如果觉得画面太脏，就用这一行代替上面两行

    if (state === 'tree' && progress > config.transitionDelay) {
        state = 'text';
    }

    // 绘制背景
    backgroundParticles.forEach(p => {
        p.update();
        p.draw();
    });

    // 绘制主体
    particles.forEach(p => {
        p.update(timestamp);
        p.draw();
    });

    requestAnimationFrame(animate);
}

window.addEventListener('resize', () => {
    resize();
    initTextTargets();
    initParticles();
    state = 'tree';
    startTime = null;
});

function init() {
    resize();
    initTextTargets();
    initParticles();
    animate();
}

init();