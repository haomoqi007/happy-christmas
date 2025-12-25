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

// [⭐ 核心修复：树形生成算法]
function createTreePoints() {
    targets.tree = [];
    const count = config.particleCount;
    // 树的高度：占屏幕高度的 85%
    const treeHeight = height * 0.85; 
    // 底部最宽处的半径
    const maxBaseRadius = Math.min(width * 0.4, height * 0.35); 
    // 整体向上移动一点，保持居中
    const yOffset = -height * 0.1; 

    for (let i = 0; i < count; i++) {
        // [关键] 高度分布算法
        // 使用 sqrt(random) 让 h 分布偏向 1 (底部)。
        // 这样底部的宽阔区域会有更多粒子，顶部的狭窄区域粒子较少，
        // 完美解决“顶部太密、底部太疏”的问题。
        const h = Math.sqrt(Math.random()); 
        // h: 0 (树顶) -> 1 (树底)

        // 计算 Y 坐标：从 负(顶) 到 正(底)
        const y = (h - 0.5) * treeHeight + yOffset;

        // 计算基础半径：线性增长 (圆锥体)
        // h=0 -> r=0; h=1 -> r=Max
        let r = maxBaseRadius * h;

        // [关键] 分层纹理 (Layers)
        // 增加 8 层波浪，模仿树枝伸出的感觉
        const layers = 8;
        // 使用 sin 波让半径忽大忽小
        const layerEffect = 1 + 0.15 * Math.sin(h * layers * Math.PI * 2 + i * 0.1);

        // [关键] 螺旋分布 (Spiral)
        // 参考你发的图，粒子并不是杂乱的，而是有螺旋纹理
        const angle = i * 0.1 + h * 10; 

        // 最终半径：基础半径 * 分层效果 * 随机厚度(让树看起来厚实)
        const finalRadius = r * layerEffect * (0.8 + 0.2 * Math.random());

        targets.tree.push({
            x: Math.cos(angle) * finalRadius,
            y: y, 
            z: Math.sin(angle) * finalRadius
        });
    }
    // 随机打乱
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
    const availHeight
