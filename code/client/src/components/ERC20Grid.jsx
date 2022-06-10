import Card from 'antd/es/card'
import Image from 'antd/es/image'
import Row from 'antd/es/row'
import Space from 'antd/es/space'
import Typography from 'antd/es/typography'
import Divider from 'antd/es/divider'
import Button from 'antd/es/button'
import Col from 'antd/es/col'
import isNull from 'lodash/fp/isNull'
import isUndefined from 'lodash/fp/isUndefined'
import uniqBy from 'lodash/fp/uniqBy'
import walletActions from '../state/modules/wallet/actions'
import { balanceActions } from '../state/modules/balance'

import CloseOutlined from '@ant-design/icons/CloseOutlined'
import PlusCircleOutlined from '@ant-design/icons/PlusCircleOutlined'
import React, { useState, useEffect, useRef, useCallback } from 'react'
import { TallRow } from './Grid'
import { api } from '../../../lib/api'
import ONE from '../../../lib/onewallet'
import ONEUtil from '../../../lib/util'
import util, { useWindowDimensions } from '../util'
import { Warning, Hint, InputBox, Heading } from './Text'
import { withKeys, DefaultTrackedERC20, HarmonyONE } from './TokenAssets'
import { useDispatch, useSelector } from 'react-redux'
import abbr from '../abbr'
import { handleAddressError } from '../handler'
import ONEConstants from '../../../lib/constants'
import message from '../message'
const { Text, Link } = Typography

export const handleTrackNewToken = async ({ newContractAddress, currentTrackedTokens, dispatch, address, hideWarning }) => {
  if (!newContractAddress || newContractAddress.length < 42) {
    return
  }
  const contractAddress = util.safeExec(util.normalizedAddress, [newContractAddress], handleAddressError)
  if (!contractAddress) {
    return
  }
  const existing = currentTrackedTokens.find(t => t.contractAddress === contractAddress)
  if (existing && !hideWarning) {
    message.error(`You already added ${existing.name} (${existing.symbol}) (${existing.contractAddress})`)
    return
  }
  try {
    const tt = { tokenType: ONEConstants.TokenType.ERC20, tokenId: 0, contractAddress }
    const key = ONEUtil.hexView(ONE.computeTokenKey(tt).hash)
    dispatch(balanceActions.fetchTokenBalance({ address, ...tt, key }))
    tt.key = key
    try {
      const { name, symbol, decimals } = await api.blockchain.getTokenMetadata(tt)
      tt.name = name
      tt.symbol = symbol
      tt.decimals = decimals
    } catch (ex) {
      console.error(ex)
    }
    return tt
  } catch (ex) {
    message.error(`Unable to retrieve balance from ${newContractAddress}. It might not be a valid HRC20 contract address`)
  }
}

