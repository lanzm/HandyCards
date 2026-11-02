/**
 * 随手词卡 · 分享卡片与 Canvas 2D 绘图工具类
 */

export const SHARE_TITLE = '随手词卡 · HandyCards - 打开即用的极简翻卡背单词小程序';
export const DEFAULT_SHARE_COVER = '/static/share-cover.jpg';

export interface RenderWordShareCardOptions {
    canvas: any;
    word: string;
    phonetic?: string;
    width?: number;
    height?: number;
}

/**
 * 绘制圆角矩形路径
 * @param ctx 渲染上下文 (CanvasRenderingContext2D)
 * @param x 起点 X 坐标
 * @param y 起点 Y 坐标
 * @param w 矩形宽度
 * @param h 矩形高度
 * @param r 圆角半径
 */
export const drawRoundRect = (
    ctx: any,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
): void => {
    if (w < 2 * r) r = w / 2;
    if (h < 2 * r) r = h / 2;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
};

/**
 * 绘制随手词卡 Logo 图标（圆角蓝色卡片 + 浮动双卡图案）
 * @param ctx 渲染上下文
 * @param lx 左上角 X 坐标
 * @param ly 左上角 Y 坐标
 * @param ls 图标外框尺寸（正方形宽高）
 */
export const drawHandyCardsLogo = (
    ctx: any,
    lx: number,
    ly: number,
    ls: number
): void => {
    ctx.save();
    ctx.shadowColor = 'rgba(43, 130, 246, 0.28)';
    ctx.shadowBlur = 16;
    ctx.shadowOffsetY = 6;
    ctx.fillStyle = '#2B82F6';
    drawRoundRect(ctx, lx, ly, ls, ls, 18);
    ctx.fill();
    ctx.restore();

    // 绘制 Logo 内部的双卡浮动图案 (基于 512x512 视口等比缩放)
    ctx.save();
    ctx.translate(lx, ly);
    const scale = ls / 512;
    ctx.scale(scale, scale);

    // 背面卡片 (旋转 -10deg)
    ctx.save();
    ctx.translate(256, 256);
    ctx.rotate((-10 * Math.PI) / 180);
    ctx.translate(-256, -256);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    drawRoundRect(ctx, 156, 140, 180, 232, 28);
    ctx.fill();
    ctx.restore();

    // 正面卡片 (旋转 +6deg)
    ctx.save();
    ctx.translate(256, 256);
    ctx.rotate((6 * Math.PI) / 180);
    ctx.translate(-256, -256);
    ctx.fillStyle = '#FFFFFF';
    drawRoundRect(ctx, 166, 140, 180, 232, 28);
    ctx.fill();

    // 卡片标题栏条形与圆点
    ctx.fillStyle = '#2B82F6';
    drawRoundRect(ctx, 198, 202, 82, 18, 9);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(300, 211, 9, 0, Math.PI * 2);
    ctx.fill();

    // 卡片次级文字条形
    ctx.fillStyle = 'rgba(43, 130, 246, 0.45)';
    drawRoundRect(ctx, 198, 234, 116, 12, 6);
    ctx.fill();
    ctx.restore();

    ctx.restore();
};

/**
 * 在 2D Canvas 上渲染单词海报分享卡片并导出临时文件路径
 * @param options 渲染配置项
 * @returns Promise<string> 导出的图片临时路径，失败则回退默认封面
 */
