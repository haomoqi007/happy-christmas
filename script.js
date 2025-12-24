const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

let width, height;
let particles = [];
let backgroundParticles = []; 
let textTargets = [];
let treeTargets = [];
let state = 'tree'; 
let particleCount = 0; 

const config = {
    text: '圣诞快乐',
    // 移除固定的 fontSize，改用动态计算
    particleSize: 3, 
    treeWidthRatio: 0.4,
    treeHeightRatio: 0.7,
    transitionDelay: 3000,
    transitionSpeed: 0.03,
    fluctuationSpeed: 0.002,
    fluctuationRange: 3,
    bgParticleCount: 100 
};

function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
}

function getColor(y) {
    const contentCenterY = height / 2;
    const h = height * config.treeHeightRatio;
    const yRatio = (y - contentCenterY) / (h / 2);
    
    let r, g, b;
    if (yRatio < 0) { 
        r = 150 + (1+yRatio) * 105;
        g = 220 + (1+yRatio) * 35;
        b = 255;
    } else {
        r = 255;
        g = 180 - yRatio * 150;
        b = 100 - yRatio * 100;
    }
    return `rgba(${Math.floor(r)},${Math.floor(g)},${Math.floor(b)}, 1)`;
}

// --- 粒子类 ---
class Particle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.treeX = x;
        this.treeY = y;
        this.textX = null;
        this.textY = null;
        this.size = config.particleSize * (0.8 + Math.random() * 0.4);
        this.color = getColor(y);
        this.randomOffset = Math.random() * 100; 
    }

    update(time) {
        let tx = (state === 'tree') ? this.treeX : this.textX;
        let ty = (state === 'tree') ? this.treeY : this.textY;

        // 移动
        this.x += (tx - this.x) * config.transitionSpeed;
        this.y += (ty - this.y) * config.transitionSpeed;

        // 波动
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

// --- 背景星星 ---
class BackgroundParticle {
    constructor() {
        this.reset();
    }
    reset() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.size = Math.random() * 2;
        this.speedX = (Math.random() - 0.5) * 0.5;
        this.speedY = (Math.random() - 0.5) * 0.5;
        this.alpha = 0.1 + Math.random() * 0.4;
    }
    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        if (this.x < 0 || this.x > width || this.y < 0 || this.y > height) this.reset();
    }
    draw() {
        ctx.fillStyle = `rgba(255, 255, 255, ${this.alpha})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

function initTextTargets() {
    const offCanvas = document.createElement('canvas');
    offCanvas.width = width;
    offCanvas.height = height;
    const offCtx = offCanvas.getContext('2d');

    // --- 修复点 1: 动态计算字体大小 ---
    // 保证文字在手机上也不会太大溢出，也不会太小看不清
    const fontSize = Math.min(120, width / 4); 
    offCtx.font = `bold ${fontSize}px sans-serif`; // 使用通用字体防止加载失败
    offCtx.fillStyle = '#FFFFFF';
    offCtx.textAlign = 'center';
    offCtx.textBaseline = 'middle';
    offCtx.fillText(config.text, width / 2, height / 2);

    const imageData = offCtx.getImageData(0, 0, width, height).data;
    textTargets = [];
    
    // --- 修复点 2: 提高扫描密度 ---
    // 之前是 5，现在改成 3，扫描更细致，更容易抓取到点
    const step = 3; 
    for (let y = 0; y < height; y += step) {
        for (let x = 0; x < width; x += step) {
            if (imageData[(y * width + x) * 4 + 3] > 128) {
                textTargets.push({ x, y });
            }
        }
    }

    // --- 修复点 3: 兜底逻辑 ---
    // 如果万一还是没取到点（比如字体加载失败），强行生成一个圆圈形状，保证不黑屏
    if (textTargets.length === 0) {
        console.warn("未检测到文字像素，使用默认圆形路径");
        const radius = Math.min(width, height) / 4;
        const centerX = width / 2;
        const centerY = height / 2;
        for (let i = 0; i < 300; i++) {
            const angle = (i / 300) * Math.PI * 2;
            textTargets.push({
                x: centerX + Math.cos(angle) * radius,
                y: centerY + Math.sin(angle) * radius
            });
        }
    }
    
    particleCount = textTargets.length;
}

function initParticles() {
    particles = [];
    backgroundParticles = [];
    treeTargets = [];
    
    const treeTopY = height / 2 - (height * config.treeHeightRatio / 2);
    const treeHeight = height * config.treeHeightRatio;
    const maxTreeWidth = width * config.treeWidthRatio;

    for (let i = 0; i < particleCount; i++) {
        // 生成树形目标点
        const y = treeTopY + Math.random() * treeHeight;
        const currentW = maxTreeWidth * ((y - treeTopY) / treeHeight);
        const x = width / 2 + (Math.random() - 0.5) * currentW;
        
        treeTargets.push({x, y});
        
        const p = new Particle(x, y);
        // 分配文字目标点
        const target = textTargets[i % textTargets.length];
        p.textX = target.x;
        p.textY = target.y;
        
        particles.push(p);
    }

    for (let i = 0; i < config.bgParticleCount; i++) {
        backgroundParticles.push(new BackgroundParticle());
    }
}

let startTime = null;
function animate(timestamp) {
    if (!startTime) startTime = timestamp;
    const progress = timestamp - startTime;

    // 使用 clearRect 保证画面最干净，避免重影导致变暗
    ctx.clearRect(0, 0, width, height);

    if (state === 'tree' && progress > config.transitionDelay) {
        state = 'text';
    }

    backgroundParticles.forEach(p => { p.update(); p.draw(); });
    particles.forEach(p => { p.update(timestamp); p.draw(); });

    requestAnimationFrame(animate);
}

// 重新加载处理
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
