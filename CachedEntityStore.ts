import { configKey, EntityState, EntityStore, getIDType, OrArray, StoreConfigOptions, StoreConfig } from '@datorama/akita';
import { Observable } from 'rxjs';

export interface CacheEntityState {
  cacheAdd?: number;
  cacheUpdated?: number;
  cachePartial?: boolean;
}

export type getCachedEntityType<S> = S extends EntityState<CachedEntity<infer I>> ? I : never;

export declare type CachedEntity<T> = CacheEntityState & T;

function updateCacheTimestamp<T>(entity: T): CachedEntity<T> {
  const timestamp: number = Date.now();
  return {
    ...entity,
    cacheAdd: (undefined !== (entity as CachedEntity<T>).cacheAdd) ? (entity as CachedEntity<T>).cacheAdd : timestamp,
    cacheUpdated: timestamp
  } as CachedEntity<T>;
}

export interface CachedEntityConfigOptions {
  ttl: number;
}
export interface CachedEntityStoreConfigOptions extends StoreConfigOptions {
  entityCache: CachedEntityConfigOptions;
}

export function CachedEntityStoreConfig(metadata: CachedEntityStoreConfigOptions) {
  return (constructor: Function) => { // tslint:disable-line ban-types
    StoreConfig(metadata)(constructor);
    constructor[configKey].entityCache = {
      ttl: (undefined !== metadata.entityCache.ttl) ? metadata.entityCache.ttl : 3600000
    };
  };
}

// tslint:disable-next-line no-any
export class CachedEntityStore<S extends EntityState = any, EntityType = getCachedEntityType<S>, IDType = getIDType<S>>
  extends EntityStore<CachedEntity<S>, CachedEntity<EntityType>, IDType> {

  get cachedEntityConfig(): CachedEntityConfigOptions {
    return (this.constructor[configKey]) ? this.constructor[configKey].entityCache || {} : {};
  }

  constructor(initialState: Partial<S> = {}, protected options: Partial<CachedEntityStoreConfigOptions> = {}) {
    super(initialState, options);
  }

  akitaPreAddEntity(entity: CachedEntity<EntityType>) {
    return updateCacheTimestamp(entity);
  }

  akitaPreUpdateEntity(prevEntity: CachedEntity<EntityType>, nextEntity: CachedEntity<EntityType>) {
    return updateCacheTimestamp(nextEntity);
  }

  expireCachedEntity(id: OrArray<IDType>) {
    this.update(id, {
      cacheUpdated: undefined
    } as Partial<CachedEntity<EntityType>>);
  }

  addPartial(entity: Partial<EntityType>) {
    this.add({
      ...entity,
      cachePartial: true
    } as CachedEntity<EntityType>);
  }

  updateCachedEntity(id: IDType, fetchFn: () => Promise<EntityType> | Observable<EntityType>, requireFull = true) {
    this.selectCachedEntity(id, fetchFn, requireFull).subscribe();
  }

  selectCachedEntity(id: IDType, fetchFn: () => Promise<EntityType> | Observable<EntityType>, requireFull = true): Observable<EntityType> {
    return new Observable<EntityType>((subscriber => {
      const ttlExpiry: number = Date.now() - this.cachedEntityConfig.ttl;
      const cacheEntity = this.getValue().entities[id as any] as CachedEntity<EntityType>;  // tslint:disable-line no-any
      if (undefined !== cacheEntity) {
        // console.log('CachedEntityStore: cache-hit', cacheEntity);
        subscriber.next(cacheEntity);
      } else {
        // console.log('CachedEntityStore: cache-miss', id);
      }
      if (undefined === cacheEntity
        || (requireFull && cacheEntity.cachePartial)
        || undefined === cacheEntity.cacheUpdated
        || cacheEntity.cacheUpdated < ttlExpiry) {
        const fetchResult = fetchFn();
        if (fetchResult instanceof Promise) {
          fetchResult
            .then(fetchedEntity => {
              // console.log('CachedEntityStore: Updated via Promise:', fetchedEntity);
              this.upsert(id, { ...fetchedEntity, cachePartial: false });
              subscriber.next(fetchedEntity);
              subscriber.complete();
            })
            .catch(error => { subscriber.error(error); });
        } else if (fetchResult instanceof Observable) {
          fetchResult
            .subscribe(
              fetchedEntity => {
                // console.log('CachedEntityStore: Updated via Observable:', fetchedEntity);
                this.upsert(id, { ...fetchedEntity, cachePartial: false });
                subscriber.next(fetchedEntity);
              },
              error => { subscriber.error(error); },
              () => { subscriber.complete(); });
        }
      } else {
        // console.log('CachedEntityStore: Fetch not required:', ttlExpiry, cacheEntity.cacheUpdated);
        subscriber.complete();
      }
    }));
  }

}
