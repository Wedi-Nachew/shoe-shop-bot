const { Telegraf } = require("telegraf");
const { config, validateConfig } = require("../config");

validateConfig();

const bot = new Telegraf(config.bot.token);

module.exports = bot;
