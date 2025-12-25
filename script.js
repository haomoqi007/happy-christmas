const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

let width, height;
let particles = [];
let targets = { tree: [], text: [] };
// [修改点 1] 初始状态直接设为文字
let state = 'text'; 
let rotationAngle = 0;

// --- 配置 ---
const config = {
    // 文字内容数组
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
            // 状态是文字：不旋转，直接面向观众 (扁平)
            rx = tx;
            ry = ty;
            rz = tz;
        }

        this.x += (rx - this.x) * config.transitionSpeed;
        this.y += (ry - this.y) * config.transitionSpeed;
        this.z += (rz - this.z) * config.transitionSpeed;

        // 添加波浪流动效果 (保持流动感)
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
// 这个函数其实可以删掉了，保留着也不影响
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

function createTextPoints() {
    targets.text = [];
    const vCanvas = document.createElement('canvas');
    const vSize = 1000;
    vCanvas.width = vSize;
    vCanvas.height = vSize;
    const vCtx = vCanvas.getContext('2d');

    vCtx.font = 'bold 120px "Microsoft YaHei", Arial, sans-serif';
    vCtx.fillStyle = '#fff';
    vCtx.textAlign = 'center';
    vCtx.textBaseline = 'middle';

    const lines = config.text;
    const lineHeight = 150; 
    const totalHeight = lines.length * lineHeight;
    const startY = (vSize - totalHeight) / 2 + lineHeight / 2;

    lines.forEach((line, i) => {
        vCtx.fillText(line, vSize / 2, startY + i * lineHeight);
    });

    const imageData = vCtx.getImageData(0, 0, vSize, vSize).data;
    const step = 4;

    const targetWidth = width * 0.9;
    const scale = targetWidth / vSize;

    for (let y = 0; y < vSize; y += step) {
        for (let x = 0; x < vSize; x += step) {
            const alpha = imageData[(y * vSize + x) * 4 + 3];
            if (alpha > 128) {
                targets.text.push({
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
    // const progress = timestamp - startTime; // 不需要计算进度了

    // 只有在树的状态下，才增加旋转角度 (现在永远不会执行)
    if (state === 'tree') {
        rotationAngle += config.rotationSpeed;
    }

    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fillRect(0, 0, width, height);

    // [修改点 2] 注释掉或删除状态切换逻辑，确保一直保持在 text 状态
    /*
    if (state === 'tree' && progress > 4000) {
        state = 'text';
    }
    */

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
    // [修改点 3] 确保初始化时状态就是 text
    state = 'text'; 
    rotationAngle = 0;
    animate();
}

window.addEventListener('resize', () => {
    resize();
    createTreePoints();
    createTextPoints(); 
});

init();
