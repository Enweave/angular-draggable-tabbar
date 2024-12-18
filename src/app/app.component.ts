import {Component, ElementRef, OnInit, ViewChild, Renderer2, AfterViewInit} from '@angular/core';
import {Observable, of} from 'rxjs';
import {LoremIpsum} from 'lorem-ipsum';
import {CommonModule} from '@angular/common';

class Coordinate {
  x: number;
  y: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }
}

@Component({
  selector: 'app-root',
  imports: [CommonModule],
  templateUrl: './app.component.html',
  standalone: true,
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit, AfterViewInit {
  lorem: Observable<string> | undefined;
  accumulationTime: number = 100;
  pointerMoveEvents: Array<PointerEvent> = [];
  pointerActive: boolean = false;
  extended: boolean = false;
  $extended: Observable<boolean>;
  evaluatePointerMove;

  @ViewChild('draggable') draggable!: ElementRef;
  @ViewChild('anchor') anchor!: ElementRef;

  constructor(private renderer: Renderer2) {
    this.$extended = of(false);
    this.evaluatePointerMove = this.throttle(() => {
      let x = 0;
      let y = 0;
      for (let i = 0; i < this.pointerMoveEvents.length; i++) {
        x += this.pointerMoveEvents[i].clientX;
        y += this.pointerMoveEvents[i].clientY;
      }

      const resultClientCoord = new Coordinate(x / this.pointerMoveEvents.length, y / this.pointerMoveEvents.length);

      this.moveDraggable(resultClientCoord);
      this.pointerMoveEvents = [];

    }, this.accumulationTime);
  }

  toggleDraggable() {
    if (this.extended) {
      this.renderer.setStyle(this.draggable.nativeElement, 'transform', 'translateY(0)');
    } else {
      const translation = this.clientToTranslate(new Coordinate(0, 0), true);
      this.renderer.setStyle(this.draggable.nativeElement, 'transform', `translateY(${translation.y}px)`);
    }

    this.extended = !this.extended;
    this.$extended = of(this.extended);
  }

  clientToTranslate(clientCoord: Coordinate, max: boolean = false): Coordinate {
    let translation = new Coordinate(0, 0);

    // get draggable size
    const draggableSize = this.draggable.nativeElement.getBoundingClientRect();

    // get anchor offset
    const anchorOffset = {
      x: this.anchor.nativeElement.getBoundingClientRect().left,
      y: this.anchor.nativeElement.getBoundingClientRect().top
    };

    if (max) {
      translation.x = draggableSize.width;
      translation.y = -draggableSize.height;
      return translation;
    }

    translation.x = clientCoord.x - anchorOffset.x;
    translation.y = clientCoord.y - anchorOffset.y;

    translation.x = this.clamp(0, translation.x, draggableSize.width);
    translation.y = this.clamp(-draggableSize.height, translation.y, 0);

    if (translation.x === 0 || translation.y === 0) {
      this.extended = false;
      this.$extended = of(this.extended);
    }

    if (translation.x === draggableSize.width || translation.y === -draggableSize.height) {
      this.extended = true;
      this.$extended = of(this.extended);
    }

    return translation;

  }

  moveDraggable(clientCoord: Coordinate) {
    const translateCoord = this.clientToTranslate(clientCoord);
    this.renderer.setStyle(this.draggable.nativeElement, 'transform', `translateY(${translateCoord.y}px)`);
  }

  ngOnInit() {
    this.lorem = new Observable((observer) => {
      const loremIpsum = new LoremIpsum({
        sentencesPerParagraph: {
          max: 8,
          min: 4
        },
        wordsPerSentence: {
          max: 16,
          min: 4
        }
      });
      observer.next(loremIpsum.generateParagraphs(2));
    });
  }

  ngAfterViewInit() {
    this.draggable.nativeElement.draggable = false;
    this.draggable.nativeElement.style.touchAction = 'none';

    this.renderer.listen(this.draggable.nativeElement, 'pointermove', (event: PointerEvent) => {
      if (this.pointerActive) {
        this.pointerMoveEvents.push(event);
        this.evaluatePointerMove();
      }
    });

    this.renderer.listen(this.draggable.nativeElement, 'pointerdown', (event: PointerEvent) => {
      if (!this.pointerActive) {
        this.pointerActive = true;
      }
    });

    ['pointerup','pointerleave', 'pointercancel'].forEach((eventName) => {
      this.renderer.listen(this.draggable.nativeElement, eventName, (event: PointerEvent) => {
        this.onPointerEnd();
      });
    });
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
  }

  private onPointerEnd() {
    this.pointerActive = false;
  }


  private throttle(func: Function, wait: number): Function {
    let timeout: number | null = null;
    return function (this: any, ...args: any[]) {
      if (timeout === null) {
        timeout = window.setTimeout(() => {
          func.apply(this, args);
          timeout = null;
        }, wait);
      }
    }
  }
}

