import type { WordBookMeta } from '@/types/word';

declare const wx: any;

const wordBookList: WordBookMeta[] = [
    {
        label: '四级词汇',
        value: 'CET4luan_1',
        count: 1162,
    },
    {
        label: '六级词汇',
        value: 'CET6luan_1',
        count: 1228,
    },
    {
        label: '考研词汇',
        value: 'KaoYanluan_1',
        count: 1340,
    },
    {
        label: '雅思词汇',
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
    /**
     * 本地静态图片纯离线预览（微信小程序端通过文件系统临时转存实现 100% 离线预览，H5/其他端平滑降级）
     * @param staticPath 相对于 static 的路径或以 /static 开头的路径
     * @param cacheFileName 缓存到本地的文件名
     */
    previewLocalImage(staticPath: string, cacheFileName = 'preview_cache.jpg') {
        // #ifdef MP-WEIXIN
        try {
            if (typeof wx !== 'undefined' && wx.getFileSystemManager && wx.env && wx.env.USER_DATA_PATH) {
                const fs = wx.getFileSystemManager();
                const targetPath = `${wx.env.USER_DATA_PATH}/${cacheFileName}`;

                let needWrite = true;
                try {
                    fs.accessSync(targetPath);
                    needWrite = false;
                } catch {
                    needWrite = true;
                }

                if (needWrite) {
                    const cleanPath = staticPath.startsWith('/') ? staticPath.slice(1) : staticPath;
                    let buffer: any;
                    try {
                        buffer = fs.readFileSync(cleanPath);
                    } catch {
                        buffer = fs.readFileSync(`/${cleanPath}`);
                    }
                    fs.writeFileSync(targetPath, buffer, 'binary');
                }

                uni.previewImage({
                    current: targetPath,
                    urls: [targetPath],
                });
                return;
            }
        } catch (err) {
            console.warn('[commonUtil.previewLocalImage] 本地转存预览失败:', err);
        }
        // #endif

        // H5 / 其他端降级使用
        const url = staticPath.startsWith('/') ? staticPath : `/${staticPath}`;
        uni.previewImage({
            current: url,
            urls: [url],
        });
    },
};

export default commonUtil;
