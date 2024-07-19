const getCurrentDateTime = require('../Time/DateTime.js')

const { year, month, day, hour, minute, second } = getCurrentDateTime()

function getRandomIntInclusive() {
    const max = 9999999999
    const min = 1000000000
    const minCeiled = Math.ceil(min);
    const maxFloored = Math.floor(max);
    return Math.floor(Math.random() * (maxFloored - minCeiled + 1) + minCeiled); // 최댓값도 포함, 최솟값도 포함
}

function getRandomFileName () {
    const random = getRandomIntInclusive()
    
    const filename = `${year}${month}${day}${hour}${minute}${second}_${random}`
    return filename
}

module.exports = getRandomFileName;