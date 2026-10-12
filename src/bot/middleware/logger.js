const {getDb} = require("../../db");

// Log user activity
const activityLogger = (ctx, next) => {
    try {
        if(ctx.from) {
            const db = getDb();
            const action = ctx.callbackQuery 
            ? `callback:${ctx.callbackQuery.data}` 
            : ctx.message?.text 
                ? `message:${ctx.message.text}` 
                : 'other';

            db.prepare(`
                INSERT INTO activity_log (user_id, user_name, action)
                VALUES (?, ?, ?)
            `).run(ctx.from.id.toString(), ctx.from.first_name || 'Unknown', action);
            
        }
    } catch (error) {
        console.error('Error logging activity:', error);
    }
    return next();
}

module.exports = {
    activityLogger
};
