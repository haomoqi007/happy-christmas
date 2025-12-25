const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

let width, height;
let particles = [];
// 存储两种形态的目标坐标点 (带3D信息)
let targets = { tree: [], text: [] }; 
let state = 'tree'; // 当前状态
let rotationAngle = 0; // 全局旋转角度

// --- 配置项 ---
const config = {
    text: "Merry Christmas", 
    particleCount: 2000, // 粒子总数
    particleSize: 2.2, // 粒子大小
    // 圣诞幻彩灯光色板
    colors: ['#ff3333', '#00cc66', '#ffcc00', '#3399ff', '#ffffff'],
    transitionSpeed: 0.03, // 变换速度
    delayBeforeMorph: 4000, // 开始变形前的等待时间
    rotationSpeed: 0.003, // 3D旋转速度
    noiseStrength: 5 // 流体噪声强度
};

// --- 初始化画布尺寸 ---
function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
}

// --- 随机颜色获取 ---
function getRandomColor() {
    return config.colors[Math.floor(Math.random() * config.colors.length)];
}

// --- 简化的噪声函数 (模拟Perlin Noise) ---
function noise(x, y, z) {
    const p = [151,160,137,91,90,15,131,13,201,95,96,53,194,233,7,225,140,36,103,30,69,142,8,99,37,240,21,10,23,190,6,148,247,120,234,75,0,26,197,62,94,252,219,203,117,35,11,32,57,177,33,88,237,149,56,87,174,20,125,136,171,168,68,175,74,165,71,134,139,48,27,166,77,146,158,231,83,111,229,122,60,211,133,230,220,105,92,41,55,46,245,40,244,102,143,54,65,25,63,161,1,216,80,73,209,76,132,187,208, 89,18,169,200,196,135,130,116,188,159,86,164,100,109,198,173,186,3,64,52,217,226,250,124,123,5,202,38,147,118,126,255,82,85,212,207,206,59,227,47,16,58,17,182,189,28,42,223,183,170,213,119,248,152,2,44,154,163,70,221,153,101,155,167,43,172,9,129,22,39,253,19,98,108,110,79,113,224,232,178,185,112,104,218,246,97,228,251,34,242,193,238,210,144,12,191,179,162,241,81,51,145,235,249,14,239,107,49,192,214,31,181,199,106,157,184,84,204,176,115,121,50,45,127,4,150,254,138,236,205,93,222,114,67,29,24,72,243,141,128,195,78,66,215,61,156,180];
    const X = Math.floor(x) & 255, Y = Math.floor(y) & 255, Z = Math.floor(z) & 255;
    x -= Math.floor(x); y -= Math.floor(y); z -= Math.floor(z);
    const u = fade(x), v = fade(y), w = fade(z);
    const A = p[X]+Y, AA = p[A]+Z, AB = p[A+1]+Z, B = p[X+1]+Y, BA = p[B]+Z, BB = p[B+1]+Z;
    return lerp(w, lerp(v, lerp(u, grad(p[AA], x, y, z), grad(p[BA], x-1, y, z)), lerp(u, grad(p[AB], x, y-1, z), grad(p[BB], x-1, y-1, z))), lerp(v, lerp(u, grad(p[AA+1], x, y, z-1), grad(p[BA+1], x-1, y, z-1)), lerp(u, grad(p[AB+1], x, y-1, z-1), grad(p[BB+1], x-1, y-1, z-1))));
}
function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
function lerp(t, a, b) { return a + t * (b - a); }
function grad(hash, x, y, z) { const h = hash & 15; const u = h<8 ? x : y, v = h<4 ? y : h==12||h==14 ? x : z; return ((h&1) == 0 ? u : -u) + ((h&2) == 0 ? v : -v); }

// ==========================================
// 核心类：粒子 (升级版)
// ==========================================
class Particle {
    constructor(index) {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.z = (Math.random() - 0.5) * 200; // 引入Z轴深度
        this.size = config.particleSize * (0.5 + Math.random());
        this.color = getRandomColor(); // 随机幻彩颜色
        this.targetIndex = index;
        // 噪声参数
        this.noiseOffsetX = Math.random() * 1000;
        this.noiseOffsetY = Math.random() * 1000;
        this.noiseOffsetZ = Math.random() * 1000;
    }