export const renderWordShareCardToTempFile = (options: RenderWordShareCardOptions): Promise<string> => {
    return new Promise((resolve) => {
        const { canvas, word, phonetic } = options;
        const width = options.width ?? 1000;
        const height = options.height ?? 800;

        if (!canvas || !word) {
            return resolve(DEFAULT_SHARE_COVER);
        }

        const ctx = canvas.getContext('2d');
        if (!ctx) {
            return resolve(DEFAULT_SHARE_COVER);
        }

        canvas.width = width;
        canvas.height = height;

        // 1. 清爽浅色背景
        ctx.fillStyle = '#F8FAFC';
        ctx.fillRect(0, 0, width, height);

        // 2. 径向微光
        try {
            const grad = ctx.createRadialGradient(
                width / 2,
                height / 2 - 40,
                50,
                width / 2,
                height / 2 - 40,
                450
            );
            grad.addColorStop(0, 'rgba(43, 130, 246, 0.04)');
            grad.addColorStop(1, 'rgba(248, 250, 252, 0)');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, width, height);
        } catch {
            // ignore
        }

        // 3. 左上角 Logo (蓝底圆角 + 浮动双卡)
        drawHandyCardsLogo(ctx, 64, 56, 76);

        // 4. 居中大单词
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        let fontSize = 96;
        if (word.length > 13) fontSize = 68;
        else if (word.length > 10) fontSize = 80;

        ctx.font = `800 ${fontSize}px sans-serif`;
        ctx.fillStyle = '#0F172A';
        ctx.fillText(word, width / 2, height / 2 - 40);

        // 5. 英文音标
        if (phonetic) {
            ctx.font = 'italic 34px serif';
            ctx.fillStyle = '#64748B';
            ctx.fillText(phonetic, width / 2, height / 2 + 35);
        }
        ctx.restore();

        // 6. 底部特性胶囊标签
        ctx.save();
        const tagText = '开源 · 无广 · 无登录 · 打开即用';
        ctx.font = '600 24px sans-serif';
        const textWidth = ctx.measureText(tagText).width;
        const pillPadX = 32;
        const pillW = textWidth + pillPadX * 2;
        const pillH = 50;
        const pillX = (width - pillW) / 2;
        const pillY = height - 120;

        // 胶囊阴影
        ctx.shadowColor = 'rgba(0, 0, 0, 0.03)';
        ctx.shadowBlur = 12;
        ctx.shadowOffsetY = 4;

        ctx.fillStyle = '#FFFFFF';
        drawRoundRect(ctx, pillX, pillY, pillW, pillH, 999);
        ctx.fill();

        // 胶囊边框
        ctx.shadowColor = 'transparent';
        ctx.strokeStyle = '#E2E8F0';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // 胶囊文字
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#1E293B';
        ctx.fillText(tagText, width / 2, pillY + pillH / 2);
        ctx.restore();

        // #ifdef MP-WEIXIN
        // 导出临时文件 (2.13.0+ 支持)
        (uni.canvasToTempFilePath as any)({
            canvas: canvas,
            canvasId: 'shareCanvas',
            destWidth: width,
            destHeight: height,
            fileType: 'jpg',
            quality: 0.92,
            success: (tempRes: any) => {
                resolve(tempRes?.tempFilePath ?? DEFAULT_SHARE_COVER);
            },
            fail: (err: any) => {
                console.error('[shareCard] canvasToTempFilePath fail:', err);
                resolve(DEFAULT_SHARE_COVER);
            }
        });
        // #endif

        // #ifndef MP-WEIXIN
        resolve(DEFAULT_SHARE_COVER);
        // #endif
    });
};

/**
 * 按需为指定单词生成动态分享卡片（封装 SelectorQuery 与 Canvas 查找）
 * @param instanceProxy 当前组件实例代理 (instance?.proxy)
 * @param word 单词文本
 * @param phonetic 音标文本
 * @param canvasId 离屏 Canvas 选择器，默认为 #shareCanvas
 * @returns Promise<string> 本地临时文件路径 (wxfile://...)
 */
export const renderShareCardOnDemand = (
    instanceProxy: any,
    word?: string,
    phonetic?: string,
    canvasId = '#shareCanvas'
): Promise<string> => {
    return new Promise((resolve) => {
        if (!word) {
            return resolve(DEFAULT_SHARE_COVER);
        }

        // #ifdef MP-WEIXIN
        try {
            const query = uni.createSelectorQuery();
            const proxy = instanceProxy ? query.in(instanceProxy) : query;
            (proxy.select(canvasId) as any)
                .node()
                .exec((res: any[]) => {
                    const canvas = res?.[0]?.node;
                    if (!canvas) {
                        console.warn('[shareCard] 未找到 canvas 节点，回退默认封面');
                        return resolve(DEFAULT_SHARE_COVER);
                    }
                    renderWordShareCardToTempFile({
                        canvas,
                        word,
                        phonetic,
                        width: 1000,
                        height: 800,
                    })
                        .then(resolve)
                        .catch(() => resolve(DEFAULT_SHARE_COVER));
                });
        } catch (e) {
            console.error('[shareCard] 执行异常:', e);
            resolve(DEFAULT_SHARE_COVER);
        }
        // #endif

        // #ifndef MP-WEIXIN
        resolve(DEFAULT_SHARE_COVER);
        // #endif
    });
};
