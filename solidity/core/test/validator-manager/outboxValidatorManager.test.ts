import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { ethers } from 'hardhat';

import { Validator, types, utils } from '@abacus-network/utils';
import { BytesArray } from '@abacus-network/utils/dist/src/types';

import {
  OutboxValidatorManager,
  OutboxValidatorManager__factory,
  TestOutbox,
  TestOutbox__factory,
} from '../../types';

import { signCheckpoint } from './utils';

const OUTBOX_DOMAIN = 1234;
const INBOX_DOMAIN = 4321;
const QUORUM_THRESHOLD = 2;

interface MerkleProof {
  root: string;
  proof: BytesArray;
  leaf: string;
  index: number;
}

describe('OutboxValidatorManager', () => {
  let validatorManager: OutboxValidatorManager,
    outbox: TestOutbox,
    helperOutbox: TestOutbox,
    signer: SignerWithAddress,
    validator0: Validator,
    validator1: Validator;

  const dispatchMessage = async (outbox: TestOutbox, message: string) => {
    const recipient = utils.addressToBytes32(validator0.address);
    const destination = INBOX_DOMAIN;
    await outbox.dispatch(
      destination,
      recipient,
      ethers.utils.formatBytes32String(message),
    );
  };

  const dispatchMessageAndReturnProof = async (
    outbox: TestOutbox,
    message: string,
  ) => {
    const destination = INBOX_DOMAIN;
    const recipient = validator0.address;
    await dispatchMessage(outbox, message);
    const formattedMessage = utils.formatMessage(
      OUTBOX_DOMAIN,
      signer.address,
      destination,
      recipient,
      ethers.utils.formatBytes32String(message),
    );
    const count = await outbox.count();
    const leaf = utils.messageHash(formattedMessage, count.sub(1).toNumber());
    const root = await outbox.root();
    const proof = await outbox.proof();
    return {
      root,
      proof,
      leaf,
      index: count.sub(1).toNumber(),
    };
  };

  before(async () => {
    const signers = await ethers.getSigners();
    signer = signers[0];
    validator0 = await Validator.fromSigner(signers[1], OUTBOX_DOMAIN);
    validator1 = await Validator.fromSigner(signers[2], OUTBOX_DOMAIN);
  });

  beforeEach(async () => {
    const validatorManagerFactory = new OutboxValidatorManager__factory(signer);
    validatorManager = await validatorManagerFactory.deploy(
      OUTBOX_DOMAIN,
      [validator0.address, validator1.address],
      QUORUM_THRESHOLD,
    );

    const outboxFactory = new TestOutbox__factory(signer);
    outbox = await outboxFactory.deploy(OUTBOX_DOMAIN);
    await outbox.initialize(validatorManager.address);

    // Deploy a second Outbox for convenience. We push a fraudulent message to this Outbox
    // and use it to generate a fraudulent merkle proof.
    helperOutbox = await outboxFactory.deploy(OUTBOX_DOMAIN);
    await helperOutbox.initialize(validatorManager.address);
  });

  describe('#invalidCheckpoint', async () => {
    const message = 'message';
    const messageCount = 3;
    beforeEach(async () => {
      for (let i = 0; i < messageCount; i++) {
        await dispatchMessage(helperOutbox, message);
      }
    });

    it('accepts an invalidity proof of a non-empty leaf if signed by a quorum', async () => {
      const invalid = await dispatchMessageAndReturnProof(
        helperOutbox,
        message,
      );
      const root = await helperOutbox.root();
      const index = messageCount - 1;
      const signatures = await signCheckpoint(
        root,
        index,
        [validator0, validator1], // 2/2 signers is a quorum
      );
      await expect(
        validatorManager.invalidCheckpoint(
          outbox.address,
          root,
          index,
          signatures,
          invalid.leaf,
          invalid.proof,
          invalid.index,
        ),
      )
        .to.emit(validatorManager, 'InvalidCheckpoint')
        .withArgs(outbox.address, invalid.root, index, signatures);
      expect(await outbox.state()).to.equal(types.AbacusState.FAILED);
    });

    it('accepts an invalidity proof of an empty leaf if signed by a quorum', async () => {
      // For some reason, the `proof()` view call fails unless we make a `root()` view call first...
      await helperOutbox.root();
      const proof = await helperOutbox.proof();
      const leaf = ethers.constants.HashZero;
      const leafIndex = messageCount - 2;
      // It's not clear what this root is a commitment to *other* than an
      // empty leaf at leafIndex, but that's enough for us.
      const root = await helperOutbox.branchRoot(leaf, proof, leafIndex);
      const index = messageCount - 1;
      const signatures = await signCheckpoint(
        root,
        index,
        [validator0, validator1], // 2/2 signers is a quorum
      );
      await expect(
        validatorManager.invalidCheckpoint(
          outbox.address,
          root,
          index,
          signatures,
          leaf,
          proof,
          leafIndex,
        ),
      )
        .to.emit(validatorManager, 'InvalidCheckpoint')
        .withArgs(outbox.address, root, index, signatures);
      expect(await outbox.state()).to.equal(types.AbacusState.FAILED);
    });

    it('reverts if an invalidity proof of a non-empty leaf is not signed by a quorum', async () => {
      const invalid = await dispatchMessageAndReturnProof(
        helperOutbox,
        message,
      );
      const root = await helperOutbox.root();
      const index = messageCount - 1;
      const signatures = await signCheckpoint(
        root,
        index,
        [validator0], // 1/2 signers is not a quorum
      );
      await expect(
        validatorManager.invalidCheckpoint(
          outbox.address,
          root,
          index,
          signatures,
          invalid.leaf,
          invalid.proof,
          invalid.index,
        ),
      ).to.be.revertedWith('!quorum');
    });

    it('reverts if the signed root does not match the invalidity proof', async () => {
      const root = await helperOutbox.root();
      const invalid = await dispatchMessageAndReturnProof(
        helperOutbox,
        message,
      );
      const index = messageCount - 1;
      const signatures = await signCheckpoint(
        root,
        index,
        [validator0, validator1], // 2/2 signers is a quorum
      );
      await expect(
        validatorManager.invalidCheckpoint(
          outbox.address,
          root,
          index,
          signatures,
          invalid.leaf,
          invalid.proof,
          invalid.index,
        ),
      ).to.be.revertedWith('!root');
    });

    it('reverts if the proved leaf is valid', async () => {
      const valid = await dispatchMessageAndReturnProof(helperOutbox, message);
      const root = await helperOutbox.root();
      const index = messageCount;
      const signatures = await signCheckpoint(
        root,
        index,
        [validator0, validator1], // 2/2 signers is a quorum
      );
      await expect(
        validatorManager.invalidCheckpoint(
          outbox.address,
          root,
          index,
          signatures,
          valid.leaf,
          valid.proof,
          valid.index,
        ),
      ).to.be.revertedWith('!invalid');
    });
  });

  describe('#prematureCheckpoint', () => {
    const messageCount = 1;
    // An premature checkpoint is one that has index greater than the latest index
    // in the Outbox.
    const prematureIndex = messageCount;
    const root = ethers.utils.formatBytes32String('test root');

    beforeEach(async () => {
      for (let i = 0; i < messageCount; i++) {
        await dispatchMessage(outbox, 'message');
      }
    });

    it('accepts a premature checkpoint if it has been signed by a quorum of validators', async () => {
      const signatures = await signCheckpoint(
        root,
        prematureIndex,
        [validator0, validator1], // 2/2 signers is a quorum
      );

      await expect(
        validatorManager.prematureCheckpoint(
          outbox.address,
          root,
          prematureIndex,
          signatures,
        ),
      )
        .to.emit(validatorManager, 'PrematureCheckpoint')
        .withArgs(outbox.address, root, prematureIndex, signatures);
      expect(await outbox.state()).to.equal(types.AbacusState.FAILED);
    });

    it('reverts if a premature checkpoint has not been signed a quorum of validators', async () => {
      const signatures = await signCheckpoint(
        root,
        prematureIndex,
        [validator0], // 1/2 signers is not a quorum
      );

      await expect(
        validatorManager.prematureCheckpoint(
          outbox.address,
          root,
          prematureIndex,
          signatures,
        ),
      ).to.be.revertedWith('!quorum');
    });

    it('reverts if a non-premature checkpoint has been signed by a quorum of validators', async () => {
      const validIndex = messageCount - 1;
      const signatures = await signCheckpoint(
        root,
        validIndex,
        [validator0, validator1], // 2/2 signers is a quorum
      );

      await expect(
        validatorManager.prematureCheckpoint(
          outbox.address,
          root,
          validIndex,
          signatures,
        ),
      ).to.be.revertedWith('!premature');
    });
  });

  describe('#fraudulentCheckpoint', async () => {
    let actual: MerkleProof, fraudulent: MerkleProof;
    const disputedIndex = 2;

    beforeEach(async () => {
      const actualMessage = 'message';
      const fraudulentMessage = 'fraud';
      for (let i = 0; i < disputedIndex; i++) {
        await dispatchMessage(outbox, actualMessage);
        await dispatchMessage(helperOutbox, fraudulentMessage);
      }

      actual = await dispatchMessageAndReturnProof(outbox, actualMessage);
      fraudulent = await dispatchMessageAndReturnProof(
        helperOutbox,
        fraudulentMessage,
      );
    });

    it('accepts a fraud proof signed by a quorum', async () => {
      await outbox.cacheCheckpoint();
      const signatures = await signCheckpoint(
        fraudulent.root,
        fraudulent.index,
        [validator0, validator1], // 2/2 signers is a quorum
      );

      await expect(
        validatorManager.fraudulentCheckpoint(
          outbox.address,
          fraudulent.root,
          fraudulent.index,
          signatures,
          fraudulent.leaf,
          fraudulent.proof,
          actual.leaf,
          actual.proof,
          fraudulent.index,
        ),
      )
        .to.emit(validatorManager, 'FraudulentCheckpoint')
        .withArgs(
          outbox.address,
          fraudulent.root,
          fraudulent.index,
          signatures,
        );
      expect(await outbox.state()).to.equal(types.AbacusState.FAILED);
    });

    it('reverts if a fraud proof is not signed by a quorum', async () => {
      await outbox.cacheCheckpoint();
      const signatures = await signCheckpoint(
        fraudulent.root,
        fraudulent.index,
        [validator0], // 1/2 signers is not a quorum
      );

      await expect(
        validatorManager.fraudulentCheckpoint(
          outbox.address,
          fraudulent.root,
          fraudulent.index,
          signatures,
          fraudulent.leaf,
          fraudulent.proof,
          actual.leaf,
          actual.proof,
          fraudulent.index,
        ),
      ).to.be.revertedWith('!quorum');
    });

    it('reverts if the signed root is not fraudulent', async () => {
      await outbox.cacheCheckpoint();
      const signatures = await signCheckpoint(
        actual.root,
        actual.index,
        [validator0, validator1], // 2/2 signers is a quorum
      );

      await expect(
        validatorManager.fraudulentCheckpoint(
          outbox.address,
          actual.root,
          actual.index,
          signatures,
          fraudulent.leaf,
          fraudulent.proof,
          actual.leaf,
          actual.proof,
          fraudulent.index,
        ),
      ).to.be.revertedWith('!root');
    });

    it('reverts if the disputed leaf is not committed to by the signed checkpoint', async () => {
      await outbox.cacheCheckpoint();
      const signatures = await signCheckpoint(
        fraudulent.root,
        fraudulent.index - 1,
        [validator0, validator1], // 2/2 signers is a quorum
      );

      await expect(
        validatorManager.fraudulentCheckpoint(
          outbox.address,
          fraudulent.root,
          fraudulent.index - 1,
          signatures,
          fraudulent.leaf,
          fraudulent.proof,
          actual.leaf,
          actual.proof,
          fraudulent.index,
        ),
      ).to.be.revertedWith('!index');
    });

    it('reverts if the actual root is not cached', async () => {
      const signatures = await signCheckpoint(
        fraudulent.root,
        fraudulent.index,
        [validator0, validator1], // 2/2 signers is a quorum
      );

      await expect(
        validatorManager.fraudulentCheckpoint(
          outbox.address,
          fraudulent.root,
          fraudulent.index,
          signatures,
          fraudulent.leaf,
          fraudulent.proof,
          actual.leaf,
          actual.proof,
          fraudulent.index,
        ),
      ).to.be.revertedWith('!cache');
    });

    it('reverts if the disputed leaves are not different', async () => {
      await outbox.cacheCheckpoint();
      const signatures = await signCheckpoint(
        actual.root,
        actual.index,
        [validator0, validator1], // 2/2 signers is a quorum
      );

      await expect(
        validatorManager.fraudulentCheckpoint(
          outbox.address,
          actual.root,
          actual.index,
          signatures,
          actual.leaf,
          actual.proof,
          actual.leaf,
          actual.proof,
          actual.index,
        ),
      ).to.be.revertedWith('!leaf');
    });
  });
});
