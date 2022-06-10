import React, { useEffect, useState } from 'react'
import Button from 'antd/es/button'
import Space from 'antd/es/space'
import Tooltip from 'antd/es/tooltip'
import Typography from 'antd/es/typography'
import util from '../util'
import WalletConstants from '../constants/wallet'
import FieldBinaryOutlined from '@ant-design/icons/FieldBinaryOutlined'
import DeploymentUnitOutlined from '@ant-design/icons/DeploymentUnitOutlined'
import { useSelector } from 'react-redux'
const { Text, Link } = Typography

/**
 * Address to be displayed. It will be either displayed as full or shortened version.
 */
const displayAddress = ({ address, shorten }) => {
  if (shorten) {
    return util.ellipsisAddress(address)
  }

  return address
}

/**
 * Renders list of actionable options for the wallet's address.
 * - Copy address
 * - Go to wallet explorer
 * - Switch address style, one address or normal
 */
const WalletAddressOptions = ({ copyText, address, network, onAddressStyleSwitch, itemStyle }) => {
  return (
    <Space size='middle' align='baseline'>
      <Tooltip title='Copy Hex Address and Label'>
        <Text copyable={{ text: copyText }} style={itemStyle} />
      </Tooltip>
      <Tooltip title='Block Explorer'>
        <Link target='_blank' href={util.getNetworkExplorerUrl(address, network)} rel='noreferrer'>
          <DeploymentUnitOutlined style={itemStyle} />
        </Link>
      </Tooltip>
      <Tooltip title='Switch Address Format'>
        <Link onClick={onAddressStyleSwitch}>
          <FieldBinaryOutlined style={itemStyle} />
        </Link>
      </Tooltip>
    </Space>
  )
}

const MOUSE_HOVER_DETECTION_DELAY = 1000

/**
 * Renders the provided wallet's address in either ONE style or normal.
 * Provides the ability to copy the address and link to wallet explorer.
 */
const WalletAddress = ({ showLabel, labelOverride, address, shorten, onToggle, addressStyle, alwaysShowOptions, onClick, itemStyle, useHex }) => {
  const network = useSelector(state => state.global.network)
  const knownAddresses = useSelector(state => state.global.knownAddresses)
  const [showAddressOptions, setShowAddressOptions] = useState(false)
  const [showAddressOptionsLocked, setShowAddressOptionsLocked] = useState(alwaysShowOptions || false)
  const [mouseOnOptions, setMouseOnOptions] = useState(false)
  const [mouseOnAddress, setMouseOnAddress] = useState(false)
  const [showOneAddress, setShowOneAddress] = useState(!useHex)

  const currentDisplayAddress = showOneAddress ? util.safeOneAddress(address) : util.safeNormalizedAddress(address)

  const addressTooltipText = shorten ? currentDisplayAddress : ''

  const getLabel = (address) => {
    const normalized = util.safeNormalizedAddress(address)
    if (util.isDefaultRecoveryAddress(normalized)) {
      return WalletConstants.defaultRecoveryAddressLabel
    }
    return knownAddresses[normalized]?.label
  }

  useEffect(() => {
    if (!mouseOnOptions && !mouseOnAddress && !showAddressOptionsLocked) {
      setShowAddressOptions(false)
      onToggle && onToggle(false)
    } else {
      setShowAddressOptions(true)
      onToggle && onToggle(true)
    }
  }, [mouseOnOptions, mouseOnAddress])

  const addressOnClick = () => {
    onClick && onClick(!showAddressOptionsLocked)
    if (alwaysShowOptions) {
      navigator.clipboard && navigator.clipboard.writeText(currentDisplayAddress)
      return
    }
    setShowAddressOptionsLocked(!showAddressOptionsLocked)
  }

  return (
    <Space size='small' align='center' style={{ flexWrap: 'wrap' }}>
      <Tooltip title={addressTooltipText}>
        <Button
          type='text'
          style={{
            color: 'rgba(0, 0, 0, 0.45)', textAlign: 'left', wordBreak: 'break-word', overflowWrap: 'break-word', whiteSpace: 'break-spaces', height: 'fit-content', ...addressStyle
          }}
          onClick={addressOnClick}
          onMouseEnter={() => setMouseOnAddress(true)}
          onMouseLeave={() => setTimeout(() => setMouseOnAddress(false), MOUSE_HOVER_DETECTION_DELAY)}
        >
          {
            showLabel && getLabel(address) && `(${getLabel(address)}) `
          }
          {
            displayAddress({
              address: currentDisplayAddress,
              shorten
            })
          }
        </Button>
      </Tooltip>
      <Space
        onMouseEnter={() => setMouseOnOptions(true)}
        onMouseLeave={() => setTimeout(() => setMouseOnOptions(false), MOUSE_HOVER_DETECTION_DELAY)}
      >
        {showAddressOptions
          ? <WalletAddressOptions
              onAddressStyleSwitch={() => {
                setShowOneAddress(!showOneAddress)
                navigator.clipboard.writeText(`${!showOneAddress ? util.safeOneAddress(address) : util.safeNormalizedAddress(address)} (${getLabel(address)})`)
              }}
              address={address}
              copyText={currentDisplayAddress}
              network={network}
              itemStyle={itemStyle}
            />
          : <></>}
      </Space>
    </Space>
  )
}

export default WalletAddress
