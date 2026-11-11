import { ref, onUnmounted } from 'vue';
import type { Ref, ComputedRef } from 'vue';
import type { WordItem, WordBookMeta } from '@/types/word';
import type { Translations } from '@/utils/i18n';
import commonUtil from '@/utils/commonUtil';
import { wordBooksData, createWordShuffler, ensureWordbookSubpackage, type WordShuffler } from '@/utils/wordbooks';

export interface UseWordDeckOptions {
    studyMode: Ref<'quiz' | 'browse'>;
    knowFlag: Ref<boolean>;
    isRevealing: Ref<boolean>;
    i18n: ComputedRef<Translations>;
    onWordChange?: (word: WordItem | null) => void;
}

export function useWordDeck(options: UseWordDeckOptions) {
    const { studyMode, knowFlag, isRevealing, i18n, onWordChange } = options;

    const wordBook = ref<WordBookMeta | null>(null);
    const wordList = ref<WordItem[]>([]);
    const historyWords = ref<WordItem[]>([]);
    const historyIndex = ref(-1);
    const wordObj = ref<WordItem | null>(null);
    const preloadedNextWord = ref<WordItem | null>(null);
    const loading = ref(false);

    // Background card display states
    const bgWordObj = ref<WordItem | null>(null);
    const bgKnowFlag = ref(false);
    const bgCardTransitionClass = ref('');
    const cardTransitionClass = ref('');
    const isSwipingDownActive = ref(false);
    const isTransitioning = ref(false);
    let transitionTimer: ReturnType<typeof setTimeout> | null = null;
    let resetTimer: ReturnType<typeof setTimeout> | null = null;

    const clearTimers = () => {
        if (transitionTimer) {
            clearTimeout(transitionTimer);
            transitionTimer = null;
        }
        if (resetTimer) {
            clearTimeout(resetTimer);
            resetTimer = null;
        }
    };

    let wordShuffler: WordShuffler | null = null;

    const pickNextWord = (): WordItem | null => {
        if (!wordShuffler) return null;
        const res = wordShuffler.pickNext();
        if (res.isNewRound) {
            commonUtil.msg(i18n.value.bookCompletedAlert, 'none', false, 2500);
        }
        return res.word;
    };

    const peekNextWord = (): WordItem | null => {
        if (!wordShuffler) return null;
        return wordShuffler.peekNext();
    };

    const updatePreloadedNextWord = () => {
        if (wordList.value.length === 0) return;
        if (!preloadedNextWord.value) {
            preloadedNextWord.value = peekNextWord();
        }
    };

    const getNextWord = () => {
        if (historyIndex.value < historyWords.value.length - 1) {
            return historyWords.value[historyIndex.value + 1];
        }
        if (!preloadedNextWord.value) {
            updatePreloadedNextWord();
        }
        return preloadedNextWord.value;
    };

    const syncBgCard = () => {
        if (isSwipingDownActive.value) {
            return;
        }
        bgWordObj.value = getNextWord();
        bgKnowFlag.value = studyMode.value === 'browse';
    };

    const nextWordDirectional = (dir: 'up' | 'down') => {
        if (isTransitioning.value) return;

        if (dir === 'down') {
            if (historyIndex.value <= 0) {
                commonUtil.msg(i18n.value.firstWordAlert);
                return;
            }
            commonUtil.vibrateCardSwitch();
            isSwipingDownActive.value = true;
            bgWordObj.value = wordObj.value;
            bgKnowFlag.value = knowFlag.value;
            
            historyIndex.value -= 1;
            wordObj.value = historyWords.value[historyIndex.value];
            knowFlag.value = true;
        } else {
            if (historyIndex.value < historyWords.value.length - 1) {
                historyIndex.value += 1;
            } else {
                if (wordList.value.length === 0) {
                    loadWordBook();
                    return;
                }
                const newWord = pickNextWord();
                if (newWord) {
                    historyWords.value.push(newWord);
                }
                preloadedNextWord.value = null;
                historyIndex.value = historyWords.value.length - 1;
            }
            commonUtil.vibrateCardSwitch();
            isSwipingDownActive.value = false;
        }

        isRevealing.value = false;
        if (dir === 'up') {
            knowFlag.value = studyMode.value === 'browse';
        }

        isTransitioning.value = true;
        clearTimers();

        cardTransitionClass.value = dir === 'up' ? 'card-slide-out-up' : 'card-slide-in-down';
        bgCardTransitionClass.value = dir === 'up' ? 'bg-card-to-active' : 'bg-card-to-back';

        transitionTimer = setTimeout(() => {
            if (dir === 'up') {
                knowFlag.value = studyMode.value === 'browse';
                wordObj.value = historyWords.value[historyIndex.value];

                cardTransitionClass.value = 'card-reset-center';
                bgCardTransitionClass.value = 'bg-card-to-back-instant';

                resetTimer = setTimeout(() => {
                    cardTransitionClass.value = '';
                    bgCardTransitionClass.value = '';
                    isSwipingDownActive.value = false;
                    isTransitioning.value = false;
                    updatePreloadedNextWord();
                    syncBgCard();
                }, 30);
            } else {
                cardTransitionClass.value = '';
                bgCardTransitionClass.value = '';
                isSwipingDownActive.value = false;
                isTransitioning.value = false;
                updatePreloadedNextWord();
                syncBgCard();
            }
            onWordChange?.(wordObj.value);
        }, 250);
    };

    const nextWord = () => {
        nextWordDirectional('up');
    };

    const randomWord = () => {
        knowFlag.value = studyMode.value === 'browse';
        if (wordList.value.length === 0) {
            loadWordBook();
            return;
        }

        if (historyWords.value.length === 0) {
            const firstWord = pickNextWord();
            if (firstWord) {
                historyWords.value.push(firstWord);
                historyIndex.value = 0;
                wordObj.value = firstWord;
            }
        } else {
            wordObj.value = historyWords.value[historyIndex.value];
        }
        onWordChange?.(wordObj.value);
    };

    const loadWordBook = async () => {
        wordBook.value = commonUtil.getCurrWordBook();
        wordList.value = [];
        historyWords.value = [];
        historyIndex.value = -1;
        preloadedNextWord.value = null;

        const bookVal = wordBook.value?.value;
        let data = bookVal ? wordBooksData[bookVal] : null;

        if ((!data || data.length === 0) && bookVal && bookVal !== 'CET4luan_1') {
            // 优雅骨架屏：冷启动时不弹阻断式遮罩 loading，保持 loading.value = true 展示纯粹骨架屏
            loading.value = true;
            const ok = await ensureWordbookSubpackage(bookVal, 8000);
            if (ok) {
                data = wordBooksData[bookVal];
            }
        }

        if (data && data.length > 0) {
            wordList.value = data;
            wordShuffler = createWordShuffler(bookVal || 'default', data);
            randomWord();
            updatePreloadedNextWord();
            syncBgCard();
            loading.value = false;
        } else {
            // 极端兜底（例如离线断网且本地从未下载分包超过 5 秒）：静默在内存展示四级，保留用户 Storage 偏好不变
            console.warn(`[WordDeck] 超时未能加载词书 ${bookVal}，临时在内存中降级为四级展示`);
            const fallbackData = wordBooksData['CET4luan_1'];
            if (fallbackData && fallbackData.length > 0) {
                wordBook.value = commonUtil.wordBookList[0];
                wordList.value = fallbackData;
                wordShuffler = createWordShuffler('CET4luan_1', fallbackData);
                randomWord();
                updatePreloadedNextWord();
                syncBgCard();
            } else {
                commonUtil.msg(i18n.value.loadFailAlert, 'error');
            }
            loading.value = false;
        }
    };

    const changeWordBook = async (item: WordBookMeta) => {
        if (item.value !== 'CET4luan_1') {
            commonUtil.loading(i18n.value.loadingText || '加载中...');
            const ok = await ensureWordbookSubpackage(item.value, 8000);
            uni.hideLoading();
            if (!ok) {
                commonUtil.msg(i18n.value.subpackageFailAlert, 'error');
                return;
            }
        }
        uni.setStorageSync('wordBook', item.value);
        wordBook.value = item;
        await loadWordBook();
    };

    onUnmounted(() => {
        clearTimers();
    });

    return {
        wordBook,
        wordList,
        historyWords,
        historyIndex,
        wordObj,
        bgWordObj,
        bgKnowFlag,
        loading,
        preloadedNextWord,
        cardTransitionClass,
        bgCardTransitionClass,
        isSwipingDownActive,
        isTransitioning,
        loadWordBook,
        changeWordBook,
        nextWordDirectional,
        nextWord,
        syncBgCard,
        updatePreloadedNextWord,
        randomWord,
        getDeckProgress: () => wordShuffler?.getProgress() ?? { cursor: 0, total: 0, round: 1 },
        reshuffleBook: () => wordShuffler?.reshuffle()
    };
}
