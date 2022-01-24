const HDWalletProvider = require("@truffle/hdwallet-provider");
const fs = require('fs');

let MNEMONIC = fs.existsSync('./mnemonic.key') ? fs.readFileSync('./mnemonic.key', { encoding: 'utf8' }) : "";// Your metamask's recovery words

module.exports = {
    networks: {
        // Useful for testing. The `development` name is special - truffle uses it by default
        // if it's defined here and no other network is specified at the command line.
        // You should run a client (like ganache-cli, geth or parity) in a separate terminal
        // tab if you use this network and you must also set the `host`, `port` and `network_id`
        // options below to some value.
        //
        development: {
        // Ganache
            host: "127.0.0.1",
            port: 8545,
            network_id: "*",
        },
        // RSK
        regtest: {
            host: "127.0.0.1",
            port: 4444,
            network_id: "33",
            gas: 6300000,
            gasPrice: 60000000 // 0.06 gwei
        },
        testnet: {
            provider: () =>
                new HDWalletProvider(MNEMONIC, "https://public-node.testnet.rsk.co"),
            network_id: 31,
            gas: 6300000,
            gasPrice: 60000000, // 0.06 gwei
            skipDryRun: true
        },
        mainnet: {
            provider: () =>
                new HDWalletProvider(MNEMONIC, "https://public-node.rsk.co"),
            network_id: 30,
            gas: 6300000,
            gasPrice: 60000000, // 0.06 gwei
            skipDryRun: true
        }
    },

    plugins: ["solidity-coverage"],

    // Set default mocha options here, use special reporters etc.
    mocha: {
        reporter: 'eth-gas-reporter'
        // timeout: 100000
    },

    // Configure your compilers
    compilers: {
        solc: {
            version: "0.6.10",
            settings: {
                optimizer: {
                    enabled: false,
                    runs: 200
                },
                evmVersion: "byzantium"
            }
        }
    }
}
