Last Content Update on 2021-05-23 (draft v0.1.5)

- [1-Page Project Summary](http://harmony.one/StreamWallet) 

- [Demo on Harmony Mainnet](https://StreamWallet.crazy.one)

- [Harmony's Wallet Strategy](https://twitter.com/stse/status/1390810619834638336)

- [Tweets on Updates and News](https://twitter.com/StreamWallet_)

- [Research on Keyless Wallets](https://twitter.com/dionyziz/status/1400005462028914690)

- [Protocol and Technical Specification](https://github.com/stream-protocol/stream-web-wallet/blob/43197c70e36cb58c2884c423c1e665feff232042/wiki/protocol.pdf)

## Table of Contents

* [Security Goals](#security-goals)
  * [Social (people)](#social-people)
  * [Smart (code)](#smart-code)
  * [Hard (math)](#hard-math)
* [Product Overview](#product-overview)
  * [Product Features](#product-features)
  * [Security Features](#security-features)
* [Technical Background](#technical-background)
  * [Two\-factor Authentication on Blockchain](#two-factor-authentication-on-blockchain)
  * [SmartOTP](#smartotp)
    * [Key issues](#key-issues)
    * [Notations](#notations)
    * [Assumptions](#assumptions)
    * [Security](#security)
  * [Differences in ONE Wallet](#differences-in-stream-web-wallet)
    * [Compared to Password Authentication](#compared-to-password-authentication)
    * [Compared to Private Key Authentication](#compared-to-private-key-authentication)
* [ONE Wallet Technical Design](#stream-web-wallet-technical-design)
  * [Context](#context)
  * [Components](#components)
    * [Client](#client)
      * [OTP (One-Time-Password) Seed](#otp-seed)
      * [OTP](#otp)
      * [OTP Merkle Tree](#otp-merkle-tree)
      * [OTP Proof](#otp-proof)
      * [Visibility of OTP Merkle Tree](#visibility-of-otp-merkle-tree)
      * [Composable Authentication](#composable-authentication)
    * [Authenticator](#authenticator)
      * [OTP Seed](#otp-seed-1)
      * [OTP](#otp-1)
    * [Smart Contract](#smart-contract)
      * [Basic Wallet](#basic-wallet)
        * [Two\-stage transaction](#two-stage-transaction)
      * [Guardians](#guardians)
      * [Composable Authentication](#composable-authentication-1)
        * [Authentication with Private Key](#authentication-with-private-key)
        * [Authentication with HOTP](#authentication-with-hotp)
  * [Operations](#operations)
* [Security Analysis](#security-analysis)
* [Open Problems](#open-problems)

## Security Goals

ONE Wallet is designed with these goals in mind for security:

### Social (people)
- **Resilient**. Funds are recoverable through time locks and multiple safety nets. No single point of failure such as thefts, cracks, loss, censorship or coersions is catastrophic. 
- **Sufficient**. All steps are well defined without delegating to hardware devices or seed phrases in safety boxes. Users do not need any passwords or rely on biometrics.
- **Anonymous**. An account is a fresh cryptographic hash, not tied to existing systems or real-world identity. Derived paths support multiple public keys to protect privacy.

### Smart (code)
- **Composable**. One-time or low-entropy passwords are useful for small funds. Multiple authentications can independently boost protection thresholds against brute-force.
- **On-chain**. A decentralized network with high stakes and fast finality validates all transactions. Its platform has sustainable incentives and open governance to evolve. 
- **Programmable**. Operations can call third-party contracts, store history of states, or upgrade its code. Complex applications may use oracles of time, locations and events.

### Hard (math)
- **Self-Sovereign**. No third parties, government documents, designated guardians, backup servers or hardware enclaves are necessary. Users have full custody and self control.
- **Air-Gapped**. Key-loggers and man-in-the-middle attacks are minimized. The full parameters of transactions are easy to verify and approve without cables or cameras.
- **Verified**. Trusted are only open source and hardened cryptography. Formal verification, through logical frameworks, assures end-to-end security beyond tests and audits.

## Tradeoffs

There may be conflicts, tradeoffs or impracticality of the goals above. Here's our rule of thumb:
1. Toward validating our innovation with 10k users (each with $100 assets), focus on these three goals: **sufficient, resilient and composable**. 
1. Toward adopting our product with 1m users (each with $1k assets), differentiate with these three goals: **on-chain, self-sovereign and air-gapped**.
  
## Product Overview

ONE Wallet is a non-custodial crypto wallet optimized for everyday use cases. It is designed to be more secure and easier to use than existing crypto wallets and engineered to be more resilient to theft and accidental loss. Users can send payments as efficiently and securely as Venmo, Paypal, or Coinbase Wallet, and recover funds when they forget passwords. However, as a non-custodial wallet operating on smart contracts, the user would retain all control rather than being forced to trust a company or a person and give up all control to them. 

ONE Wallet is one of the first non-custodial wallets to support Google authenticator, social recovery, and multi-layer authentication. The wallet will support major cryptocurrencies such as ETH, ONE, BSC, BTC, ATOM, and others. By design, the wallet requires two-factor authentications for sensitive operations. The funds in the wallet remain safe even if hackers gained control of a single device (e.g., wallet client on a computer). If the user loses their passwords or private keys, the wallet provides multiple mechanisms for fund recovery.

### Product Features

- **Smart-contract wallet**: open-source, transparent, entirely controlled by the user, using algorithms audited by the community.
- **One-time passwords**: authorizes transactions using a one-time password that is effective only for 30 seconds and stays safe against prying eyes and security cameras.
- **Permission by time-slice**: Create shallow copies of your wallet client that is cryptographically only effective for a specified period (e.g., weekend only, by the end of this week, in 4-8 hours).
- **Social Identities** (coming soon): Establish ownership using social identities, e.g., other wallet accounts, Twitter, Telegram, not just private keys.

### Security Features
- **Quick transfer**: Send a small amount of fund (e.g., $100) using a random 6-digit code generated by Google Authenticator
- **Spending limit**: Control spending with customizable daily limits  
- **Fund recovery**: Set the last resort address for fund recovery so you would not lose all your funds even in the worst case 
- **Guardians**: Invite others to guard your wallet: establish identities, recover accounts, authorize sensitive transactions  
- **Composable authentication**: Authorize sensitive operations (e.g., sending $20000, destroy wallet, adding/removing identities) using multiple mechanisms together (e.g., Google Authenticator, guardians, Private key signature, multiple Google Authenticator codes)

ONE Wallet runs on Harmony network, a fast blockchain using proof-of-stake consensus. It is compatible with apps that run on Ethereum, but it substantially outperforms Ethereum in many ways (most significantly, fees and consensus time). 

## Technical Background

### Two-factor Authentication on Blockchain

After two decades of security incidents, massive scale password leaks, and consumer privacy movements, two-factor authentication and one-time password (OTP) already became ubiquitous in non-blockchain applications. Today, an app that does not have Two-factor Authentication (2FA) implemented may be considered insecure and look out of place. Among 2FA implementations, Google Authenticator is arguably the most popular method for generating an OTP (aside from sending OTP by text messages). With Google Authenticator, a 6-digit code<sup>[1](#f1)</sup> OTP is generated using the current timestamp and a secret seed. The code remains valid for 30 seconds. Afterward, a new code is generated. The seed is typically generated and stored by the app's server, displayed on the screen as a QR code, then transmitted by the user to the Google Authenticator app by a camera scan. The QR code encodes the seed itself and some configuration parameters. The seed is permanently stored on Google Authenticator and can be exported by the user at any time. The server can validate a user's identity by verifying whether the user is providing an expected QR code.

On a public blockchain, the role of a server is replaced by the smart contract, where the execution code and parameters are visible to the public by default. Therefore, we can no longer store the secret seed can on-chain. Otherwise, the seed would be visible to everyone. The challenge is to find a way to verify an OTP is valid at a given time without exposing any secret while assuming all execution data are visible to attackers. On top of that, the design must consider potential delays in blockchain consensus and blockchain's execution and storage cost. 

<a name="f1">[1]</a> Although the iOS version supports 8-digit code, more secure algorithms, and additional options such as generating a new code every 60 seconds instead of 30 seconds, the Android version only supports the most basic algorithm with 6-digit code. See an [in-depth analysis by Laban Sköllermark](https://labanskoller.se/blog/2019/07/11/many-common-mobile-authenticator-apps-accept-qr-codes-for-modes-they-dont-support/)

### SmartOTP

Our design extends from the groundwork laid by [SmartOTP (Homoliak et al., 2018)](https://arxiv.org/abs/1812.03598). SmartOTP proposes a smart contract wallet that requires each operation to be confirmed by two factors: a signature generated by a private key (to initiate the operation) and an OTP generated by an authenticator. The signature-confirmation component is similar to how users authorize transactions on mainstream wallets (e.g., MetaMask). The OTP component is new, and it may be the first to explore the use of OTP in the context of a smart contract without using any oracle. Compared to MetaMask, the OTP mechanism adds an extra layer of security. In practice, it is cumbersome to ask the users to confirm every operation. Something as trivial as paying \$20 to a friend for lunch should be frictionless. 

#### Key issues

There are several obstacles in adopting SmartOTP:

1. The OTP is not a time-based OTP similar to that of Google Authenticator. Generating an OTP requires an operation ID as an input parameter instead of the current time.
2. The OTP is very long (at least 128-bit, compared to 20-bit for a 6-digit code in Google Authenticator).
3. The authenticator computes the OTP based on a customized function of the input (the operation ID and the seed). [*](#issue-beta-function)
4. All operations must be initiated using a signature confirmation, marked as pending, then later confirmed by the OTP.
5. A separate hardware wallet is assumed to carry the private keys and perform signing (and authorization) of the initialization of an operation. 

#### Notations

Using the notation in the paper, we have: a User, a client-side program (similar to MetaMask) abbreviated as the Client, a Hardware Wallet (similar to Trezor), and the Smart Contract wallet (the smart contracts holding the user's funds and perform a variety of operations). The hardware wallet maintains the private key and produces signatures for all transactions. In ONE Wallet's design, we do not use the Hardware Wallet since it is inconvenient, most people do not use it, and our Smart Contract does not restrict the sender of an operation to be a particular account. 

#### Assumptions

Following the assumptions in SmartOTP:

1. The secret seed for OTP is only stored and kept on the Authenticator.
2. The client keeps a copy of the seed only before creating the Smart Contract wallet. 
3. When the wallet is created, the client generates a large number of OTPs with seed. These OTPs are then hashed and built into a Merkle tree<sup>[2](#f2)</sup>. The hashed values are kept in the Client only. They will be used in computing proofs for operations. The seed is discarded after the wallet is created.
4. The Smart Contract wallet only keeps the root<sup>[3](#f3)</sup> of the Merkle tree created in (3). The roots are sufficient to verify whether an OTP is valid. 

<a name="f2">[2]</a>: The paper also introduces several optimizations to reduce the number of hashes by several orders of magnitudes. As discussed below, they cannot be used with Google Authenticator, so we omit the details.

<a name="f3">[3]</a>: The paper suggests caching a layer of nodes to reduce the compute cost in practice. This optimization is not essential in our use case as the gas cost on Harmony network is cheap.

#### Security

Under the above assumptions, SmartOTP offers excellent security. SmartOTP remains secure when only a single point is compromised. A compromised client cannot confirm any operation without the correct OTP. A compromised authenticator does not pose any risk because the attacker cannot initiate any operation without the private key at the wallet (or client, in the absensce<sup>[4](#f4)</sup> of hardware wallet). We omit the details since the paper provides excellent analysis for various scenarios, such as attacks intended to prevent users from accessing the funds.  

<a name="f4">[4]</a>: If the client is compromised and a software wallet is embedded with the Client, the attacker may still perform a front-running attack. 

### Differences in ONE Wallet 

ONE Wallet prioritizes practicality, simplicity, and usability. In ONE Wallet's design, we have to balance between convenience and security depending on the sensitivity of the transactions and the user's preferences. We make the tradeoffs customizable by the user and provide a range of options for security protections. By default, we let the user start with the most convenient (and least secure) option and allow them to incrementally add layers of securities as they use ONE Wallet more often: sending larger transactions, setting up more identities, and exploring more complex functionalities (recovery, guardian, composable security, and more).
  
It should be noted that by default, ONE Wallet only provides **one factor of authentication** despite the use of OTP. See OTP, OTP Proof, and Visibility of OTP Merkle Tree below for a detailed explanation. If the user's Client (e.g., computer) is compromised such that the attacker can access the OTP Merkle Tree stored on the Client, the 6-digit OTP would not effectively protect the user. For the same reason, we set a low daily spending limit (\$100) for the default setting to minimize the damage. See [below sections](#components) for details. If the user wants to gain more protection and raise the daily spending limit, the user should set up Guardians or Composable Authentication. See [below](#components).

#### Compared to Password Authentication

Compared to standard password-lock, the OTP effectively protects users from keyloggers, security cameras, or someone who may physically see the password when the user types it. For example, if the user uses ONE wallet in a coffee shop (to pay their friend or the merchant for coffee or dessert), they would not need to worry about someone sitting behind or around might steal the password, or the coffee shop's security camera may capture it because the OTP expires in 30 seconds. In contrast, if the user is using a password-lock for their wallet, after gaining the password, the thief would only need temporary access to the user's device to steal the funds, i.e., when the user did not pay attention or goes to the restroom.

#### Compared to Private Key Authentication

Compared to private-key mechanisms, the advantage of the OTP mechanisms in ONE Wallet (introduced below) is that shallow copies of the wallet can be created, and permissions can be sliced by time and shared across multiple devices (multiple Clients), without communicating with the Smart Contract. This feature is made possible by copying part of the OTP Merkle Tree corresponding to the desired time range to the destination Client. 

For example, the user may want the home computer only to send funds over the weekend (e.g., when the user knows they would be at home, kids who have access to the computer would not mess around the computer and spend money irresponsibly). This objective can be achieved by copying the OTP Merkle Tree leaves corresponds to weekends (within the wallet's lifespan) and their ancestors and siblings to the home computer. Cryptographically, the home computer would not be able to send funds outside of the weekend since it lacks the OTP Proof to initiate any operation on the Smart Contract.  

A user may want to set up a Client that can only access the fund after a fixed point in time—for example, setting up an escrow account for a work contract that pays the contractor that pays \$100 per day after 14 days (during which period the work is performed first). In this case, a shallow copy of the Client can be created by copying the OTP Merkle Tree but discarding the leaves corresponding to the first 14 days. The shallow copy can be given to the contractor or an escrow holder, and they would not be able to do anything within the first 14 days.

In both scenarios above, the solution leverages that our design only needs a slice of the OTP Merkle Tree to initiate an operation on the wallet. The feature would not be possible using a private-key-based authentication mechanism since a private key is either shared with another client (thus giving permissions to do everything on the wallet) in its entirety or not shared at all. An equivalent solution for private key based mechanism using custom smart contract would be cumbersome, costly, and possibly less secure since a custom smart contract needs to be developed, the smart contract has to maintain state on who has permission to do what, and the Client needs to update the smart when new roles with partial permissions are added or removed. 

The above two scenarios are merely two simple examples. There are many other possibilities for permission using the time-slice mechanism. 
  


## ONE Wallet Technical Design

The core of ONE Wallet is the Client and the Smart Contract. A proof-of-concept (work in progress) is made open-source and [available on Github](https://github.com/hashmesan/harmony-totp). The authenticator is Google Authenticator. We are leaving the design of the user interface and wrappers around the client to the next stage of the project. We are open to other developers to contribute or build their wallets based on our core.

### Context

Since ONE Wallet is based on a smart contract, the contract must be deployed and created by another account. This operation costs gas, and the gas has to be paid by that account. We refer to that account as the Owner Account. The Owner Account can be an existing wallet under the user's control or a contract account created by Harmony designated explicitly for this purpose. In either case, we assume it already exists. If it is an account under the user's control, the user may use it for fund recovery. For example, the user may add the owner account's address as a guardian or a last-resort drain. The user may also use it to add an extra layer of security since the owner account would have its Private Key, which can be used to sign transactions and initiate operations similar to the design in SmartOTP. 

At the next stage of development, we may generate and manage this wallet address on the user's behalf. For now, we focus our discussion and analysis only on the Client, the Smart Contract, and how the user interacts with them using their Google Authenticator. We also limit our initial discussion and security analysis to the authentication and authorizations provided by Authenticator and Private Key and guardians in applicable scenarios. We will leave social login features to the next version. To address security concerns and issues identified in previous sections, we introduce Composable Authentication that makes uses of multiple OTPs and counter-based OTPs, in addition to the default settings where security is only provided via the proof (stored at the client) associated with a single time-based OTP generated by the Authenticator.

In the sections below, we introduce the key components of the wallet, the thinking and necessity behind each component, and how they address common security concerns. For components similar to those elements in SmartOTP, we also briefly describe the key differences. 


### Components

#### Client 

The Client is the primary interface which the user may create and manage their ONE Wallet. The Client can be a native program running on an operating system, a browser extension, or a mobile app. The Client is assumed to be not easily compromised. Thus any credentials and non-public constructs stored at the Client are assumed to be secure unless an attacker specifically targets the Client. 

The Client holds constructs that are necessary to perform operations on the ONE Wallet. Some constructs are transient (e.g., OTP Seed) and must be destroyed as soon as they serve their purpose. Some constructs may become visible to the public over time (e.g., OTP Merkle Tree). We assume constructs such as Owner Account's Private Key (if applicable) exists outside the Client in the current version. In later sections, we analyze the scenarios separately: the Client is compromised, the Private Key is compromised, or both are compromised.

##### OTP Seed

OTP Seed is a random string generated by the Client and encoded in the QR code, which the user subsequently scans to initialize the Google Authenticator. The seed is destroyed after hashed values of potential OTPs are computed, ** before** the creation of the wallet. Based on [RFC4226](https://www.ietf.org/rfc/rfc4226.txt), the secret seed must be at least 128-bit (16 characters long). The recommended length is 160-bit. In ONE Wallet, we use a random string with a length of 160-bit (20 characters). 

Note that, in SmartOTP paper, the Authenticator generates the seed instead of the Client. The seed is then copied to the Client by a QR Code (displayed on the authenticator) or a microSD card. We changed this mechanism because Google Authenticator cannot generate seed values independently, and such a change does not make the wallet less secure. If the Client is compromised during setup, the wallet would be compromised regardless of where the seed is generated. 

##### OTP

OTP codes are generated and temporarily held at the Client only during the construction of OTP Merkle Tree, using the same algorithms<sup>[6](#f6)</sup> the Authenticator would use. We enumerate possible input values (time or counter) for the OTP algorithms for a reasonably long foreseeable future. After the OTP Merkle Tree is generated, the OTPs are destroyed. The OTP codes themselves cannot be recovered from the Merkle Tree aside from using brute-force attacks. Since brute-force attacks on 1 million possible codes are trivially simple, if the OTP Merkle Tree is constructed using hashes of single OTP codes as leaves, the original OTP codes would be trivially recovered from the OTP Merkle Tree. In this scenario, the OTP codes would not offer an additional layer of security protection if the Client is compromised since the OTP Merkle Tree (see below) is stored in the Client. Nonetheless, such OTP codes can still help make small transfers convenient. See later sections for a detailed discussion. Additionally, our designs in the Composable Authentication address this issue by grouping multiple OTPs before they are hashed and used as leaves, thus makes brute-force attacks exceedingly difficult.    

<a name="f6">[6]</a>: A [mathematical construction](https://www.wikiwand.com/en/HMAC-based_One-Time_Password) is provided on Wikipedia. A [step-by-step tutorial with code examples](https://hackernoon.com/how-to-implement-google-authenticator-two-factor-auth-in-javascript-091wy3vh3) are available at Hackernoon.  

##### OTP Merkle Tree

OTP Merkle Tree is a Merkle tree constructed using hashed values of all the OTP codes enumerated for the expected lifespan of the wallet. The construction process is the same as a standard Merkle tree: the hashed values of the enumerated OTP codes are placed as the leaves of the tree, and the inner nodes of the tree are the hash of the concatenation of the consecutive hash pair from the layer below, starting from the leaves.

##### OTP Proof

OTP Proof is a path from a leaf to the root of the OTP Merkle Tree, plus an OTP code itself. In SmartOTP, the OTP Merkle Tree is not assumed to be a secret. The OTP Proof is submitted to the Smart Contract as part of the proof during OTP validation. Whenever an OTP is used, the corresponding sibling and ancestors on the Merkle tree are exposed to the public. Since SmartOTP's custom Authenticator uses all OTP codes multiple times (while maintaining security by leveraging hash chains), the OTP Merkle Tree is entirely made public soon after all OTP codes are used at least once.

##### Visibility of OTP Merkle Tree

In our design, the OTP Merkle Tree is not necessarily made public. This distinction is because of two differences: (1) the OTPs generated by Google Authenticator are time-based, and (2) the OTPs are never re-used. Since each OTP code is valid for 30 seconds, we only need to generate about 1 million<sup>[7](#f7)</sup> codes to cover a one-year lifespan of a wallet. In all but the most extreme corner use cases, the user would not be using the wallet during the wallet's lifespan; hence, only a tiny portion of the 1 million OTP codes would be used. Since time monotonically increases, and we are unable to embed a custom function in the Authenticator (as mentioned in [previous section](#issue-beta-function)), we would not be following any pattern to reuse an OTP code that was used in previous operations<sup>[8](#f8)</sup>.  

If an OTP Proof is submitted as proof and made public, only its immediate sibling and ancestors are made public. Because of this, all other values on the leaves (i.e., the hashes of the OTPs) would remain undisclosed until a corresponding OTP or its sibling's corresponding OTP is used. Therefore, we may assume the OTP Merkle Tree is semi-private and leverage this property in our design. For example, we may create a "shallow copy" of the wallet offering limited functionalities to be used in an insecure environment (e.g., work phone, work laptop, family-shared computer), by providing a copy of the OTP Merkle Tree and allow some operations to be authorized by using the tree and an OTP code.

<a name="f7">[7]</a>: 3600 seconds / 30 seconds * 24 hours/day * 365 days/year ~= 1 million codes / year

<a name="f8">[8]</a>: Collision to previously used code would still occur, since there are only 1,000,000 codes available for a 6-digit OTP code. However, such a collision would not be based on any tractable pattern.


##### Composable Authentication

In Composable Authentication, we use one or more additional counter-based OTP Seeds to configure the Authenticator and generate associated OTP Merkle Tree accordingly. Different security levels may require different numbers of consecutive OTPs to be provided to confirm a transaction. Thus, the OTPs must be grouped consecutively into n-tuples before being hashed and used as the leaves to generate the Merkle Tree, where n is the number of consecutive OTPs required. 

#### Authenticator

As discussed above, the Authenticator we use is a standard Google Authenticator that can be downloaded from [iOS](https://apps.apple.com/us/app/google-authenticator/id388497605) and [Android](https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2&hl=en_US&gl=US) stores. Because of the compatibility issues<sup>[1](#f1)</sup> described above in the Android version of the Google Authenticator, we limit the configuration parameters<sup>[9](#f9)</sup> to using 6-digit OTP code, SHA1 hash function, and time-based OTP code with a refreshing interval of 30-seconds. 

Despite the shortcomings, both the Android and iOS versions of the Google Authenticator also support counter-based OTP code. Although our design is primarily based on time-based OTP codes, we also use counter-based OTP codes to enhance its security in later parts. When counter-based OTP codes are used, we will need to add additional OTP seeds to the Authenticator by scanning additional QR codes.  

<a name="f9">[9]</a>: See Google Authenticator [URI format](https://github.com/google/google-authenticator/wiki/Key-Uri-Format) for a detailed description of possible parameters. The QR Code simply encodes the URI.

##### OTP Seed

The Authenticator acquires the OTP seed from the Client when a new wallet is created by scanning a QR code that also conveys other Authenticator configurations. The seed is then permanently stored on the Authenticator until the user manually deletes it. 

It should be noted that Google Authenticator allows the user to export the seed at any time. Therefore, we need to consider two kinds of threats in our security analysis: (1) an attacker who gains visibility into one or more OTP codes, and (2) an attacker who temporarily gains physical or remote access to the user's phone, therefore can gain visibility into the OTP seed itself. 

In Composable Authentication, counter-based OTPs are used in addition to time-based OTP. Extra OTP seeds are stored on the Authenticator, and the same analysis applies.

##### OTP

After the Authenticator is provided with OTP seed(s), the standard time-based OTPs are automatically generated by Google Authenticator every 30 seconds (with an initial offset to round off to the nearest 30-second interval based on Unix epoch). 

The counter-based OTPs used in EComposable Authentication are generated only by request from the user (by clicking a refresh button). The OTPs do not expire or refresh themselves, but Google Authenticator automatically masks them after a period of inactivity. Under the hood, each time the user refreshes the counter-based OTP, the counter is increased by one. The counter value is a private state inside the Authenticator. Since the user may refresh for an arbitrary number of times, the counter value may differ from what the Client and the Smart Contract anticipates. Therefore, the Client must look ahead and resynchronize<sup>[10](#f10)</sup> its counter as well as the Smart Contract's, such that all three components would have a consistent view of the counter value while verifying the OTP codes. This synchronization can be achieved easily at the Client since it possesses the hashed values of (groups of) OTPs (as part of the OTP Merkle Tree stored at the Client), and it may simply look ahead the hash values one-by-one and increment its internal counter until it finds a hash value that matches the hash of the OTP(s) provided by the user. Afterward, the Client can submit the new counter value to the Smart Contract to achieve resynchronization at the Smart Contract.

<a name="f10">[10]</a>: See also a brief discussion in [RFC4224 Section 7.4 Resynchronization of the Counter](https://datatracker.ietf.org/doc/html/rfc4226#section-7.4)     

#### Smart Contract

The Smart Contract (written in Solidity) defines the operations of the wallet described in the sections below. After the owner's account deploys the smart contract, a ONE Wallet belonging to the user is created with a zero balance. The wallet can be funded by transferring funds to the deployed smart contract's address. The security parameters are provided as part of the constructor of the smart contract when it is deployed. The security parameters include but are not limited to

1. the expected root hash(es) of the OTP Merkle Tree(s) and lifespan of the OTPs;
2. the daily spending limit(s);
3. the last-resort address which the funds should be drained to, in case of an account recovery;
4. whether Composable Authentication should be activated.

The Smart Contract can be broken down into modules: 

- Basic Wallet
	- Daily Spending Limit
	- Drain to Last Resort Account
- Guardians
- Composable Authentication
	- With Private Key
	- With Counter-Based OTP (HOTP)
- (Coming soon) Social Identities
	- Twitter
	- Telegram

##### Basic Wallet

The Basic Wallet contract aims for simplicity, so new users can onboard quickly. It provides implementations to complete everyday wallet operations with the least amount of friction. As such, operations defined in the Basic Wallet do not require two-factor authentications unless they exceed some limits set by the user, such as daily spending limit and per-transaction transfer limit. In the absence of user-defined limits, a set of default limits are applied. 

The Basic Wallet contract defines:

- Mechanisms for creating a wallet and default parameters
- Functions for validating OTP codes given an OTP Proof
- Process of initiating and completing an operation given a time-based OTP code and its OTP Proof
- Constraints and execution steps for transferring funds
- Fund recovery and wallet destruction processes

The Basic Wallet maintains the states of:

- Daily spending limits
- Activation statuses of Guardian and Composable Authentication modules

Unlike SmartOTP, operations (under limits) on the Basic Wallet do not start with a "pending" state, before they transition into a "confirmed" state by separate routines that validate OTP Proofs (including OTP codes). Transfers are subject to a small daily spending limit until the user has at least one guardian, at which time the daily spending limit would be lifted to a medium-sized value. Larger daily spending limits require the activation of Composable Authentication.

A transfer can be initiated and completed within the same function call by providing only a valid OTP Proof unless the total amount transferred within the last 24 hours exceeds the aforementioned medium-sized value. In the latter case, the transfer would be processed by the Composable Authentication module, where operations would begin with a "pending" state and confirmed only when a required level of authentications is met. 

The user defines the daily spending limits and transfers limits for "small", "medium," and "larger" sizes at the time when the wallet is created. By default, the limits are set to the following. All USD amounts are converted to an equivalent number of ONE computed at the Client by using a 24h average exchange rate of ONE-USDT on Binance.

- Small daily spending limit: \$500
- Medium daily spending limit: \$5000
- Larger daily spending limit: \$25000  (or anything above \$5000)

###### Two-stage transaction

Even though we want to simplify the mechanisms for Basic Wallet as much as possible, it still needs to ensure a basic level of security and protects against common attack patterns (e.g., front-running). For example, in a fund transfer operation, we cannot allow an attacker to copy whatever is sent to the blockchain, modify some parameters (e.g., recipient, amount), then dispatch his transaction at a higher gas cost to get their transaction executed first (displacement attack). Even with Composable Security enabled, we cannot allow the attacker to insert their operation, which may be inadvertently confirmed by an unwary user (insertion attack). We should also provide compelling disincentives to make suppression attacks (or any attack that may delay the user's normal operations) costly and impractical.  

For this reason, we use a commit-reveal mechanism to achieve the security requirement. The Client executes an operation with the Smart Contract in two stages. During the first stage, the Client commits an operation by sending the hash of the operation itself, concatenated with the parameters and the OTP Proof. The smart contract then stores this hash in a dictionary and timestamp of this operation. During the second stage, the Client reveals the operation by sending the details of the operation, the parameters, and the OTP Proof without hashing. The smart contract may concatenate these arguments, hash them, and look up in its state to determine whether a committed operation matches the hash. If there is a match, the smart contract may execute the operation (or put it in a "pending" state if Composable Security is activated), provided that the timestamp is not too old (e.g., more than 120 seconds), and the OTP matches the timestamp, root hash, and the OTP Proof. In practice, the Client should refrain from revealing the details (the second stage) until the OTP expires for its 30-second time window. Otherwise, an attacker could perform an attack by starving the Client's revealing operation (by stuffing the block with garbage operations) and manufacturing its two-stage mechanism. First, the attacker can manufacture its commit operation using the details revealed by the Client. The attacker can pay higher gas and get manufactured operation executed first. After the block confirms the fake operation, the attacker may manufacture its revealing operation and executes it before the Client's legitimate revealing operation.


##### Guardians

Guardians are other wallet accounts and users. They are wallet accounts designated by the user to protect the funds in the wallet. The functionalities include offering one layer of security and authorizing legitimate transactions, alerting the user and defer operations when the Guardian notices suspicious activities, and help forgetful users recover their funds after losing access to their account.

The Guardian contract defines how guardians are added, removed, and validated. The contract also defines how Guardians may:

- initiate a recovery operation and drain funds to the last resort account
- authorize activation of Composable Authentication
- (Composable Authentication) serve as one authentication factor to increase spending limits
- (Composable Authentication) confirm to deactivate Composable Authentication

The only state the contract maintains is the list of addresses for the guardians.

##### Composable Authentication

Composable Authentication provides more authentication factors that can be composed together. This design allows sensitive operations to set different numbers of factors required to confirm the operation, thus achieving different levels of security protection. 

At this time, Composable Authentication contracts provide two additional authentication factors: (1) private key and (2) counter-based OTP (HOTP). In Composable Authentication contracts, operations (such as transfer) remain pending until confirmed by one or two authentication factors or abandoned (expired). The contract maintains the states of pending operations and the activation statuses for each authentication factor. 

Composable Authentication must be activated if the user wants to increase the daily spending limit to a larger amount (above \$5000, by default). Otherwise, Composable Authentication is entirely optional. Composable Authentication can be activated at any time by the user. If the user already has at least one guardian, activating Composable Authentication would require both a guardian's confirmation and the correct OTP Proof. 

Once activated, Composable Authentication can only be deactivated by one of the following methods:
(1) Confirmations from all guardians, plus at least one authentication factor activated by the user in Composable Authentication.
(2) All factors of authorization, activated by the user in Composable Authentication. If the user has a guardian, at least one confirmation from guardians.

The daily spending limit may be further increased using Composable Authentication to "Large" or "No Limit" (for 24 hours).

- Large daily spending limit \$25000: requires confirmation from at least one factor using Composable Authentication. 
- No limit for 24 hours: requires confirmation from either:
	- Two factors using Composable Authentication, or
	- One factor using Composable Authentication, and one confirmation using Guardian

The daily spending limit can also be decreased down to "Large" (\$25000), "Medium" (\$5000), "Small" (\$500), or "Zero" (\$0), using confirmation from at least one factor using Composable Authentication, or confirmation from a Guardian.

Standard time-based OTP Proof from Basic Wallet is still required to initiate the operations in all the above operations. The confirmation required by Composable Authentication may only confirm operations already initiated but not to initiate new operations. 


###### Authentication with Private Key

Authentication with Private Key behaves similarly to private keys in SmartOTP, but with a few differences. 

In SmartOTP, an operation must be initiated by providing a signature for the transaction, signed using the owner account's private key. The operation is held on the smart contract as pending until it is confirmed by the client using OTP Proof. In SmartOTP's design, the signature is produced by a hardware wallet (which possesses the private key). The hardware wallet is assumed to secure.
 
Here, we do not use the signature to initiate an operation. The signature is used to confirm an already pending operation (and initiated using an OTP Proof). SmartOTP enforces a rule that all operations must be initiated using the correct signature. Here, we do not enforce the rule. Any address on the network can initiate an operation on the wallet using the correct OTP Proof. 

There are several reasons for this change: 

1. We aim for high usability. Only a subset of operations require higher security protection, thus two-factor (or more) authentication. The majority of operations are initiated by the Client using only OTP Proof. It would confuse the user to require a small subset of operations initiated by private-key signatures.
2. This change does not make the wallet less secure as long as the private key device is different from the device running the Client. The transaction is still protected by at least two factors. If the Client is compromised, the attacker may initiate transactions but not confirm them. If the private key is compromised, the attacker cannot do anything because no operation can be initiated using the private key.

To elaborate, in our use case, the device holding the private key does not need to be a hardware wallet, and the signature does not need to be transmitted by the client. Any program may transmit the signature and confirm the pending operation, as long as (a) it can store the private key securely; (b) it can sign a transaction given the transaction's parameters; (c) it can send a message to the smart contract wallet on Harmony network via RPC calls. As discussed above in (2), it would be best for the program to be on a separate device from the client, so they would not be compromised at the same time. For example, if the client is running as a browser extension on a desktop computer, the device holding the private key can be a simple mobile private-key-based wallet or a browser/desktop wallet on a different laptop computer.

Authentication with Private Key can be activated in Composable Authentication contract, using a function that takes parameters of (1) the public key of the signer, and (2) the usual OTP Proof to initiate operations, and (3) The OTP Proof for Authentication with HOTP, if it is already activated. 

In practice, the public key can be transmitted between devices using a QR code or simply copying and pasting. After obtaining the public key, the client can call the function in the Composable Authentication contract with the required parameters. 

###### Authentication with HOTP 

Authentication with HOTP (i.e., counter-based OTP) allows operations to be confirmed by providing extra OTP Proof. It behaves similarly to standard time-based OTP as described in preceding sections and the SmartOTP paper. The difference here is the OTP Proof and OTP Merkle Trees are computed using a tuple of 3 counter-based OTP codes<sup>[11](#f11)</sup> concatenated together. 

During activation, a new OTP Seed is generated. The user is provided with a configuration QR-code for counter-based OTP, which the user must scan to add to Google Authenticator as a separate entry to the time-based OTP. The construction of the OTP Merkle Tree is the same as the process in time-based OTP, except the OTP hashes are computed using tuples of 3 consecutive OTPs concatenated together. 

In counter-based OTP mode, Google Authenticator allows users to refresh and skip an arbitrary number of OTPs. Therefore, when the user provides a tuple of 3 consecutive OTPs, there may be an offset of 0, 1, or 2, depending on how many they skipped. Since the number of skips is unknown to us and not tracked by Google Authenticator, we must account for all possible offsets. To do this, we must compute 3 OTP Merkle Trees, skipping the first 0, 1, 2 OTPs generated, respectively, before grouping the OTPs into tuples of three, and hash the tuples and use them as leaves. This design allows us to search in the list of leaves from each tree to find which one aligns with the tuple provided by the user. To achieve this, we construct the OTP Proof in a manner identical to computing OTP Proof with time-based OTP, except 3 consecutive OTPs are taken and concatenated before it is hashed and used to construct the proof. We may use the hash to find which OTP Merkle Tree the tuple corresponds to and resynchronize the counter by simply looking ahead (for large but finite window size) using the list of the leaves for each OTP Merkle Tree and stop at the first match. 

Authentication with HOTP can be activated in Composable Authentication contract using a function that requires parameters of (1) the root hashes for all 3 OTP Merkle Trees (computed by the client<sup>[12](#f12)</sup>), and (2) the usual time-based OTP Proof to initiate operations. 

Operations can be confirmed using Authentication with HOTP by providing the OTP Proof computed by the client (based on 3-OTP tuple provided by the user), an updated counter-value to resynchronize the counters (to account for the number of OTPs skipped by the user), and an integer value indicating which of the 3 OTP Merkle Trees are used. 

<a name="f11">[11]</a>: This represents 60-bit security, since each OTP 6-digit code provides 20-bit of security. On Stackoverflow, an answer to the question ["How reassuring is 64-bit (in)security?"](https://crypto.stackexchange.com/questions/63536/how-reassuring-is-64-bit-insecurity) provides an analysis for the cost to brute-force the pre-image of the hash using generic hardware. An attack is possible by first compromising the client to obtain the OTP Merkle Trees, then finding a hashed value in the leaves sufficiently ahead of the current counter, then computing the 3-OTP tuple brute-force. However, such an attack is unlikely to be worth the effort and the cost. We may also adjust the number of consecutive OTPs from 3 to 4 or 5 for users who require extra security protection. We may also provide 5-OTP as a separate factor of authorization.

<a name="f12">[12]</a>: If we use the same client which computes the time-based OTP Proof and the client is compromised, technically, the attacker may intercept the OTP codes and front-run any operation. For extra security, we may advise the user to use a client on another device to complete Authentication with HOTP. In practice, it may be cumbersome, and it might be the case that only a small portion of users may elect to do that.

### Operations

See [Smart Contract References](https://github.com/stream-protocol/stream-web-wallet/wiki/Smart-Contract-Refnereces)

## Security Analysis

TODO

## Open Problems

1. Can we create a commit-reveal mechanism such that the Client does not have to wait for OTP expiration (15 seconds on average, ~30 seconds in the worst case) before revealing the details of the operation and OTP Proof?
2. Can we create a better mechanism than the proposed commit-reveal mechanism to satisfy the basic security requirement?
3. Since OTP Proof includes the hash of the sibling of the leaf corresponding to the current OTP, as soon as the OTP Proof is revealed, it would not be secure in committing another operation based on the OTP corresponding to the sibling leaf. Otherwise, the attacker may brute-force the corresponding OTP and manufacture its operation. This issue means that the commit-reveal mechanism may require up to 60 seconds of delay until revealing the details of a committed operation to ensure absolute safety. Can we improve?