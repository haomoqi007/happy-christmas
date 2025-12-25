const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

let width, height;
let particles = [];
let targets = { tree: [], text: [] };
let state = 'tree';
let rotationAngle = 0;

// --- 配置 ---
const config = {
    text: ["00姐", "圣诞快乐"], 
    // [关键修改 1] 粒子数量翻倍，确保能铺满复杂的汉字
    particleCount: 3000, 
    // [微调] 粒子稍微改小一点点，避免太密糊在一起
    particleSize: 2.2,   
    colors: ['#4285F4', '#EA4335', '#34A853', '#FBBC05', '#FFFFFF', '#00FFFF'],
    transitionSpeed: 0.04, // 稍微慢一点点，让飞行更优雅
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
        
        // 循环分配目标点，如果目标点比粒子少，就会有重叠；
        // 如果目标点比粒子多，这段逻辑会导致只显示前 config.particleCount 个点
        // 所以我们在 createTextPoints 里加了“打乱”逻辑作为保险
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
    const lineHeight = 160; 
    const totalHeight = lines.length * lineHeight;
    const startY = (vSize - totalHeight) / 2 + lineHeight / 2;

    lines.forEach((line, i) => {
        vCtx.fillText(line, vSize / 2, startY + i * lineHeight);
    });

    const imageData = vCtx.getImageData(0, 0, vSize, vSize).data;
    // [关键修改 2] 采样步长稍微调大一点点 (4->5)，
    // 这样可以在有限的粒子数下覆盖更大的面积
    const step = 5; 

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

    // [关键修改 3] 随机打乱目标点
    // 这样即使粒子不够，也是整体变淡，而不会出现下半部分直接消失的情况
    targets.text.sort(() => Math.random() - 0.5);

    // 如果粒子数远小于目标点数，截取前 N 个，保证性能
    if (targets.text.length > config.particleCount) {
        // 实际上因为我们已经打乱了，所以截取前 N 个就是随机采样的效果
        targets.text = targets.text.slice(0, config.particleCount);
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
    createTextPoints();
});

init();
