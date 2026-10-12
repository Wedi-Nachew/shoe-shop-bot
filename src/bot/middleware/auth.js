const { config } = require("../../config");

// Middleware to check if user is shop owner
const ownerOnly = (ctx, next) => {
    if(ctx.from.id.toString() === config.bot.ownerId){
        return next();
    }

    // Silent ignore - don't respond to unauthorized users
    return;
};

// Check if user is admin
const isOwner = (ctx) => {
    return ctx.from.id.toString() === config.bot.ownerId;
};

module.exports = {
    ownerOnly,
    isOwner
};
