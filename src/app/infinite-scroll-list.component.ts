import { Component, Input } from '@angular/core';
import { BehaviorSubject, fromEvent, merge } from 'rxjs';
import { map, filter, debounceTime, distinct, tap, flatMap } from 'rxjs/operators';
import {HttpClient} from '@angular/common/http';
import * as _ from 'lodash';


@Component({
  selector: 'infinite-scroll-list',
  template: `
    <table>
      <tbody>
        <tr *ngFor="let item of itemResults$ | async"
          [style.height]="itemHeight + 'px'">
          <td>{{item.name}}</td>
        </tr>
      </tbody>
    </table>
  `,
  styles: [`h1 { font-family: Lato; }`]
})
export class InfiniteScrollListComponent {
  private cache = [];
  private pageByManual$ = new BehaviorSubject(1);
  private itemHeight = 40;
  private numberOfItems = 10;
  private pageByScroll$ = fromEvent(window, "scroll").pipe(
    map(() => window.scrollY),
    tap(v => console.log(v)),
    filter(current =>
      current >= document.body.clientHeight - window.innerHeight),
    debounceTime(200),
    distinct(),
    map(y => Math.ceil(
      (y + window.innerHeight)/ (this.itemHeight * this.numberOfItems)
      )
    )
  );

  private pageByResize$ = fromEvent(window, "resize").pipe(
    debounceTime(200),
    map(_ => Math.ceil(
      (window.innerHeight + document.body.scrollTop) /
      (this.itemHeight * this.numberOfItems)
    ))
  );

  private pageToLoad$ = merge(
    this.pageByManual$,
    this.pageByResize$,
    this.pageByScroll$
  ).pipe(
    distinct(),
    filter(page => this.cache[page-1] === undefined)
  );

  loading = false;

  itemResults$ = this.pageToLoad$.pipe(
    tap(_ => this.loading = true),
    flatMap((page: number) => {
      return this.httpClient.get(`https://swapi.co/api/people?page=${page}`).pipe(
        map((resp: any) => resp.results),
        tap(resp => {
          this.cache[page - 1] = resp;
          if((this.itemHeight * this.numberOfItems * page)
            < window.innerHeight) {
              this.pageByManual$.next(page + 1);
            }
        })
      )
    }),
    map(() => _.flatMap(this.cache))
  );
  constructor(private httpClient: HttpClient) {}

}
