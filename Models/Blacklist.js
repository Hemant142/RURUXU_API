const mongoose = require("mongoose");

const blacklistSchema = mongoose.Schema({
    blacklist: { type: [String] }
});

const BlacklistModel = mongoose.model("Blacklist", blacklistSchema); // Updated model name

module.exports = {
    BlacklistModel
};
