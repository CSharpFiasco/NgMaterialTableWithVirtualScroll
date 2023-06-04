import { DataSource, ListRange } from '@angular/cdk/collections';
import {
  CdkVirtualScrollRepeater,
  CdkVirtualScrollViewport,
} from '@angular/cdk/scrolling';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import {
  Observable,
  Subscription,
  combineLatest,
  map,
  mergeMap,
  tap,
} from 'rxjs';

interface VirtualScrollDataSourceMatPaginatorOptions<T> {
  matPaginator: MatPaginator,
  pagination: (page: PageEvent) => Observable<T[]>
}

export interface VirtualScrollDataSourceOptions<T> {
  paginatorOptions?: VirtualScrollDataSourceMatPaginatorOptions<T>
}

export class VirtualScrollDataSource<T>
  extends DataSource<T>
  implements CdkVirtualScrollRepeater<T>
{
  // Create MatTableDataSource so we can have all sort, filter bells and whistles
  private readonly matTableDataSource: MatTableDataSource<T> = new MatTableDataSource<T>(this.initialValue);

  // Expose dataStream so that the ViewPort knows when data stream changes
  public readonly dataStream: Observable<T[]>;
  private readonly paginatorOptions?: VirtualScrollDataSourceMatPaginatorOptions<T>;

  private readonly subscription = new Subscription();

  constructor(
      private readonly viewPort: CdkVirtualScrollViewport,
      private readonly initialValue: T[],
      options?: VirtualScrollDataSourceOptions<T>
    ) {
    super();

    this.paginatorOptions = options?.paginatorOptions;

    this.dataStream = this.matTableDataSource.connect().asObservable();

    if(this.paginatorOptions !== undefined) {
      // We subscribe to the paginator and set the data each time we paginate
      const paginatorSubscription = this.paginatorOptions.matPaginator.page
      .pipe(
        mergeMap((pageEvent) => this.paginatorOptions!.pagination(pageEvent)),
        tap((data) => this.setData(data))
      )
      .subscribe();

      this.subscription.add(paginatorSubscription);
    }

    // Virtualizes scroller
    this.viewPort.attach(this);
  }

  /** Connect is called by table to know what to render */
  connect(): Observable<T[]> {
    return this.sliceDataByRangeStream(this.dataStream);
  }

  /* Required by CdkVirtualScrollRepeater interface, but we don't have a use case for it at the moment */
  measureRangeSize(
    _range: ListRange,
    _orientation: 'horizontal' | 'vertical'
  ): number {
    throw new Error('Unsupported behavior');
  }

  disconnect() {
    this.subscription.unsubscribe();
  }

  public getCurrentData(): T[]{
    return this.matTableDataSource.data;
  }

  /* exposed to set data, for example, to load the initial page */
  public setData(data: T[]) {
    this.matTableDataSource.data = [...data];
  }

  /* Since we only want to render items that fit in the viewport, we slice the range that would exist in the viewport */
  private sliceDataByRangeStream(tableData: Observable<T[]>): Observable<T[]> {
    const rangeStream = this.viewPort.renderedRangeStream;

    const sliced = combineLatest([tableData, rangeStream]).pipe(
      map(([data, { start, end }]) => data.slice(start, end))
    );
    return sliced;
  }
}