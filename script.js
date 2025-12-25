const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

let width, height;
let particles = [];
let targets = { tree: [], text: [] };
let state = 'tree';
let rotationAngle = 0;

// --- 配置 ---
const config = {
    text: "Merry Christmas",
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
        // 1. 获取目标
        let targetList = (state === 'tree') ? targets.tree : targets.text;
        let t = targetList[this.targetIndex % targetList.length] || {x: 0, y: 0, z: 0};

        // 目标的原始 3D 坐标
        const tx = t.x;
        const ty = t.y;
        const tz = t.z;

        let rx, ry, rz;

        // ================================================================
        // [修改关键点] 根据当前状态决定是否应用旋转
        // ================================================================
        if (state === 'tree') {
            // 状态是树：应用 3D 旋转计算
            const cos = Math.cos(rotationAngle);
            const sin = Math.sin(rotationAngle);
            rx = tx * cos - tz * sin;
            ry = ty;
            rz = tx * sin + tz * cos;
        } else {
            // 状态是文字：不旋转，直接面向观众 (扁平)
            rx = tx;
            ry = ty;
            rz = tz; // 文字生成时 z 已经是 0 了
        }
        // ================================================================


        // 3. 粒子飞行 (平滑插值飞向计算好的目标 r)
        this.x += (rx - this.x) * config.transitionSpeed;
        this.y += (ry - this.y) * config.transitionSpeed;
        this.z += (rz - this.z) * config.transitionSpeed;

        // 4. 添加波浪流动效果 (保持流动感)
        const waveX = Math.sin(time * 0.002 + this.waveOffset) * 5;
        const waveY = Math.cos(time * 0.002 + this.waveOffset) * 5;
        
        // 5. 最终投影到 2D 屏幕
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
// 目标生成器 (保持不变)
// ==========================================
function createTreePoints() {
    targets.tree = [];
    const count = config.particleCount;
    const heightRange = height * 0.7;
    const maxRadius = width * 0.3;

    for (let i = 0; i < count; i++) {
        const p = i / count;
        const y = -heightRange/2 + p * heightRange;
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
    const vSize = 600;
    vCanvas.width = vSize;
    vCanvas.height = vSize / 2;
    const vCtx = vCanvas.getContext('2d');

    vCtx.font = 'bold 100px Arial, sans-serif';
    vCtx.fillStyle = '#fff';
    vCtx.textAlign = 'center';
    vCtx.textBaseline = 'middle';
    vCtx.fillText(config.text, vSize/2, vSize/4);

    const imageData = vCtx.getImageData(0, 0, vSize, vSize/2).data;
    const step = 4;

    for (let y = 0; y < vSize/2; y += step) {
        for (let x = 0; x < vSize; x += step) {
            const alpha = imageData[(y * vSize + x) * 4 + 3];
            if (alpha > 128) {
                targets.text.push({
                    x: (x - vSize/2) * 2.5,
                    y: (y - vSize/4) * 2.5,
                    z: 0 // 文字 Z 轴为 0，扁平
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

    // 只有在树的状态下，才增加旋转角度
    if (state === 'tree') {
        rotationAngle += config.rotationSpeed;
    }
    // 如果变成了文字，rotationAngle 就保持不变了，不过上面的逻辑已经保证了文字不使用这个角度

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
});

init();
