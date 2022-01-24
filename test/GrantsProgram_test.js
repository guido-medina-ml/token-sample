const GrantsProgram = artifacts.require("GrantsProgram");
const randomHex = web3.utils.randomHex;
const toWei = web3.utils.toWei;
const BN = require("bn.js");
const { promisify } = require('util');
const truffleAssert = require('truffle-assertions');

contract("GrantsProgram", async accounts => {
    const fedsPubKeys = ["0x0368fd0a659e0e1e56752b093f9ef2bf529f0ba0c336b05660d1739c5803c48d74", 
                         "0x0385f60a249ebad9b736499f72114c32a40aa4fc213dd71a3051a0b72d73812647", 
                         "0x03115116d980d5f02c0ae98a2374598df0969c96f5f7cad6ac559020ef57eac249"];
    const periodLength = 2628000;
    const amountToPay = 1;

    describe("after deploy the contact", async () => {
        let grantsProgram;
        let fed1Address;
        let fed2Address;
        let fed3Address;
        let initialBalanceFed1;
        let initialBalanceFed2;
        let initialBalanceFed3;

        beforeEach(async function () {
            grantsProgram = await GrantsProgram.new(accounts[0], periodLength, amountToPay, fedsPubKeys);
            fed1Address = await grantsProgram.getAddressFromPublicKey(fedsPubKeys[0]);
            fed2Address = await grantsProgram.getAddressFromPublicKey(fedsPubKeys[1]);
            fed3Address = await grantsProgram.getAddressFromPublicKey(fedsPubKeys[2]);
            initialBalanceFed1 = await web3.eth.getBalance(fed1Address);
            initialBalanceFed2 = await web3.eth.getBalance(fed2Address);
            initialBalanceFed3 = await web3.eth.getBalance(fed3Address);
        });

        it("updatePeriodLength", async () => {
            assert.equal(Number(await grantsProgram.periodLength()), periodLength);

            let newPeriodLength = 3600;
            await grantsProgram.updatePeriodLength.sendTransaction(newPeriodLength, { from: accounts[0] })

            assert.equal(Number(await grantsProgram.periodLength()), newPeriodLength);
        });

        it("call updatePeriodLength using not authorized address", async () => {
            await truffleAssert.reverts(grantsProgram.updatePeriodLength.sendTransaction(3800, { from: accounts[1] }));
        });

        it("updateAmountToPay", async() => {
            assert.equal(Number(await grantsProgram.amountToPay()), amountToPay);

            let newAmountToPay = 2;
            await grantsProgram.updateAmountToPay.sendTransaction(newAmountToPay, { from: accounts[0] });

            assert.equal(Number(await grantsProgram.amountToPay()), newAmountToPay)
        });

        it("call updateAmountToPay using not authorized address", async () => {
            await truffleAssert.reverts(grantsProgram.updateAmountToPay.sendTransaction(3800, { from: accounts[1] }));
        });

        it("updateFedPubKeys", async() => {
            let areEqual = true;

            for (let i = 0; i < 3; i ++) {
                if (!(fedsPubKeys).includes(await grantsProgram.fedsPubKeys(i))) {
                    areEqual = false;
                }
            }
            assert.equal(areEqual, true);

            let newFedPubKeys = ["0x02afc230c2d355b1a577682b07bc2646041b5d0177af0f98395a46018da699b6da",
                                 "0x0344a3c38cd59afcba3edcebe143e025574594b001700dec41e59409bdbd0f2a09"];

            await grantsProgram.updateFedsPubKeys.sendTransaction(newFedPubKeys, { from: accounts[0] });

            for (let i = 0; i < 2; i ++) {
                if (!(newFedPubKeys).includes(await grantsProgram.fedsPubKeys(i))) {
                    areEqual = false;
                }
            }

            assert.equal(areEqual, true);
        });

        it("call updateFedsPubKeys using not authorized address", async () => {
            let newFedPubKeys = ["0x02afc230c2d355b1a577682b07bc2646041b5d0177af0f98395a46018da699b6da"];
            await truffleAssert.reverts(grantsProgram.updateFedsPubKeys.sendTransaction(newFedPubKeys, { from: accounts[1] }));
        });

        it("decompress public key", async () => {
            let expectedPubKey = "0x68fd0a659e0e1e56752b093f9ef2bf529f0ba0c336b05660d1739c5803c48d7403c13b0994b327bf42a8bb498ca771afab4097b3629ec22ee53bf9cd8e02165f";
            let compressedPubKey = "0x0368fd0a659e0e1e56752b093f9ef2bf529f0ba0c336b05660d1739c5803c48d74"
            let result = await grantsProgram.decompressPublicKey(compressedPubKey);
            assert.equal(result, expectedPubKey);
        });

        it("decompress decompressed public key", async () => {
            let expectedPubKey = "0x68fd0a659e0e1e56752b093f9ef2bf529f0ba0c336b05660d1739c5803c48d7403c13b0994b327bf42a8bb498ca771afab4097b3629ec22ee53bf9cd8e02165f";
            await truffleAssert.reverts(grantsProgram.decompressPublicKey(expectedPubKey));
        });

        it("get address from public key", async () => {
            let pubKey = "0x0368fd0a659e0e1e56752b093f9ef2bf529f0ba0c336b05660d1739c5803c48d74";
            let expectedAddress = "0xb50557e825cc29d1448459797568480c0a5e1df5";
            let actualAddress = await grantsProgram.getAddressFromPublicKey(pubKey);
            assert.equal(expectedAddress, actualAddress.toLowerCase());
        });

        it("disable member", async () => {
            let bannedMember = randomHex(20);
            await disableMember(grantsProgram, bannedMember, accounts[0]);
        });

        it("disable member already disabled", async () => {
            let bannedMember = randomHex(20);
            await disableMember(grantsProgram, bannedMember, accounts[0]);

            let callResult = await grantsProgram.disableMember.sendTransaction(bannedMember, { from: accounts[0] });
            truffleAssert.eventNotEmitted(callResult, "MemberDisabled");
        });

        it("call disableMember using not authorized address", async () => {
            let bannedMember = randomHex(20);
            await truffleAssert.reverts(grantsProgram.disableMember.sendTransaction(bannedMember, { from: accounts[1] }));
        });

        it("enable a disabled member", async () => {
            let bannedMember = randomHex(20);
            await disableMember(grantsProgram, bannedMember, accounts[0]);
            await enableMember(grantsProgram, bannedMember, accounts[0]);
        });

        it("enable an already enabled member", async () => {
            let bannedMember = randomHex(20);
            assert.equal(await grantsProgram.bannedAddressesMap(bannedMember), false);

            let result = await grantsProgram.enableMember.sendTransaction(bannedMember, { from: accounts[0] });
            truffleAssert.eventNotEmitted(result, "MemberEnabled");
        });

        it("call enableMember using not authorized address", async () => {
            let bannedMember = randomHex(20);
            await truffleAssert.reverts(grantsProgram.enableMember.sendTransaction(bannedMember, { from: accounts[1] }));
        });

        it("get required funds", async() => {
            let result = await grantsProgram.getRequiredFunds();
            let requiredFunds = fedsPubKeys.length * amountToPay;
            assert.equal(result.toNumber(), requiredFunds);
        });

        it("pay to federation - contract without funds", async() => {
            await truffleAssert.reverts(grantsProgram.payToFederation());
        });

        it("pay to federation", async() => {
            // Fund contract
            await web3.eth.sendTransaction({to: grantsProgram.address, from: accounts[0], value: toWei("1.0", "ether")});
            
            // Check FederatorPaid events
            let checkEmittedByFed = [{fedAddress: fed1Address}, {fedAddress: fed2Address}, {fedAddress: fed3Address}];
            let result = await grantsProgram.payToFederation();
            
            await checkEvent(result, "FederatorPaid", checkEmittedByFed);

            // Check balances after paying
            assert.equal(Number(await web3.eth.getBalance(fed1Address)), Number(initialBalanceFed1) + Number(amountToPay));
            assert.equal(Number(await web3.eth.getBalance(fed2Address)), Number(initialBalanceFed2) + Number(amountToPay));
            assert.equal(Number(await web3.eth.getBalance(fed3Address)), Number(initialBalanceFed3) + Number(amountToPay));
        });

        it("pay to federation twice before periodLength is reached", async() => {
            // Fund contract
            await web3.eth.sendTransaction({to: grantsProgram.address, from: accounts[0], value: toWei("1.0", "ether")});
            
            // Check FederatorPaid events
            let checkEmittedByFed = [{fedAddress: fed1Address}, {fedAddress: fed2Address}, {fedAddress: fed3Address}];
            let result = await grantsProgram.payToFederation();
            
            await checkEvent(result, "FederatorPaid", checkEmittedByFed);

            // Check balances after paying
            let balanceAfterPayFed1 = Number(await web3.eth.getBalance(fed1Address));
            let balanceAfterPayFed2 = Number(await web3.eth.getBalance(fed2Address));
            let balanceAfterPayFed3 = Number(await web3.eth.getBalance(fed3Address));

            assert.equal(balanceAfterPayFed1, Number(initialBalanceFed1) + Number(amountToPay));
            assert.equal(balanceAfterPayFed2, Number(initialBalanceFed2) + Number(amountToPay));
            assert.equal(balanceAfterPayFed3, Number(initialBalanceFed3) + Number(amountToPay));

            // Try to pay to federation again
            result = await grantsProgram.payToFederation();
            truffleAssert.eventNotEmitted(result, "FederatorPaid");

            // Check balances remain the same
            assert.equal(Number(await web3.eth.getBalance(fed1Address)), Number(balanceAfterPayFed1));
            assert.equal(Number(await web3.eth.getBalance(fed2Address)), Number(balanceAfterPayFed2));
            assert.equal(Number(await web3.eth.getBalance(fed3Address)), Number(balanceAfterPayFed3));
        });

        it("pay to federation with 1 address banned", async() => {
            // Fund contract
            await web3.eth.sendTransaction({to: grantsProgram.address, from: accounts[0], value: toWei("1.0", "ether")});

            // Disable fed2Address
            await disableMember(grantsProgram, fed2Address, accounts[0]);

            // Check FederatorPaid events
            let checkEmittedByFed = [{fedAddress: fed1Address}, {fedAddress: fed3Address}];
            let checkNotEmittedByFed = [{fedAddress: fed2Address}];
            
            let result = await grantsProgram.payToFederation();
            
            await checkEvent(result, "FederatorPaid", checkEmittedByFed, checkNotEmittedByFed);

            // Check balances after paying
            assert.equal(Number(await web3.eth.getBalance(fed1Address)), Number(initialBalanceFed1) + Number(amountToPay));
            assert.equal(Number(await web3.eth.getBalance(fed2Address)), Number(initialBalanceFed2));
            assert.equal(Number(await web3.eth.getBalance(fed3Address)), Number(initialBalanceFed3) + Number(amountToPay));
        });

        it("pay to federation with 1 address banned, unban address and pay only to unbanned", async() => {
            // Fund contract
            await web3.eth.sendTransaction({to: grantsProgram.address, from: accounts[0], value: toWei("1.0", "ether")});

            // Disable fed2Address
            await disableMember(grantsProgram, fed2Address, accounts[0]);

            // Check FederatorPaid events
            let checkEmittedByFed = [{fedAddress: fed1Address}, {fedAddress: fed3Address}];
            let checkNotEmittedByFed = [{fedAddress: fed2Address}];
            
            let result = await grantsProgram.payToFederation();

            await checkEvent(result, "FederatorPaid", checkEmittedByFed, checkNotEmittedByFed);

            // Check balances after paying
            let balanceAfterPayFed1 = Number(await web3.eth.getBalance(fed1Address));
            let balanceAfterPayFed2 = Number(await web3.eth.getBalance(fed2Address));
            let balanceAfterPayFed3 = Number(await web3.eth.getBalance(fed3Address));

            assert.equal(balanceAfterPayFed1, Number(initialBalanceFed1) + Number(amountToPay));
            assert.equal(balanceAfterPayFed2, Number(initialBalanceFed2));
            assert.equal(balanceAfterPayFed3, Number(initialBalanceFed3) + Number(amountToPay));

            // Enable fed2Address
            await enableMember(grantsProgram, fed2Address, accounts[0]);

            // Check FederatorPaid events
            checkEmittedByFed = [{fedAddress: fed2Address}];
            checkNotEmittedByFed = [{fedAddress: fed1Address}, {fedAddress: fed3Address}];
            
            result = await grantsProgram.payToFederation();

            await checkEvent(result, "FederatorPaid", checkEmittedByFed, checkNotEmittedByFed);

            // Check balances after paying again
            assert.equal(Number(await web3.eth.getBalance(fed1Address)), balanceAfterPayFed1);
            assert.equal(Number(await web3.eth.getBalance(fed2Address)), Number(initialBalanceFed2) + Number(amountToPay));
            assert.equal(Number(await web3.eth.getBalance(fed3Address)), balanceAfterPayFed3);
        });

        it("pay to federation twice after periodLength is reached", async() => {
            // Deploy new instance of contract
            let deployedGrantsProgram = await GrantsProgram.new(accounts[0], 1, amountToPay, fedsPubKeys);

            // Fund contract
            await web3.eth.sendTransaction({ to: deployedGrantsProgram.address, from: accounts[1], value: toWei("3.5", "ether") });
            
            // Check FederatorPaid events
            let checkEmittedByFed = [{fedAddress: fed1Address}, {fedAddress: fed2Address}, {fedAddress: fed3Address}];
            let result = await deployedGrantsProgram.payToFederation();
            
            await checkEvent(result, "FederatorPaid", checkEmittedByFed);

            // Check balances after paying
            let balanceAfterPayFed1 = Number(await web3.eth.getBalance(fed1Address));
            let balanceAfterPayFed2 = Number(await web3.eth.getBalance(fed2Address));
            let balanceAfterPayFed3 = Number(await web3.eth.getBalance(fed3Address));

            assert.equal(balanceAfterPayFed1, Number(initialBalanceFed1) + Number(amountToPay));
            assert.equal(balanceAfterPayFed2, Number(initialBalanceFed2) + Number(amountToPay));
            assert.equal(balanceAfterPayFed3, Number(initialBalanceFed3) + Number(amountToPay));
            
            // Advance block timestamp
            await increase(2000);

            // Try to pay to federation again and check FederatorPaid events
            checkEmittedByFed = [{fedAddress: fed1Address}, {fedAddress: fed2Address}, {fedAddress: fed3Address}];
            result = await deployedGrantsProgram.payToFederation();
            
            await checkEvent(result, "FederatorPaid", checkEmittedByFed);

            // Check balances after paying again
            assert.equal(Number(await web3.eth.getBalance(fed1Address)), Number(balanceAfterPayFed1) + Number(amountToPay));
            assert.equal(Number(await web3.eth.getBalance(fed2Address)), Number(balanceAfterPayFed2) + Number(amountToPay));
            assert.equal(Number(await web3.eth.getBalance(fed3Address)), Number(balanceAfterPayFed3) + Number(amountToPay));
        });

        it("withdraw all funds", async() => {
            // Fund contract
            await web3.eth.sendTransaction({to: grantsProgram.address, from: accounts[0], value: toWei("1.0", "ether")});
            let initialContractBalance = await web3.eth.getBalance(grantsProgram.address);
            
            // Check balance for recover address
            let recoverAddress = accounts[1];
            let initialRecoverAddressBalance = await web3.eth.getBalance(recoverAddress);

            // Call recover funds method
            let result = await grantsProgram.withdrawFunds.sendTransaction(recoverAddress, { from: accounts[0] });
            truffleAssert.eventEmitted(result, "LogWithdrawal");

            // Get balances
            let finalContractBalance = await web3.eth.getBalance(grantsProgram.address);
            let finalRecoverAddressBalance = await web3.eth.getBalance(recoverAddress);

            // Check balances
            assert.equal(finalContractBalance, 0);
            assert.equal(finalRecoverAddressBalance, Number(initialContractBalance) + Number(initialRecoverAddressBalance));
        });
    });
});

