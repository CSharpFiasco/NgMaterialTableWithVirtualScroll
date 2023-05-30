import { DataSource, ListRange } from '@angular/cdk/collections';
import {
  CdkVirtualScrollRepeater,
  CdkVirtualScrollViewport,
} from '@angular/cdk/scrolling';
import { MatTableDataSource } from '@angular/material/table';
import {
  BehaviorSubject,
  Observable,
  combineLatest,
  map,
  startWith,
} from 'rxjs';

export class VirtualScrollDataSource<T>
  extends DataSource<T>
  implements CdkVirtualScrollRepeater<T>
{
  // Create MatTableDataSource so we can have all sort, filter bells and whistles
  private readonly matTableDataSource: MatTableDataSource<T> = new MatTableDataSource<T>([]);

  // Expose dataStream so that the ViewPort knows when data stream changes
  public readonly dataStream: Observable<T[]>;

  constructor(private readonly viewPort: CdkVirtualScrollViewport) {
    super();

    this.dataStream = this.matTableDataSource.connect().asObservable();

    this.viewPort.attach(this);
  }

  /** Connect is called by table to know what to render */
  connect(): Observable<T[]> {
    return this.filterByRangeStream(this.dataStream);
  }

  /* Required by CdkVirtualScrollRepeater interface, but we don't have a use case for it at the moment */
  measureRangeSize(
    _range: ListRange,
    _orientation: 'horizontal' | 'vertical'
  ): number {
    throw new Error('Unsupported behavior');
  }

  disconnect() {
    // Intentionally left empty
  }

  public getCurrentData(): T[]{
    return this.matTableDataSource.data;
  }

  public update(people: T[]) {
    this.matTableDataSource.data = [...people];
  }

  /* Since we only want to render items that fit in the viewport, we slice the range that would exist in the viewport */
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