const { expect } = require('chai')
const { ethers } = require('hardhat')

describe("Voting", function () {
  let proposalNames;
  let votersAddresses;
  let voting;

  this.beforeEach(async function() {
    proposalNames = ["ABC", "MAE", "CAOS"];
    [add0, add1, add2, add3, add4, add5, add6, add7] = await ethers.getSigners();
    votersAddresses = [add0.address, add1.address, add2.address, add3.address, add4.address, add5.address, add6.address];

    const Voting = await hre.ethers.getContractFactory("Voting");
    voting = await Voting.deploy(proposalNames, votersAddresses);
  });

  function removeNullBytes(str) {
    return str.split("").filter(char => char.codePointAt(0)).join("");
  }

  describe("Deployment", async function() {
    it('should set the right value of the proposals', async function(){
      for (let i = 0; i < proposalNames.length; i++) {
        let prop = await voting.getProposal(i);
        await expect(removeNullBytes(prop[0])).to.equal(proposalNames[i]);
      }
    });

    it('should set the voter addresses', async function(){
      for (let i = 0; i < votersAddresses.length; i++) {
        let voterAdd = await voting.voters(votersAddresses[i]);
        await expect(voterAdd.voter).to.equal(votersAddresses[i]);
      }
    });
  });

  describe("Vote", async function() {
    it("shouldn't vote", async function(){
      await expect(voting.vote(votersAddresses[1], 1)).to.be.revertedWith("Voting System: This address does not have rights to vote")
    });
    it("should vote", async function(){
      await expect(voting.vote(votersAddresses[0], 1)).not.to.be.reverted;
    });
  });

  describe("Delegate", async function(){
    it("should'n delegate, self delegation", async function(){
      await expect(voting.delegate(votersAddresses[0])).to.be.revertedWith('Voting System: Wrong delegate action');
    });

    it("should'n delegate, user already had voted", async function(){
      await voting.vote(votersAddresses[0], 1);
      await expect(voting.delegate(votersAddresses[1])).to.be.revertedWith('Voting System: Voter already voted');
    });

    it("Shouldn't delegate, this address don't have rights to vote", async function(){
      await expect(voting.connect(add7).delegate(votersAddresses[1])).to.be.revertedWith("Voting System: This address does not have right to vote");
    });

    it('Should delegate', async function() {
      await expect(voting.delegate(votersAddresses[1])).not.to.be.reverted;
      let voterAddr = await voting.voters(votersAddresses[0]);
      await expect(voterAddr.delegate).to.equal(votersAddresses[1]);
    });
  });

  describe("Voting", function(){
    it("Shouldn't vote, this proposal doesn't exist", async function(){
      await expect(voting.vote(votersAddresses[0], 8)).to.be.revertedWith("Voting System: Proposal index out of bounds");
    });

    it("Shouldn't vote, voter already voted", async function(){
      await voting.vote(votersAddresses[0], 1);
      await expect(voting.vote(votersAddresses[0], 1)).to.be.revertedWith("Voting System: Voter already voted");
    });

    it("Shouldn't vote, no rights to vote", async function(){
      await expect(voting.connect(add1).vote(votersAddresses[0], 1)).to.be.revertedWith("Voting System: This address does not have rights to vote");
    });

    it("Should vote", async function(){
      await expect(voting.vote(votersAddresses[0], 1)).not.to.be.reverted;
    });
  });

  describe("Winners", function(){
    it("Can't compute winners", async function(){
      await voting.vote(votersAddresses[0], 1);
      await voting.connect(add1).vote(votersAddresses[1], 1);
      await voting.connect(add2).vote(votersAddresses[2], 0);
      await voting.connect(add3).vote(votersAddresses[3], 2);
      await voting.connect(add4).vote(votersAddresses[4], 2);
      await voting.connect(add5).vote(votersAddresses[5], 1);
      await voting.connect(add6).vote(votersAddresses[6], 1);

      await expect(voting.connect(add1).getWinners()).to.be.revertedWithCustomError;
    });

    it("Can compute winners", async function(){
      await voting.vote(votersAddresses[0], 1);
      await voting.connect(add1).vote(votersAddresses[1], 1);
      await voting.connect(add2).vote(votersAddresses[2], 0);
      await voting.connect(add3).vote(votersAddresses[3], 0);
      await voting.connect(add4).vote(votersAddresses[4], 1);
      await voting.connect(add5).vote(votersAddresses[5], 0);
      //await voting.connect(add6).vote(votersAddresses[6], 0);

      await expect(voting.getWinners()).not.to.be.reverted;
      
      let prop = await voting.getWinnersNames();
      expect(prop[0]).to.be.equal('ABC');
      expect(prop[1]).to.be.equal('MAE');
    });
  });
});