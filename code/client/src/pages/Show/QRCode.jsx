import qrcode from 'qrcode'
import React, { useEffect, useState, useRef } from 'react'
import config from '../../config'
import html2canvas from 'html2canvas'
import Button from 'antd/es/button'
import Image from 'antd/es/image'
import Row from 'antd/es/row'
import Space from 'antd/es/space'
import Typography from 'antd/es/typography'
import util from '../../util'
import { walletActions } from '../../state/modules/wallet'
import { useDispatch } from 'react-redux'
const { Text } = Typography

const QRCode = ({ address, name }) => {
  const dispatch = useDispatch()
  const [qrCodeData, setQRCodeData] = useState()
  const ref = useRef()
  useEffect(() => {
    const f = async () => {
      const uri = `${config.rootUrl}/to/${address}`
      const data = await qrcode.toDataURL(uri, { errorCorrectionLevel: 'low', width: 512 })
      setQRCodeData(data)
    }
    f()
  }, [])
  const capture = async () => {
    const canvas = await html2canvas(ref.current)
    return new Promise((resolve, reject) => {
      try {
        canvas.toBlob(blob => { resolve(blob) })
      } catch (err) {
        reject(err)
      }
    })
  }
  const onCapture = async () => {
    dispatch(walletActions.userAcknowledgedToSaveAddress({ address }))
    const blob = await capture()
    const element = document.createElement('a')
    element.href = URL.createObjectURL(blob)
    element.download = `StreamWallet-${util.safeOneAddress(address)}.png`
    document.body.appendChild(element)
    element.click()
    URL.revokeObjectURL(element.href)
  }
  return (
    <>
      <Row style={{ width: '100%', marginTop: 16 }} justify='center'>
        <Space direction='vertical' style={{ textAlign: 'center' }}>
          <Text>Others can scan your QR code to send you assets</Text>
          <Text>(This QR code cannot be used to restore your wallet)</Text>
          <div ref={ref} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Image
              src={qrCodeData}
              preview={false}
              width='85%'
              style={{ maxWidth: 400 }}
            />
            <Text>Your StreamWallet: {name}</Text>
            <Text>{util.safeOneAddress(address)}</Text>
          </div>
          <Button type='primary' shape='round' onClick={onCapture}>Save Image</Button>
        </Space>
      </Row>
    </>
  )
}

export default QRCode
