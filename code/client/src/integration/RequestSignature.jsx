import Button from 'antd/es/button'
import Space from 'antd/es/space'
import Typography from 'antd/es/typography'
import Divider from 'antd/es/divider'
import Tooltip from 'antd/es/tooltip'
import AnimatedSection from '../components/AnimatedSection'
import { AverageRow } from '../components/Grid'
import { Hint } from '../components/Text'
import React, { useEffect, useState } from 'react'
import util from '../util'
import { handleAddressError } from '../handler'
import humanizeDuration from 'humanize-duration'
import { WALLET_OUTDATED_DISABLED_TEXT, WalletSelector } from './Common'
import ONEUtil from '../../../lib/util'
import Sign from '../pages/Show/Sign'
import QuestionCircleOutlined from '@ant-design/icons/QuestionCircleOutlined'
const { Title, Paragraph } = Typography
const RequestSignature = ({ caller, callback, messageB64Encoded, raw, duration, from, commentB64Encoded }) => {
  const [message, setMessage] = useState('')
  const [comment, setComment] = useState('')
  const [showSign, setShowSign] = useState(false)
  const durationParsed = parseInt(duration)
  const [selectedAddress, setSelectedAddress] = useState({})

  useEffect(() => {
    try {
      const message = Buffer.from(messageB64Encoded || '', 'base64').toString()
      const comment = Buffer.from(commentB64Encoded || '', 'base64').toString()
      setMessage(message)
      setComment(comment)
    } catch (ex) {
      message.error('Unable to parse message or comment provided by the app')
      console.error(ex)
    }
  }, [])

  const next = () => {
    if (!selectedAddress.value) {
      return message.error('No address is selected')
    }
    const normalizedAddress = util.safeExec(util.normalizedAddress, [selectedAddress.value], handleAddressError)
    if (!normalizedAddress) {
      return message.error(`normalizedAddress=${normalizedAddress}`)
    }
    setShowSign(true)
  }
  const cancel = () => {
    window.location.href = callback + '?success=0'
  }
  const onCallClose = () => {
    setShowSign(false)
  }
  const onSuccess = (txId, { hash, signature }) => {
    const hashStr = ONEUtil.hexString(hash)
    const signatureStr = ONEUtil.hexString(signature)
    window.location.href = callback + `?success=1&txId=${txId}&hash=${hashStr}&signature=${signatureStr}`
  }
  raw = !(typeof raw === 'undefined' || raw === 'false' || raw === '0')

  return (
    <>
      <AnimatedSection
        show
        style={{ minHeight: 320, maxWidth: 720 }}
      >
        <AverageRow>
          <Space direction='vertical'>
            <Title level={3}>"{caller}" wants your StreamWallet to sign something</Title>
            {comment && <Paragraph>Reason: {comment} </Paragraph>}
            {!comment && <Paragraph>The app did not provide any explanation </Paragraph>}
            <Hint>Tips: Signatures are usually provided for verification reasons. Signing a message does not mean you will allow the app to access your funds.</Hint>
            <Divider />
            <Title level={3}>Technical details</Title>
            <Paragraph>Message: {message}</Paragraph>
            <Paragraph>Prepend Header: {raw ? 'No' : 'Yes'}
              <Tooltip title={'Whether standard Ethereum message header should be prepended: "\\x19Ethereum Signed Message:\\n", followed by the message\'s length'}>
                <QuestionCircleOutlined style={{ marginLeft: 16 }} />
              </Tooltip>
            </Paragraph>
            <Paragraph>Expiry Time: {typeof duration === 'undefined' ? 'None' : humanizeDuration(durationParsed, { largest: 2, round: true })}</Paragraph>
          </Space>
        </AverageRow>
        <Divider />
        <WalletSelector from={from} onAddressSelected={setSelectedAddress} filter={e => e.majorVersion >= 10} disabledText={WALLET_OUTDATED_DISABLED_TEXT} />

        {!showSign &&
          <AverageRow justify='space-between'>
            <Button size='large' type='text' onClick={cancel} danger>Cancel</Button>
            <Button
              type='primary' size='large' shape='round' onClick={next}
              disabled={!(selectedAddress.value)}
            >Next
            </Button>
          </AverageRow>}

      </AnimatedSection>
      {showSign &&
        <Sign
          address={selectedAddress.value} onClose={onCallClose} onSuccess={onSuccess}
          prefillMessageInput={message}
          prefillUseRawMessage={raw}
          prefillDuration={duration}
          shouldAutoFocus
        />}
    </>
  )
}

export default RequestSignature
