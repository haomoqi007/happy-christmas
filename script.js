const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

let width, height;
let particles = [];
let targets = { 
    tree: [], 
    text1: [], 
    text2: [], 
    text3: []  
};

const states = ['tree', 'text1', 'text2', 'text3'];
let currentStateIndex = 0; 
let lastStateChangeTime = 0; 

let rotationAngle = 0;
let isMobile = window.innerWidth < 768;

// --- 核心配置 ---
const config = {
    texts: [
        "00姐", 
        "圣诞快乐", 
        "幸福平安"
    ],
    duration: 10000, 
    
    // 保持之前的高清参数
    particleCount: isMobile ? 3500 : 2500, 
    particleSize: isMobile ? 1.5 : 2.2,   
    
    // [关键修改1] 定义两套色板
    
    // 1. 圣诞树配色 (保留原本的 Google 节日彩色)
    treeColors: [
        '#4285F4', // Blue
        '#EA4335', // Red
        '#34A853', // Green
        '#FBBC05', // Yellow
        '#FFFFFF'  // White
    ],

    // 2. 文字配色 (蓝色主调，简约风)
    // 这里的颜色配比决定了蓝色的占比，我多加了几个蓝色，少加了白色
    textColors: [
        '#4285F4', // Google Blue (标准蓝) - 占多份
        '#4285F4', 
        '#4285F4', 
        '#1967D2', // Dark Blue (深蓝，增加层次)
        '#8AB4F8', // Light Blue (浅蓝，增加透亮感)
        '#00FFFF', // Cyan (青色，提亮)
        '#FFFFFF'  // White (星星点缀，极少)
    ],

    transitionSpeed: 0.04,
    rotationSpeed: 0.005,
    depth: 800
};

function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    isMobile = width < 768;
    config.particleSize = isMobile ? 1.5 : 2.2;
}

// [关键修改2] 修改获取颜色的函数，支持传入指定的色板
function getRandomColor(colorArray) {
    return colorArray[Math.floor(Math.random() * colorArray.length)];
}

// [关键修改3] 新增：批量切换所有粒子的颜色
function switchParticleColors(colorArray) {
    particles.forEach(p => {
        p.color = getRandomColor(colorArray);
    });
}

// ==========================================
// 粒子类
// ==========================================
class Particle {
    constructor(index) {
        this.x = (Math.random() - 0.5) * width;
        this.y = (Math.random() - 0.5) * height;
        this.z = (Math.random() - 0.5) * 500;
        
        this.targetIndex = index;
        this.size = config.particleSize * (0.8 + Math.random() * 0.4);
        
        // 初始颜色：因为初始状态是树，所以用树的颜色
        this.color = getRandomColor(config.treeColors);
        
        this.waveOffset = Math.random() * 100;
    }

    update(time) {
        const stateName = states[currentStateIndex];
        let targetList = targets[stateName];
        let t = targetList[this.targetIndex % targetList.length] || {x: 0, y: 0, z: 0};

        const tx = t.x;
        const ty = t.y;
        const tz = t.z;

        let rx, ry, rz;

        if (stateName === 'tree') {
            const cos = Math.cos(rotationAngle);
            const sin = Math.sin(rotationAngle);
            rx = tx * cos - tz * sin;
            ry = ty;
            rz = tx * sin + tz * cos;
        } else {
            rx = tx;
            ry = ty;
            rz = tz;
        }

        this.x += (rx - this.x) * config.transitionSpeed;
        this.y += (ry - this.y) * config.transitionSpeed;
        this.z += (rz - this.z) * config.transitionSpeed;

        const waveX = Math.sin(time * 0.002 + this.waveOffset) * 5;
        const waveY = Math.cos(time * 0.002 + this.waveOffset) * 5;
        
        const scale = config.depth / (config.depth + this.z);
        this.screenX = width / 2 + (this.x + waveX) * scale;
        this.screenY = height / 2 + (this.y + waveY) * scale;
        this.screenSize = Math.max(0.1, this.size * scale);
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.screenX, this.screenY, this.screenSize, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        
        // 保持之前的手机锐化逻辑
        if (isMobile) {
            ctx.shadowBlur = 2; 
        } else {
            ctx.shadowBlur = 5; 
        }
        ctx.shadowColor = this.color;
        
        ctx.fill();
        ctx.shadowBlur = 0;
    }
}

