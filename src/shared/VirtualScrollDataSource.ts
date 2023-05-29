import { DataSource } from '@angular/cdk/collections';
import {
  CdkVirtualScrollRepeater,
  CdkVirtualScrollViewport,
} from '@angular/cdk/scrolling';
import { MatTableDataSource } from '@angular/material/table';
import {
  BehaviorSubject,
  Observable,
  Subscription,
  combineLatest,
  map,
  startWith,
} from 'rxjs';
import { ListRange } from '@angular/cdk/collections';

export class VirtualScrollDataSource<T>
  extends DataSource<T>
  implements CdkVirtualScrollRepeater<T>
{
  private readonly viewPort: CdkVirtualScrollViewport;

  /** Stream of data that is provided to the table. */

  // Create MatTableDataSource so we can have all sort,filter bells and whistles
  private matTableDataSource: MatTableDataSource<T>;

  private renderedStream = new BehaviorSubject<T[]>([]);

  private subscription = new Subscription();

  // Expose dataStream to simulate VirtualForOf.dataStream
  public dataStream: Observable<T[]>;

  constructor(viewPort: CdkVirtualScrollViewport) {
    super();
    this.viewPort = viewPort;

    this.matTableDataSource = new MatTableDataSource<T>([]);
    this.dataStream = this.matTableDataSource.connect().asObservable();

    this.viewPort.attach(this);
  }

  /** Connect function called by the table to retrieve one stream containing the data to render. */
  connect(): Observable<T[]> {
    const tableData = this.matTableDataSource.connect();
    const filtered = this.filterByRangeStream(tableData);

    const filteredSubscription = filtered.subscribe((data) => {
      this.renderedStream.next(data);
    });

    this.subscription.add(filteredSubscription);

    return this.renderedStream.asObservable();
  }

  update(people: T[]) {
    this.matTableDataSource.data = [...people];
  }

  measureRangeSize(
    _range: ListRange,
    _orientation: 'horizontal' | 'vertical'
  ): number {
    throw new Error('Unsupported behavior');
  }

  disconnect() {
    this.subscription.unsubscribe();
  }

  private filterByRangeStream(tableData: Observable<T[]>): Observable<T[]> {
    const rangeStream = this.viewPort.renderedRangeStream.pipe(
      startWith({} as ListRange)
    );
    const filtered = combineLatest([tableData, rangeStream]).pipe(
      map(([data, { start, end }]) => {
        return start === null || end === null ? data : data.slice(start, end);
      })
    );
    return filtered;
  }
}