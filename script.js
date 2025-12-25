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
        ["00姐"],           
        ["圣诞", "快乐"],    
        ["幸福", "平安"]     
    ],
    duration: 10000, 
    
    particleCount: isMobile ? 3500 : 2500, 
    particleSize: isMobile ? 1.5 : 2.2,   
    
    // 1. 圣诞树配色 (Google 经典五色)
    treeColors: [
        '#4285F4', '#EA4335', '#34A853', '#FBBC05', '#FFFFFF'
    ],

    // 2. 文字配色 (蓝调为主 + 红黄点缀)
    textColors: [
        '#4285F4', '#4285F4', '#4285F4', '#4285F4', '#4285F4', '#4285F4', '#4285F4', '#4285F4',
        '#EA4335', 
        '#FBBC05'  
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

function getRandomColor(colorArray) {
    return colorArray[Math.floor(Math.random() * colorArray.length)];
}

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

// [⭐核心修改⭐] 全新的真实树形生成算法
function createTreePoints() {
    targets.tree = [];
    const count = config.particleCount;
    const treeHeight = height * 0.75;
    // 稍微加宽底部，让树看起来更稳重
    const maxBaseRadius = Math.min(width * 0.45, height * 0.35); 
    const yOffset = -height * 0.05; 

    for (let i = 0; i < count; i++) {
        // 1. 高度 h (从 0 底部 到 1 顶部)
        // 使用 pow 让底部的粒子稍微密集一点，重心更稳
        const h = Math.pow(Math.random(), 0.8);
        // 映射到屏幕 Y 坐标
        const y = (h - 0.5) * treeHeight + yOffset;

        // 2. 基础圆锥半径 (越往上越窄)
        const baseRadius = maxBaseRadius * (1 - h);

        // 3. [关键] 分层效果 (Layering Effect)
        // 模仿真实树木一层层的树枝。设置约 7 层。
        // 使用 sin 函数创造波浪起伏，abs 让波浪向外凸起。
        // (1-h)*0.3 意味着越往树顶，分层效果越不明显。
        const layers = 7;
        const layerBulge = (1 - h) * 0.3 * Math.abs(Math.sin(h * Math.PI * layers));

        // 4. [关键] 自然噪点 (Natural Noise)
        // 让树枝边缘不那么圆滑，增加参差感
        const angle = Math.random() * Math.PI * 2;
        const branchNoise = 0.05 * Math.sin(angle * 5 + h * 10);

        // 5. [关键] 最终半径计算 (Volumetric Radius)
        // 结合基础半径、分层凸起和噪点。
        // Math.sqrt(Math.random()) 用于让粒子均匀填充在圆内，而不是聚集在中心，制造体积感。
        const finalRadius = baseRadius * (1 + layerBulge + branchNoise) * Math.sqrt(Math.random());

        // 生成 3D 坐标 (注意 Y 轴方向)
        targets.tree.push({
            x: Math.cos(angle) * finalRadius,
            y: -y, // 取反，因为屏幕坐标 Y 向下为正
            z: Math.sin(angle) * finalRadius
        });
    }
    // 打乱顺序，让变换更自然
    targets.tree.sort(() => Math.random() - 0.5);
}

function createPointsForString(textItem) {
    const points = [];
    const vSize = 1500; 
    vCanvas = document.createElement('canvas');
    vCanvas.width = vSize;
    vCanvas.height = vSize;
    const vCtx = vCanvas.getContext('2d');

    const lines = Array.isArray(textItem) ? textItem : [textItem];

    let baseFontSize = 500; 
    if (lines.length === 1) baseFontSize = 400;

    vCtx.font = `900 ${baseFontSize}px "Microsoft YaHei", "Heiti SC", sans-serif`;
    vCtx.fillStyle = '#fff';
    vCtx.textAlign = 'center';
    vCtx.textBaseline = 'middle';

    const lineHeight = baseFontSize * 1.0; 
    const totalHeight = lines.length * lineHeight;
    const startY = (vSize - totalHeight) / 2 + lineHeight / 2;

    lines.forEach((line, i) => {
        vCtx.fillText(line, vSize / 2, startY + i * lineHeight);
    });

    const imageData = vCtx.getImageData(0, 0, vSize, vSize).data;
    const step = isMobile ? 5 : 6; 

    const availWidth = width * (isMobile ? 0.9 : 0.7);
    const availHeight = height * (isMobile ? 0.8 : 0.7);
    const scaleX = availWidth / vSize;
    const scaleY = availHeight / vSize;
    const scale = Math.min(scaleX, scaleY);

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
    
    if (elapsed > config.duration) {
        currentStateIndex = (currentStateIndex + 1) % states.length;
        lastStateChangeTime = timestamp;
        
        const nextState = states[currentStateIndex];
        
        if (nextState === 'tree') {
            switchParticleColors(config.treeColors);
        } else {
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
