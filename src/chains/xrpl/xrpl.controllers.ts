import { Wallet, TxResponse } from 'xrpl';
import { TokenInfo, XRPLish } from './xrpl';
import { latency } from '../../services/base';
import {
  HttpException,
  LOAD_WALLET_ERROR_CODE,
  LOAD_WALLET_ERROR_MESSAGE,
} from '../../services/error-handler';
import { getNotNullOrThrowError } from '../../chains/xrpl/xrpl.helpers';

import {
  XRPLBalanceRequest,
  XRPLBalanceResponse,
  XRPLPollRequest,
  XRPLPollResponse,
} from './xrpl.requests';

import {
  validateXRPLBalanceRequest,
  validateXRPLPollRequest,
  validateXRPLGetTokenRequest,
} from './xrpl.validators';
import { TokensRequest } from '../../network/network.requests';

export class XRPLController {
  static async currentBlockNumber(xrplish: XRPLish): Promise<number> {
    return xrplish.getCurrentLedgerIndex();
  }

  static async balances(
    xrplish: XRPLish,
    req: XRPLBalanceRequest
  ): Promise<XRPLBalanceResponse> {
    const initTime = Date.now();
    let wallet: Wallet;

    validateXRPLBalanceRequest(req);

    try {
      wallet = await xrplish.getWallet(req.address);
    } catch (err) {
      throw new HttpException(
        500,
        LOAD_WALLET_ERROR_MESSAGE + err,
        LOAD_WALLET_ERROR_CODE
      );
    }

    const balances = await xrplish.getAllBalance(wallet);

    return {
      network: xrplish.network,
      timestamp: initTime,
      latency: latency(initTime, Date.now()),
      address: req.address,
      balances,
    };
  }

  static async poll(
    xrplish: XRPLish,
    req: XRPLPollRequest
  ): Promise<XRPLPollResponse> {
    validateXRPLPollRequest(req);

    const initTime = Date.now();
    const currentLedgerIndex = await xrplish.getCurrentLedgerIndex();
    const txData = getNotNullOrThrowError<TxResponse>(
      await xrplish.getTransaction(req.txHash)
    );
    const txStatus = await xrplish.getTransactionStatusCode(txData);

    return {
      network: xrplish.network,
      timestamp: initTime,
      currentLedgerIndex: currentLedgerIndex,
      txHash: req.txHash,
      txStatus: txStatus,
      txLedgerIndex: txData.result.ledger_index,
      txData: getNotNullOrThrowError<TxResponse>(txData),
    };
  }

  static async getTokens(xrplish: XRPLish, req: TokensRequest) {
    validateXRPLGetTokenRequest(req);
    let tokens: TokenInfo[] = [];
    if (req.tokenSymbols?.length === 0) {
      tokens = xrplish.storedTokenList;
    } else {
      for (const t of req.tokenSymbols as []) {
        const arr = xrplish.getTokenForSymbol(t);
        if (arr !== undefined) {
          arr.forEach((token) => {
            tokens.push(token);
          });
        }
      }
    }

    return { tokens };
  }
}
