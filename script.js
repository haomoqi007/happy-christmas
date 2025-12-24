const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

let width, height;
let particles = [];
let backgroundParticles = [];
// 强制粒子数量，保证画面一定有内容
const PARTICLE_COUNT = 800; 

const config = {
    text: '圣诞快乐',
    particleSize: 5, // 调大粒子，模仿LED灯珠感
    treeWidthRatio: 0.5,
    treeHeightRatio: 0.75,
    transitionDelay: 2000, // 2秒后开始变形
    transitionSpeed: 0.04,
    fluctuationSpeed: 0.003,
    fluctuationRange: 4,
    bgParticleCount: 80 // 背景星星数量
};

function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
}

// 颜色生成：模仿你发的图片的蓝-白-金渐变
function getColor(y) {
    const contentCenterY = height / 2;
    const h = height * config.treeHeightRatio;
    const yRatio = (y - contentCenterY) / (h / 2);
    
    // 简单的三段色：上蓝，中白，下红/金
    let r, g, b;
    if (yRatio < -0.3) { 
        // 顶部：亮蓝色 (模仿图片中的蓝色点)
        return `rgba(50, 150, 255, 1)`;
    } else if (yRatio < 0.3) {
        // 中部：白色/青色
        return `rgba(220, 240, 255, 1)`;
    } else {
        // 底部：暖色/红色
        return `rgba(255, 100, 100, 1)`;
    }
}

class Particle {
    constructor(i) {
        // 1. 初始化时，先不管文字，强行把粒子摆成圣诞树的样子
        const treeTopY = height / 2 - (height * config.treeHeightRatio / 2);
        const treeHeight = height * config.treeHeightRatio;
        const maxTreeWidth = width * config.treeWidthRatio;

        // 随机生成在三角形内
        const y = treeTopY + Math.random() * treeHeight;
        const currentW = maxTreeWidth * ((y - treeTopY) / treeHeight);
        const x = width / 2 + (Math.random() - 0.5) * currentW;

        this.x = x;
        this.y = y;
        
        // 记录“树”形态的坐标
        this.treeX = x;
        this.treeY = y;
        
        // “文字”形态的坐标（稍后填充）
        this.textX = x; 
        this.textY = y;

        this.size = config.particleSize * (0.8 + Math.random() * 0.5);
        this.color = getColor(y);
        this.randomOffset = Math.random() * 100;
    }

    update(time, state) {
        // 确定当前要飞向的目标
        let tx = (state === 'tree') ? this.treeX : this.textX;
        let ty = (state === 'tree') ? this.treeY : this.textY;

        // 飞过去
        this.x += (tx - this.x) * config.transitionSpeed;
        this.y += (ty - this.y) * config.transitionSpeed;

        // 原地呼吸波动
        this.x += Math.sin(time * config.fluctuationSpeed + this.randomOffset) * 0.5;
        this.y += Math.cos(time * config.fluctuationSpeed + this.randomOffset) * 0.5;
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        // 添加一点发光效果
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        ctx.fill();
        ctx.shadowBlur = 0; // 重置，避免影响性能
    }
}

// 简单的背景星星
class BackgroundParticle {
    constructor() { this.reset(); }
    reset() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.size = Math.random() * 2;
        this.speed = 0.2 + Math.random() * 0.5;
        this.angle = Math.random() * Math.PI * 2;
    }
    update() {
        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;
        if (this.x<0 || this.x>width || this.y<0 || this.y>height) this.reset();
    }
    draw() {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

// 获取文字的像素点坐标
function getTextTargets() {
    const offCanvas = document.createElement('canvas');
    offCanvas.width = width;
    offCanvas.height = height;
    const offCtx = offCanvas.getContext('2d');

    // 动态调整字体大小
    let fontSize = Math.min(width * 0.25, 120); 
    offCtx.font = `bold ${fontSize}px sans-serif`;
    offCtx.fillStyle = '#fff';
    offCtx.textAlign = 'center';
    offCtx.textBaseline = 'middle';
    offCtx.fillText(config.text, width / 2, height / 2);

    const imageData = offCtx.getImageData(0, 0, width, height).data;
    const targets = [];
    
    // 扫描像素，存入 targets
    for (let y = 0; y < height; y += 4) {
        for (let x = 0; x < width; x += 4) {
            if (imageData[(y * width + x) * 4 + 3] > 128) {
                targets.push({x, y});
            }
        }
    }
    return targets;
}

function init() {
    resize();
    particles = [];
    backgroundParticles = [];

    // 1. 先扫描文字点
    let textPoints = getTextTargets();

    // 兜底：如果没扫到文字（例如屏幕太奇怪），生成一个圆圈作为目标
    if (textPoints.length < 100) {
        const radius = Math.min(width, height) * 0.3;
        for(let i=0; i<PARTICLE_COUNT; i++){
            const angle = (i / PARTICLE_COUNT) * Math.PI * 2;
            textPoints.push({
                x: width/2 + Math.cos(angle) * radius,
                y: height/2 + Math.sin(angle) * radius
            });
        }
    }

    // 2. 创建 800 个粒子（圣诞树形态）
    // 并把文字目标分配给它们
    for (let i = 0; i < PARTICLE_COUNT; i++) {
        const p = new Particle(i);
        
        // 从 textPoints 里取一个目标给这个粒子
        // 如果文字点比粒子少，就循环取；如果多，就随机取
        const target = textPoints[i % textPoints.length];
        p.textX = target.x;
        p.textY = target.y;

        particles.push(p);
    }

    // 3. 创建背景
    for(let i=0; i<config.bgParticleCount; i++){
        backgroundParticles.push(new BackgroundParticle());
    }

    animate();
}

let startTime = null;
let state = 'tree';

function animate(timestamp) {
    if (!startTime) startTime = timestamp || Date.now();
    const progress = (timestamp || Date.now()) - startTime;

    ctx.clearRect(0, 0, width, height);

    // 状态切换逻辑
    if (state === 'tree' && progress > config.transitionDelay) {
        state = 'text';
    }

    // 绘制所有层
    backgroundParticles.forEach(p => { p.update(); p.draw(); });
    particles.forEach(p => { p.update(timestamp || Date.now(), state); p.draw(); });

    requestAnimationFrame(animate);
}

window.addEventListener('resize', () => {
    resize();
    init(); // 窗口改变时重置
    startTime = null;
    state = 'tree';
});

init();
