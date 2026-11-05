export type Language = 'zh' | 'en';

export interface Translations {
    quizPrompt: string;
    knowBtn: string;
    dontKnowBtn: string;
    nextBtn: string;
    addWordBtn: string;
    loadingText: string;
    
    definitionsTitle: string;
    wordAnatomyTitle: string;
    wordRootTitle: string;
    wordRootLabel: string;
    wordFamilyLabel: string;
    examplesTitle: string;
    collocationsTitle: string;
    collocationsBadge: string;
    confusingTitle: string;
    confusingBadge: string;
    secondaryTitle: string;
    secondaryBadge: string;
    
    settingsTitle: string;
    currentBookLabel: string;
    studyModeLabel: string;
    quizModeText: string;
    browseModeText: string;
    quizModeDesc: string;
    browseModeDesc: string;
    themeLabel: string;
    ttsLabel: string;
    ttsTitle: string;
    ttsEnabledHint: string;
    ttsDisabledHint: string;
    lightModeText: string;
    darkModeText: string;
    shareLabel: string;
    shareCardTitle: string;
    shareCardDesc: string;
    shareBadgeText: string;
    githubCardTitle: string;
    githubBadgeText: string;
    copyLinkText: string;
    githubCopiedMsg: string;
    wordListLabel: string;
    savedWordsTitle: string;
    totalWordsCount: (count: number) => string;
    
    backToSettings: string;
    emptyListPrompt: string;
    
    firstWordAlert: string;
    addedAlert: string;
    alreadyAddedAlert: string;
    removedAlert: string;
    loadFailAlert: string;
    subpackageFailAlert: string;
    subpackageFallbackAlert: string;
    bookCompletedAlert: string;
    
    langLabel: string;
    langZhText: string;
    langEnText: string;
    
    wordBookCountText: (count: number) => string;
    wordBookLabels: Record<string, string>;
}

export const getTranslations = (lang: Language): Translations => {
    const isZh = lang === 'zh';
    return {
        // Main card states
        quizPrompt: isZh ? '轻触查看释义' : 'Tap to reveal definitions',
        knowBtn: isZh ? '认识' : 'Know',
        dontKnowBtn: isZh ? '不认识' : 'Don\'t Know',
        nextBtn: isZh ? '下一个' : 'Next',
        addWordBtn: isZh ? '加入生词本' : 'Add to List',
        loadingText: isZh ? '加载中...' : 'Loading...',
        
        // Card detail section headers
        definitionsTitle: isZh ? '释义列表' : 'Definitions',
        wordAnatomyTitle: isZh ? '同根派生' : 'Roots & Cognates',
        wordRootTitle: isZh ? '同根派生' : 'Roots & Cognates',
        wordRootLabel: isZh ? '核心词根' : 'Core Root',
        wordFamilyLabel: isZh ? '同根派生词' : 'Cognates',
        examplesTitle: isZh ? '应用例句' : 'Examples',
        collocationsTitle: isZh ? '常用搭配' : 'Collocations',
        collocationsBadge: isZh ? '高频语块' : 'Phrases',
        confusingTitle: isZh ? '形近辨析' : 'Confusing Pairs',
        confusingBadge: isZh ? '易混警示' : 'Watch Out',
        secondaryTitle: isZh ? '熟词生义' : 'Tricky Meanings',
        secondaryBadge: isZh ? '常考真题' : 'Exam Focus',
        
        // Drawer main settings
        settingsTitle: isZh ? '设置选项' : 'Settings',
        currentBookLabel: isZh ? '当前词书' : 'Current Wordbook',
        studyModeLabel: isZh ? '刷词模式' : 'Study Mode',
        quizModeText: isZh ? '自测模式' : 'Quiz Mode',
        browseModeText: isZh ? '速览模式' : 'Browse Mode',
        quizModeDesc: isZh ? '默认遮挡释义，轻触卡片查看' : 'Hide definitions, tap card to reveal',
        browseModeDesc: isZh ? '直接显示释义与例句，无需点击' : 'Directly show all definitions and examples',
        themeLabel: isZh ? '显示模式' : 'Display Mode',
        ttsLabel: isZh ? '发音设置' : 'Pronunciation',
        ttsTitle: isZh ? '单词发音' : 'Word Pronunciation',
        ttsEnabledHint: isZh ? '自动播放和点击发音' : 'Auto-play and tap pronunciation',
        ttsDisabledHint: isZh ? '已关闭，不请求在线发音' : 'Off. No online pronunciation request',
        lightModeText: isZh ? '☀️ 明亮模式' : '☀️ Light Mode',
        darkModeText: isZh ? '🌙 暗黑模式' : '🌙 Dark Mode',
        shareLabel: isZh ? '开源与分享' : 'Open Source & Share',
        shareCardTitle: isZh ? '微信分享二维码' : 'WeChat Share QR Code',
        shareCardDesc: isZh ? '点击查看高清大图，长按可识别或转发' : 'Tap to preview QR code, long press to scan or share',
        shareBadgeText: isZh ? '二维码' : 'QR Code',
        githubCardTitle: isZh ? 'GitHub 开源项目' : 'GitHub Repo',
        githubBadgeText: isZh ? 'CC 非商用' : 'CC BY-NC 4.0',
        copyLinkText: isZh ? '复制链接' : 'Copy',
        githubCopiedMsg: isZh ? '已复制链接' : 'Link copied',
        wordListLabel: isZh ? '我的生词本' : 'My Word List',
        savedWordsTitle: isZh ? '已收录生词' : 'Saved Vocabulary',
        totalWordsCount: (count: number) => isZh ? `共 ${count} 个单词` : `${count} words collected`,
        
        // Drawer word list management
        backToSettings: isZh ? '返回设置' : 'Back to Settings',
        emptyListPrompt: isZh ? '生词本空空如也，快去添加吧' : 'Word list is empty. Go add some!',
        
        // Alerts & Messages
        firstWordAlert: isZh ? '已经是第一词了' : 'Already at the first word',
        addedAlert: isZh ? '已添加到生词本' : 'Added to word list',
        alreadyAddedAlert: isZh ? '已在生词本中' : 'Already in word list',
        removedAlert: isZh ? '已从生词本移除' : 'Removed from word list',
        loadFailAlert: isZh ? '加载词书失败' : 'Failed to load wordbook',
        subpackageFailAlert: isZh ? '词书分包下载失败，请检查网络后重试' : 'Subpackage download failed, please check network',
        subpackageFallbackAlert: isZh ? '分包加载失败，已切回四级核心词库' : 'Failed to load subpackage, switched to CET-4',
        bookCompletedAlert: isZh ? '🎉 恭喜背完整本！已开启新一轮洗牌' : '🎉 Congratulations! Shuffled for the next round',
        
        // Language Selector
        langLabel: isZh ? '界面语言' : 'Language',
        langZhText: '中文',
        langEnText: 'English',
        
        // Additional formatting & dictionary lists
        wordBookCountText: (count: number) => isZh ? `${count} 词` : `${count} words`,
        wordBookLabels: {
            'CET4luan_1': isZh ? '四级词汇' : 'CET-4 Vocab',
            'CET6luan_1': isZh ? '六级词汇' : 'CET-6 Vocab',
            'KaoYanluan_1': isZh ? '考研词汇' : 'Postgrad Vocab',
            'IELTSluan_2': isZh ? '雅思词汇' : 'IELTS Vocab'
        }
    };
};
