import { Injectable } from '@angular/core';
import { MyEntityStore } from './myentity.store';
import { RouterQuery } from '@datorama/akita-ng-router-store';
import { MyEntity } from 'MyEntity';

@Injectable({ providedIn: 'root' })
export class TeamsService {

  constructor(
    private store: MyEntityStore,
    private routerQuery: RouterQuery
  ) {
    this.store.setActive(null);
    this.routerQuery.selectParams(['teamid'])
      .subscribe(([teamid]) =>
        this.entityLoader.bind(this)(teamid as string));
  }

  async entityLoader(teamid: string | undefined) {
    if (undefined !== teamid) {
      this.store.updateCachedEntity(teamid, () => this.getEntity(teamid), true);
    }
  }

  async getEntity(id: string): Promise<MyEntity> {
    // Promise or Observable to fetch the entity from server goes here
    return { stuff: 'loaded stuff' };
  };

}
