# federation-grants-program
This contract was created in order to pay to federator for its services. In this first version, all the federators will receive an equivalent payment, unless they are banned.

### Configuration
In order to run the tool it is necessary to create a `config.json` file (use **config.example.json** as example), where you set the contract data (that will be used as data for constructor): 

	ownerAddress: "0x4f69b412c06830cv41365d6f985b3dbe8c04c85c",
	periodLength: 3600 (amount in seconds),
	amountToPay: "10000000000000000 (amount in weis)" 

And the public keys of federators for each network as array:

	 "development": [pubKey1, pubKeyN],
	 "regtest": [pubKey1, pubKeyN],
	 "testnet": [pubKey1, pubKeyN],
	 "mainnet": [pubKey1, pubKeyN]

### Observations
1. Functions use **external** modifier instead of **public** as this spends less gas. However, it is important to take into account that **external** is used if you expect that the function will only ever be called externally, and use **public** if you need to call the function internally.

2. If you wish to update federation avoiding redeploying the contract, you need to call `updateFedsPubKeys` method and pass a new array of public keys as parameter (must include all federators public keys, despite they were part of the old federation).

### Run tests
Test can be run with or without coverage option:
In order to run tests, you can run commands:

`truffle test` or `npm run test`

In order to run test and show coverage, run:

`truffle run coverage` or `npm run coverage`