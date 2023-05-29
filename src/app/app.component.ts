import {
  CdkVirtualScrollViewport,
} from '@angular/cdk/scrolling';
import { HttpClient } from '@angular/common/http';
import { AfterViewInit, Component, ViewChild } from '@angular/core';
import {
  Observable,
  map,
  tap,
} from 'rxjs';
import { Person } from 'src/models/person';
import { VirtualScrollDataSource } from 'src/shared/VirtualScrollDataSource';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements AfterViewInit {
  public readonly ITEM_SIZE = 48;

  @ViewChild('viewPort')
  viewPort?: CdkVirtualScrollViewport;

  public offset$?: Observable<number>;
  protected peopledataSource!: VirtualScrollDataSource<Person>;

  private peopleData: Person[] = [];

  constructor(private httpClient: HttpClient) {}

  ngAfterViewInit() {
    if (this.viewPort === undefined) {
      throw new Error('ViewPort missing');
    }

    this.peopledataSource = new VirtualScrollDataSource<Person>(this.viewPort);

    /* offset for sticky header */
    this.offset$ = this.viewPort.renderedRangeStream
    .pipe(
      map((range) => range.start * -this.ITEM_SIZE)
    );
  }

  loadInData() {
    this.httpClient
      .get<Person[]>('/assets/people.json')
      .pipe(
        tap((people) => {
          this.peopleData = people;
          this.peopledataSource?.update(people);
        })
      )
      .subscribe();
  }

  mutateData() {
    if(this.peopleData.length === 0) return;

    const dataToMutate = this.peopleData[0];
    dataToMutate.age = 100;

    const updatedData = [
      ...this.peopleData,
    ];

    this.peopledataSource?.update(updatedData);
  }
}
