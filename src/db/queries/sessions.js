const { getDb } = require('../index');

const sessions = {
    // Get user session
    get(userId) {
        const db = getDb();
        const session = db.prepare(
            'SELECT * FROM sessions WHERE user_id = ?'
        ).get(userId);

        if (session && session.data) {
            session.data = JSON.parse(session.data);
        }

        return session;
    },

    // Set user session
    set(userId, state, data = {}) {
        const db = getDb();
        return db.prepare(`
            INSERT INTO sessions (user_id, state, data, updated_at)
            VALUES (?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(user_id) DO UPDATE SET
                state = ?,
                data = ?,
                updated_at = CURRENT_TIMESTAMP
        `).run(userId, state, JSON.stringify(data), state, JSON.stringify(data));
    },

    // Clear user session
    clear(userId) {
        const db = getDb();
        return db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
    },

    // Clear expired sessions (older than 1 hour)
    clearExpired(maxAgeMs = 3600000) {
        const db = getDb();
        const cutoff = new Date(Date.now() - maxAgeMs).toISOString();
        return db.prepare(
            'DELETE FROM sessions WHERE updated_at < ?'
        ).run(cutoff);
    }
};

module.exports = sessions;