const sessions = require("../../db/queries/sessions");

// Attach session helpers to context
const sessionMiddleware = (ctx, next) => {
    const userId = ctx.from?.id?.toString();
    if (!userId) {
        return next();
    }

    // Attach session methods to context
    ctx.session = {
        get() {
            return sessions.get(userId)
        },
        set(state, data = {}) {
            return sessions.set(userId, state, data);
        },
        clear() {
            return sessions.clear(userId);
        },
        getState() {
            const session = sessions.get(userId);
            return session?.state || null;
        },
        getData() {
            const session = sessions.get(userId);
            return session?.data || {};
        }
    };

    return next();
};

module.exports = {
    sessionMiddleware
};