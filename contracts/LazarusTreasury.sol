// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * LazarusTreasury — the Compute Treasury of Lazarus Net.
 *
 * Protocol fees arrive as native ETH (plain transfers or depositFees()).
 * A governance-configured share (computeAllocationBps) is earmarked for GPU
 * compute; the owner (protocol multisig / admin wallet) pays compute providers
 * from the treasury with payProvider(), which is what the site reports as
 * compute spend. Every number the dashboard shows comes from these views:
 *
 *   totalProtocolFees()    lifetime fees received (wei)
 *   computeAllocationBps() share of fees earmarked for compute (basis points)
 *   totalComputeSpend()    lifetime payments to compute providers (wei)
 *   computeBudget()        fees × allocation − spend, i.e. what may still be spent on compute
 *
 * No proxies, no external dependencies: a single small contract that can be
 * read by anyone and verified byte-for-byte.
 */
contract LazarusTreasury {
    address public owner;
    address public pendingOwner;

    uint256 public totalProtocolFees;
    uint256 public totalComputeSpend;
    uint256 public computeAllocationBps;

    uint256 public constant MAX_BPS = 10_000;

    event FeesReceived(address indexed from, uint256 amount, string memo);
    event AllocationChanged(uint256 previousBps, uint256 newBps);
    event ComputePaid(address indexed provider, uint256 amount, string memo);
    event Withdrawn(address indexed to, uint256 amount, string memo);
    event OwnershipTransferStarted(address indexed previousOwner, address indexed newOwner);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    error NotOwner();
    error NotPendingOwner();
    error ZeroAddress();
    error BpsTooHigh();
    error InsufficientBalance();
    error OverComputeBudget();
    error TransferFailed();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor(address initialOwner, uint256 initialAllocationBps) {
        if (initialOwner == address(0)) revert ZeroAddress();
        if (initialAllocationBps > MAX_BPS) revert BpsTooHigh();
        owner = initialOwner;
        computeAllocationBps = initialAllocationBps;
        emit OwnershipTransferred(address(0), initialOwner);
        emit AllocationChanged(0, initialAllocationBps);
    }

    // ─── Fee inflow ───────────────────────────────────────────────────────

    receive() external payable {
        totalProtocolFees += msg.value;
        emit FeesReceived(msg.sender, msg.value, "");
    }

    function depositFees(string calldata memo) external payable {
        totalProtocolFees += msg.value;
        emit FeesReceived(msg.sender, msg.value, memo);
    }

    // ─── Views ────────────────────────────────────────────────────────────

    /// @notice Fees earmarked for compute that have not been spent yet.
    function computeBudget() public view returns (uint256) {
        uint256 earmarked = (totalProtocolFees * computeAllocationBps) / MAX_BPS;
        return earmarked > totalComputeSpend ? earmarked - totalComputeSpend : 0;
    }

    function balance() external view returns (uint256) {
        return address(this).balance;
    }

    // ─── Governance ───────────────────────────────────────────────────────

    function setComputeAllocationBps(uint256 newBps) external onlyOwner {
        if (newBps > MAX_BPS) revert BpsTooHigh();
        emit AllocationChanged(computeAllocationBps, newBps);
        computeAllocationBps = newBps;
    }

    /// @notice Pays a compute provider out of the compute budget.
    function payProvider(address payable provider, uint256 amount, string calldata memo) external onlyOwner {
        if (provider == address(0)) revert ZeroAddress();
        if (amount > address(this).balance) revert InsufficientBalance();
        if (amount > computeBudget()) revert OverComputeBudget();
        totalComputeSpend += amount;
        (bool ok, ) = provider.call{value: amount}("");
        if (!ok) revert TransferFailed();
        emit ComputePaid(provider, amount, memo);
    }

    /// @notice Moves the non-compute share (or any surplus) elsewhere; never counted as compute spend.
    function withdraw(address payable to, uint256 amount, string calldata memo) external onlyOwner {
        if (to == address(0)) revert ZeroAddress();
        if (amount > address(this).balance) revert InsufficientBalance();
        (bool ok, ) = to.call{value: amount}("");
        if (!ok) revert TransferFailed();
        emit Withdrawn(to, amount, memo);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        pendingOwner = newOwner;
        emit OwnershipTransferStarted(owner, newOwner);
    }

    function acceptOwnership() external {
        if (msg.sender != pendingOwner) revert NotPendingOwner();
        emit OwnershipTransferred(owner, pendingOwner);
        owner = pendingOwner;
        pendingOwner = address(0);
    }
}
