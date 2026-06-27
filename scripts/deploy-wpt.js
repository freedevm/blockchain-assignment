const { ethers } = require('hardhat');

async function main() {
  const [deployer] = await ethers.getSigners();

  const WorkloPoints = await ethers.getContractFactory('WorkloPoints');
  const token = await WorkloPoints.deploy(deployer.address);
  await token.waitForDeployment();

  console.log(`WorkloPoints deployed to: ${await token.getAddress()}`);
  console.log(`Owner/minter address: ${deployer.address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
