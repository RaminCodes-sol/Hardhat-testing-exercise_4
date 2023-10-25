// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;



contract Lock {
    address payable public owner;
    uint256 public unlockTime;

    event Withdrawal(uint256 _amount, uint256 _when);
    event UnlockTimeChanged(uint256 _when, uint256 _newUnlockTime);


    constructor(uint256 _unlockTime) payable {
        require(_unlockTime > block.timestamp, "unlock time should be in the future");
        
        owner = payable(msg.sender);
        unlockTime = _unlockTime;
    }


    // Change UnlockTime
    function changeUnlockTime (uint256 _newUnlockTime) public {
        require(msg.sender == owner, "Only the owner can call this function");
        require(_newUnlockTime > block.timestamp, "unlock time should be in the future");

        unlockTime = _newUnlockTime;
        
        emit UnlockTimeChanged(block.timestamp, _newUnlockTime);
    }

    // Withdraw
    function withdraw() public {
        require(msg.sender == owner, "Only the owner can call this function");
        require(block.timestamp >= unlockTime, "You can't withdraw yet");
        
        emit Withdrawal(address(this).balance, block.timestamp);
        
        (bool success, ) = owner.call{value: address(this).balance}("");
        require(success, "Transfering Failed");
        
    }
}