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

// --- 配置 ---
const config = {
    texts: [
        "00姐", 
        "圣诞快乐", 
        "幸福平安"
    ],
    // [修改 1] 时间改为 10 秒
    duration: 10000, 
    particleCount: 3000, 
    // [微调] 粒子大小稍微调大一点点，增加手机上的可见度
    particleSize: 2.5,   
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
    // [适配] 手机上树稍微瘦一点，防止超出屏幕
    const maxRadius = Math.min(width * 0.4, height * 0.25); 
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

// [关键修改] 增强版文字点生成，适配手机
function createPointsForString(textStr) {
    const points = [];
    const vCanvas = document.createElement('canvas');
    // 虚拟画布尺寸保持 1000，方便计算
    const vSize = 1000; 
    vCanvas.width = vSize;
    vCanvas.height = vSize;
    const vCtx = vCanvas.getContext('2d');

    // [关键] 判断是不是手机 (屏幕宽度小于 768px 视为手机)
    const isMobile = width < 768;

    // [关键] 字体大小策略：
    // 如果是手机，用超大字体填满虚拟画布，保证笔画够粗
    const fontSize = isMobile ? 250 : 200; 
    vCtx.font = `bold ${fontSize}px "Microsoft YaHei", Arial, sans-serif`;
    vCtx.fillStyle = '#fff';
    vCtx.textAlign = 'center';
    vCtx.textBaseline = 'middle';

    // 绘制文字
    vCtx.fillText(textStr, vSize / 2, vSize / 2);

    const imageData = vCtx.getImageData(0, 0, vSize, vSize).data;
    // 采样步长：越小越精细，但点越多。这里取 5 比较平衡
    const step = 5; 

    // [关键] 屏幕缩放策略：
    // 如果是手机，让文字宽度占满屏幕的 95%，否则占 70%
    const widthRatio = isMobile ? 0.95 : 0.7; 
    const targetWidth = width * widthRatio;
    
    // 计算缩放比例
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
    
    // 随机打乱，防止截断
    points.sort(() => Math.random() - 0.5);

    // 兜底
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
    if (elapsed > config.duration) {
        currentStateIndex = (currentStateIndex + 1) % states.length;
        lastStateChangeTime = timestamp;
    }

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
    initAllTargets(); 
});

init();
