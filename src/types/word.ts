export interface WordItem {
    w: string;                  // 单词文本
    p: string;                  // 音标
    t: [string, string][];      // [词性, 释义][]
    s?: [string, string][];     // [英文例句, 中文翻译][]
    cardIndex?: number;         // 词卡在洗牌序列中的编号 (1 ~ N)
}

export interface WordBookMeta {
    label: string;
    value: string;
    count: number;              // 词书词汇量
}

export interface WordAnatomy {
    syllables: number;
    difficulty: number;
    vowelsCount: number;
    consonantsCount: number;
    suffixInfo?: {
        suffix: string;
        meaning: string;
    };
}

export type DetailSectionKey = 'definitions' | 'examples' | 'anatomy';
