const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

let width, height;
let particles = [];
// 存储两种形态的目标坐标点
let targets = { tree: [], text: [] }; 
let state = 'tree'; // 当前状态

// --- 配置项 ---
const config = {
    text: "圣诞快乐", 
    particleCount: 1500, // 粒子总数，越多越清晰，但性能要求越高
    particleSize: 2.5, // 粒子大小
    // 模仿 Gemini 的蓝紫色调
    colors: ['#4285f4', '#9b72cb', '#d96570', '#131314', '#ffffff'],
    transitionSpeed: 0.05, // 变换速度 (越小越慢越平滑)
    delayBeforeMorph: 3000 // 开始变形前的等待时间 (毫秒)
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

// ==========================================
// 核心类：粒子
// ==========================================
class Particle {
    constructor() {
        // 初始位置随机分布在屏幕外，制造入场效果
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.size = config.particleSize + Math.random() * 1.5;
        this.color = getRandomColor();
        this.targetIndex = 0; // 对应目标点列表中的索引
        
        // 每个粒子的随机波动参数，让运动不那么死板
        this.noiseOffsetX = Math.random() * 100;
        this.noiseOffsetY = Math.random() * 100;
    }

    // 更新粒子位置
    update(time) {
        // 1. 确定当前的目标点列表
        let targetList = (state === 'tree') ? targets.tree : targets.text;
        
        // 2. 找到自己的目标坐标
        // 如果目标点数量少于粒子数，循环使用目标点
        let target = targetList[this.targetIndex % targetList.length];

        // 兜底：如果没有目标点，就待在屏幕中心
        if (!target) target = { x: width / 2, y: height / 2 };

        // 3. 缓动计算 (Easing) - 核心动画原理
        // 每一帧都向目标点移动剩下距离的一小部分
        this.x += (target.x - this.x) * config.transitionSpeed;
        this.y += (target.y - this.y) * config.transitionSpeed;
    }

    // 绘制粒子
    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
    }
}

// ==========================================
// 核心功能：形状采样器
// 在虚拟画布上画出形状，然后读取像素坐标
// ==========================================
const Sampler = {
    // 创建一个虚拟的小画布用于采样
    vCanvas: document.createElement('canvas'),
    vCtx: null,
    vWidth: 200, // 虚拟宽度，越小采样越快，但精度越低
    vHeight: 200,

    init: function() {
        this.vCanvas.width = this.vWidth;
        this.vCanvas.height = this.vHeight;
        this.vCtx = this.vCanvas.getContext('2d', { willReadFrequently: true });
    },

    // 通用采样方法
    getPoints: function(drawFn) {
        this.vCtx.clearRect(0, 0, this.vWidth, this.vHeight);
        drawFn(this.vCtx, this.vWidth, this.vHeight);
        
        const imageData = this.vCtx.getImageData(0, 0, this.vWidth, this.vHeight).data;
        const points = [];
        const step = 2; // 采样步长，越小点越密

        for (let y = 0; y < this.vHeight; y += step) {
            for (let x = 0; x < this.vWidth; x += step) {
                const alpha = imageData[(y * this.vWidth + x) * 4 + 3];
                // 如果像素不透明，认为是一个点
                if (alpha > 128) {
                    // 将虚拟坐标映射回真实屏幕坐标，并居中放大
                    const scale = Math.min(width, height) / this.vWidth * 0.8;
                    const realX = width / 2 + (x - this.vWidth / 2) * scale;
                    const realY = height / 2 + (y - this.vHeight / 2) * scale;
                    points.push({ x: realX, y: realY });
                }
            }
        }
        // 打乱顺序，让变形时的飞行轨迹更随机好看
        return points.sort(() => Math.random() - 0.5);
    },

    // 定义如何画树 (参考图1的形状)
    drawTree: function(ctx, w, h) {
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        // 简单的三角形树冠
        ctx.moveTo(w / 2, h * 0.1); 
        ctx.lineTo(w * 0.8, h * 0.7);
        ctx.lineTo(w * 0.2, h * 0.7);
        ctx.fill();
        // 树干
        ctx.fillRect(w * 0.45, h * 0.7, w * 0.1, h * 0.2);
    },

    // 定义如何画文字 (参考图2的内容)
    drawText: function(ctx, w, h) {
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 50px "Microsoft YaHei", sans-serif';
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

    // 使用半透明清空画布，制造一点点拖尾光影效果
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(0, 0, width, height);

    // 时间到后切换状态
    if (state === 'tree' && progress > config.delayBeforeMorph) {
        state = 'text';
    }

    // 更新并绘制所有粒子
    particles.forEach(p => {
        p.update(timestamp);
        p.draw();
    });

    requestAnimationFrame(animate);
}

function init() {
    resize();
    Sampler.init();

    // 1. 生成两种形态的目标点
    targets.tree = Sampler.getPoints(Sampler.drawTree);
    targets.text = Sampler.getPoints(Sampler.drawText);
    
    // 2. 创建粒子
    particles = [];
    for (let i = 0; i < config.particleCount; i++) {
        const p = new Particle();
        p.targetIndex = i;
        particles.push(p);
    }

    // 3. 开始动画
    startTime = null;
    state = 'tree';
    animate();
}

// 窗口大小改变时重新计算
window.addEventListener('resize', () => {
    // 简单处理：刷新页面以适应新尺寸
    location.reload();
});

// 启动
init();