async function disableMember(grantsProgram, address, fromAccount) {
    // Check address is not banned
    assert.equal(await grantsProgram.bannedAddressesMap(address), false);
    
    // Disable member
    let callResult = await grantsProgram.disableMember.sendTransaction(address, { from: fromAccount });
    assert.equal(await grantsProgram.bannedAddressesMap(address), true);

    // Check event was emitted
    truffleAssert.eventEmitted(callResult, "MemberDisabled");
}

async function enableMember(grantsProgram, address, fromAccount) {
    // Check address is banned
    assert.equal(await grantsProgram.bannedAddressesMap(address), true);

    // Enable member
    let result = await grantsProgram.enableMember.sendTransaction(address, { from: fromAccount });
    assert.equal(await grantsProgram.bannedAddressesMap(address), false);

    // Check event was emitted
    truffleAssert.eventEmitted(result, "MemberEnabled");
}

async function checkEvent(result, eventName, checkEmittedByFed, checkNotEmittedByFed) {
    checkNotEmittedByFed = checkNotEmittedByFed || null;

    if (checkNotEmittedByFed) {
        for (let map of checkNotEmittedByFed) {
            truffleAssert.eventNotEmitted(result, eventName, map);
        }
    }

    for (let map of checkEmittedByFed) {
        truffleAssert.eventEmitted(result, eventName, map);
    }
}

function advanceBlock () {
    return promisify(web3.currentProvider.send.bind(web3.currentProvider))({
      jsonrpc: '2.0',
      method: 'evm_mine',
      id: new Date().getTime(),
    });
}

async function increase (duration) {
    if (!BN.isBN(duration)) {
      duration = new BN(duration);
    }
  
    if (duration.isNeg()) throw Error(`Cannot increase time by a negative amount (${duration})`);
  
    await promisify(web3.currentProvider.send.bind(web3.currentProvider))({
      jsonrpc: '2.0',
      method: 'evm_increaseTime',
      params: [duration.toNumber()],
      id: new Date().getTime(),
    });
  
    await advanceBlock();
}
