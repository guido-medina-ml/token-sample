
// File: contracts/BytesLib.sol

// SPDX-License-Identifier: MIT
/*
 * @title Solidity Bytes Arrays Utils
 * @author Gonçalo Sá <goncalo.sa@consensys.net>
 *
 * @dev Bytes tightly packed arrays utility library for ethereum contracts written in Solidity.
 *      The library lets you concatenate, slice and type cast bytes arrays both in memory and storage.
 */
pragma solidity >=0.5.0 <0.7.0;

library BytesLib {
    function toUint8(bytes memory _bytes, uint256 _start) internal pure returns (uint8) {
        require(_bytes.length >= (_start + 1), "Read out of bounds");
        uint8 tempUint;

        assembly {
            tempUint := mload(add(add(_bytes, 0x1), _start))
        }

        return tempUint;
    }

    function toUint256(bytes memory _bytes, uint256 _start) internal pure returns (uint256) {
        require(_bytes.length >= (_start + 32), "Read out of bounds");
        uint256 tempUint;

        assembly {
            tempUint := mload(add(add(_bytes, 0x20), _start))
        }

        return tempUint;
    }
}

// File: contracts/GrantsProgram.sol
pragma solidity ^0.6.0;
pragma experimental ABIEncoderV2;


contract GrantsProgram {
    event MemberEnabled(address indexed memberAddress);
    event MemberDisabled(address indexed memberAddress);
    event FundsReceived(uint256 amount);
    event FederatorPaid(address indexed fedAddress, uint256 amount);
    event LogWithdrawal(address sender);

    mapping(address => bool) public bannedAddressesMap;
    uint256 public lastPaid;
    address public authorized;
    uint256 public periodLength;
    uint256 public amountToPay;
    mapping(address => uint256) public federatorLastPaid;
    bytes[] public fedsPubKeys;

    constructor(address _authorized, uint256 _periodLength, uint256 _amountToPay, bytes[] memory _fedsPubKeys) public {
        require(_authorized != address(0), "GrantsProgram: Authorized address can't be null");
        require(_periodLength != 0, "GrantsProgram: Period lenght must be greater than 0");
        require(_amountToPay > 0, "GrantsProgram: Amount to pay must be greater than 0");

        authorized = _authorized;
        periodLength = _periodLength;
        amountToPay = _amountToPay;
        fedsPubKeys = _fedsPubKeys;
    }

    modifier onlyAuthorized() {
        require(msg.sender == authorized, "GrantsProgram: Not authorized");
        _;
    }

    receive() external payable {
        emit FundsReceived(msg.value);
    }

    function updatePeriodLength(uint256 newPeriodLength) external onlyAuthorized {
        periodLength = newPeriodLength;
    }

    function updateAmountToPay(uint256 newAmountToPay) external onlyAuthorized {
        amountToPay = newAmountToPay;
    }

    function updateFedsPubKeys(bytes[] memory newFedsPubKeys) external onlyAuthorized {
        fedsPubKeys = newFedsPubKeys;
    }

    function disableMember(address member) external onlyAuthorized {
        if (bannedAddressesMap[member] == false) {
            bannedAddressesMap[member] = true;
            emit MemberDisabled(member);
        }
    }

    function enableMember(address member) external onlyAuthorized {
        if (bannedAddressesMap[member] == true) {
            delete bannedAddressesMap[member];
            emit MemberEnabled(member);
        }
    }

    function getRequiredFunds() external view returns (uint256) {
        return fedsPubKeys.length * amountToPay;
    }

    function payToFederation() external {
        require(address(this).balance >= this.getRequiredFunds(), "GrantsProgram: Not enough funds for paying to all federators");

        uint256 federationSize = fedsPubKeys.length;

        for (uint256 i = 0; i < federationSize; i++) {
            address payable fedAddress = getAddressFromPublicKey(fedsPubKeys[i]);

            if (!bannedAddressesMap[fedAddress] && block.timestamp >= federatorLastPaid[fedAddress] + periodLength) {
                fedAddress.transfer(amountToPay);
                federatorLastPaid[fedAddress] = block.timestamp;
                emit FederatorPaid(fedAddress, amountToPay);
            }
        }
    }

    function getAddressFromPublicKey(bytes memory fedPubKey) public view returns (address payable) {
        bytes memory decompressedPublicKey = this.decompressPublicKey(fedPubKey);
        return payable(address(uint160(uint256(keccak256(abi.encodePacked(decompressedPublicKey))))));
    }

    function withdrawFunds(address payable recoverAddress) external onlyAuthorized {
        recoverAddress.transfer(address(this).balance);
        emit LogWithdrawal(msg.sender);
    }

    function decompressPublicKey(bytes memory fedPubKey) public pure returns (bytes memory) {
        uint8 firstByte = BytesLib.toUint8(fedPubKey, 0);
        require(firstByte == 2 || firstByte == 3, "GrantsProgram: Provided public key is not compressed");
        
        uint8 compressedPrefix = firstByte == 2 ? 0 : 1;
        uint256 x = BytesLib.toUint256(fedPubKey, 1);
        uint256 p = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2F;
        uint256 y2 = addmod(mulmod(x, mulmod(x, x, p), p), 7, p);
        uint256 y_ = expmod(y2, (p + 1) / 4, p);
        uint256 cmp = compressedPrefix ^ (y_ & 1);
        return abi.encodePacked(x, (cmp == 0) ? y_ : p - y_);
    }

    function expmod(uint256 b, uint256 e, uint256 m) internal pure returns (uint256 r) {
        if (b == 0) return 0;
        if (e == 0) return 1;
        if (m == 0) revert();
        r = 1;
        uint256 bit = 2**255;
        assembly {
            for {} gt(bit, 0) {} {
                r := mulmod(mulmod(r, r, m),exp(b, iszero(iszero(and(e, bit)))),m)
                r := mulmod(mulmod(r, r, m), exp(b, iszero(iszero(and(e, div(bit, 2))))), m)
                r := mulmod(mulmod(r, r, m), exp(b, iszero(iszero(and(e, div(bit, 4))))), m)
                r := mulmod(mulmod(r, r, m), exp(b, iszero(iszero(and(e, div(bit, 8))))),m)
                bit := div(bit, 16)
            }
        }
    }
}
