import { batch, useDispatch, useSelector } from 'react-redux'
import React, { useEffect, useState } from 'react'
import ONEConstants from '../../../../lib/constants'
import ONEUtil from '../../../../lib/util'
import util, { autoWalletNameHint, useWindowDimensions } from '../../util'
import config from '../../config'
import BN from 'bn.js'
import Button from 'antd/es/button'
import Card from 'antd/es/card'
import Typography from 'antd/es/typography'
import Space from 'antd/es/space'
import Row from 'antd/es/row'
import Steps from 'antd/es/steps'
import Timeline from 'antd/es/timeline'
import message from '../../message'
import { OtpStack, useOtpState } from '../../components/OtpStack'
import { useRandomWorker } from './randomWorker'
import ShowUtils from './show-util'
import { EOTPDerivation, SmartFlows } from '../../../../lib/api/flow'
import ONE from '../../../../lib/onewallet'
import { api } from '../../../../lib/api'
import { walletActions } from '../../state/modules/wallet'
import { useHistory } from 'react-router'
import Paths from '../../constants/paths'
import WalletAddress from '../../components/WalletAddress'
const { Title, Text, Link } = Typography
const { Step } = Steps
const CardStyle = {
  backgroundColor: 'rgba(0,0,0,0.15)',
  position: 'absolute',
  width: '100%',
  height: '100%',
  left: 0,
  top: 0,
  zIndex: 100,
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
  minHeight: '800px'
}

