const GrantsProgram = artifacts.require("GrantsProgram");
const config = require('../config.json');
const contractData = getContractData();

function getContractData() {
    if (validateContractData) {
        return config.contractData;
    }
}

function getFedsPubKeysByNetwork(network) {
    let pubKeys = config.publicKeysByNetwork[network];

    if (validatePubKeys(pubKeys)) {
        return pubKeys;
    };
}

function validatePubKeys(pubKeys) {
    for (pubKey of pubKeys) {
        // Add 0x if needed
        if (!(pubKey.substr(0,2) === '0x')) {
            pubKey = "0x" + pubKey;
        }

        // Validate first byte is 02 or 03
        if (!(pubKey.substr(2,2) === '02') && !(pubKey.substr(2,2) === '03')) {
            throw new Error(`Public key ${pubKey} is invalid. Must begin with 02 or 03`);
        }

        // Validate length. 0x + 33 bytes
        if (pubKey.length != 68) {
            throw new Error(`Invalid length for public key ${pubKey}. Must be 33 bytes long`);
        }
    }

    return true;
}

function validateContractData() {
    let contractData = config.ownerAddress;
    let ownerAddress = contractData.ownerAddress;
    let periodLength = contractData.periodLength;
    let amountToPay = contractData.amountToPay;

    // Add 0x to address if needed
    if (!(ownerAddress.substr(0,2) === '0x')) {
        ownerAddress = "0x" + ownerAddress;
    }

    if (!web3.utils.isAddress(ownerAddress)) {
        throw new Error("Address must be 20 bytes long");
    }

    if (periodLength <= 0) {
        throw new Error("Period length must be greather than 0");
    }

    if (amountToPay <= 0) {
        throw new Error("Amount to pay must be greater than 0");
    }

    return true;
}

function deploy(deployer, ownerAddress, network) {
    return deployer.deploy(GrantsProgram, ownerAddress, contractData.periodLength, contractData.amountToPay, getFedsPubKeysByNetwork(network));
}

module.exports = function(deployer, network, accounts) {
    switch (network) {
        case 'development':
            return deploy(deployer, contractData.ownerAddress, network);
        case 'regtest':
            return deploy(deployer, contractData.ownerAddress, network);
        case 'testnet':
            return deploy(deployer, contractData.ownerAddress, network);
        case 'mainnet':
            return deploy(deployer, contractData.ownerAddress, network);
        default:
            console.error('No migrations.');
            return deployer;
    }
};
