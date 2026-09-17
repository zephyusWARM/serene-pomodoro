import { useState, useEffect, useCallback } from 'react';

// Get today's date in local timezone (YYYY-MM-DD)
const getLocalToday = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// Prune stats older than 90 days to prevent localStorage bloat
const pruneOldStats = (stats) => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);
    const cutoffStr = `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, '0')}-${String(cutoff.getDate()).padStart(2, '0')}`;
    const pruned = {};
    for (const [date, count] of Object.entries(stats)) {
        if (date >= cutoffStr) pruned[date] = count;
    }
    return pruned;
};

const getInitialStats = () => {
    const today = getLocalToday();
    const statsStr = localStorage.getItem('zen-garden-stats');
    if (statsStr) {
        try {
            const stats = JSON.parse(statsStr);
            return stats[today] || 0;
        } catch {
            return 0;
        }
    }
    return 0;
};

const useStats = () => {
    const [todayFocusCount, setTodayFocusCount] = useState(getInitialStats);

    const loadStats = useCallback(() => {
        setTodayFocusCount(getInitialStats());
    }, []);

    const recordFocusSession = useCallback(() => {
        const today = getLocalToday();
        const statsStr = localStorage.getItem('zen-garden-stats');
        let stats = statsStr ? JSON.parse(statsStr) : {};
        stats[today] = (stats[today] || 0) + 1;
        stats = pruneOldStats(stats);
        localStorage.setItem('zen-garden-stats', JSON.stringify(stats));
        
        // Update local state immediately
        setTodayFocusCount(stats[today]);
        
        // Dispatch event for other tabs/windows if needed
        window.dispatchEvent(new Event('zen-garden-updated'));
    }, []);

    useEffect(() => {
        window.addEventListener('zen-garden-updated', loadStats);
        return () => window.removeEventListener('zen-garden-updated', loadStats);
    }, [loadStats]);

    return {
        todayFocusCount,
        recordFocusSession,
    };
};

export default useStats;
