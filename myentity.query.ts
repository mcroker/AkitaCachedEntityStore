import { Injectable } from '@angular/core';
import { QueryEntity } from '@datorama/akita';
import { MyEntityStore, MyEntityState } from './myentity.store';
import { MyEntity } from './MyEntity';
import { RouterQuery } from '@datorama/akita-ng-router-store';
import { switchMap } from 'rxjs/operators';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class MyEntityQuery extends QueryEntity<MyEntityState> {

  constructor(
    protected store: MyEntityStore,
    private routerQuery: RouterQuery
  ) {
    super(store);
  }

  selectRoutedEntity(): Observable<MyEntity> {
    return this.routerQuery.selectParams('entityid').pipe(
      switchMap(entityid => this.selectEntity<MyEntity>(entityid))
    );
  }

}
