import type { WordBookMeta } from '@/types/word';

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

export default {
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
            return wordBookList.find((e) => e.value === _wordBook) ?? wordBookList[3];
        } else {
            return wordBookList[3];
        }
    },
}
