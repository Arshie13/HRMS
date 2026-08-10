import { AsyncLocalStorage } from 'node:async_hooks';

interface TenantContextValue {
  tenantId?: string;
}

export class TenantContext {
  private static readonly als = new AsyncLocalStorage<TenantContextValue>();

  static run<T>(tenantId: string | undefined, fn: () => T): T {
    return this.als.run({ tenantId }, fn);
  }

  static getTenantId(): string | undefined {
    return this.als.getStore()?.tenantId;
  }
}
