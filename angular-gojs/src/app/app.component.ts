import { ViewEncapsulation } from '@angular/core';
import { Component } from '@angular/core';
import * as go from 'gojs';
import { DataSyncService, DiagramComponent, PaletteComponent } from 'gojs-angular';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  encapsulation: ViewEncapsulation.None
})
export class AppComponent {

  // initialize diagram and templates
  public initDiagram(): go.Diagram {

    const $ = go.GraphObject.make;

    // define the diagram
    const diagram = new go.Diagram({
      // stores model and diagram changes and allows undo/redo operations
      // should always be set to true
      'undoManager.isEnabled': true,
      // create the model
      model: new go.GraphLinksModel(
        {
          nodeKeyProperty: 'id',
          // must be defined for merges and data sync
          linkKeyProperty: 'key'
        }
      )
    });

    // define the node template
    diagram.nodeTemplate =
      $(go.Node, 'Auto',
        $(go.Shape, 'RoundedRectangle', { stroke: null },
          new go.Binding('fill', 'color')
        ),
        $(go.TextBlock, { margin: 8, editable: true },
          new go.Binding('text').makeTwoWay())
      );

    return diagram
  }

  // palette holds default nodes which can be dragged to another diagram
  public initPalette(): go.Palette {

    const $ = go.GraphObject.make;
    const palette = $(go.Palette);

    palette.nodeTemplate =
      $(go.Node, 'Auto',
        $(go.Shape, 'RoundedRectangle', { stroke: null },
          new go.Binding('fill', 'color')
        ),
        $(go.TextBlock, { margin: 8 },
          new go.Binding('text', 'key'))
      );
    
    return palette
  }

  // object that holds the state of the diagram elements
  public state = {

    // node data array
    diagramNodeData: [
      { id: 'Alpha', text: 'Alpha', color: 'lightblue' },
      { id: 'Beta', text: "Beta", color: 'orange' }
    ],

    // link data array
    diagramLinkData: [
      { key: -1, from: 'Alpha', to: 'Beta' }
    ],

    // modelData defines custom proerties for the model itself
    diagramModelData: { prop: 'value' },

    // should the component skip updating? often used when updating state from modelChange
    skipsDiagramUpdate: false,

    // node data for palette
    paletteNodeData: [
      { key: 'PaletteNode1', color: 'firebrick' },
      { key: 'PaletteNode2', color: 'blueviolet' }
    ]
  }

  // sets the class name with the CSS linked to it for the gojs-diagram html tag
  public diagramDivClassName: string = 'myDiagramDiv';
  public paletteDivClassName = 'myPaletteDiv';

  // handles model changes
  public diagramModelChange = function(changes: go.IncrementalData) {
    console.log(changes)
  }
}
