import type { WordItem } from '@/types/word';

// We do NOT statically import JSON files here to prevent them from being bundled into the compiled Javascript code.
// Instead, they are loaded synchronously on demand at runtime from the local static assets folder.

const cachedData: Record<string, WordItem[]> = {};

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
                let content;
                try {
                    // Try absolute path from code package root first
                    content = fs.readFileSync(`/static/${prop}.json`, 'utf8');
                } catch (pathErr) {
                    // Fallback to relative path
                    content = fs.readFileSync(`static/${prop}.json`, 'utf8');
                }
                const data = JSON.parse(content as string);
                cachedData[prop] = data;
                return data;
            }
        } catch (e) {
            console.error(`[WordBooks] Failed to load ${prop} using WeChat FileSystemManager:`, e);
        }

        // Try Web/H5 XMLHttpRequest fallback (Browser environment)
        try {
            if (typeof window !== 'undefined') {
                const xhr = new XMLHttpRequest();
                xhr.open('GET', `/static/${prop}.json`, false); // synchronous GET request
                xhr.send(null);
                if (xhr.status === 200) {
                    const data = JSON.parse(xhr.responseText);
                    cachedData[prop] = data;
                    return data;
                }
            }
        } catch (e) {
            console.error(`[WordBooks] Failed to load ${prop} using XMLHttpRequest:`, e);
        }

        return [];
    }
});


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
