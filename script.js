const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

let width, height;
let particles = [];
// 存储所有状态的目标点
let targets = { 
    tree: [], 
    text1: [], // 00姐
    text2: [], // 圣诞快乐
    text3: []  // 幸福平安
};

// 状态列表
const states = ['tree', 'text1', 'text2', 'text3'];
let currentStateIndex = 0; // 当前播放到第几个状态
let lastStateChangeTime = 0; // 上次切换的时间

let rotationAngle = 0;

// --- 配置 ---
const config = {
    // 这里定义三段文字内容
    texts: [
        "00姐", 
        "圣诞快乐", 
        "幸福平安"
    ],
    duration: 5000, // 每个阶段持续 5 秒
    particleCount: 3000, // 保持高密度，确保字清晰
    particleSize: 2.2,
    colors: ['#4285F4', '#EA4335', '#34A853', '#FBBC05', '#FFFFFF', '#00FFFF'],
    transitionSpeed: 0.04,
    rotationSpeed: 0.005,
    depth: 800
};

function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
}

function getRandomColor() {
    return config.colors[Math.floor(Math.random() * config.colors.length)];
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
        this.size = config.particleSize * (0.8 + Math.random() * 0.5);
        this.color = getRandomColor();
        this.waveOffset = Math.random() * 100;
    }

    update(time) {
        // [关键] 根据当前状态索引，获取对应的目标列表
        const stateName = states[currentStateIndex];
        let targetList = targets[stateName];
        
        // 循环取点
        let t = targetList[this.targetIndex % targetList.length] || {x: 0, y: 0, z: 0};

        const tx = t.x;
        const ty = t.y;
        const tz = t.z;

        let rx, ry, rz;

        // 只有在 'tree' 状态下才计算旋转
        if (stateName === 'tree') {
            const cos = Math.cos(rotationAngle);
            const sin = Math.sin(rotationAngle);
            rx = tx * cos - tz * sin;
            ry = ty;
            rz = tx * sin + tz * cos;
        } else {
            // 文字状态下，不旋转，保持正对屏幕
            rx = tx;
            ry = ty;
            rz = tz;
        }

        // 粒子飞行
        this.x += (rx - this.x) * config.transitionSpeed;
        this.y += (ry - this.y) * config.transitionSpeed;
        this.z += (rz - this.z) * config.transitionSpeed;

        // 波动效果
        const waveX = Math.sin(time * 0.002 + this.waveOffset) * 5;
        const waveY = Math.cos(time * 0.002 + this.waveOffset) * 5;
        
        // 3D 投影
        const scale = config.depth / (config.depth + this.z);
        this.screenX = width / 2 + (this.x + waveX) * scale;
        this.screenY = height / 2 + (this.y + waveY) * scale;
        this.screenSize = Math.max(0.1, this.size * scale);
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.screenX, this.screenY, this.screenSize, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 5;
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
    const heightRange = height * 0.7;
    const maxRadius = width * 0.3;
    const yOffset = -height * 0.05; 

    for (let i = 0; i < count; i++) {
        const p = i / count;
        const y = -heightRange/2 + p * heightRange + yOffset;
        const radius = maxRadius * p;
        const angle = i * 0.5; 

        targets.tree.push({
            x: Math.cos(angle) * radius,
            y: y,
            z: Math.sin(angle) * radius
        });
    }
}

// [修改] 通用的文字点生成函数，可以生成任意一段文字的点
function createPointsForString(textStr) {
    const points = [];
    const vCanvas = document.createElement('canvas');
    const vSize = 1000; 
    vCanvas.width = vSize;
    vCanvas.height = vSize;
    const vCtx = vCanvas.getContext('2d');

    vCtx.font = 'bold 150px "Microsoft YaHei", Arial, sans-serif'; // 字号稍微调大
    vCtx.fillStyle = '#fff';
    vCtx.textAlign = 'center';
    vCtx.textBaseline = 'middle';

    // 绘制文字
    vCtx.fillText(textStr, vSize / 2, vSize / 2);

    const imageData = vCtx.getImageData(0, 0, vSize, vSize).data;
    const step = 5; 

    // 缩放比例
    const targetWidth = width * 0.8; // 文字占宽 80%
    const scale = targetWidth / vSize;

    for (let y = 0; y < vSize; y += step) {
        for (let x = 0; x < vSize; x += step) {
            const alpha = imageData[(y * vSize + x) * 4 + 3];
            if (alpha > 128) {
                points.push({
                    x: (x - vSize/2) * scale,
                    y: (y - vSize/2) * scale,
                    z: 0
                });
            }
        }
    }
    
    // 随机打乱
    points.sort(() => Math.random() - 0.5);

    // 兜底：如果没生成点，生成圆球
    if (points.length === 0) {
        for (let i = 0; i < 100; i++) {
             points.push({x:0, y:0, z:0});
        }
    }
    return points;
}

function initAllTargets() {
    // 1. 生成树
    createTreePoints();
    
    // 2. 分别生成三段文字的目标点
    targets.text1 = createPointsForString(config.texts[0]); // 00姐
    targets.text2 = createPointsForString(config.texts[1]); // 圣诞快乐
    targets.text3 = createPointsForString(config.texts[2]); // 幸福平安
}

// ==========================================
// 动画循环
// ==========================================
function animate(timestamp) {
    if (!lastStateChangeTime) lastStateChangeTime = timestamp;
    
    // [关键] 循环控制逻辑
    const elapsed = timestamp - lastStateChangeTime;
    if (elapsed > config.duration) {
        // 时间到，切换到下一个状态
        currentStateIndex = (currentStateIndex + 1) % states.length;
        lastStateChangeTime = timestamp;
        console.log("Switching to state:", states[currentStateIndex]);
    }

    // 只有在树的状态下旋转
    if (states[currentStateIndex] === 'tree') {
        rotationAngle += config.rotationSpeed;
    }

    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
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
    initAllTargets(); // 重新计算位置
});

init();
