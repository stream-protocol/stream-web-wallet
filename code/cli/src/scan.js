import React, { useEffect, useState } from 'react'
import { Box, Newline, render, Text, useStdout } from 'ink'
import { storeIncompleteWallet } from './store'
import Constants from './constants'
import config from './config'
import BigText from 'ink-big-text'
import Gradient from 'ink-gradient'
import crypto from 'crypto'
import ONEUtil from '../../lib/util'
import ONENames from '../../lib/names'
import path from 'path'
import qrcode from 'qrcode'
import { Worker } from 'worker_threads'
import b32 from 'hi-base32'

const PROGRESS_REPORT_INTERVAL = 1

const getQRCodeUri = ({ name, seed }) => {
    // otpauth://TYPE/LABEL?PARAMETERS
    name = name.replace(' ', '%20')
    return `otpauth://totp/${name}?secret=${b32.encode(seed)}&issuer=Harmony`
}

const QRCode = ({ data }) => {
        const rows = []
        for (let i = 0; i < data.size; i += 1) {
            const buffer = []
            for (let j = 0; j < data.size; j += 1) {
                if (data.get(i, j)) {
                    buffer.push( < Text backgroundColor = '#000000'
                        key = { `${i}-${j}` } > { '\u3000' } < /Text>)
                    }
                    else {
                        buffer.push( < Text backgroundColor = '#ffffff'
                            key = { `${i}-${j}` } > { '\u3000' } < /Text>)
                        }
                    }
                    rows.push( < Text key = { `r-${i}` } > < Text > { buffer } < /Text><Newline / > < /Text>)
                    }
                    if (!data) {
                        return < > < />
                    }
                    return <Text > { rows } < /Text>
                }

                const Header = () => {
                    return ( <
                        >
                        <
                        Box marginBottom = { 2 } >
                        <
                        Gradient colors = {
                            ['#30c5dc', '#01e6a3']
                        } >
                        <
                        BigText text = 'ONE Wallet' / >
                        <
                        Text > CLI version { config.version } < /Text> < /
                        Gradient > <
                        /Box> <
                        Box marginBottom = { 2 }
                        flexDirection = 'column' >
                        <
                        Text > Please scan the QR code using your Google Authenticator. < /Text> <
                        Text > You need the 6 - digit code from Google authenticator to transfer funds.You can restore your wallet using Google authenticator on any device. < /Text> < /
                        Box > <
                        />
                    )
                }

                const NewWallet = ({ seed, name, data }) => {
                    // eslint-disable-next-line no-unused-vars
                    const { write: log } = useStdout()
                        // eslint-disable-next-line no-unused-vars
                    const [duration, setDuration] = useState(Constants.defaultDuration)
                    const [progress, setProgress] = useState(0)
                    const [progressStage, setProgressStage] = useState(-1)
                    const [worker, setWorker] = useState()
                        // eslint-disable-next-line no-unused-vars
                    const [slotSize] = useState(1)

                    useEffect(() => {
                        const worker = new Worker(path.join(__dirname, 'ONEWalletWorker.js'))
                        setWorker(worker)
                    }, [])

                    useEffect(() => {
                        if (worker) {
                            // log('posting to worker')
                            const effectiveTime = Math.floor(Date.now() / Constants.interval) * Constants.interval
                            worker && worker.postMessage({
                                seed,
                                effectiveTime,
                                duration,
                                slotSize,
                                interval: Constants.interval
                            })
                            worker.on('message', async({ status, current, total, stage, result } = {}) => {
                                if (status === 'working') {
                                    // log(`Completed ${(current / total * 100).toFixed(2)}%`)
                                    if (current % PROGRESS_REPORT_INTERVAL === 0) {
                                        setProgress(Math.round(current / total * 100))
                                    }
                                    setProgressStage(stage)
                                }
                                if (status === 'done') {
                                    const { hseed, root, layers, maxOperationsPerInterval: slotSize } = result
                                    const state = {
                                        name,
                                        root: ONEUtil.hexView(root),
                                        duration,
                                        effectiveTime,
                                        slotSize,
                                        hseed: ONEUtil.hexView(hseed),
                                    }
                                    await storeIncompleteWallet({ state, layers })
                                    worker.terminate()
                                    process.exit(0)
                                        // why()
                                        // log('Received created wallet from worker', result)
                                }
                            })
                        }
                    }, [worker])

                    return ( <
                        >
                        <
                        Box marginY = { 2 }
                        flexDirection = 'column' >
                        <
                        Text > After you are done, use < /Text> <
                        Box borderStyle = 'single' > < Text > StreamWallet make { '<recovery-address> <code>' } < /Text></Box >
                        <
                        Text > command to deploy the wallet.If you need help,
                        try < /Text> <
                        Box borderStyle = 'single' > < Text > StreamWallet help < /Text></Box >
                        <
                        /Box> <
                        Box marginBottom = { 2 }
                        flexDirection = 'column' >
                        <
                        Text > Building wallet... < /Text> <
                        Text color = { progressStage === 0 ? 'yellow' : (progressStage < 0 ? 'grey' : 'green') } > Securing the wallet { progressStage === 0 && `${progress}%` } < /Text> <
                        Text color = { progressStage === 1 ? 'yellow' : (progressStage < 1 ? 'grey' : 'green') } > Preparing signatures { progressStage === 1 && `${progress}%` } < /Text> <
                        Text color = { progressStage < 2 ? 'grey' : 'green' } > Finalizing < /Text> < /
                        Box > <
                        />
                    )
                }

                export default () => {
                    const seed = new Uint8Array(crypto.randomBytes(20).buffer)
                    const name = ONENames.randomWord(3, '-').toLowerCase()
                    const uri = getQRCodeUri({ name, seed })
                    const code = qrcode.create(uri, { errorCorrectionLevel: 'low' })
                    const data = code.modules
                    render( < Header / > ).unmount()
                    render( < QRCode data = { data }
                            />).unmount()
                            render( < NewWallet seed = { seed }
                                name = { name }
                                />)
                            }