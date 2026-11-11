import type { WordItem } from '@/types/word';

declare const wx: any;

// We do NOT statically import JSON files here to prevent them from being bundled into the compiled Javascript code.
// Instead, CET4 is read from local static assets, and other books (CET6, KaoYan, IELTS) are packaged into their own independent subpackages.

const cachedData: Record<string, WordItem[]> = {};

interface SubpackageBookConfig {
    name: string;
    root: string;
    modulePaths: string[];
}

const BOOK_SUBPACKAGE_MAP: Record<string, SubpackageBookConfig> = {
    'CET6luan_1': {
        name: 'cet6',
        root: 'subpackages/cet6',
        modulePaths: [
            '../subpackages/cet6/index.js',
            '/subpackages/cet6/index.js',
            'subpackages/cet6/index.js',
            '../subpackages/cet6/pages/loader.js',
            '/subpackages/cet6/pages/loader.js'
        ]
    },
    'KaoYanluan_1': {
        name: 'kaoyan',
        root: 'subpackages/kaoyan',
        modulePaths: [
            '../subpackages/kaoyan/index.js',
            '/subpackages/kaoyan/index.js',
            'subpackages/kaoyan/index.js',
            '../subpackages/kaoyan/pages/loader.js',
            '/subpackages/kaoyan/pages/loader.js'
        ]
    },
    'IELTSluan_2': {
        name: 'ielts',
        root: 'subpackages/ielts',
        modulePaths: [
            '../subpackages/ielts/index.js',
            '/subpackages/ielts/index.js',
            'subpackages/ielts/index.js',
            '../subpackages/ielts/pages/loader.js',
            '/subpackages/ielts/pages/loader.js'
        ]
    }
};

/**
 * 检查内存或全局中是否已经存有该词书数据
 */
function getBookFromMemory(bookKey: string): WordItem[] | null {
    if (cachedData[bookKey] && cachedData[bookKey].length > 0) {
        return cachedData[bookKey];
    }
    if (typeof wx !== 'undefined' && wx?.__wordbooks?.[bookKey]) {
        const list = wx.__wordbooks[bookKey];
        if (Array.isArray(list) && list.length > 0) {
            cachedData[bookKey] = list;
            return list;
        }
    }
    if (typeof globalThis !== 'undefined' && (globalThis as any)?.__wordbooks?.[bookKey]) {
        const list = (globalThis as any).__wordbooks[bookKey];
        if (Array.isArray(list) && list.length > 0) {
            cachedData[bookKey] = list;
            return list;
        }
    }
    return null;
}

/**
 * 同步尝试 require 分包模块
 */
function tryRequireBook(bookKey: string): WordItem[] | null {
    const mem = getBookFromMemory(bookKey);
    if (mem) return mem;

    const cfg = BOOK_SUBPACKAGE_MAP[bookKey];
    if (!cfg) return null;

    // @ts-ignore
    if (typeof require === 'function') {
        for (const p of cfg.modulePaths) {
            try {
                // @ts-ignore
                const mod = require(p);
                const afterMem = getBookFromMemory(bookKey);
                if (afterMem) return afterMem;

                const list = mod?.wordList || mod?.default || mod;
                if (Array.isArray(list) && list.length > 0) {
                    cachedData[bookKey] = list;
                    if (typeof wx !== 'undefined') {
                        if (!wx.__wordbooks) wx.__wordbooks = {};
                        wx.__wordbooks[bookKey] = list;
                    }
                    return list;
                }
            } catch {
                // try next candidate path
            }
        }
    }
    return null;
}

const subpackagePromises: Record<string, Promise<boolean> | undefined> = {};

/**
 * 确保指定词书的分包已被微信小程序环境下载并挂载
 * @param targetBook 目标词书 key（如 IELTSluan_2、CET6luan_1、KaoYanluan_1）
 * @param maxWaitMs 最大等待毫秒数，默认 8000ms（8秒，兼顾真机弱网环境）
 */
