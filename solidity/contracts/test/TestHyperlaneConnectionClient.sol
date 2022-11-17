// SPDX-License-Identifier: MIT OR Apache-2.0
pragma solidity >=0.6.11;
import {HyperlaneConnectionClient} from "../HyperlaneConnectionClient.sol";
import {IMailbox} from "../../interfaces/IMailbox.sol";

contract TestHyperlaneConnectionClient is HyperlaneConnectionClient {
    function initialize(address _abacusConnectionManager) external initializer {
        __HyperlaneConnectionClient_initialize(_abacusConnectionManager);
    }

    function localDomain() external view returns (uint32) {
        return mailbox.localDomain();
    }
}