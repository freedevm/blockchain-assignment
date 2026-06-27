/* eslint-disable @typescript-eslint/no-require-imports */
require('@nomicfoundation/hardhat-ethers');

/** @type {import("hardhat/config").HardhatUserConfig} */
module.exports = {
  solidity: {
    version: '0.8.24',
  },
  networks: {
    localhost: {
      url: process.env.HARDHAT_RPC_URL || 'http://127.0.0.1:8545',
    },
  },
};
