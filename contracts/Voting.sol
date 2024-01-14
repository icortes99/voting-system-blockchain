// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "@openzeppelin/contracts/access/Ownable.sol";

contract Voting is Ownable {
    struct Voter {
        address voter;
        address delegate;
        uint vote;
        bool voted;
    }

    struct Proposal {
        bytes32 name;
        uint voteCount;
    }

    mapping(address => Voter) public voters;
    Proposal[] proposals;
    uint proposalCount;
    uint[] winningProposals;

    event VotingStarted(address indexed _owner, uint _proposalCount);
    event VoteSubmitted(uint _proposalVoted, address indexed _voted);
    event Delegation(address indexed _from, address indexed _to);

    modifier existProposal(uint _proposalIndex) {
        require(
            _proposalIndex <= proposalCount,
            "Voting System: Proposal index out of bounds"
        );
        _;
    }
    modifier noVotedYet(address _voter) {
        require(!voters[_voter].voted, "Voting System: Voter already voted");
        _;
    }

    constructor(
        string[] memory proposalNames,
        address[] memory voterAddresses
    ) Ownable(msg.sender) {
        proposalCount = proposalNames.length;

        for (uint i = 0; i < proposalCount; i++) {
            Proposal memory proposal = Proposal(
                stringToBytes(proposalNames[i]),
                0
            );
            proposals.push(proposal);
        }

        for (uint i = 0; i < voterAddresses.length; i++) {
            Voter memory voter = Voter(voterAddresses[i], address(0), 0, false);
            voters[voterAddresses[i]] = voter;
        }

        emit VotingStarted(owner(), proposalCount);
    }

    function getProposal(
        uint _proposalIndex
    )
        public
        view
        existProposal(_proposalIndex)
        returns (string memory _proposalName, uint _voteCount)
    {
        (_proposalName, _voteCount) = (
            bytesToString(proposals[_proposalIndex].name),
            proposals[_proposalIndex].voteCount
        );
    }

    function vote(
        address _voter,
        uint _proposalIndex
    ) public existProposal(_proposalIndex) noVotedYet(_voter) returns (bool) {
        Voter storage sender = voters[_voter];
        require(
            msg.sender == _voter || msg.sender == sender.delegate,
            "Voting System: This address does not have rights to vote"
        );

        sender.vote = _proposalIndex;
        proposals[_proposalIndex].voteCount++;
        sender.voted = true;

        emit VoteSubmitted(_proposalIndex, _voter);
        return true;
    }

    function delegate(address _to) external noVotedYet(msg.sender) {
        require(
            (_to != msg.sender) && (_to != address(0)),
            "Voting System: Wrong delegate action"
        );
        Voter storage sender = voters[msg.sender];
        require(
            sender.voter != address(0),
            "Voting System: This address does not have right to vote"
        );

        sender.delegate = _to;
        emit Delegation(msg.sender, _to);
    }

    function getWinners() external onlyOwner {
        delete winningProposals;
        uint winningVoteCount = 0;
        uint winner = 0;

        for (uint i = 0; i < proposals.length; i++) {
            if (proposals[i].voteCount > winningVoteCount) {
                winningVoteCount = proposals[i].voteCount;
                winner = i;
            }
        }

        winningProposals.push(winner);

        for (uint i = 0; i < proposals.length; i++) {
            if (
                (proposals[i].voteCount == proposals[winner].voteCount) &&
                (i != winner)
            ) {
                winningProposals.push(i);
            }
        }
    }

    function getWinnersNames() external view returns (string[] memory) {
        string[] memory _winnerNames = new string[](winningProposals.length);
        for (uint i = 0; i < winningProposals.length; i++) {
            _winnerNames[i] = bytesToString(
                proposals[winningProposals[i]].name
            );
        }
        return _winnerNames;
    }

    function getWinnersProposals() external view returns (uint[] memory) {
        return winningProposals;
    }

    //Internal Functions

    function stringToBytes(string memory str) internal pure returns (bytes32) {
        return bytes32(abi.encodePacked(str));
    }

    function bytesToString(
        bytes32 _bytes
    ) internal pure returns (string memory) {
        uint256 i = 0;
        while (i < 32 && _bytes[i] != 0) {
            i++;
        }
        bytes memory bytesArray = new bytes(i);
        for (i = 0; i < 32 && _bytes[i] != 0; i++) {
            bytesArray[i] = _bytes[i];
        }
        return string(bytesArray);
    }
}
