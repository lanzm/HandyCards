const POS_NORMALIZATION_MAP: Record<string, string> = {
    n: 'noun',
    noun: 'noun',
    v: 'verb',
    verb: 'verb',
    vi: 'verb',
    vt: 'verb',
    'vt&vi': 'verb',
    'vi&vt': 'verb',
    a: 'adj',
    adj: 'adj',
    adjective: 'adj',
    ad: 'adv',
    adv: 'adv',
    adverb: 'adv',
    prep: 'prep',
    preposition: 'prep',
    conj: 'conj',
    conjunction: 'conj',
    pron: 'pron',
    pronoun: 'pron',
    art: 'art',
    article: 'art',
    num: 'num',
    numeral: 'num',
    int: 'int',
    interj: 'int',
    abbr: 'abbr',
    modal: 'modal',
    aux: 'aux',
};

/**
 * 校验并规范化单个词性字符串，过滤非合法英文词性脏数据
 */
export const normalizePos = (rawPos: string): string | null => {
    if (!rawPos) return null;
    const clean = rawPos
        .replace(/^["'“”«»]+|["'“”«»]+$/g, '')
        .trim()
        .replace(/\.$/, '')
        .toLowerCase();

    if (!clean) return null;
    if (POS_NORMALIZATION_MAP[clean]) {
        return POS_NORMALIZATION_MAP[clean];
    }
    // 复合词性如 vt&vi, vi&n
    if (clean.includes('&')) {
        const parts = clean.split('&').map(s => s.trim());
        const normParts = parts
            .map(p => POS_NORMALIZATION_MAP[p] || (['n', 'v', 'adj', 'adv', 'prep', 'conj', 'pron'].includes(p) ? p : null))
            .filter(Boolean);
        if (normParts.length === parts.length) {
            return Array.from(new Set(normParts)).join('/');
        }
    }
    // 标准英文 1-6 字母纯词性
    if (/^[a-z]{1,6}$/.test(clean)) {
        return clean;
    }
    return null;
};

/**
 * 提取去重并格式化词性列表（过滤掉非英文词性）
 */
export const getUniquePos = (trans: [string, string][] | undefined): string[] => {
    if (!trans) return [];
    const posSet = new Set<string>();
    trans.forEach(t => {
        if (t && t[0]) {
            const norm = normalizePos(t[0]);
            if (norm) {
                posSet.add(norm);
            }
        }
    });
    return Array.from(posSet);
};

/**
 * 格式化释义列表中的词性展示
 */
export const formatDefinitionPos = (rawPos: string): string => {
    if (!rawPos) return '';
    const clean = rawPos.replace(/^["'“”«»]+|["'“”«»]+$/g, '').trim().replace(/\.$/, '');
    if (!/^[a-zA-Z&/-]+$/.test(clean)) {
        return '';
    }
    return clean;
};

/**
 * 格式化释义内容（兜底处理历史脏数据中的前缀释义）
 */
export const formatDefinitionContent = (item: [string, string]): string => {
    const rawPos = (item[0] || '').replace(/^["'“”«»]+|["'“”«»]+$/g, '').trim().replace(/\.$/, '');
    const def = (item[1] || '').replace(/^["'“”«»]+|["'“”«»]+$/g, '').trim();
    if (!rawPos) return def;
    if (!/^[a-zA-Z&/-\s]+$/.test(rawPos)) {
        return `${rawPos} ${def}`.trim();
    }
    return def;
};

/**
 * 根据词性返回 Emoji 装饰图标
 */
export const getPosIcon = (pos: string): string => {
    const p = pos.toLowerCase();
    if (p.includes('noun') || p === 'n') return '📝';
    if (p.includes('verb') || p === 'v') return '⚡';
    if (p.includes('adj') || p === 'a') return '✨';
    if (p.includes('adv') || p === 'ad') return '🚀';
    if (p.includes('prep')) return '🔗';
    if (p.includes('conj')) return '🔀';
    if (p.includes('pron')) return '👤';
    return '🏷️';
};
