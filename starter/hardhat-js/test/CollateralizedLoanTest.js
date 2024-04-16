const { ethers } = require("hardhat");
const { expect } = require("chai");
describe("CollateralizedLoan Contract", function () {
    let owner, borrower, lender, collateralizedLoan;
    let loanAmount, interestRate, duration, deposit;

    beforeEach(async function () {
        [owner, borrower, lender] = await ethers.getSigners();
        const CollateralizedLoan = await ethers.getContractFactory("CollateralizedLoan");
        collateralizedLoan = await CollateralizedLoan.deploy();
        // Use BigInt for Ether to Wei conversion if ethers.utils.parseEther is not available
        loanAmount = "800000000000000000"; // Equivalent to 0.8 ether in Wei
        deposit = "1000000000000000000"; // Equivalent to 1 ether in Wei
        interestRate = 5; // 5%
        duration = 30 * 24 * 60 * 60; // 30 days in seconds
    });


    describe("Loan Request", function () {
        it("Should allow a borrower to deposit collateral and request a loan", async function () {
            await expect(collateralizedLoan.connect(borrower).depositCollateralAndRequestLoan(loanAmount, interestRate, duration, { value: deposit }))
                .to.emit(collateralizedLoan, "LoanRequested")
                .withArgs(0, borrower.address, loanAmount, interestRate, duration);
        });
    });

    describe("Loan Funding", function () {
        it("Should allow a lender to fund a loan", async function () {
            // Assume loanId 0 exists and is not funded
            await collateralizedLoan.connect(borrower).depositCollateralAndRequestLoan(loanAmount, interestRate, duration, { value: deposit });
            await expect(collateralizedLoan.connect(lender).fundLoan(0, { value: loanAmount }))
                .to.emit(collateralizedLoan, "LoanFunded")
                .withArgs(0, lender.address);
        });
    });

    describe("Loan Repayment", function () {
        it("Should allow a borrower to repay a loan", async function () {
            // Assume loanId 0 is funded
            await collateralizedLoan.connect(borrower).depositCollateralAndRequestLoan(loanAmount, interestRate, duration, { value: deposit });
            await collateralizedLoan.connect(lender).fundLoan(0, { value: loanAmount });
            const repaymentAmount = await collateralizedLoan.calculateRepaymentAmount(0);
            await expect(collateralizedLoan.connect(borrower).repayLoan(0, { value: repaymentAmount }))
                .to.emit(collateralizedLoan, "LoanRepaid")
                .withArgs(0);
        });
    });

    describe("Collateral Claim", function () {
        it("Should allow a lender to claim collateral on default", async function () {
            // Assume loanId 0 is funded and borrower has defaulted
            await collateralizedLoan.connect(borrower).depositCollateralAndRequestLoan(loanAmount, interestRate, duration, { value: deposit });
            await collateralizedLoan.connect(lender).fundLoan(0, { value: loanAmount });
            await ethers.provider.send("evm_increaseTime", [duration + 1]); // Move past the due date
            await ethers.provider.send("evm_mine"); // Mine a new block
            // Simulate default by forwarding time (not shown here for brevity)
            await expect(collateralizedLoan.connect(lender).claimCollateral(0))
                .to.emit(collateralizedLoan, "CollateralClaimed")
                .withArgs(0);
        });
    });
});