const GridItem = ({ style, children, icon, name, symbol, tokenKey, contractAddress, balance, addNew, selected, onSelected, onUntrack }) => {
  const { isMobile } = useWindowDimensions()
  const bech32ContractAddress = util.safeOneAddress(contractAddress)
  const abbrBech32ContractAddress = util.ellipsisAddress(bech32ContractAddress)
  const [mobileGridHeight, setMobileGridHeight] = useState('50%')
  const gridInnerRef = useRef()
  const [showUntrack, setShowUntrack] = useState(false)

  const handleResize = useCallback(() => {
    if (isMobile) {
      const width = gridInnerRef.current?.parentNode.clientWidth
      setMobileGridHeight(width ? `${width}px` : '50%')
    }
  }, [setMobileGridHeight])

  useEffect(() => {
    window.addEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    handleResize()
  }, [gridInnerRef.current?.parentNode.clientWidth])

  return (
    <Card.Grid
      style={{
        ...style,
        ...(selected && { backgroundColor: '#fafafa' }),
        height: isMobile ? mobileGridHeight : style.height,
        padding: isMobile ? 0 : 24
      }}
      onClick={onSelected}
      onMouseEnter={() => { setShowUntrack(true) }}
      onMouseLeave={() => { setShowUntrack(false) }}
    >
      <div style={{ textAlign: 'center' }} ref={gridInnerRef}>
        {onUntrack && showUntrack &&
          <Space style={{ position: 'absolute', right: 8, top: 8 }}>
            <Button
              key='close' type='text' icon={<CloseOutlined />} onClick={(e) => {
                e.stopPropagation()
                onUntrack(tokenKey)
              }}
            />
          </Space>}
        {addNew && <Text style={{ textAlign: 'center' }}><PlusCircleOutlined style={{ fontSize: 24 }} /><br /><br />Add Token</Text>}
        {children}
        {!children && !addNew &&
          <Space direction='vertical'>
            <Row justify='center' style={{ alignItems: 'center' }} gutter={8}>
              {icon && <Col><Image preview={false} src={icon} style={{ height: 32, width: 32 }} /></Col>}
              {symbol && !isMobile && <Col><Text style={{ fontSize: isMobile ? 12 : 24 }}>{symbol}</Text></Col>}
              {!symbol && <Col><Text style={{ fontSize: isMobile ? 12 : 24 }}>{abbrBech32ContractAddress}</Text></Col>}
            </Row>
            <Row justify='center' style={{ alignItems: 'center' }}>
              <Space>
                {
                !isMobile
                  ? (
                    <Hint style={{ textAlign: 'center' }}>
                      Balance
                    </Hint>
                    )
                  : <Hint style={{ fontSize: 12 }}>{symbol}</Hint>
                }
                {
                  !isMobile ? <Text>{abbr(balance, 1)}</Text> : <></>
                }
              </Space>
            </Row>
            {
              isMobile
                ? (
                  <Row justify='center' style={{ alignItems: 'center' }}>
                    <Hint style={{ fontSize: 12 }}>{abbr(balance, 1)}</Hint>
                  </Row>
                  )
                : <></>
            }
          </Space>}
      </div>
    </Card.Grid>
  )
}

