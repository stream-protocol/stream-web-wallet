const ONEConstants = require('../../../lib/constants')
export default {
    interval: ONEConstants.INTERVAL,
    interval6: ONEConstants.INTERVAL6,
    // defaultDuration: 3600 * 1000 * 24 * 364,
    defaultDuration: 3600 * 1000 * 24 * 272, // 272 days corresponds to a life span of 2**17 * 6 (multiply by 30 seconds, divide by 3600 * 24 * 1000 to get the number of days: 273.06)
    defaultSpendingLimit: 1000, // ONEs
    defaultSpendingInterval: ONEConstants.DefaultSpendingInterval,
    minDuration: 3600 * 1000 * 24 * 120,
    maxDuration: 3600 * 1000 * 24 * 364 * 2,
    maxTransferAttempts: 3,
    checkCommitInterval: 5000,
    fetchBalanceFrequency: 15000,
    fetchDelaysAfterTransfer: [0, 2000, 5000],
    defaultRecoveryAddressLabel: 'StreamWallet DAO',
    redPacketDuration: 3600 * 1000 * 24 * 5,
    oneAddressPattern: /(one1[a-z0-9]{38})/,
    // See https://en.bitcoin.it/wiki/Bech32 or https://zips.z.cash/zip-0173 for a nice table
    oneAddressExcludeCharacters: ['1', 'b', 'i', 'o'],
    qrcodePattern: /\/to\/([a-zA-Z0-9]{42})/,
    unwrapPattern: /\/unwrap\?data=[a-zA-Z0-9]+/,

    expiringSoonThreshold: 3600 * 24 * 1000 * 30 * 3, // 3 months
    globalStatsCacheDuration: 60 * 1000,
}