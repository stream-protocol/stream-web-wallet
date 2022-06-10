import React, { useState } from 'react'
import ImportOutlined from '@ant-design/icons/ImportOutlined'
import LoadingOutlined from '@ant-design/icons/LoadingOutlined'
import Button from 'antd/es/button'
import Upload from 'antd/es/upload'
import { useDispatch, useSelector } from 'react-redux'
import { useHistory } from 'react-router'
import message from '../message'
import storage from '../storage'
import util from '../util'
import ONEUtil from '../../../lib/util'
import { walletActions } from '../state/modules/wallet'
import Paths from '../constants/paths'
import { SimpleWalletExport } from '../proto/wallet'
import { getDataFromFile } from './Common'

const LocalImport = () => {
  const dispatch = useDispatch()
  const history = useHistory()
  const wallets = useSelector(state => state.wallet)
  const [fileUploading, setFileUploading] = useState(false)

  const handleImport = async info => {
    if (info.file.status === 'uploading') {
      setFileUploading(true)
    }

    if (info.file.status === 'done') {
      try {
        const data = await getDataFromFile(info.file.originFileObj)
        const { innerTrees, layers, state, address, name } = SimpleWalletExport.decode(new Uint8Array(data))

        // const decoded = LocalExportMessage.decode(new Uint8Array(data))
        const wallet = JSON.parse(state)
        // console.log(ONEUtil.hexView(layers[layers.length - 1]), wallet.root)
        if (!util.isValidWallet(wallet)) {
          message.error('Wallet file has invalid data')
          return
        }
        if (wallets[wallet.address]) {
          message.error('Wallet already exists. Please use the existing one or delete it first.')
          return
        }
        if (!layers) {
          message.error('Wallet file has corrupted data')
          return
        }
        message.info(`Saving wallet ${name} (${util.safeOneAddress(address)})`)
        dispatch(walletActions.updateWallet(wallet))
        const promises = []
        for (const { layers: innerLayers } of innerTrees) {
          const innerRoot = innerLayers[innerLayers.length - 1]
          promises.push(storage.setItem(ONEUtil.hexView(innerRoot), innerLayers))
        }
        promises.push(storage.setItem(ONEUtil.hexView(layers[layers.length - 1]), layers))
        await Promise.all(promises)
        message.success(`Wallet ${wallet.name} (${wallet.address}) is restored!`)
        setTimeout(() => history.push(Paths.showAddress(wallet.address)), 1500)
      } catch (err) {
        message.error(err?.message || 'Unable to parse wallet file')
      } finally {
        setFileUploading(false)
      }
    }
  }

  const beforeUpload = (file) => {
    const filename = file.name.split('.')
    const isStreamWalletExt = filename[filename.length - 1] === 'StreamWallet'

    if (!isStreamWalletExt) {
      message.error('You can only upload StreamWallet file')
    }

    return isStreamWalletExt
  }

  return (
    <Upload
      name='walletjson'
      showUploadList={false}
      customRequest={({ onSuccess }) => { onSuccess('ok') }}
      beforeUpload={beforeUpload}
      onChange={handleImport}
    >
      <Button
        type='primary'
        shape='round'
        size='large'
        icon={fileUploading ? <LoadingOutlined /> : <ImportOutlined />}
      >
        Import
      </Button>
    </Upload>
  )
}

export default LocalImport
