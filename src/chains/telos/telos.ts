import abi from '../ethereum/ethereum.abi.json';
import { logger } from '../../services/logger';
import { Contract, Transaction, Wallet } from 'ethers';
import { EthereumBase } from '../ethereum/ethereum-base';
import { getEthereumConfig as getTelosConfig } from '../ethereum/ethereum.config';
import { Provider } from '@ethersproject/abstract-provider';
import { OpenoceanConfig } from '../../connectors/openocean/openocean.config';
import { Ethereumish } from '../../services/common-interfaces';
import { ConfigManagerV2 } from '../../services/config-manager-v2';
import { EVMController } from '../ethereum/evm.controllers';

export class Telos extends EthereumBase implements Ethereumish {
  private static _instances: { [name: string]: Telos };
  private _gasPrice: number;
  private _gasPriceRefreshInterval: number | null;
  private _nativeTokenSymbol: string;
  private _chain: string;
  public controller;

  private constructor(network: string) {
    const config = getTelosConfig('telos', network);
    super(
      'telos',
      config.network.chainID,
      config.network.nodeURL,
      config.network.tokenListSource,
      config.network.tokenListType,
      config.manualGasPrice,
      config.gasLimitTransaction,
      ConfigManagerV2.getInstance().get('server.nonceDbPath'),
      ConfigManagerV2.getInstance().get('server.transactionDbPath'),
    );
    this._chain = config.network.name;
    this._nativeTokenSymbol = config.nativeCurrencySymbol;

    this._gasPrice = config.manualGasPrice;

    this._gasPriceRefreshInterval =
      config.network.gasPriceRefreshInterval !== undefined
        ? config.network.gasPriceRefreshInterval
        : null;

    this.updateGasPrice();
    this.controller = EVMController;
  }

  public static getInstance(network: string): Telos {
    if (Telos._instances === undefined) {
      Telos._instances = {};
    }
    if (!(network in Telos._instances)) {
      Telos._instances[network] = new Telos(network);
    }

    return Telos._instances[network];
  }

  public static getConnectedInstances(): { [name: string]: Telos } {
    return Telos._instances;
  }

  // getters

  public get gasPrice(): number {
    return this._gasPrice;
  }

  public get nativeTokenSymbol(): string {
    return this._nativeTokenSymbol;
  }

  public get chain(): string {
    return this._chain;
  }

  getContract(tokenAddress: string, signerOrProvider?: Wallet | Provider) {
    return new Contract(tokenAddress, abi.ERC20Abi, signerOrProvider);
  }

  getSpender(reqSpender: string): string {
    let spender: string;
    if (reqSpender === 'openocean') {
      spender = OpenoceanConfig.config.routerAddress('telos', this._chain);
    } else {
      spender = reqSpender;
    }
    return spender;
  }

  // cancel transaction
  async cancelTx(wallet: Wallet, nonce: number): Promise<Transaction> {
    logger.info(
      'Canceling any existing transaction(s) with nonce number ' + nonce + '.',
    );
    return super.cancelTxWithGasPrice(wallet, nonce, this._gasPrice * 2);
  }

  /**
   * Automatically update the prevailing gas price on the network.
   */
  async updateGasPrice(): Promise<void> {
    if (this._gasPriceRefreshInterval === null) {
      return;
    }

    const gasPrice = await this.getGasPrice();
    if (gasPrice !== null) {
      this._gasPrice = gasPrice;
    } else {
      logger.info('gasPrice is unexpectedly null.');
    }

    setTimeout(
      this.updateGasPrice.bind(this),
      this._gasPriceRefreshInterval * 1000,
    );
  }

  async close() {
    await super.close();
    if (this._chain in Telos._instances) {
      delete Telos._instances[this._chain];
    }
  }
}