import { Logger } from 'pino';

import { Address, ProtocolType, rootLogger } from '@hyperlane-xyz/utils';

import { CoreConfig } from '../core/types.js';
import { EvmHookReader, HookReader } from '../hook/read.js';
import { HookConfig } from '../hook/types.js';
import { EvmIsmReader, IsmReader } from '../ism/read.js';
import { IsmConfig } from '../ism/types.js';
import { WarpRouteConfig } from '../metadata/warpRouteConfig.js';
import { MultiProvider } from '../providers/MultiProvider.js';
import { TypedTransaction } from '../providers/ProviderType.js';
import { ChainNameOrId } from '../types.js';

export type CrudConfig = CoreConfig | WarpRouteConfig | HookConfig | IsmConfig;

export type CrudModuleArgs<TConfig> = {
  address?: string;
  multiProvider: MultiProvider;
  chain: ChainNameOrId;
  concurrency: number;
  config: TConfig;
};

export abstract class CrudModule<TConfig extends CrudConfig> {
  protected abstract readonly logger: Logger;

  protected constructor(protected readonly args: CrudModuleArgs<TConfig>) {}

  public abstract serialize(): string;
  public abstract read(address: Address): Promise<TConfig>;
  public abstract update(config: TConfig): Promise<TypedTransaction[]>;

  // types and static methods are problematic
  // public static create<T extends CrudConfig>(
  //   _config: T,
  // ): Promise<CrudModule<T>> {
  //   throw new Error('not implemented');
  // }
}

// WIP example impl of HookModule
export class HookModule extends CrudModule<HookConfig> {
  protected logger = rootLogger.child({ module: 'HookModule' });

  protected reader: HookReader;

  protected constructor(args: CrudModuleArgs<HookConfig>) {
    super(args);

    const { multiProvider, chain, concurrency } = this.args;
    const { protocol } = multiProvider.getChainMetadata(chain);

    if (protocol !== ProtocolType.Ethereum) {
      // only EVM supported currently
      throw new Error(`Unsupported protocol type ${protocol}`);
    }

    this.reader = new EvmHookReader(multiProvider, chain, concurrency);
  }

  public serialize(): string {
    throw new Error('Method not implemented.');
  }

  public async read(address: Address): Promise<HookConfig> {
    return await this.reader.deriveHookConfig(address);
  }

  public async update(_config: HookConfig): Promise<TypedTransaction[]> {
    throw new Error('Method not implemented.');
  }

  // manually write static create function
  public static create(_config: HookConfig): Promise<HookModule> {
    throw new Error('not implemented');
  }
}

// WIP example impl of HookModule
export class IsmModule extends CrudModule<IsmConfig> {
  protected logger = rootLogger.child({ module: 'IsmModule' });

  protected reader: IsmReader;

  protected constructor(args: CrudModuleArgs<IsmConfig>) {
    super(args);

    const { multiProvider, chain, concurrency } = this.args;
    const { protocol } = multiProvider.getChainMetadata(chain);

    if (protocol !== ProtocolType.Ethereum) {
      // only EVM supported currently
      throw new Error(`Unsupported protocol type ${protocol}`);
    }

    this.reader = new EvmIsmReader(multiProvider, chain, concurrency);
  }

  public serialize(): string {
    throw new Error('Method not implemented.');
  }

  public async read(address: Address): Promise<IsmConfig> {
    return await this.reader.deriveIsmConfig(address);
  }

  public async update(_config: IsmConfig): Promise<TypedTransaction[]> {
    throw new Error('Method not implemented.');
  }

  // manually write static create function
  public static create(_config: IsmConfig): Promise<IsmModule> {
    throw new Error('not implemented');
  }
}

export class CoreModule extends CrudModule<CoreConfig> {
  protected logger = rootLogger.child({ module: 'CoreModule' });

  protected constructor(args: CrudModuleArgs<CoreConfig>) {
    super(args);
  }

  public serialize(): string {
    throw new Error('Method not implemented.');
  }

  public read(_address: string): Promise<CoreConfig> {
    throw new Error('Method not implemented.');
  }

  public update(_config: CoreConfig): Promise<TypedTransaction[]> {
    throw new Error('Method not implemented.');
  }

  // manually write static create function
  public static create(_config: CoreConfig): Promise<CoreModule> {
    throw new Error('not implemented');
  }
}

export class WarpModule extends CrudModule<WarpRouteConfig> {
  protected logger = rootLogger.child({ module: 'WarpModule' });

  protected constructor(args: CrudModuleArgs<WarpRouteConfig>) {
    super(args);
  }

  public serialize(): string {
    throw new Error('Method not implemented.');
  }

  public read(_address: string): Promise<WarpRouteConfig> {
    throw new Error('Method not implemented.');
  }

  public update(_config: WarpRouteConfig): Promise<TypedTransaction[]> {
    throw new Error('Method not implemented.');
  }

  // manually write static create function
  public static create(_config: WarpRouteConfig): Promise<WarpModule> {
    throw new Error('not implemented');
  }
}