export function ensureWordbookSubpackage(targetBook?: string, maxWaitMs = 8000): Promise<boolean> {
    if (!targetBook || targetBook === 'CET4luan_1') {
        return Promise.resolve(true);
    }

    if (tryRequireBook(targetBook)) {
        return Promise.resolve(true);
    }

    const existingPromise = subpackagePromises[targetBook];
    if (existingPromise) {
        return existingPromise;
    }

    const cfg = BOOK_SUBPACKAGE_MAP[targetBook];
    if (!cfg) {
        return Promise.resolve(false);
    }

    const promise = new Promise<boolean>(async (resolve) => {
        // 1. 优先尝试微信官方原生分包异步化 require.async
        try {
            // @ts-ignore
            if (typeof require !== 'undefined' && typeof (require as any).async === 'function') {
                for (const p of cfg.modulePaths) {
                    try {
                        // @ts-ignore
                        const mod = await (require as any).async(p);
                        const afterMem = getBookFromMemory(targetBook);
                        if (afterMem) {
                            delete subpackagePromises[targetBook];
                            resolve(true);
                            return;
                        }

                        const list = mod?.wordList || mod?.default || mod;
                        if (Array.isArray(list) && list.length > 0) {
                            cachedData[targetBook] = list;
                            if (typeof wx !== 'undefined') {
                                if (!wx.__wordbooks) wx.__wordbooks = {};
                                wx.__wordbooks[targetBook] = list;
                            }
                            delete subpackagePromises[targetBook];
                            resolve(true);
                            return;
                        }
                    } catch {
                        // try next
                    }
                }
            }
        } catch {
            // 继续向下尝试 wx.loadSubpackage
        }

        // 2. 尝试 wx.loadSubpackage
        if (typeof wx !== 'undefined' && wx.loadSubpackage) {
            const intervalMs = 200;
            const maxTries = Math.max(1, Math.floor(maxWaitMs / intervalMs));

            const pollCheckReady = (remainingTries: number) => {
                if (tryRequireBook(targetBook)) {
                    delete subpackagePromises[targetBook];
                    resolve(true);
                    return;
                }
                if (remainingTries <= 0) {
                    delete subpackagePromises[targetBook];
                    resolve(false);
                    return;
                }
                setTimeout(() => {
                    pollCheckReady(remainingTries - 1);
                }, intervalMs);
            };

            wx.loadSubpackage({
                name: cfg.name,
                success: () => {
                    const list = tryRequireBook(targetBook);
                    delete subpackagePromises[targetBook];
                    resolve(!!list);
                },
                fail: (err: any) => {
                    console.warn('[WordBooks] loadSubpackage(' + cfg.name + ') fail, polling readiness:', err);
                    pollCheckReady(maxTries);
                }
            });
        } else {
            const list = tryRequireBook(targetBook);
            delete subpackagePromises[targetBook];
            resolve(!!list);
        }
    });

    subpackagePromises[targetBook] = promise;
    return promise;
}

export const wordBooksData = new Proxy({} as Record<string, WordItem[]>, {
    get(target, prop: string) {
        if (typeof prop !== 'string') {
            return undefined;
        }

        if (cachedData[prop]) {
            return cachedData[prop];
        }

        // 1. 如果属于独立分包词书，尝试从分包编译产物（JS 模块）同步获取
        if (BOOK_SUBPACKAGE_MAP[prop]) {
            const subData = tryRequireBook(prop);
            if (subData && Array.isArray(subData) && subData.length > 0) {
                cachedData[prop] = subData;
                return subData;
            }
        }

        // 2. 主包词书（如 CET4luan_1）尝试微信 FileSystemManager
        try {
            if (typeof wx !== 'undefined' && wx.getFileSystemManager) {
                const fs = wx.getFileSystemManager();
                let content: string | ArrayBuffer | undefined;
                const candidatePaths = [
                    '/static/' + prop + '.json',
                    'static/' + prop + '.json'
                ];

                for (const p of candidatePaths) {
                    try {
                        content = fs.readFileSync(p, 'utf8');
                        if (content) break;
                    } catch {
                        // Try next candidate path
                    }
                }

                if (content) {
                    const data = JSON.parse(content as string);
                    cachedData[prop] = data;
                    return data;
                }
            }
        } catch (e) {
            console.error('[WordBooks] Failed to load ' + prop + ' using WeChat FileSystemManager:', e);
        }

        // 3. Try Web/H5 XMLHttpRequest fallback (Browser environment)
        try {
            if (typeof window !== 'undefined') {
                const webCandidatePaths = [
                    '/static/' + prop + '.json'
                ];

                for (const url of webCandidatePaths) {
                    try {
                        const xhr = new XMLHttpRequest();
                        xhr.open('GET', url, false);
                        xhr.send(null);
                        if (xhr.status === 200 || xhr.status === 0) {
                            const data = JSON.parse(xhr.responseText);
                            cachedData[prop] = data;
                            return data;
                        }
                    } catch {
                        // Try next url
                    }
                }
            }
        } catch (e) {
            console.error('[WordBooks] Failed to load ' + prop + ' using XMLHttpRequest:', e);
        }

        return [];
    }
});

