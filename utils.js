const fs = require('fs')
const config = require('./config')
const regions = JSON.parse(fs.readFileSync('/var/www/www-root/data/www/pozishen.ru/api/regions.json').toString())
const fetch = require('node-fetch')

class ApiError extends Error {
    constructor(message) {
        super(message);
    }
}

module.exports = {
    isProduction: () => false,//process.env.NODE_ENV === "production"
    ApiError: ApiError,
    getRegionId: (region) => regions.find(reg => reg.title.toLowerCase() === region.toLowerCase())?.id || 225,
    getFrequency: async (regionId, queryText) => {
        const res = await fetch(`https://word-keeper.ru/api/word?token=${config.wordkeeperToken}&text=${encodeURI(queryText)}&geo=${regionId}&freq=1`)

        const freq = Number(await res.text())

        if(isNaN(freq))
            return new Error()

        return freq
    }
}