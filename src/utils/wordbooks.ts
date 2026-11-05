import type { WordItem } from '@/types/word';

// We do NOT statically import JSON files here to prevent them from being bundled into the compiled Javascript code.
// Instead, they are loaded synchronously on demand at runtime from the local static assets folder or subpackages.

const cachedData: Record<string, WordItem[]> = {};

let subpackageLoadPromise: Promise<boolean> | null = null;
let subpackageLoaded = false;

/**
 * 确保词书分包已被微信小程序环境下载并挂载
 */
export function ensureWordbookSubpackage(): Promise<boolean> {
    if (subpackageLoaded) {
        return Promise.resolve(true);
    }
    if (subpackageLoadPromise) {
        return subpackageLoadPromise;
    }

    subpackageLoadPromise = new Promise((resolve) => {
        // @ts-ignore
        if (typeof wx !== 'undefined' && wx.loadSubpackage) {
            // @ts-ignore
            wx.loadSubpackage({
                name: 'wordbooks',
                success: () => {
                    subpackageLoaded = true;
                    subpackageLoadPromise = null;
                    resolve(true);
                },
                fail: (err: any) => {
                    console.warn('[WordBooks] loadSubpackage by name "wordbooks" failed, trying "subpackages/wordbooks":', err);
                    // @ts-ignore
                    wx.loadSubpackage({
                        name: 'subpackages/wordbooks',
                        success: () => {
                            subpackageLoaded = true;
                            subpackageLoadPromise = null;
                            resolve(true);
                        },
                        fail: (err2: any) => {
                            console.error('[WordBooks] loadSubpackage failed:', err2);
                            subpackageLoadPromise = null; // allow retry
                            resolve(false);
                        }
                    });
                }
            });
        } else {
            subpackageLoaded = true;
            resolve(true);
        }
    });

    return subpackageLoadPromise;
}

export const wordBooksData = new Proxy({} as Record<string, WordItem[]>, {
    get(target, prop: string) {
        if (typeof prop !== 'string') {
            return undefined;
        }

        if (cachedData[prop]) {
            return cachedData[prop];
        }

        // Try WeChat FileSystemManager first (Mini Program environment)
        try {
            // @ts-ignore
            if (typeof wx !== 'undefined' && wx.getFileSystemManager) {
                // @ts-ignore
                const fs = wx.getFileSystemManager();
                let content: string | ArrayBuffer | undefined;
                const candidatePaths = [
                    `/static/${prop}.json`,
                    `static/${prop}.json`,
                    `/subpackages/wordbooks/static/${prop}.json`,
                    `subpackages/wordbooks/static/${prop}.json`
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
            console.error(`[WordBooks] Failed to load ${prop} using WeChat FileSystemManager:`, e);
        }

        // Try Web/H5 XMLHttpRequest fallback (Browser environment)
        try {
            if (typeof window !== 'undefined') {
                const webCandidatePaths = [
                    `/static/${prop}.json`,
                    `/subpackages/wordbooks/static/${prop}.json`
                ];

                for (const url of webCandidatePaths) {
                    try {
                        const xhr = new XMLHttpRequest();
                        xhr.open('GET', url, false); // synchronous GET request
                        xhr.send(null);
                        if (xhr.status === 200) {
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
            console.error(`[WordBooks] Failed to load ${prop} using XMLHttpRequest:`, e);
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

    const orderKey = `ej_shuffled_order_${bookKey}`;
    const cursorKey = `ej_cursor_${bookKey}`;
    const roundKey = `ej_round_${bookKey}`;

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

    const saveState = () => {
        try {
            uni.setStorageSync(orderKey, order);
            uni.setStorageSync(cursorKey, cursor);
            uni.setStorageSync(roundKey, round);
        } catch (e) {
            console.warn('[WordShuffler] 保存状态失败:', e);
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
                saveState();
            }
        } catch {
            order = generateShuffledOrder(list.length);
            cursor = 0;
            round = 1;
        }
    };

    init();

    const reshuffle = () => {
        order = generateShuffledOrder(list.length);
        cursor = 0;
        round += 1;
        saveState();
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
        saveState();
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

/**
 * 创建具有防连续重复缓冲池的单词随机抽取器
 * @param maxHistory 最大防重复历史容量（默认 30）
 */
export function createWordRandomizer(maxHistory = 30) {
    const recentHistory: string[] = [];

    return {
        pick(list: WordItem[]): WordItem | null {
            if (!list || list.length === 0) return null;
            if (list.length <= 5) {
                return list[Math.floor(Math.random() * list.length)];
            }
            let candidate = list[Math.floor(Math.random() * list.length)];
            let attempts = 0;
            while (recentHistory.includes(candidate.w.toLowerCase()) && attempts < 10) {
                candidate = list[Math.floor(Math.random() * list.length)];
                attempts++;
            }
            recentHistory.push(candidate.w.toLowerCase());
            const limit = Math.min(maxHistory, Math.floor(list.length * 0.5));
            if (recentHistory.length > limit) {
                recentHistory.shift();
            }
            return candidate;
        },
        reset() {
            recentHistory.length = 0;
        },
    };
}
