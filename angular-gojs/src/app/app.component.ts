import { ViewEncapsulation, ViewChild, Component, ChangeDetectorRef } from '@angular/core';
import * as go from 'gojs';
import { DataSyncService, DiagramComponent, PaletteComponent } from 'gojs-angular';
import produce from "immer";

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  encapsulation: ViewEncapsulation.None
})
export class AppComponent {

  // initial set of nodes
  initialNodes: go.ObjectData[] = [
    { key: 'Alpha', text: "Alpha", color: 'lightblue', loc: '0 0' },
    { key: 'Beta', text: "Beta", color: 'orange', loc: '100 0' },
    { key: 'Gamma', text: "Gamma", color: 'lightgreen', loc: '0 100' },
    { key: 'Delta', text: "Delta", color: 'pink', loc: '100 100' },
  ];

  // initial set of links
  initialLinks = [
    // fromPort and toPort indicate from and to which port the link goes
    // the port is created in the makePort and the values are assigned in the diagram.nodeTemplate
    { key: -1, from: 'Alpha', to: 'Beta', fromPort: 'r', toPort: '1' },
    { key: -2, from: 'Alpha', to: 'Gamma', fromPort: 'b', toPort: 't' },
    { key: -3, from: 'Beta', to: 'Beta', fromPort: 'b', toPort: 'b' },
    { key: -4, from: 'Gamma', to: 'Delta', fromPort: 'r', toPort: 'l' },
    { key: -5, from: 'Delta', to: 'Alpha', fromPort: 't', toPort: 'r' }
  ];

  // save the reference of the element with id 'myDiagram' for use after initialization
  @ViewChild('myDiagram', { static: true }) public myDiagramComponent!: DiagramComponent;

  // inform Angular to detect changes after initialization
  constructor(private cdr: ChangeDetectorRef) { }

  // initialize diagram and templates
  public initDiagram(): go.Diagram {

    const $ = go.GraphObject.make;

    // define the diagram
    const diagram = new go.Diagram({
      // stores model and diagram changes and allows undo/redo operations
      // should always be set to true
      'undoManager.isEnabled': true,
      // allows to create a new node with double click
      'clickCreatingTool.archetypeNodeData': { text: 'new node', color: 'lightblue' },
      // create the model
      model: $(go.GraphLinksModel,
        {

          linkKeyProperty: 'key'
        }
      )
    });

    // define default behaviour when creating a group data, used for contextMenu
    diagram.commandHandler.archetypeGroupData = { key: 'Group', isGroup: true };

    // create a port in a node for links
    const makePort = function(id: string, spot: go.Spot) {
      return $(go.Shape, 'Circle',
        {
          opacity: .5,
          fill: 'gray', strokeWidth: 0, desiredSize: new go.Size(5, 5),
          portId: id, alignment: spot,
          fromLinkable: true, toLinkable: true
        }
      );
    }

    // define the node template
    diagram.nodeTemplate =
      $(go.Node, 'Spot',
        {
          // what appears when a node is right clicked
          contextMenu:
            $('ContextMenu',
              $('ContextMenuButton',
                $(go.TextBlock, 'Group'),
                // when the 'Group' text is clicked a group with the selected nodes will be created
                { click: function (e, obj) { e.diagram.commandHandler.groupSelection(); } },)
            )
        },
        // bind the loc (as a go.Point) into the 'location' and make changes twoWay
        new go.Binding("location", "loc", go.Point.parse).makeTwoWay(go.Point.stringify),

        $(go.Panel, 'Auto',
          $(go.Shape, 'RoundedRectangle', { stroke: null },
            new go.Binding('fill', 'color')
          ),
          $(go.TextBlock, { margin: 8, editable: true },
            new go.Binding('text').makeTwoWay())
        ),

        // create ports in the respective points
        makePort('t', go.Spot.TopCenter),
        makePort('l', go.Spot.Left),
        makePort('r', go.Spot.Right),
        makePort('b', go.Spot.BottomCenter)
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

    palette.model = new go.GraphLinksModel(
      {
        linkKeyProperty: 'key'
      }
    )

    return palette
  }

  // object that holds the state of the diagram elements
  public state = {

    // node data array
    diagramNodeData: this.initialNodes,

    // link data array
    diagramLinkData: this.initialLinks,

    // modelData defines custom proerties for the model itself
    diagramModelData: { prop: 'value' },

    // should the component skip updating? often used when updating state from modelChange
    skipsDiagramUpdate: false,

    // used by InspectorComponent
    //selectedNodeData: null,

    // node data for palette
    paletteNodeData: [
      { key: 'Epsilon', text: 'Epsilon', color: 'red' },
      { key: 'Kappa', text: 'Kappa', color: 'purple' }
    ],
  }

  // sets the class name with the CSS linked to it for the gojs-diagram html tag
  public diagramDivClassName = 'myDiagramDiv';
  public paletteDivClassName = 'myPaletteDiv';

  // handles model changes made from the view and updates the state
  public diagramModelChange = (changes: go.IncrementalData) => {
    if(!changes) return
    console.log(this.state.diagramNodeData);
    
    this.state = {
      ...this.state,
      skipsDiagramUpdate: true,
      diagramNodeData: DataSyncService.syncNodeData(changes, this.state.diagramNodeData)
    }  
  };

  // function to reinitialize the model
  public reinitModel() {
    // clears the diagram
    this.myDiagramComponent.clear();
    // sets values for the newly initialized diagram
    this.state = produce(this.state, draft => {
      draft.skipsDiagramUpdate = false;
      draft.diagramNodeData = [...this.initialNodes];
      draft.diagramLinkData = [...this.initialLinks];
    });
  }

  // defining properties for the Overview component
  public overviewDivClassName = 'myOverviewDiv'

  // function required to initialize overview component
  public initOverview(): go.Overview {
    return new go.Overview();
  }

  public observedDiagram!: go.Diagram;

  // assign the observed diagram for the overview
  public ngAfterViewInit() {
    if (this.observedDiagram) return;

    this.observedDiagram = this.myDiagramComponent.diagram;

    this.cdr.detectChanges();
  }
}
