import { Injectable } from '@angular/core';
import { EntityState, ActiveState } from '@datorama/akita';
import { MyEntity } from './MyEntity';
import { CachedEntityStoreConfig, CachedEntityStore } from './CachedEntityStore';

export interface MyEntityState extends EntityState<MyEntity>, ActiveState { }

@Injectable({ providedIn: 'root' })
@CachedEntityStoreConfig({
  name: 'myentity',
  entityCache: { ttl: 3600000 }
})
export class MyEntityStore extends CachedEntityStore<MyEntityState> {

}
