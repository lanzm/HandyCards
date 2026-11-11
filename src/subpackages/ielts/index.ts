import type { WordItem } from '@/types/word';
import data from './data.json';

export const wordList: WordItem[] = data as WordItem[];

// @ts-ignore
if (typeof wx !== 'undefined') {
    // @ts-ignore
    if (!wx.__wordbooks) wx.__wordbooks = {};
    // @ts-ignore
    wx.__wordbooks['IELTSluan_2'] = wordList;
}
// @ts-ignore
if (typeof globalThis !== 'undefined') {
    // @ts-ignore
    if (!globalThis.__wordbooks) globalThis.__wordbooks = {};
    // @ts-ignore
    globalThis.__wordbooks['IELTSluan_2'] = wordList;
}

export default wordList;
