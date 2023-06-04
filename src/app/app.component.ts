import {
  CdkVirtualScrollViewport,
} from '@angular/cdk/scrolling';
import { HttpClient } from '@angular/common/http';
import { AfterViewInit, Component, ViewChild } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import {
  Observable,
  map,
  shareReplay,
  tap,
} from 'rxjs';
import { Person } from 'src/models/person';
import { VirtualScrollDataSource } from 'src/shared/VirtualScrollDataSource';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';


type PageSize = 5 | 10 | 25 | 100 | 1_000 | 10_000;

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements AfterViewInit {
  /* Height of mat table row */
  protected readonly ITEM_SIZE = 48;

  @ViewChild('viewPort')
  protected viewPort?: CdkVirtualScrollViewport;

  @ViewChild('paginator')
  protected paginator?: MatPaginator;

  protected tableTopOffset$?: Observable<number>;
  protected paginatorBottomOffset$?: Observable<number>;
  protected peopledataSource?: VirtualScrollDataSource<Person>;

  protected readonly columns: string[] = ['fullName', 'age', 'email'];
  protected readonly pageSizes: PageSize[] = [5, 10, 25, 100, 1_000, 10_000];
  protected readonly pageSize: PageSize = 10;
  protected totalLength: number = 0;

  drop(event: CdkDragDrop<string[]>) {
    moveItemInArray(this.columns, event.previousIndex, event.currentIndex);
  }

  private readonly data$ = this.httpClient
  .get<Person[]>('/assets/people.json')
  .pipe(
    shareReplay(),
  );

  constructor(private readonly httpClient: HttpClient) {    
  }

  ngAfterViewInit() {
    if (this.viewPort === undefined) {
      throw new Error('ViewPort missing');
    }

    if(this.paginator === undefined) {
      throw new Error('Paginator missing');
    }

    this.peopledataSource = new VirtualScrollDataSource<Person>(this.viewPort, [], {
      paginatorOptions: {
        matPaginator: this.paginator,
        pagination: (page) => {
          return this.data$
          .pipe(
            map((people) => people.slice(page.pageIndex * page.pageSize, (page.pageIndex + 1) * page.pageSize)));
        },
      }
    });

    // /* offset for sticky header */
    this.tableTopOffset$ = this.viewPort.renderedRangeStream
    .pipe(
      map((range) => range.start * -this.ITEM_SIZE)
    );

    /* offset for sticky header */
    this.paginatorBottomOffset$ = this.viewPort.renderedRangeStream
    .pipe(
      map((range) => range.start * this.ITEM_SIZE)
    );
  }

  loadInData() {
    this.data$
    .pipe(
      tap((people) => {
      this.totalLength = people.length;

      this.peopledataSource?.setData(people.slice(0, this.pageSize));
    }))
    .subscribe();
  }

  mutateData() {
    const peopleData = this.peopledataSource?.getCurrentData();
    if(peopleData === undefined || peopleData.length === 0) return;

    const dataToMutate = peopleData[0];
    dataToMutate.age = 100;

    const updatedData = [
      ...peopleData,
    ];

    this.peopledataSource?.setData(updatedData);
  }
}
