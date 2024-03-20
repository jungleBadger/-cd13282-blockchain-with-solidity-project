// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract CollateralizedLoan {
    struct Loan {
        address borrower;
        address lender;
        uint256 loanAmount;
        uint256 interestRate; // Represented as a percentage (e.g., 5 for 5%)
        uint256 dueDate;
        bool isFunded;
        bool isRepaid;
        uint256 collateralAmount;
    }

    mapping(uint256 => Loan) public loans;
    uint256 public nextLoanId;

    event LoanRequested(uint256 indexed loanId, address borrower, uint256 loanAmount, uint256 interestRate, uint256 duration);
    event LoanFunded(uint256 indexed loanId, address lender);
    event LoanRepaid(uint256 indexed loanId);
    event CollateralClaimed(uint256 indexed loanId);

    modifier loanExists(uint256 loanId) {
        require(loans[loanId].borrower != address(0), "Loan does not exist.");
        _;
    }

    function depositCollateralAndRequestLoan(uint256 loanAmount, uint256 interestRate, uint256 duration) external payable {
        uint256 dueDate = block.timestamp + duration;
        loans[nextLoanId] = Loan(msg.sender, address(0), loanAmount, interestRate, dueDate, false, false, msg.value);
        emit LoanRequested(nextLoanId, msg.sender, loanAmount, interestRate, duration);
        nextLoanId++;
    }

    function fundLoan(uint256 loanId) external payable loanExists(loanId) {
        Loan storage loan = loans[loanId];
        require(!loan.isFunded, "Loan is already funded.");
        require(msg.value >= loan.loanAmount, "Insufficient amount to fund the loan.");

        loan.lender = msg.sender;
        loan.isFunded = true;
        emit LoanFunded(loanId, msg.sender);
    }

    function repayLoan(uint256 loanId) external payable loanExists(loanId) {
        Loan storage loan = loans[loanId];
        require(loan.isFunded, "Loan is not funded.");
        require(!loan.isRepaid, "Loan is already repaid.");
        require(block.timestamp <= loan.dueDate, "Loan is past due date.");

        uint256 repaymentAmount = calculateRepaymentAmount(loanId);
        require(msg.value >= repaymentAmount, "Insufficient amount to repay the loan.");

        loan.isRepaid = true;
        payable(loan.lender).transfer(repaymentAmount);

        emit LoanRepaid(loanId);
    }

    function claimCollateral(uint256 loanId) external loanExists(loanId) {
        Loan storage loan = loans[loanId];
        require(msg.sender == loan.lender, "Caller is not the lender.");
        require(loan.isFunded, "Loan is not funded.");
        require(!loan.isRepaid, "Loan is already repaid.");
        require(block.timestamp > loan.dueDate, "Loan is not past due date yet.");

        loan.isRepaid = true; // Mark as repaid to prevent further actions
        payable(loan.lender).transfer(loan.collateralAmount);

        emit CollateralClaimed(loanId);
    }

    function calculateRepaymentAmount(uint256 loanId) public view returns (uint256) {
        Loan storage loan = loans[loanId];
        return loan.loanAmount + (loan.loanAmount * loan.interestRate / 100);
    }
}
