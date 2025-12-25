const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

let width, height;
let particles = [];
let targets = { tree: [], text: [] };
let state = 'tree';
let rotationAngle = 0;

// --- 配置 ---
const config = {
    // [修改点 1] 文字改为数组，实现多行显示
    text: ["00姐", "Merry Christmas"],
    particleCount: 1500,
    particleSize: 2.5,
    colors: ['#4285F4', '#EA4335', '#34A853', '#FBBC05', '#FFFFFF', '#00FFFF'],
    transitionSpeed: 0.05,
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
        let targetList = (state === 'tree') ? targets.tree : targets.text;
        let t = targetList[this.targetIndex % targetList.length] || {x: 0, y: 0, z: 0};

        const tx = t.x;
        const ty = t.y;
        const tz = t.z;

        let rx, ry, rz;

        if (state === 'tree') {
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
    const maxRadius = width * 0.3;

    // [修改点 2] 添加一个向上的偏移量 (负值向上)
    // 这里向上偏移屏幕高度的 5%，你可以调整这个数字
    const yOffset = -height * 0.05; 

    for (let i = 0; i < count; i++) {
        const p = i / count;
        // 应用偏移量
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

function createTextPoints() {
    targets.text = [];
    const vCanvas = document.createElement('canvas');
    // [修改点 3] 加大虚拟画布尺寸，确保能容纳大字体和多行文字
    const vSize = 1000;
    vCanvas.width = vSize;
    vCanvas.height = vSize; // 设为正方形更方便计算
    const vCtx = vCanvas.getContext('2d');

    // [修改点 4] 使用支持中文的字体，并调整大小
    vCtx.font = 'bold 120px "Microsoft YaHei", Arial, sans-serif';
    vCtx.fillStyle = '#fff';
    vCtx.textAlign = 'center';
    vCtx.textBaseline = 'middle';

    // [修改点 5] 循环绘制多行文字
    const lines = config.text;
    const lineHeight = 150; // 行高
    const totalHeight = lines.length * lineHeight;
    const startY = (vSize - totalHeight) / 2 + lineHeight / 2; // 垂直居中起始点

    lines.forEach((line, i) => {
        vCtx.fillText(line, vSize / 2, startY + i * lineHeight);
    });

    const imageData = vCtx.getImageData(0, 0, vSize, vSize).data;
    const step = 4;

    // [修改点 6] 动态计算缩放比例，让文字宽度占屏幕宽度的 90%
    // 这样可以保证文字在任何屏幕上都能完整显示
    const targetWidth = width * 0.9;
    const scale = targetWidth / vSize;

    for (let y = 0; y < vSize; y += step) {
        for (let x = 0; x < vSize; x += step) {
            const alpha = imageData[(y * vSize + x) * 4 + 3];
            if (alpha > 128) {
                targets.text.push({
                    // 使用动态计算的 scale 进行映射
                    x: (x - vSize/2) * scale,
                    y: (y - vSize/2) * scale,
                    z: 0
                });
            }
        }
    }

    if (targets.text.length === 0) {
        for (let i = 0; i < config.particleCount; i++) {
            const theta = Math.random() * Math.PI * 2;
            const r = 300;
            targets.text.push({
                x: r * Math.cos(theta),
                y: r * Math.sin(theta),
                z: 0
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

    if (state === 'tree') {
        rotationAngle += config.rotationSpeed;
    }

    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fillRect(0, 0, width, height);

    if (state === 'tree' && progress > 4000) {
        state = 'text';
    }

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
    createTreePoints();
    createTextPoints();
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
    createTreePoints();
    createTextPoints(); // 窗口大小改变时也需要重新计算文字点
});

init();
