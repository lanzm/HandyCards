import { ref } from 'vue';
import type { Ref, ComputedRef } from 'vue';
import type { WordItem, WordBookMeta } from '@/types/word';
import type { Translations } from '@/utils/i18n';
import commonUtil from '@/utils/commonUtil';
import { wordBooksData, createWordRandomizer } from '@/utils/wordbooks';

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

    const wordRandomizer = createWordRandomizer();
    const pickRandomWord = (): WordItem | null => wordRandomizer.pick(wordList.value);

    const updatePreloadedNextWord = () => {
        if (wordList.value.length === 0) return;
        if (!preloadedNextWord.value) {
            preloadedNextWord.value = pickRandomWord();
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
        if (dir === 'down') {
            if (historyIndex.value <= 0) {
                commonUtil.msg(i18n.value.firstWordAlert);
                return;
            }
            isSwipingDownActive.value = true;
            bgWordObj.value = wordObj.value;
            bgKnowFlag.value = knowFlag.value;
            
            historyIndex.value -= 1;
            wordObj.value = historyWords.value[historyIndex.value];
            knowFlag.value = true;
        } else {
            isSwipingDownActive.value = false;
            if (historyIndex.value < historyWords.value.length - 1) {
                historyIndex.value += 1;
            } else {
                if (preloadedNextWord.value) {
                    historyWords.value.push(preloadedNextWord.value);
                    preloadedNextWord.value = null;
                } else {
                    if (wordList.value.length === 0) {
                        loadWordBook();
                        return;
                    }
                    const newWord = pickRandomWord();
                    if (newWord) {
                        historyWords.value.push(newWord);
                    }
                }
                historyIndex.value = historyWords.value.length - 1;
            }
        }

        isRevealing.value = false;
        if (dir === 'up') {
            knowFlag.value = studyMode.value === 'browse';
        }

        cardTransitionClass.value = dir === 'up' ? 'card-slide-out-up' : 'card-slide-in-down';
        bgCardTransitionClass.value = dir === 'up' ? 'bg-card-to-active' : 'bg-card-to-back';

        setTimeout(() => {
            if (dir === 'up') {
                knowFlag.value = studyMode.value === 'browse';
                wordObj.value = historyWords.value[historyIndex.value];

                cardTransitionClass.value = 'card-reset-center';
                bgCardTransitionClass.value = 'bg-card-to-back-instant';

                setTimeout(() => {
                    cardTransitionClass.value = '';
                    bgCardTransitionClass.value = '';
                    isSwipingDownActive.value = false;
                    updatePreloadedNextWord();
                    syncBgCard();
                }, 30);
            } else {
                cardTransitionClass.value = '';
                bgCardTransitionClass.value = '';
                isSwipingDownActive.value = false;
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
            const firstWord = pickRandomWord();
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

    const loadWordBook = () => {
        wordBook.value = commonUtil.getCurrWordBook();
        wordRandomizer.reset();
        wordList.value = [];
        historyWords.value = [];
        historyIndex.value = -1;
        preloadedNextWord.value = null;

        const bookVal = wordBook.value?.value;
        const data = bookVal ? wordBooksData[bookVal] : null;
        if (data && data.length > 0) {
            wordList.value = data;
            randomWord();
            updatePreloadedNextWord();
            syncBgCard();
        } else {
            commonUtil.msg(i18n.value.loadFailAlert, "error");
        }
        loading.value = false;
    };

    const changeWordBook = (item: WordBookMeta) => {
        uni.setStorageSync('wordBook', item.value);
        wordBook.value = item;
        loadWordBook();
    };

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
        loadWordBook,
        changeWordBook,
        nextWordDirectional,
        nextWord,
        syncBgCard,
        updatePreloadedNextWord,
        randomWord
    };
}
