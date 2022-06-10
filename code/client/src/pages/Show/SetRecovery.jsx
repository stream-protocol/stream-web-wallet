import Space from 'antd/es/space'
import Typography from 'antd/es/typography'
import message from '../../message'
import { Hint, Label } from '../../components/Text'
import AddressInput from '../../components/AddressInput'
import { CommitRevealProgress } from '../../components/CommitRevealProgress'
import AnimatedSection from '../../components/AnimatedSection'
import React, { useState } from 'react'
import { SmartFlows } from '../../../../lib/api/flow'
import ONE from '../../../../lib/onewallet'
import { api } from '../../../../lib/api'
import walletActions from '../../state/modules/wallet/actions'
import ShowUtils from './show-util'
import { useDispatch, useSelector } from 'react-redux'
import { OtpStack, useOtpState } from '../../components/OtpStack'
import { useRandomWorker } from './randomWorker'
import { autoWalletNameHint, useWindowDimensions } from '../../util'
import EnsureExecutable from "./EnsureExecutable";
const { Title } = Typography

const SetRecovery = ({ address, onClose }) => {
  const dispatch = useDispatch()
  const wallets = useSelector(state => state.wallet)
  const wallet = wallets[address] || {}
  const network = useSelector(state => state.global.network)
  const [stage, setStage] = useState(-1)
  const [transferTo, setTransferTo] = useState({ value: '', label: '' })
  const { resetWorker, recoverRandomness } = useRandomWorker()
  const { state: otpState } = useOtpState()
  const { isMobile } = useWindowDimensions()
  const { otpInput, otp2Input } = otpState
  const resetOtp = otpState.resetOtp

  const { prepareValidation, ...helpers } = ShowUtils.buildHelpers({
    setStage,
    resetOtp,
    network,
    resetWorker,
    onSuccess: () => {
      message.success('Recovery address set')
      dispatch(walletActions.fetchWallet({ address }))
      onClose()
    }
  })

  const doSetRecoveryAddress = async () => {
    if (stage >= 0) {
      return
    }
    const { otp, otp2, invalidOtp2, invalidOtp, dest } = prepareValidation({
      state: { otpInput, otp2Input, doubleOtp: wallet.doubleOtp, transferTo },
      checkAmount: false
    }) || {}
    if (invalidOtp || !dest || invalidOtp2) return

    SmartFlows.commitReveal({
      wallet,
      otp,
      otp2,
      commitHashGenerator: ONE.computeDestOnlyHash,
      commitRevealArgs: { dest },
      revealAPI: api.relayer.revealSetRecoveryAddress,
      recoverRandomness,
      ...helpers,
    })
  }

  return (
    <AnimatedSection wide onClose={onClose} title={<Title level={isMobile ? 5 : 2}>Set Recovery Address</Title>}>
      <Space direction='vertical' size='large'>
        <Hint>Note: You can only do this once!</Hint>
        <Space
          align={isMobile ? undefined : 'baseline'}
          size='large'
          direction={isMobile ? 'vertical' : 'horizontal'}
          style={{ width: '100%' }}
        >
          <Label><Hint>Address</Hint></Label>
          <AddressInput
            addressValue={transferTo}
            setAddressCallback={setTransferTo}
            currentWallet={wallet}
          />
        </Space>
        <OtpStack walletName={autoWalletNameHint(wallet)} otpState={otpState} doubleOtp={wallet.doubleOtp} onComplete={doSetRecoveryAddress} action='confirm' />
      </Space>
      <CommitRevealProgress stage={stage} />
    </AnimatedSection>
  )
}

export default EnsureExecutable(SetRecovery, 'Recovery ')
