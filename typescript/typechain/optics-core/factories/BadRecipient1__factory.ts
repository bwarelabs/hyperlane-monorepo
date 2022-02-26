/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import { Signer, utils, Contract, ContractFactory, Overrides } from "ethers";
import { Provider, TransactionRequest } from "@ethersproject/providers";
import type { BadRecipient1, BadRecipient1Interface } from "../BadRecipient1";

const _abi = [
  {
    inputs: [
      {
        internalType: "uint32",
        name: "",
        type: "uint32",
      },
      {
        internalType: "bytes32",
        name: "",
        type: "bytes32",
      },
      {
        internalType: "bytes",
        name: "",
        type: "bytes",
      },
    ],
    name: "handle",
    outputs: [],
    stateMutability: "pure",
    type: "function",
  },
];

const _bytecode =
  "0x608060405234801561001057600080fd5b50610199806100206000396000f3fe608060405234801561001057600080fd5b506004361061002b5760003560e01c806356d5d47514610030575b600080fd5b61003e61002b36600461006f565b005b7f4e487b7100000000000000000000000000000000000000000000000000000000600052604160045260246000fd5b60008060006060848603121561008457600080fd5b833563ffffffff8116811461009857600080fd5b925060208401359150604084013567ffffffffffffffff808211156100bc57600080fd5b818601915086601f8301126100d057600080fd5b8135818111156100e2576100e2610040565b604051601f82017fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe0908116603f0116810190838211818310171561012857610128610040565b8160405282815289602084870101111561014157600080fd5b826020860160208301376000602084830101528095505050505050925092509256fea26469706673582212202ac0f504b85e1ac62cf7198d6e7f439aff1afb12516b438f413a408bd6b75b1164736f6c63430008090033";

export class BadRecipient1__factory extends ContractFactory {
  constructor(signer?: Signer) {
    super(_abi, _bytecode, signer);
  }

  deploy(
    overrides?: Overrides & { from?: string | Promise<string> }
  ): Promise<BadRecipient1> {
    return super.deploy(overrides || {}) as Promise<BadRecipient1>;
  }
  getDeployTransaction(
    overrides?: Overrides & { from?: string | Promise<string> }
  ): TransactionRequest {
    return super.getDeployTransaction(overrides || {});
  }
  attach(address: string): BadRecipient1 {
    return super.attach(address) as BadRecipient1;
  }
  connect(signer: Signer): BadRecipient1__factory {
    return super.connect(signer) as BadRecipient1__factory;
  }
  static readonly bytecode = _bytecode;
  static readonly abi = _abi;
  static createInterface(): BadRecipient1Interface {
    return new utils.Interface(_abi) as BadRecipient1Interface;
  }
  static connect(
    address: string,
    signerOrProvider: Signer | Provider
  ): BadRecipient1 {
    return new Contract(address, _abi, signerOrProvider) as BadRecipient1;
  }
}