export const ERC20Grid = ({ address }) => {
  const dispatch = useDispatch()
  const wallet = useSelector(state => state.wallet[address])
  const network = useSelector(state => state.global.network)
  const { selectedToken } = wallet
  const trackedTokens = (wallet.trackedTokens || []).filter(e => e.tokenType === ONEConstants.TokenType.ERC20)
  const untrackedTokenKeys = (wallet.untrackedTokens || [])
  const balances = useSelector(state => state.balance || {})
  const { balance = 0, tokenBalances = {} } = balances[address] || {}
  const { formatted } = util.computeBalance(balance)
  const walletOutdated = !util.canWalletSupportToken(wallet)
  const defaultTrackedTokens = withKeys(DefaultTrackedERC20(network))
  const initTrackedTokenState = uniqBy(t => t.key, [...defaultTrackedTokens, ...(trackedTokens || [])].filter(e => untrackedTokenKeys.find(k => k === e.key) === undefined))
  const [currentTrackedTokens, setCurrentTrackedTokens] = useState(initTrackedTokenState)
  const [disabled, setDisabled] = useState(true)
  const selected = (selectedToken && selectedToken.tokenType === ONEConstants.TokenType.ERC20) || HarmonyONE
  const [section, setSection] = useState()
  const [newContractAddress, setNewContractAddress] = useState('')
  const { isMobile } = useWindowDimensions()

  const gridItemStyle = {
    width: isMobile ? '50%' : '200px',
    height: isMobile ? undefined : '200px',
    display: 'flex',
    justifyContent: 'center',
    flexDirection: 'column',
    cursor: 'pointer',
    color: disabled && 'grey',
    opacity: disabled && 0.5,
    position: 'relative'
  }

  useEffect(() => {
    let cancelled = false
    if (walletOutdated) {
      return
    }
    setDisabled(false)
    const f = async () => {
      let tts = await api.blockchain.getTrackedTokens({ address })
      tts = tts.filter(e => e.tokenType === ONEConstants.TokenType.ERC20)
      tts.forEach(tt => { tt.key = ONEUtil.hexView(ONE.computeTokenKey(tt).hash) })

      await Promise.all(tts.map(async tt => {
        try {
          const { name, symbol, decimals } = await api.blockchain.getTokenMetadata(tt)
          tt.name = name
          tt.symbol = symbol
          tt.decimals = decimals
        } catch (ex) {
          console.error(ex)
        }
      }))
      if (cancelled) {
        return
      }
      // Merge to existing list.
      setCurrentTrackedTokens(ptts => uniqBy(t => t.key, [...ptts, ...tts, ...defaultTrackedTokens]).filter(e => untrackedTokenKeys.find(k => k === e.key) === undefined))
    }
    // dispatch(walletActions.untrackTokens({ address, keys: trackedTokens.map(e => e.key) }))
    f()
    return () => { cancelled = true }
  }, [walletOutdated])

  useEffect(() => {
    (currentTrackedTokens || []).forEach(tt => {
      const { tokenType, tokenId, contractAddress, key } = tt
      dispatch(balanceActions.fetchTokenBalance({ address, tokenType, tokenId, contractAddress, key }))
    })
    const newTokens = currentTrackedTokens.filter(e =>
      defaultTrackedTokens.find(dt => dt.key === e.key) === undefined &&
      trackedTokens.find(ut => ut.key === e.key) === undefined
    )
    // console.log({ newTokens, trackedTokens, currentTrackedTokens })
    // dispatch(walletActions.untrackTokens({ address, keys: trackedTokens.map(e => e.key) }))
    dispatch(walletActions.trackTokens({ address, tokens: newTokens }))
  }, [currentTrackedTokens])

  useEffect(() => {
    const f = async function () {
      const tt = await handleTrackNewToken({ newContractAddress, currentTrackedTokens, setCurrentTrackedTokens, dispatch, address })
      if (tt) {
        setCurrentTrackedTokens(tts => [...tts, tt])
        message.success(`New token added: ${tt.name} (${tt.symbol}) (${tt.contractAddress}`)
        setSection(null)
      }
    }
    f()
  }, [newContractAddress])

  const onSelect = (key) => () => {
    if (key === 'one') {
      dispatch(walletActions.setSelectedToken({ token: null, address }))
      return
    }
    const token = currentTrackedTokens.find(t => t.key === key)
    dispatch(walletActions.setSelectedToken({ token, address }))
  }

  return (
    <>
      {disabled && <Warning style={{ marginTop: 16, marginBottom: 16 }}>Your wallet is too outdated. Please create a new wallet to use tokens or NFTs.</Warning>}
      {!section &&
        <TallRow>
          <GridItem
            style={gridItemStyle}
            icon={HarmonyONE.icon} name={HarmonyONE.name} symbol={HarmonyONE.symbol} balance={formatted}
            selected={selected.key === 'one'} onSelected={onSelect('one')}
          />
          {currentTrackedTokens.map(tt => {
            const { icon, name, symbol, key, decimals } = tt
            const balance = !isUndefined(tokenBalances[key]) && !isNull(tokenBalances[key]) && tokenBalances[key]
            const { formatted } = balance && util.computeBalance(balance, 0, decimals)
            // console.log({ icon, name, symbol, key, decimals, formatted, balance })
            const displayBalance = balance ? formatted : 'fetching...'

            return (
              <GridItem
                disabled={disabled}
                selected={selected.key === key}
                key={key}
                tokenKey={key}
                style={gridItemStyle}
                icon={icon}
                name={name}
                symbol={symbol}
                balance={displayBalance}
                onSelected={onSelect(key)}
                onUntrack={(tokenKey) => {
                  dispatch(walletActions.untrackTokens({ keys: [tokenKey], address }))
                  setCurrentTrackedTokens(tts => tts.filter(tt => tt.key !== tokenKey))
                }}
              />
            )
          })}
          <GridItem style={gridItemStyle} addNew onSelected={() => { setSection('new') }} disabled={disabled} />
        </TallRow>}
      {section === 'new' &&
        <TallRow>
          <Divider />
          <Space direction='vertical' size='large'>
            <Heading>Track New Token</Heading>
            <Hint>Token Contract Address</Hint>
            <InputBox margin='auto' width={440} value={newContractAddress} onChange={({ target: { value } }) => setNewContractAddress(value)} placeholder='one1...' />
            <TallRow justify='space-between'>
              <Button size='large' shape='round' onClick={() => setSection(null)}>Cancel</Button>
            </TallRow>
            <Hint>You can copy contract addresses from <Link target='_blank' href='https://explorer.harmony.one/hrc20' rel='noreferrer'>StreamONE HRC20 Explorer</Link></Hint>
          </Space>
        </TallRow>}
    </>
  )
}

// match is from route matches.
export const ERC20GridV2 = ({ match = {} }) => {
  const { address } = match.params ?? {}
  const normalizedAddr = util.safeNormalizedAddress(address)
  return <ERC20Grid address={normalizedAddr} />
}
