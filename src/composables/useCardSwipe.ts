import { ref, computed, nextTick, onUnmounted } from 'vue';
import type { Ref, ComputedRef } from 'vue';
import type { WordItem } from '@/types/word';
import type { Translations } from '@/utils/i18n';
import commonUtil from '@/utils/commonUtil';

export interface UseCardSwipeOptions {
    historyIndex: Ref<number>;
    historyWords: Ref<WordItem[]>;
    wordObj: Ref<WordItem | null>;
    bgWordObj: Ref<WordItem | null>;
    bgKnowFlag: Ref<boolean>;
    knowFlag: Ref<boolean>;
    isRevealing: Ref<boolean>;
    isSwipingDownActive: Ref<boolean>;
    cardTransitionClass: Ref<string>;
    bgCardTransitionClass: Ref<string>;
    i18n: ComputedRef<Translations>;
    nextWordDirectional: (dir: 'up' | 'down') => void;
    syncBgCard: () => void;
    updatePreloadedNextWord: () => void;
    onSwipeDownSuccess?: () => void;
}

export function useCardSwipe(options: UseCardSwipeOptions) {
    const {
        historyIndex,
        historyWords,
        wordObj,
        bgWordObj,
        bgKnowFlag,
        knowFlag,
        isRevealing,
        isSwipingDownActive,
        cardTransitionClass,
        bgCardTransitionClass,
        i18n,
        nextWordDirectional,
        syncBgCard,
        updatePreloadedNextWord,
        onSwipeDownSuccess
    } = options;

    const getInitialScreenHeight = () => {
        try {
            return uni.getSystemInfoSync()?.windowHeight || 800;
        } catch {
            return 800;
        }
    };
    const screenHeight = ref(getInitialScreenHeight());
    const startX = ref(0);
    const startY = ref(0);
    const cardY = ref(0);
    const isSwiping = ref(false);
    const preventClick = ref(false);
    const detailScrollTop = ref(0);
    const scrollTop = ref(0);
    let swipeDownTimer: ReturnType<typeof setTimeout> | null = null;
    let swipeResetTimer: ReturnType<typeof setTimeout> | null = null;

    const clearSwipeTimers = () => {
        if (swipeDownTimer) {
            clearTimeout(swipeDownTimer);
            swipeDownTimer = null;
        }
        if (swipeResetTimer) {
            clearTimeout(swipeResetTimer);
            swipeResetTimer = null;
        }
    };

    const cardStyle = computed(() => {
        if (isSwiping.value) {
            if (cardY.value < 0) {
                // Dragging UP
                return `transform: translate3d(0, ${cardY.value}px, 0); z-index: 10; transition: none !important;`;
            } else {
                // Dragging DOWN
                if (isSwipingDownActive.value) {
                    const progress = Math.min(cardY.value / 80, 1);
                    const scale = 1.0 - progress * 0.06;
                    const translateY = progress * 18;
                    const opacity = 1.0 - progress * 0.12;
                    return `transform: scale(${scale}) translate3d(0, ${translateY}px, 0); opacity: ${opacity}; z-index: 5; transition: none !important;`;
                } else {
                    return `transform: translate3d(0, 0, 0); z-index: 10; transition: none !important;`;
                }
            }
        }
        return 'z-index: 10;';
    });

    const bgCardStyle = computed(() => {
        if (isSwiping.value) {
            const threshold = 80;
            if (cardY.value < 0) {
                // Dragging UP
                const progress = Math.min(Math.abs(cardY.value) / threshold, 1);
                const scale = 0.88 + progress * 0.12;
                const translateY = 32 - progress * 32;
                const opacity = 0.7 + progress * 0.3;
                return `transform: scale(${scale}) translate3d(0, ${translateY}px, 0); opacity: ${opacity}; z-index: 5; transition: none !important;`;
            } else {
                // Dragging DOWN
                if (isSwipingDownActive.value) {
                    const translateY = -screenHeight.value + cardY.value;
                    return `transform: translate3d(0, ${translateY}px, 0); opacity: 1; z-index: 10; transition: none !important;`;
                }
            }
        }
        return '';
    });

    const onCardTouchStart = (e: TouchEvent) => {
        preventClick.value = false;
        if (e.touches && e.touches[0]) {
            startX.value = e.touches[0].clientX;
            startY.value = e.touches[0].clientY;
            cardY.value = 0;
            isSwiping.value = false;
        }
    };

    const onCardTouchMove = (e: TouchEvent) => {
        if (!e.touches || !e.touches[0]) return;
        
        const currentX = e.touches[0].clientX;
        const currentY = e.touches[0].clientY;
        const deltaX = currentX - startX.value;
        const deltaY = currentY - startY.value;
        
        if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
            preventClick.value = true;
        }
        
        if (!isSwiping.value) {
            if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 10) {
                isSwiping.value = true;
                
                if (deltaY > 0) {
                    if (historyIndex.value > 0) {
                        isSwipingDownActive.value = true;
                        bgWordObj.value = historyWords.value[historyIndex.value - 1];
                        bgKnowFlag.value = true;
                    } else {
                        isSwiping.value = false;
                        commonUtil.msg(i18n.value.firstWordAlert);
                    }
                } else {
                    isSwipingDownActive.value = false;
                }
            }
        }
        
        if (isSwiping.value) {
            cardY.value = deltaY;
        }
    };

    const onCardTouchEnd = () => {
        if (!isSwiping.value) {
            isSwiping.value = false;
            isSwipingDownActive.value = false;
            return;
        }
        
        const threshold = 80;
        
        if (cardY.value < -threshold) {
            isSwiping.value = false;
            nextWordDirectional('up');
        } else if (cardY.value > threshold && isSwipingDownActive.value) {
            commonUtil.vibrateCardSwitch();
            isSwiping.value = false;
            clearSwipeTimers();
            
            cardTransitionClass.value = 'active-card-to-back-instant';
            bgCardTransitionClass.value = 'prev-card-to-active-instant';
            
            swipeDownTimer = setTimeout(() => {
                isRevealing.value = false;
                historyIndex.value -= 1;
                wordObj.value = historyWords.value[historyIndex.value];
                knowFlag.value = true;
                cardTransitionClass.value = 'card-reset-center';
                bgCardTransitionClass.value = 'bg-card-reset-back';
                isSwipingDownActive.value = false;
                cardY.value = 0;
                onSwipeDownSuccess?.();
                updatePreloadedNextWord();
                syncBgCard();
                
                swipeResetTimer = setTimeout(() => {
                    cardTransitionClass.value = '';
                    bgCardTransitionClass.value = '';
                }, 30);
            }, 200);
        } else {
            isSwiping.value = false;
            if (isSwipingDownActive.value) {
                cardTransitionClass.value = '';
                bgCardTransitionClass.value = '';
                isSwipingDownActive.value = false;
                cardY.value = 0;
                syncBgCard();
            } else {
                cardY.value = 0;
            }
        }
    };

    const onDetailTouchStart = (e: TouchEvent) => {
        if (detailScrollTop.value > 5) return;
        onCardTouchStart(e);
    };

    const onDetailTouchMove = (e: TouchEvent) => {
        if (detailScrollTop.value > 5) return;
        onCardTouchMove(e);
    };

    const onDetailTouchEnd = () => {
        if (detailScrollTop.value > 5) return;
        onCardTouchEnd();
    };

    const onDetailScroll = (e: Event | CustomEvent<{ scrollTop: number }>) => {
        detailScrollTop.value = (e as CustomEvent<{ scrollTop: number }>).detail?.scrollTop ?? 0;
    };

    const resetCardScrollTop = () => {
        scrollTop.value = detailScrollTop.value || 1;
        nextTick(() => {
            scrollTop.value = 0;
            detailScrollTop.value = 0;
        });
    };

    onUnmounted(() => {
        clearSwipeTimers();
    });

    return {
        screenHeight,
        cardY,
        isSwiping,
        preventClick,
        cardStyle,
        bgCardStyle,
        scrollTop,
        detailScrollTop,
        onCardTouchStart,
        onCardTouchMove,
        onCardTouchEnd,
        onDetailTouchStart,
        onDetailTouchMove,
        onDetailTouchEnd,
        onDetailScroll,
        resetCardScrollTop
    };
}
