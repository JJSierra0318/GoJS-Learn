import { Component, EventEmitter, Input, Output } from '@angular/core';
import * as go from 'gojs';


@Component({
  selector: 'app-inspector',
  templateUrl: './inspector.component.html',
  styleUrls: ['./inspector.component.css']
})
export class InspectorComponent {

  @Input()
  public nodeData: go.ObjectData | undefined;

  @Output()
  public onInspectorChange: EventEmitter<any> = new EventEmitter<any>();

  constructor() { }

  public onInputChange(e: any, prop: any) {
    this.onInspectorChange.emit({prop, value: e.target.value});
  }

}