    // 更新粒子位置 (核心3D旋转和流体运动逻辑)
    update(time) {
        let targetList = (state === 'tree') ? targets.tree : targets.text;
        let target = targetList[this.targetIndex % targetList.length];
        if (!target) target = { x: 0, y: 0, z: 0 };

        // 1. 3D旋转变换 (绕Y轴旋转)
        // 将目标点从 2D 映射到 3D 空间，并应用旋转
        const cos = Math.cos(rotationAngle);
        const sin = Math.sin(rotationAngle);
        // 目标点的原始3D坐标 (相对于中心点)
        const tx0 = target.x;
        const ty0 = target.y;
        const tz0 = target.z || 0;
        // 旋转后的3D坐标
        const tx1 = tx0 * cos - tz0 * sin;
        const ty1 = ty0;
        const tz1 = tx0 * sin + tz0 * cos;

        // 2. 计算透视投影 (将3D坐标投影回2D屏幕)
        const perspective = 1000; // 透视距离
        const scale = perspective / (perspective - tz1); // 近大远小
        const finalTargetX = width / 2 + tx1 * scale;
        const finalTargetY = height / 2 + ty1 * scale;

        // 3. 缓动飞向目标 (Easing)
        this.x += (finalTargetX - this.x) * config.transitionSpeed;
        this.y += (finalTargetY - this.y) * config.transitionSpeed;
        this.z += (tz1 - this.z) * config.transitionSpeed;
        
        // 4. 叠加流体噪声运动 (永不静止的核心)
        const nX = noise(time * 0.0005 + this.noiseOffsetX, time * 0.0005, this.noiseOffsetZ) * config.noiseStrength;
        const nY = noise(time * 0.0005 + this.noiseOffsetY, time * 0.0005 + 100, this.noiseOffsetZ) * config.noiseStrength;
        
        this.x += nX;
        this.y += nY;
        // 根据深度调整大小，增强3D感
        this.currentSize = this.size * scale;
    }

    draw() {
        // 不绘制太远或太近的粒子
        if (this.currentSize <= 0) return;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.currentSize, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        // 添加一点发光效果，增强灯珠感
        ctx.shadowBlur = this.currentSize * 2;
        ctx.shadowColor = this.color;
        ctx.fill();
        ctx.shadowBlur = 0;
    }
}

// ==========================================
// 形状采样器
// ==========================================
const Sampler = {
    vCanvas: document.createElement('canvas'),
    vCtx: null,
    vWidth: 400, // 提高采样分辨率
    vHeight: 400,

    init: function() {
        this.vCanvas.width = this.vWidth;
        this.vCanvas.height = this.vHeight;
        this.vCtx = this.vCanvas.getContext('2d', { willReadFrequently: true });
    },

    getPoints: function(drawFn) {
        this.vCtx.clearRect(0, 0, this.vWidth, this.vHeight);
        drawFn(this.vCtx, this.vWidth, this.vHeight);
        
        const imageData = this.vCtx.getImageData(0, 0, this.vWidth, this.vHeight).data;
        const points = [];
        const step = 3; // 采样密度

        for (let y = 0; y < this.vHeight; y += step) {
            for (let x = 0; x < this.vWidth; x += step) {
                if (imageData[(y * this.vWidth + x) * 4 + 3] > 128) {
                    // 坐标归一化到 -1 到 1 之间，方便后续3D处理
                    const nx = (x / this.vWidth) * 2 - 1;
                    const ny = (y / this.vHeight) * 2 - 1;
                    // 映射到虚拟3D空间范围
                    const range = Math.min(width, height) * 0.7;
                    points.push({ x: nx * range, y: ny * range, z: 0 });
                }
            }
        }
        return points.sort(() => Math.random() - 0.5);
    },

    // 画树 (更精细的形状)
    drawTree: function(ctx, w, h) {
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        const topY = h * 0.1;
        const bottomY = h * 0.8;
        const centerX = w / 2;
        // 三层树冠
        for (let i = 0; i < 3; i++) {
            const layerTop = topY + (bottomY - topY) * (i * 0.25);
            const layerBottom = topY + (bottomY - topY) * ((i + 1) * 0.3);
            const layerWidth = w * (0.2 + i * 0.15);
            ctx.moveTo(centerX, layerTop);
            ctx.lineTo(centerX + layerWidth, layerBottom);
            ctx.lineTo(centerX - layerWidth, layerBottom);
            ctx.fill();
        }
        // 树干
        ctx.fillRect(centerX - w*0.05, bottomY, w*0.1, h*0.15);
    },

    // 画文字 (参考图6的风格)
    drawText: function(ctx, w, h) {
        ctx.fillStyle = '#fff';
        // 使用更活泼的字体，如果系统没有会回退到通用字体
        ctx.font = 'bold italic 60px "Comic Sans MS", "Arial Rounded MT Bold", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(config.text, w / 2, h / 2);
    }
};

// ==========================================
// 主程序
// ==========================================
let startTime = null;

function animate(timestamp) {
    if (!startTime) startTime = timestamp;
    const progress = timestamp - startTime;

    // 增加全局旋转角度，产生整体的3D自转
    rotationAngle += config.rotationSpeed;

    // 使用半透明清空画布，制造丝滑的拖尾光影
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.fillRect(0, 0, width, height);
    // ctx.globalCompositeOperation = 'lighter'; // 可选：叠加变亮模式，光感更强

    if (state === 'tree' && progress > config.delayBeforeMorph) {
        state = 'text';
    }

    particles.forEach(p => {
        p.update(timestamp);
        p.draw();
    });

    // ctx.globalCompositeOperation = 'source-over'; // 恢复默认混合模式
    requestAnimationFrame(animate);
}

function init() {
    resize();
    Sampler.init();
    targets.tree = Sampler.getPoints(Sampler.drawTree);
    targets.text = Sampler.getPoints(Sampler.drawText);
    
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
    // 窗口尺寸改变时彻底重置
    init();
});

// 启动
init();