export interface WordShuffler {
    /** 抽取下一个无重复单词并推进游标；若整本学完自动开启新一轮并标记 isNewRound */
    pickNext(): { word: WordItem | null; isNewRound: boolean };
    /** 预窥下一个单词（不推进游标），供背景卡片渲染 */
    peekNext(): WordItem | null;
    /** 获取当前进度 */
    getProgress(): { cursor: number; total: number; round: number };
    /** 强制重新洗牌并重置 */
    reshuffle(): void;
}

/**
 * Fisher-Yates 全本乱序洗牌抽取器
 * 1. 纯整型下标乱序数组（0 到 N-1），内存开销仅 ~15KB
 * 2. 保证整本书中每个单词均只出现一次，绝对不重复
 * 3. 进度与乱序状态持久化到 Storage，断点续背
 * 4. 整本书背完后自动开启下一轮洗牌并触发通知
 */
export function createWordShuffler(bookKey: string, list: WordItem[]): WordShuffler {
    if (!list || list.length === 0) {
        return {
            pickNext: () => ({ word: null, isNewRound: false }),
            peekNext: () => null,
            getProgress: () => ({ cursor: 0, total: 0, round: 1 }),
            reshuffle: () => {}
        };
    }

    const orderKey = 'ej_shuffled_order_' + bookKey;
    const cursorKey = 'ej_cursor_' + bookKey;
    const roundKey = 'ej_round_' + bookKey;

    let order: number[] = [];
    let cursor = 0;
    let round = 1;

    // Fisher-Yates 算法生成随机乱序排列
    const generateShuffledOrder = (length: number): number[] => {
        const arr = Array.from({ length }, (_, i) => i);
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    };

    const saveCursorState = () => {
        try {
            uni.setStorageSync(cursorKey, cursor);
        } catch (e) {
            console.warn('[WordShuffler] 保存游标进度失败:', e);
        }
    };

    const saveFullState = () => {
        try {
            uni.setStorageSync(orderKey, order);
            uni.setStorageSync(cursorKey, cursor);
            uni.setStorageSync(roundKey, round);
        } catch (e) {
            console.warn('[WordShuffler] 保存完整洗牌状态失败:', e);
        }
    };

    const init = () => {
        try {
            const savedOrder = uni.getStorageSync(orderKey);
            const savedCursor = uni.getStorageSync(cursorKey);
            const savedRound = uni.getStorageSync(roundKey);

            if (Array.isArray(savedOrder) && savedOrder.length === list.length) {
                order = savedOrder;
                cursor = typeof savedCursor === 'number' && savedCursor >= 0 && savedCursor <= list.length ? savedCursor : 0;
                round = typeof savedRound === 'number' && savedRound >= 1 ? savedRound : 1;
            } else {
                order = generateShuffledOrder(list.length);
                cursor = 0;
                round = 1;
                saveFullState();
            }
        } catch {
            order = generateShuffledOrder(list.length);
            cursor = 0;
            round = 1;
            saveFullState();
        }
    };

    init();

    const reshuffle = () => {
        order = generateShuffledOrder(list.length);
        cursor = 0;
        round += 1;
        saveFullState();
    };

    const peekNext = (): WordItem | null => {
        if (list.length === 0) return null;
        const targetCursor = cursor >= order.length ? 0 : cursor;
        const index = order[targetCursor];
        const raw = list[index];
        if (!raw) return null;
        return {
            ...raw,
            cardIndex: targetCursor + 1
        };
    };

    const pickNext = (): { word: WordItem | null; isNewRound: boolean } => {
        if (list.length === 0) return { word: null, isNewRound: false };
        let isNewRound = false;
        if (cursor >= order.length) {
            reshuffle();
            isNewRound = true;
        }
        const currentSeq = cursor + 1;
        const index = order[cursor];
        cursor += 1;
        saveCursorState();
        const raw = list[index];
        return {
            word: raw ? { ...raw, cardIndex: currentSeq } : null,
            isNewRound
        };
    };

    const getProgress = () => ({
        cursor,
        total: list.length,
        round
    });

    return {
        pickNext,
        peekNext,
        getProgress,
        reshuffle
    };
}
