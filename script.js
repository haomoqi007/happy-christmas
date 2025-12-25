const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

let width, height;
let particles = [];
let targets = { tree: [], text: [] };
let state = 'tree';
let rotationAngle = 0; // 控制整体旋转

// --- 强力配置 ---
const config = {
    text: "Merry Christmas",
    particleCount: 1500, // 粒子数量
    particleSize: 2.5,   // 粒子大小
    // Gemini 风格配色 + 圣诞红绿
    colors: ['#4285F4', '#EA4335', '#34A853', '#FBBC05', '#FFFFFF', '#00FFFF'],
    transitionSpeed: 0.05, // 飞行的速度
    rotationSpeed: 0.005,  // 旋转速度
    depth: 800             // 3D 深度感
};

function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
}

function getRandomColor() {
    return config.colors[Math.floor(Math.random() * config.colors.length)];
}

// ==========================================
// 粒子类 (带 3D 投影逻辑)
// ==========================================
class Particle {
    constructor(index) {
        // 随机出生在屏幕各处
        this.x = (Math.random() - 0.5) * width;
        this.y = (Math.random() - 0.5) * height;
        this.z = (Math.random() - 0.5) * 500;
        
        this.targetIndex = index;
        this.size = config.particleSize * (0.8 + Math.random() * 0.5);
        this.color = getRandomColor();
        
        // 每个粒子的独特波长，用于制造“流动感”
        this.waveOffset = Math.random() * 100;
    }

    update(time) {
        // 1. 获取目标 (树 或 文字)
        let targetList = (state === 'tree') ? targets.tree : targets.text;
        // 如果文字点不够，就循环分配；如果完全没点，就去中心
        let t = targetList[this.targetIndex % targetList.length] || {x: 0, y: 0, z: 0};

        // 2. 3D 旋转计算 (绕 Y 轴旋转)
        // 这是让树看起来立体的关键
        const cos = Math.cos(rotationAngle);
        const sin = Math.sin(rotationAngle);
        
        // 目标的原始 3D 坐标
        const tx = t.x;
        const ty = t.y;
        const tz = t.z;

        // 旋转后的 3D 坐标
        const rx = tx * cos - tz * sin;
        const ry = ty;
        const rz = tx * sin + tz * cos;

        // 3. 粒子飞行 (平滑插值)
        this.x += (rx - this.x) * config.transitionSpeed;
        this.y += (ry - this.y) * config.transitionSpeed;
        this.z += (rz - this.z) * config.transitionSpeed;

        // 4. 添加波浪流动效果 (Gemini 的核心感觉)
        // 不停地加上一点点正弦波偏移
        const waveX = Math.sin(time * 0.002 + this.waveOffset) * 5;
        const waveY = Math.cos(time * 0.002 + this.waveOffset) * 5;
        
        // 5. 最终投影到 2D 屏幕
        // scale 模拟近大远小
        const scale = config.depth / (config.depth + this.z);
        
        // 实际画在画布上的位置
        this.screenX = width / 2 + (this.x + waveX) * scale;
        this.screenY = height / 2 + (this.y + waveY) * scale;
        this.screenSize = Math.max(0.1, this.size * scale); // 防止负数
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.screenX, this.screenY, this.screenSize, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        // 增加发光效果
        ctx.shadowBlur = 5;
        ctx.shadowColor = this.color;
        ctx.fill();
        ctx.shadowBlur = 0;
    }
}

// ==========================================
// 目标生成器
// ==========================================

// 1. 生成 3D 螺旋圣诞树 (纯数学计算，绝对稳定)
function createTreePoints() {
    targets.tree = [];
    const count = config.particleCount;
    const heightRange = height * 0.7; // 树高
    const maxRadius = width * 0.3;    // 底部宽度

    for (let i = 0; i < count; i++) {
        // y: 从上(-0.5) 到 下(0.5)
        const p = i / count;
        const y = -heightRange/2 + p * heightRange;
        
        // 半径随高度变大 (圆锥体)
        const radius = maxRadius * p;
        
        // 角度螺旋上升
        const angle = i * 0.5; 

        targets.tree.push({
            x: Math.cos(angle) * radius,
            y: y,
            z: Math.sin(angle) * radius
        });
    }
}

// 2. 生成文字点阵 (带兜底方案)
function createTextPoints() {
    targets.text = [];
    const vCanvas = document.createElement('canvas');
    const vSize = 600; // 虚拟画布大小
    vCanvas.width = vSize;
    vCanvas.height = vSize / 2;
    const vCtx = vCanvas.getContext('2d');

    // 绘制文字
    vCtx.font = 'bold 100px Arial, sans-serif';
    vCtx.fillStyle = '#fff';
    vCtx.textAlign = 'center';
    vCtx.textBaseline = 'middle';
    vCtx.fillText(config.text, vSize/2, vSize/4);

    // 扫描
    const imageData = vCtx.getImageData(0, 0, vSize, vSize/2).data;
    const step = 4; // 采样密度

    for (let y = 0; y < vSize/2; y += step) {
        for (let x = 0; x < vSize; x += step) {
            const alpha = imageData[(y * vSize + x) * 4 + 3];
            if (alpha > 128) {
                // 坐标居中映射
                targets.text.push({
                    x: (x - vSize/2) * 2.5, // 放大系数
                    y: (y - vSize/4) * 2.5,
                    z: 0 // 文字是扁平的
                });
            }
        }
    }

    // [关键兜底] 如果文字生成失败（比如字体没加载），生成一个圆球作为替代
    // 这样绝对不会黑屏
    if (targets.text.length === 0) {
        console.warn("Text generation failed, fallback to Sphere.");
        for (let i = 0; i < config.particleCount; i++) {
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos((Math.random() * 2) - 1);
            const r = 300;
            targets.text.push({
                x: r * Math.sin(phi) * Math.cos(theta),
                y: r * Math.sin(phi) * Math.sin(theta),
                z: r * Math.cos(phi)
            });
        }
    }
}

// ==========================================
// 动画循环
// ==========================================
let startTime = null;

function animate(timestamp) {
    if (!startTime) startTime = timestamp;
    const progress = timestamp - startTime;

    // 全局自转
    rotationAngle += config.rotationSpeed;

    // 清空画布 (带拖尾效果)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fillRect(0, 0, width, height);

    // 4秒后开始变字
    if (state === 'tree' && progress > 4000) {
        state = 'text';
    }

    // 绘制所有粒子
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
    
    // 生成目标点
    createTreePoints();
    createTextPoints();
    
    // 生成粒子
    particles = [];
    for (let i = 0; i < config.particleCount; i++) {
        particles.push(new Particle(i));
    }

    startTime = null;
    state = 'tree';
    rotationAngle = 0;
    
    animate();
}

window.addEventListener('resize', () => {
    resize();
    createTreePoints(); // 窗口大小改变需重新计算树的大小
});

// 立即执行
init();
