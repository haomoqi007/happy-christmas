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
// 判断是否为手机端
let isMobile = window.innerWidth < 768;

// --- 核心配置 ---
const config = {
    texts: [
        "00姐", 
        "圣诞快乐", 
        "幸福平安"
    ],
    duration: 10000, // 10秒切换
    
    // [关键修改1] 针对手机和电脑设置不同的粒子参数
    // 手机：粒子更多但更小，防糊；电脑：粒子适中偏大
    particleCount: isMobile ? 3500 : 2500, 
    particleSize: isMobile ? 1.5 : 2.2,   
    
    // [关键修改2] 严格使用 Gemini/Google 官方品牌色 + 纯白
    colors: [
        '#4285F4', // Google Blue
        '#EA4335', // Google Red
        '#34A853', // Google Green
        '#FBBC05', // Google Yellow
        '#FFFFFF'  // Pure White (Sparkle)
    ],
    transitionSpeed: 0.04,
    rotationSpeed: 0.005,
    depth: 800
};

function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    isMobile = width < 768;
    // 窗口大小改变时，动态调整粒子大小
    config.particleSize = isMobile ? 1.5 : 2.2;
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
        // 粒子大小随机微调，增加层次感
        this.size = config.particleSize * (0.8 + Math.random() * 0.4);
        this.color = getRandomColor();
        this.waveOffset = Math.random() * 100;
    }

    update(time) {
        const stateName = states[currentStateIndex];
        let targetList = targets[stateName];
        // 循环分配目标，确保所有粒子都有去处
        let t = targetList[this.targetIndex % targetList.length] || {x: 0, y: 0, z: 0};

        const tx = t.x;
        const ty = t.y;
        const tz = t.z;

        let rx, ry, rz;

        // 只有树的状态旋转
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

        // 飞行逻辑
        this.x += (rx - this.x) * config.transitionSpeed;
        this.y += (ry - this.y) * config.transitionSpeed;
        this.z += (rz - this.z) * config.transitionSpeed;

        // 波动逻辑
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
        
        // [关键修改3] 优化发光效果
        // 手机上光晕太重会糊，所以手机上减小 blur，电脑上保持
        if (isMobile) {
            ctx.shadowBlur = 2; // 手机微弱光晕，保持锐利
        } else {
            ctx.shadowBlur = 5; // 电脑光晕强一点
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
        const angle = i * 0.6; // 稍微调整螺旋角度

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
    // 增加虚拟画布分辨率，让采样更精准
    const vSize = 1200; 
    vCanvas.width = vSize;
    vCanvas.height = vSize;
    const vCtx = vCanvas.getContext('2d');

    // [关键修改4] 字体优化
    // font-weight: 900 (最粗)，确保笔画够粗，能容纳更多粒子
    const fontSize = isMobile ? 300 : 250; 
    vCtx.font = `900 ${fontSize}px "Microsoft YaHei", "Heiti SC", sans-serif`;
    vCtx.fillStyle = '#fff';
    vCtx.textAlign = 'center';
    vCtx.textBaseline = 'middle';

    vCtx.fillText(textStr, vSize / 2, vSize / 2);

    const imageData = vCtx.getImageData(0, 0, vSize, vSize).data;
    // 采样步长：步长越小，点越密。
    // 手机上为了防糊，我们步长设小一点（密集），但粒子设小（防重叠）
    const step = 6; 

    // 缩放逻辑：手机占宽 95%，电脑占 60%
    const widthRatio = isMobile ? 0.95 : 0.6; 
    const targetWidth = width * widthRatio;
    const scale = targetWidth / vSize;

    for (let y = 0; y < vSize; y += step) {
        for (let x = 0; x < vSize; x += step) {
            const alpha = imageData[(y * vSize + x) * 4 + 3];
            // 只取完全不透明的点，保证边缘锐利
            if (alpha > 200) {
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

    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)'; // 稍微加深残影清除，让画面更干净
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
    // 使用配置中的粒子数量
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
    // 窗口大改时重建粒子，确保数量适配
    particles = [];
    for (let i = 0; i < config.particleCount; i++) {
        particles.push(new Particle(i));
    }
});

init();
