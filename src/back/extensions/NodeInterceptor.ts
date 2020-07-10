/* eslint-disable prefer-rest-params */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { IExtension, IExtensionManifest } from '@shared/extensions/interfaces';
import * as flashpoint from 'flashpoint';
import { createApiFactory } from './ApiImplementation';
import { TernarySearchTree } from '@back/util/map';
import { nullExtensionDescription } from '@back/util/extensions';
import { Registry } from './types';
import { ILogEntry } from '@shared/Log/interface';

type LoadFunction = {
  (request: string): any;
}

export interface INodeModuleFactory {
  readonly nodeModuleName: string | string[];
  load(request: string, parent: string, original: LoadFunction): any;
  alternativeModuleName?(name: string): string | undefined;
}

export type InterceptorState = {
  alternatives: ((moduleName: string) => string | undefined)[];
  factories: Map<string, INodeModuleFactory>;
}

export function registerInterceptor(interceptor: INodeModuleFactory, state: InterceptorState): void {
  const { alternatives, factories } = state;
  if (Array.isArray(interceptor.nodeModuleName)) {
    for (const moduleName of interceptor.nodeModuleName) {
      factories.set(moduleName, interceptor);
    }
  } else {
    factories.set(interceptor.nodeModuleName, interceptor);
  }
  if (typeof interceptor.alternativeModuleName === 'function') {
    alternatives.push((moduleName) => {
      return interceptor.alternativeModuleName!(moduleName);
    });
  }
}

export async function installNodeInterceptor(state: InterceptorState): Promise<void> {
  const { alternatives, factories } = state;
  const node_module: any = await import('module');
  const original = node_module._load;
  node_module._load = function load(request: string, parent: { path: string, filename: string; }, isMain: any) {
    for (const alternativeModuleName of alternatives) {
      const alternative = alternativeModuleName(request);
      if (alternative) {
        request = alternative;
        break;
      }
    }
    if (!factories.has(request)) {
      return original.apply(this, arguments);
    }
    return factories.get(request)!.load(
      request,
      parent.filename,
      request => original.apply(this, [request, parent, isMain])
    );
  };
}

interface IExtensionApiFactory {
  (ext: IExtensionManifest, reg: Registry, addExtLog: (entry: ILogEntry) => void): typeof flashpoint;
}

export class FPLNodeModuleFactory implements INodeModuleFactory {
  public readonly nodeModuleName = 'flashpoint';

  private readonly _extApiImpl = new Map<string, typeof flashpoint>();
  private _defaultApiImpl?: typeof flashpoint;
  private _apiFactory: IExtensionApiFactory;

  constructor(
    protected readonly _extensionPaths: TernarySearchTree<string, IExtension>,
    private readonly _registry: Registry,
    private readonly _addExtLogFactory: (extId: string) => (entry: ILogEntry) => void
  ) {
    this._apiFactory = createApiFactory;
  }

  /** Return an API implementation given an import request */
  public load(_request: string, parent: string): any {
    // Find API for extension
    const ext = this._extensionPaths.findSubstr(parent);
    if (ext) {
      let apiImpl = this._extApiImpl.get(ext.id);
      if (!apiImpl) {
        // No API for extension yet, make one
        apiImpl = this._apiFactory(ext.manifest, this._registry, this._addExtLogFactory(ext.id));
        this._extApiImpl.set(ext.id, apiImpl);
      }
      return apiImpl;
    }

    // Import not from an extension, Give default API
    if (!this._defaultApiImpl) {
      this._defaultApiImpl = this._apiFactory(nullExtensionDescription, this._registry, this._addExtLogFactory('null'));
    }
    return this._defaultApiImpl;
  }
}