const Upgrade = ({ address, prompt, onClose }) => {
  const history = useHistory()
  const dispatch = useDispatch()
  const network = useSelector(state => state.global.network)
  const [confirmUpgradeVisible, setConfirmUpgradeVisible] = useState(false)
  const wallets = useSelector(state => state.wallet)
  const wallet = wallets[address] || {}
  const [skipUpdate, setSkipUpdate] = useState(false)
  const { majorVersion, minorVersion, lastResortAddress, doubleOtp, forwardAddress, temp } = wallet
  const isDevVersion = parseInt(minorVersion) === 0
  const requireUpdate = majorVersion && (!(parseInt(majorVersion) >= ONEConstants.MajorVersion) || isDevVersion)
  const canUpgrade = majorVersion >= config.minUpgradableVersion
  const latestVersion = { majorVersion: ONEConstants.MajorVersion, minorVersion: ONEConstants.MinorVersion }
  const balances = useSelector(state => state.balance || {})
  const { balance } = util.computeBalance(balances[address]?.balance || 0)
  const maxSpend = BN.min(util.getMaxSpending(wallet), new BN(balance))
  const { formatted: maxSpendFormatted } = util.computeBalance(maxSpend.toString())
  const balanceGreaterThanLimit = new BN(balance).gt(new BN(maxSpend))
  // const needSetRecoveryAddressFirst = balanceGreaterThanLimit && util.isDefaultRecoveryAddress(lastResortAddress)
  const needSetRecoveryAddressFirst = util.isDefaultRecoveryAddress(lastResortAddress)
  const needSpecialSteps = balanceGreaterThanLimit && !util.isDefaultRecoveryAddress(lastResortAddress)
  const [minTransferGas] = useState(100000)
  const { isMobile } = useWindowDimensions()

  const { state: otpState } = useOtpState()
  const { otpInput, otp2Input } = otpState
  const resetOtp = otpState.resetOtp
  const [stage, setStage] = useState(-1)
  const { resetWorker, recoverRandomness } = useRandomWorker()

  useEffect(() => {
    if (prompt) {
      setSkipUpdate(false)
    }
  }, [prompt])

  const { prepareValidation, prepareProof, prepareProofFailed, onRevealSuccess, ...helpers } = ShowUtils.buildHelpers({ setStage, resetOtp, network, resetWorker })

  const doUpgrade = async () => {
    if (stage >= 0) {
      return
    }
    const { otp, otp2, invalidOtp2, invalidOtp } = prepareValidation({ state: { otpInput, otp2Input, doubleOtp: wallet.doubleOtp }, checkAmount: false, checkDest: false }) || {}

    if (invalidOtp || invalidOtp2) return

    prepareProof && prepareProof()
    const { eotp, index, layers } = await EOTPDerivation.deriveEOTP({ otp, otp2, wallet, prepareProofFailed })
    if (!eotp) {
      return
    }

    message.info('Retrieving latest information for the wallet...')
    const {
      root,
      height,
      interval,
      t0,
      lifespan,
      maxOperationsPerInterval,
      lastResortAddress,
      spendingLimit,
      spendingAmount, // ^classic

      spendingInterval, // v12

      highestSpendingLimit,
      lastLimitAdjustmentTime,
      lastSpendingInterval,
      spentAmount, // ^v15
    } = await api.blockchain.getWallet({ address, raw: true })

    const backlinks = await api.blockchain.getBacklinks({ address }) // v9
    let oldCores = [] // v14
    if (majorVersion >= 14) {
      oldCores = await api.blockchain.getOldInfos({ address, raw: true })
    }
    // TODO: always add a new identification key, computed using keccak(eotp) or similar. This key will be used for address prediction and contract verification only. It will be automatically ignored for other purposes (due to shorter length)

    const upgradeIdentificationKey = ONEUtil.hexString(ONEUtil.keccak(new Uint8Array([...eotp, ...new Uint8Array(new Uint32Array([index]).buffer)])))
    let identificationKeys = []; let innerCores = [] // v15
    if (majorVersion >= 15) {
      [innerCores, identificationKeys] = await Promise.all([
        api.blockchain.getInnerCores({ address, raw: true }),
        api.blockchain.getIdentificationKeys({ address }),
      ])
    }
    identificationKeys.unshift(upgradeIdentificationKey)
    const transformedLastResortAddress = util.isDefaultRecoveryAddress(lastResortAddress) || util.isBlacklistedAddress(lastResortAddress) ? ONEConstants.TreasuryAddress : lastResortAddress
    const { address: newAddress } = await api.relayer.create({
      root,
      height,
      interval,
      t0,
      lifespan,
      slotSize: maxOperationsPerInterval,
      lastResortAddress: transformedLastResortAddress,
      spendingAmount,
      spendingLimit,

      spendingInterval,

      backlinks: [...backlinks, address],
      oldCores,

      highestSpendingLimit,
      lastLimitAdjustmentTime,
      lastSpendingInterval,
      spentAmount,
      innerCores,
      identificationKeys, // ^v15
    })

    SmartFlows.commitReveal({
      wallet,
      otp,
      otp2,
      eotp,
      index,
      layers,
      recoverRandomness,
      commitHashGenerator: ONE.computeDestOnlyHash,
      commitRevealArgs: { dest: newAddress },
      revealAPI: api.relayer.revealForward,
      prepareProof,
      prepareProofFailed,
      ...helpers,
      onRevealSuccess: async (txId, messages) => {
        onRevealSuccess(txId, messages)
        setStage(-1)
        resetOtp()
        resetWorker()
        const newWallet = {
          ...wallet,
          address: newAddress,
          innerRoots: wallet.innerRoots || [],
          identificationKeys: wallet.identificationKeys || [],
          backlinks,
          _merge: true
        }
        const oldWallet = {
          ...wallet,
          temp: wallet.effectiveTime + wallet.duration,
          forwardAddress: newAddress,
          _merge: true
        }
        batch(() => {
          dispatch(walletActions.updateWallet(newWallet))
          dispatch(walletActions.updateWallet(oldWallet))
          dispatch(walletActions.fetchWallet({ address: newAddress }))
        })
        message.success('Upgrade completed! Redirecting to wallet in 2 seconds...')
        setTimeout(() => history.push(Paths.showAddress(util.safeOneAddress(newAddress))), 2000)
      }
    })
  }
  const skip = () => {
    setConfirmUpgradeVisible(false)
    setSkipUpdate(true)
    onClose && onClose()
  }
  const skipVersion = () => {
    dispatch(walletActions.userSkipVersion({ address, version: ONEUtil.getVersion(latestVersion) }))
    skip()
  }
  if (!requireUpdate || skipUpdate || !canUpgrade || temp || !util.isEmptyAddress(forwardAddress) || wallet.skipVersion === ONEUtil.getVersion(latestVersion)) {
    return <></>
  }

  return (
    <Card style={CardStyle} bodyStyle={{ height: '100%' }}>
      <Space
        direction='vertical'
        align='center'
        size='large'
        style={{
          height: '100%',
          justifyContent: 'start',
          paddingTop: isMobile ? 32 : 192,
          paddingLeft: isMobile ? 16 : 64,
          paddingRight: isMobile ? 16 : 64,
          display: 'flex'
        }}
      >
        {!confirmUpgradeVisible &&
          <>
            <Title level={isMobile ? 4 : 2}>
              An upgrade is available
              {isDevVersion && <Text><br />(Dev version detected)</Text>}
            </Title>
            <Text>Your wallet: v{ONEUtil.getVersion(wallet)}</Text>
            <Text>Latest version: v{ONEUtil.getVersion(latestVersion)}</Text>
            <Button type='primary' shape='round' size='large' onClick={() => setConfirmUpgradeVisible(true)}>Upgrade Now</Button>
            <Button size='large' shape='round' onClick={skip}>Do it later</Button>
            <Button type='text' danger onClick={skipVersion}>Skip this version</Button>
            <Text>For more details about this upgrade, see <Link target='_blank' href={util.releaseNotesUrl(latestVersion)} rel='noreferrer'> release notes for v{ONEUtil.getVersion(latestVersion)}</Link></Text>
          </>}
        {confirmUpgradeVisible &&
          <>
            {needSetRecoveryAddressFirst &&
              <>
                <Title level={4}>
                  To protect your assets, please set a recovery address prior to upgrading.
                </Title>
                <Button size='large' type='primary' shape='round' onClick={() => { skip(); history.push(Paths.showAddress(address, 'help')) }}>Set Now</Button>
              </>}
            {needSpecialSteps &&
              <>
                <Title type='danger' level={4}>
                  You have a high value wallet. Follow these steps:
                </Title>
                <Steps current={0} direction='vertical'>
                  <Step title='Confirm the upgrade' description={`You will get a new address. Only ${maxSpendFormatted} ONE will there. Don't panic.`} />
                  <Step
                    title='Approve asset transfer'
                    description={(
                      <Space direction='vertical'>
                        <Text>Send 0.1 ONE from your recovery address</Text>
                        <WalletAddress address={lastResortAddress} showLabel alwaysShowOptions />
                        <Text>to the current address <b>(use at least {minTransferGas} gas limit)</b></Text>
                        <WalletAddress address={address} showLabel alwaysShowOptions />
                        <Text>(To abort upgrade, recover assets, and deprecate the wallet, send 1.0 ONE instead)</Text>
                      </Space>)}
                  />
                </Steps>

              </>}
            {!needSetRecoveryAddressFirst &&
              <>
                <OtpStack shouldAutoFocus walletName={autoWalletNameHint(wallet)} doubleOtp={doubleOtp} otpState={otpState} onComplete={doUpgrade} action='confirm upgrade' />

                <Title level={3}>
                  How upgrade works:
                </Title>
                <Timeline>
                  <Timeline.Item>Each upgrade gives you a new address</Timeline.Item>
                  <Timeline.Item>Your old address auto-forward assets to new address</Timeline.Item>
                  <Timeline.Item>In rare cases, some assets may be left over (e.g. ERC20 tokens)</Timeline.Item>
                  <Timeline.Item>You can take control of old addresses (under "About" tab)</Timeline.Item>
                  <Timeline.Item>You can inspect and reclaim what's left there at any time</Timeline.Item>
                </Timeline>
              </>}
            {stage < 0 && <Button size='large' shape='round' onClick={skip}>Do it later</Button>}
            {stage < 0 && <Button type='text' danger onClick={skipVersion}>Skip this version</Button>}

          </>}
        {stage >= 0 && (
          <Row>
            <Steps current={stage}>
              <Step title='Clone' description='Cloning to new version' />
              <Step title='Prepare' description='Preparing for transfer' />
              <Step title='Link' description='Linking two versions' />
            </Steps>
          </Row>)}
      </Space>
    </Card>

  )
}
export default Upgrade
