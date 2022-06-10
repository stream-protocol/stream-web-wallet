import React, { useState } from 'react'
import Row from 'antd/es/row'
import Slider from 'antd/es/slider'
import Tooltip from 'antd/es/tooltip'
import Input from 'antd/es/input'
import Checkbox from 'antd/es/checkbox'
import Button from 'antd/es/button'
import Space from 'antd/es/space'
import Typography from 'antd/es/typography'
import QuestionCircleOutlined from '@ant-design/icons/QuestionCircleOutlined'
import { Hint, Label, Warning } from '../../components/Text'
import { CommitRevealProgress } from '../../components/CommitRevealProgress'
import AnimatedSection from '../../components/AnimatedSection'
import BN from 'bn.js'
import ShowUtils from './show-util'
import { SmartFlows } from '../../../../lib/api/flow'
import ONE from '../../../../lib/onewallet'
import ONEUtil from '../../../../lib/util'
import { api } from '../../../../lib/api'
import ONEConstants from '../../../../lib/constants'
import { OtpStack } from '../../components/OtpStack'
import humanizeDuration from 'humanize-duration'
import { autoWalletNameHint } from '../../util'
import { useOps } from '../../components/Common'
const { Title } = Typography
const { TextArea } = Input

const Sign = ({
  address,
  onClose, // optional
  onSuccess, // optional
  prefillMessageInput, // optional string, the message itself
  prefillUseRawMessage, // optional boolean, whether or not eth signing header should be attached. True means not to attach header
  prefillDuration, // optional string that can be parsed into an integer, the number of milliseconds of the validity of the signature
  shouldAutoFocus,
  headless,
}) => {
  const {
    wallet, forwardWallet, network, stage, setStage,
    resetWorker, recoverRandomness, otpState,
  } = useOps({ address })

  const doubleOtp = wallet.doubleOtp
  const { otpInput, otp2Input, resetOtp } = otpState

  const [messageInput, setMessageInput] = useState(prefillMessageInput)
  const [useRawMessage, setUseRawMessage] = useState(prefillUseRawMessage)

  prefillDuration = parseInt(prefillDuration)
  const [duration, setDuration] = useState(prefillDuration)
  const [noExpiry, setNoExpiry] = useState(isNaN(prefillDuration) ? true : (prefillDuration === 0))

  const { prepareValidation, onRevealSuccess, ...handlers } = ShowUtils.buildHelpers({ setStage, resetOtp, network, resetWorker, onSuccess })

  const doSign = () => {
    if (stage >= 0) {
      return
    }
    const { otp, otp2, invalidOtp2, invalidOtp } = prepareValidation({
      state: { otpInput, otp2Input, doubleOtp: wallet.doubleOtp }, checkAmount: false, checkDest: false
    }) || {}

    if (invalidOtp || invalidOtp2) return

    let message = messageInput
    if (!useRawMessage) {
      message = ONEUtil.ethMessage(message)
    }
    const hash = ONEUtil.keccak(message)
    const tokenId = new BN(hash).toString()

    const expiryAt = noExpiry ? 0xffffffff : Math.floor(((Date.now() + duration) / 1000))
    const expiryAtBytes = new BN(expiryAt).toArrayLike(Uint8Array, 'be', 4)
    const encodedExpiryAt = new Uint8Array(20)
    encodedExpiryAt.set(expiryAtBytes)
    const args = {
      operationType: ONEConstants.OperationType.SIGN,
      tokenType: ONEConstants.TokenType.NONE,
      contractAddress: ONEConstants.EmptyAddress,
      tokenId,
      dest: ONEUtil.hexString(encodedExpiryAt)
    }
    let signature
    const commitRevealArgs = ({ eotp }) => {
      const buf = ONEUtil.bytesConcat(eotp, hash)
      signature = ONEUtil.keccak(buf)
      return { amount: new BN(signature).toString(), ...args }
    }

    SmartFlows.commitReveal({
      wallet,
      forwardWallet,
      otp,
      otp2,
      recoverRandomness,
      commitHashGenerator: ONE.computeGeneralOperationHash,
      revealAPI: api.relayer.reveal,
      commitRevealArgs,
      onRevealSuccess: (txId, messages) => {
        onRevealSuccess(txId, messages)
        onSuccess && onSuccess(txId, { hash, signature })
      },
      ...handlers
    })
  }
  if (!(wallet.majorVersion > 10)) {
    return (
      <AnimatedSection wide onClose={onClose} title={<Title level={2}>Sign Message</Title>}>
        <Warning>Your wallet is too old. Please use a wallet that is at least version 10.1</Warning>
      </AnimatedSection>
    )
  }
  const inner = (
    <>
      <Space direction='vertical' size='large'>
        <Space align='baseline' size='large'>
          <Label wide><Hint>Message</Hint></Label>
          <TextArea
            style={{ border: '1px dashed black', margin: 'auto', width: 424 }} autoSize value={messageInput} onChange={({ target: { value } }) => setMessageInput(value)}
            disabled={typeof prefillMessageInput !== 'undefined'}
          />
        </Space>
        <Space align='baseline' size='large'>
          <Label wide><Hint>Header</Hint></Label>
          <Checkbox checked={!useRawMessage} onChange={({ target: { checked } }) => setUseRawMessage(!checked)} disabled={typeof prefillUseRawMessage !== 'undefined'} />
          <Tooltip title={'If checked, messages would be prepended with the standard Ethereum message header: "\\x19Ethereum Signed Message:\\n" followed by the message\'s length'}>
            <QuestionCircleOutlined />
          </Tooltip>
        </Space>
        <Space align='baseline' size='large'>
          <Label wide><Hint>Permanent</Hint></Label>
          <Checkbox checked={noExpiry} onChange={({ target: { checked } }) => setNoExpiry(checked)} disabled={!isNaN(prefillDuration)} />
          <Tooltip title='Whether the signature is effective permanently or for limited duration'>
            <QuestionCircleOutlined />
          </Tooltip>
        </Space>
        {!noExpiry &&
          <Space align='center' size='large'>
            <Label wide><Hint>Expire in</Hint></Label>
            <Slider
              style={{ width: 200 }}
              value={duration} tooltipVisible={false} onChange={(v) => setDuration(v)}
              min={1000} max={Math.max(prefillDuration || 0, wallet.duration)}
              disabled={!isNaN(prefillDuration)}
            />
            <Hint>{humanizeDuration(duration, { largest: 2, round: true })}</Hint>
          </Space>}
        <OtpStack shouldAutoFocus={shouldAutoFocus} wideLabel walletName={autoWalletNameHint(wallet)} doubleOtp={doubleOtp} otpState={otpState} onComplete={doSign} action='confirm' />
      </Space>
      <Row justify='start' style={{ marginTop: 24 }}>
        <Button size='large' type='text' onClick={onClose} danger>Cancel</Button>
      </Row>
      <CommitRevealProgress stage={stage} />
    </>
  )
  if (headless) {
    return inner
  }
  return (
    <AnimatedSection wide onClose={onClose} title={<Title level={2}>Sign Message</Title>}>
      {inner}
    </AnimatedSection>
  )
}

export default Sign
