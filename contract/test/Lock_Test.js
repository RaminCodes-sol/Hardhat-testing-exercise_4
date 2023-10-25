const { time, loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");




describe("Lock", () => {
    
    // deployLockFixture function
    const deployLockFixture = async () => {
        const One_Year_In_Seconds = 365 * 24 * 60 * 60
        const One_Gwei = 1_000_000_000
        
        const unlockTime = (await time.latest()) + One_Year_In_Seconds
        const lockedAmount = One_Gwei

        const lock = await hre.ethers.deployContract("Lock", [unlockTime], { value: lockedAmount })
        await lock.waitForDeployment()
        
        const [deployer, otherAccount] = await hre.ethers.getSigners()

        const deployerBalanceBefore = await hre.ethers.provider.getBalance(deployer.address)

        return { lock, deployer, otherAccount, unlockTime, lockedAmount, deployerBalanceBefore }
    }


    /*---------- Development ----------*/
    describe("Development", () => {
        
        it("Should fail if unlock time is not in the future", async () => {
            await expect(hre.ethers.deployContract("Lock", [await time.latest()], {value: 1})).to.be.revertedWith("unlock time should be in the future")
        })

        it("Should receive and store the funds to lock", async () => {
            const { lock, lockedAmount } = await loadFixture(deployLockFixture)
            expect(await hre.ethers.provider.getBalance(lock.target)).to.equal(lockedAmount)
        })

        it("Should set the right owner", async () => {
            const { lock, deployer } = await loadFixture(deployLockFixture)
            expect(await lock.owner()).to.equal(deployer.address)
        })

        it("should set the right unlock time", async () => {
            const { lock, unlockTime } = await loadFixture(deployLockFixture)
            expect(await lock.unlockTime()).to.equal(unlockTime)
            expect(await lock.unlockTime()).to.be.greaterThan(await time.latest())
        })
    })


    /*---------- Changing Unlock Time ----------*/
    describe("Changing Unlock Time", () => {
        it("Should fail if the caller is not the owner", async () => {
            const { lock, otherAccount, unlockTime } = await loadFixture(deployLockFixture)

            const newUnlockTime = (await time.latest()) + 180
            await expect(lock.connect(otherAccount).changeUnlockTime(newUnlockTime)).to.be.revertedWith("Only the owner can call this function")

            expect(await lock.unlockTime()).to.equal(unlockTime)
        })

        it("Should not allow older time to be set as unlock time", async () => {
            const { lock, deployer } = await loadFixture(deployLockFixture)

            const newUnlockTime = (await time.latest()) - 180
            await expect(lock.connect(deployer).changeUnlockTime(newUnlockTime)).to.be.revertedWith("unlock time should be in the future")
        })
        
        it("Should change unlock time to a new unlock time", async () => {
            const { lock, deployer } = await loadFixture(deployLockFixture)

            const newUnlockTime = (await time.latest()) + 180
            
            await lock.connect(deployer).changeUnlockTime(newUnlockTime)
            
            expect(await lock.unlockTime()).to.be.equal(newUnlockTime)
        })

        it("Should emit UnlockTimeChanged event", async () => {
            const { lock, deployer } = await loadFixture(deployLockFixture)

            const newUnlockTime = (await time.latest()) + 180
    
            await expect(lock.connect(deployer).changeUnlockTime(newUnlockTime)).to.emit(lock, "UnlockTimeChanged").withArgs(anyValue, newUnlockTime)
        })

    })

    
    /*---------- Withdraw ----------*/
    describe("Withdrawing", () => {
        it("Should fail if the caller is not the owner", async () => {
            const { lock, otherAccount, unlockTime } = await loadFixture(deployLockFixture)

            await time.increaseTo(unlockTime)

            await expect(lock.connect(otherAccount).withdraw()).to.be.revertedWith("Only the owner can call this function")
        })

        it("Should fail if function called too soon before unlock time", async () => {
            const { lock } = await loadFixture(deployLockFixture)
            await expect(lock.withdraw()).to.be.revertedWith("You can't withdraw yet")
        })

        it("Shouldn't fail if the unlock time has arrived and the owner calls it", async () => {
            const { lock, deployer, unlockTime} = await loadFixture(deployLockFixture)

            await time.increaseTo(unlockTime)
            
            expect(await lock.connect(deployer).withdraw()).to.not.be.reverted
        })

        it("Should transfer lockedAmount to owner", async () => {
            const { lock, unlockTime, deployer, lockedAmount} = await loadFixture(deployLockFixture)
            
            await time.increaseTo(unlockTime)

            await expect(lock.connect(deployer).withdraw()).to.changeEtherBalances([lock, deployer], [-lockedAmount, lockedAmount])
        })

        it("Should emit Withdrawal event", async () => {
            const { lock, unlockTime, lockedAmount, deployer} = await loadFixture(deployLockFixture)

            await time.increaseTo(unlockTime)

            await expect(lock.connect(deployer).withdraw()).to.emit(lock, "Withdrawal").withArgs(lockedAmount, anyValue)
        })
    })
})