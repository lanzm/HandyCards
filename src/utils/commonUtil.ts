import type { WordBookMeta } from '@/types/word';

declare const wx: any;

const wordBookList: WordBookMeta[] = [
    {
        label: '四级核心',
        value: 'CET4luan_1',
        count: 1162,
    },
    {
        label: '六级核心',
        value: 'CET6luan_1',
        count: 1228,
    },
    {
        label: '考研核心',
        value: 'KaoYanluan_1',
        count: 1340,
    },
    {
        label: '雅思核心',
        value: 'IELTSluan_2',
        count: 3427,
    },
];

const commonUtil = {
    wordBookList,
    msg(title: string, icon: 'none' | 'success' | 'loading' | 'error' = "none", mask: boolean = false, duration = 2000) {
        uni.showToast({
            title,
            duration,
            mask,
            icon,
        });
    },
    loading(title = '加载中...', mask = true) {
        uni.showLoading({
            title: title,
            mask: mask,
        });
    },
    getCurrWordBook() {
        const _wordBook = uni.getStorageSync('wordBook');
        if (_wordBook) {
            return wordBookList.find((e) => e.value === _wordBook) ?? wordBookList[0];
        } else {
            return wordBookList[0];
        }
    },
    /**
     * 高性能安全获取窗口尺寸（优先使用无阻塞的 getWindowInfo，平滑降级至 getSystemInfoSync）
     */
    getWindowDimensions() {
        try {
            if (typeof (uni as any).getWindowInfo === 'function') {
                const win = (uni as any).getWindowInfo();
                if (win && win.windowWidth) {
                    return {
                        windowWidth: win.windowWidth || 375,
                        windowHeight: win.windowHeight || 800,
                        statusBarHeight: win.statusBarHeight || 44
                    };
                }
            }
            const sys = uni.getSystemInfoSync();
            return {
                windowWidth: sys?.windowWidth || 375,
                windowHeight: sys?.windowHeight || 800,
                statusBarHeight: sys?.statusBarHeight || 44
            };
        } catch {
            return {
                windowWidth: 375,
                windowHeight: 800,
                statusBarHeight: 44
            };
        }
    },
    /**
     * 获取离线分享卡片封面路径
     * 解决微信开发者工具模拟器无法解析代码包绝对路径导致“虚拟好友”裂图的问题
     */
    getShareCoverPath(): string {
        // #ifdef MP-WEIXIN
        try {
            if (typeof wx !== 'undefined' && wx.getFileSystemManager && wx.env && wx.env.USER_DATA_PATH) {
                const fs = wx.getFileSystemManager();
                const targetPath = `${wx.env.USER_DATA_PATH}/handycards_share_cover_v3.jpg`;
                let existingSize = -1;
                try {
                    const stat = fs.statSync(targetPath);
                    existingSize = stat?.size ?? -1;
                } catch {
                    existingSize = -1;
                }

                const candidatePaths = ['static/share-cover.jpg', '/static/share-cover.jpg'];
                for (const p of candidatePaths) {
                    try {
                        const buf = fs.readFileSync(p);
                        if (buf) {
                            if (existingSize !== buf.byteLength) {
                                fs.writeFileSync(targetPath, buf);
                            }
                            return targetPath;
                        }
                    } catch {
                        // try next
                    }
                }

                if (existingSize > 0) {
                    return targetPath;
                }
            }
        } catch (e) {
            console.warn('[commonUtil] getShareCoverPath fail:', e);
        }
        // #endif
        return '/static/share-cover.jpg';
    },
    /**
     * 复制文本到系统剪贴板并提示
     */
    copyText(text: string, successMsg = '已复制') {
        uni.setClipboardData({
            data: text,
            success: () => {
                if (successMsg) {
                    commonUtil.msg(successMsg, 'success');
                }
            },
        });
    },
    /**
     * 切换卡片时的清晰微触觉反馈（medium 档位，含安卓降级保护）
     */
    vibrateCardSwitch() {
        try {
            // #ifdef MP-WEIXIN
            uni.vibrateShort({
                type: 'medium',
                fail: () => {
                    try {
                        uni.vibrateShort({});
                    } catch {
                        // ignore
                    }
                }
            });
            // #endif
            // #ifndef MP-WEIXIN
            uni.vibrateShort({});
            // #endif
        } catch {
            // ignore
        }
    },
};

export default commonUtil;
