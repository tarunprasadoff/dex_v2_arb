require("@nomicfoundation/hardhat-toolbox");

keys = require("./keys/keys.json");
infura = keys["infura"];
dev = keys["dev"];

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    compilers: [
      { version: "0.5.5" },
      { version: "0.6.6" },
      { version: "0.8.8" },
    ],
  },

  networks: {
    hardhat: {
      forking: {
        url: `https://mainnet.infura.io/v3/${infura}`,
      }
    },
    testnet: {
      url: `https://goerli.infura.io/v3/${infura}`,
      chainId: 5,
      accounts: [dev],
    },
    mainnet: {
      url: `https://mainnet.infura.io/v3/${infura}`,
      chainId: 1,
      accounts: [dev],
    }
  }
};