// ==========================================
// 目标生成器
// ==========================================
function createTreePoints() {
    targets.tree = [];
    const count = config.particleCount;
    const heightRange = height * 0.75;
    const maxRadius = Math.min(width * 0.4, height * 0.3); 
    const yOffset = -height * 0.05; 

    for (let i = 0; i < count; i++) {
        const p = i / count;
        const y = -heightRange/2 + p * heightRange + yOffset;
        const radius = maxRadius * p;
        const angle = i * 0.6; 

        targets.tree.push({
            x: Math.cos(angle) * radius,
            y: y,
            z: Math.sin(angle) * radius
        });
    }
}

function createPointsForString(textStr) {
    const points = [];
    const vCanvas = document.createElement('canvas');
    const vSize = 1200; 
    vCanvas.width = vSize;
    vCanvas.height = vSize;
    const vCtx = vCanvas.getContext('2d');

    const fontSize = isMobile ? 300 : 250; 
    vCtx.font = `900 ${fontSize}px "Microsoft YaHei", "Heiti SC", sans-serif`;
    vCtx.fillStyle = '#fff';
    vCtx.textAlign = 'center';
    vCtx.textBaseline = 'middle';

    vCtx.fillText(textStr, vSize / 2, vSize / 2);

    const imageData = vCtx.getImageData(0, 0, vSize, vSize).data;
    const step = 6; 
    const widthRatio = isMobile ? 0.95 : 0.6; 
    const targetWidth = width * widthRatio;
    const scale = targetWidth / vSize;

    for (let y = 0; y < vSize; y += step) {
        for (let x = 0; x < vSize; x += step) {
            const alpha = imageData[(y * vSize + x) * 4 + 3];
            if (alpha > 200) {
                points.push({
                    x: (x - vSize/2) * scale,
                    y: (y - vSize/2) * scale,
                    z: 0
                });
            }
        }
    }
    
    points.sort(() => Math.random() - 0.5);

    if (points.length === 0) {
        for (let i = 0; i < 100; i++) points.push({x:0, y:0, z:0});
    }
    return points;
}

function initAllTargets() {
    createTreePoints();
    targets.text1 = createPointsForString(config.texts[0]); 
    targets.text2 = createPointsForString(config.texts[1]); 
    targets.text3 = createPointsForString(config.texts[2]); 
}

// ==========================================
// 动画循环
// ==========================================
function animate(timestamp) {
    if (!lastStateChangeTime) lastStateChangeTime = timestamp;
    
    const elapsed = timestamp - lastStateChangeTime;
    
    // [关键修改4] 状态切换时的颜色控制
    if (elapsed > config.duration) {
        currentStateIndex = (currentStateIndex + 1) % states.length;
        lastStateChangeTime = timestamp;
        
        const nextState = states[currentStateIndex];
        
        // 核心逻辑：如果是树，切回彩色；如果是字，切成蓝色系
        if (nextState === 'tree') {
            switchParticleColors(config.treeColors);
        } else {
            // 所有文字状态 (text1, text2, text3) 都用蓝色系
            switchParticleColors(config.textColors);
        }
    }

    if (states[currentStateIndex] === 'tree') {
        rotationAngle += config.rotationSpeed;
    }

    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)'; 
    ctx.fillRect(0, 0, width, height);

    particles.forEach(p => {
        p.update(timestamp);
        p.draw();
    });

    requestAnimationFrame(animate);
}

// ==========================================
// 启动
// ==========================================
function init() {
    resize();
    initAllTargets();
    
    particles = [];
    for (let i = 0; i < config.particleCount; i++) {
        particles.push(new Particle(i));
    }
    
    currentStateIndex = 0;
    lastStateChangeTime = 0;
    rotationAngle = 0;
    animate();
}

window.addEventListener('resize', () => {
    resize();
    initAllTargets();
    particles = [];
    for (let i = 0; i < config.particleCount; i++) {
        particles.push(new Particle(i));
    }
});

init();
