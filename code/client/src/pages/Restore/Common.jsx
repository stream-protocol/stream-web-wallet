import util from '../../util'
import message from '../../message'
import { api } from '../../../../lib/api'
import * as Sentry from '@sentry/browser'

export const retrieveWalletInfoFromAddress = async (address, name) => {
  const oneAddress = util.safeOneAddress(address)
  const displayName = name ? `${name} (${oneAddress})` : oneAddress
  message.info(`Retrieving wallet information from ${displayName}`)
  try {
    const {
      root,
      effectiveTime,
      duration,
      slotSize,
      lastResortAddress,
      majorVersion,
      minorVersion,
      spendingLimit,
      spendingInterval,
      lastLimitAdjustmentTime,
      highestSpendingLimit,
    } = await api.blockchain.getWallet({ address })
    message.info('Wallet information retrieved from blockchain')

    const wallet = {
      address,
      root,
      effectiveTime,
      duration,
      slotSize,
      lastResortAddress,
      majorVersion,
      minorVersion,
      spendingLimit,
      spendingInterval,
      lastLimitAdjustmentTime,
      highestSpendingLimit,
    }
    console.log('Retrieved wallet:', wallet)
    return { wallet }
  } catch (ex) {
    Sentry.captureException(ex)
    console.error(ex)
    const errorMessage = ex.toString()
    if (errorMessage.includes('no code at address')) {
      message.error('This is a wallet, but is not a StreamWallet address')
    } else if (errorMessage.includes('Returned values aren\'t valid')) {
      message.error('This is a smart contract, but is not a StreamWallet')
    } else {
      message.error(`Cannot retrieve StreamWallet at address ${address}. Error: ${ex.toString()}`)
    }
  }
}
