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
  // for the diagramModelChange function to work correctly, the key property must be defined like so,
  // defining it as any other thing, such as 'id', and then setting the 'nodeKeyProperty' to 'id', (while
  // being a supposedly correct action) will make the function fail
  initialNodes: go.ObjectData[] = [
    { key: 'Alpha', text: "Alpha", color: 'lightblue', loc: '0 0' },
    { key: 'Beta', text: "Beta", color: 'orange', loc: '100 0' },
    { key: 'Gamma', text: "Gamma", color: 'lightgreen', loc: '0 100' },
    { key: 'Delta', text: "Delta", color: 'pink', loc: '100 100' },
  ];

  // initial set of links
  initialLinks: go.ObjectData[] = [
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
          linkToPortIdProperty: 'toPort',
          linkFromPortIdProperty: 'fromPort',
          // must be defined for merges and data sync
          linkKeyProperty: 'key'
        }
      )
    });

    // define default behaviour when creating a group data, used for contextMenu
    diagram.commandHandler.archetypeGroupData = { key: 'Group', isGroup: true };

    // create a port in a node for links
    const makePort = function (id: string, spot: go.Spot) {
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
    diagramModelData: { prop: 'value' } as go.ObjectData,

    // should the component skip updating? often used when updating state from modelChange
    skipsDiagramUpdate: false,

    // used by InspectorComponent
    selectedNodeData: {} as go.ObjectData,

    // node data for palette
    paletteNodeData: [
      { key: 'Epsilon', text: 'Epsilon', color: 'red' },
      { key: 'Kappa', text: 'Kappa', color: 'purple' }
    ],

    // flag to know if an update is made from the inspector
    updateFromInspector: false,
  }

  // sets the class name with the CSS linked to it for the gojs-diagram html tag
  public diagramDivClassName = 'myDiagramDiv';
  public paletteDivClassName = 'myPaletteDiv';

  // handles model changes made from the view and updates the state
  public diagramModelChange = (changes: go.IncrementalData) => {
    // if there are no changes return
    if (!changes) return;
    // skip if the change was made from the inspector component
    if (this.state.updateFromInspector) {
      this.state = {
        ...this.state,
        updateFromInspector: false
      }
      return
    }
    console.log(changes);
    
    // update the inspector data if the specific node is changed
    // get the list of modified nodes
    const modifiedNodeData = changes.modifiedNodeData;
    // check if there are any modified nodes and if there is a selected node
    // get the property name used to identify the node (key by default)
    const nodeKeyProperty = this.myDiagramComponent.diagram.model.nodeKeyProperty as string;
    if (modifiedNodeData && this.state.selectedNodeData) {
      // iterate over the modified nodes until the selected node is found
      for (let i = 0; i < modifiedNodeData.length; i++) {
        const modifiedNode = modifiedNodeData[i];
        if (modifiedNode[nodeKeyProperty] === this.state.selectedNodeData[nodeKeyProperty]) {
          this.state = {
            ...this.state,
            selectedNodeData: modifiedNode,
          }
        }
      }
    }

    this.state = {
      ...this.state,
      // set to true as the update has already been made, this function just updates the state with the changes made
      skipsDiagramUpdate: true,
      // updates state data
      diagramNodeData: DataSyncService.syncNodeData(changes, this.state.diagramNodeData),
      diagramLinkData: DataSyncService.syncLinkData(changes, this.state.diagramLinkData),
      diagramModelData: DataSyncService.syncModelData(changes, this.state.diagramModelData),
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
  public overviewDivClassName = 'myOverviewDiv';

  // function required to initialize overview component
  public initOverview(): go.Overview {
    return new go.Overview();
  }

  public observedDiagram!: go.Diagram;

  // assign the observed diagram for the overview
  public ngAfterViewInit() {
    if (this.observedDiagram) return;

    // set the observedDiagram to the initialized diagram
    this.observedDiagram = this.myDiagramComponent.diagram;
    // without this, Angular will throw ExpressionChangedAfterItHasBeenCheckedError
    this.cdr.detectChanges();

    // listener for when a node is selected
    this.myDiagramComponent.diagram.addDiagramListener('ChangedSelection', e => {
      // check if a node is selected, if not set an empty object
      if (e.diagram.selection.count === 0) this.state = {
        ...this.state,
        selectedNodeData: {}
      }
      // the selected node will be the first one in the list
      const selectedNode = e.diagram.selection.first();
      // update the state with the newly selected node
      this.state = produce(this.state, draft => {
        // check if the selection is a node
        if (selectedNode instanceof go.Node) {
          const idSelectedNode = draft.diagramNodeData.findIndex(node => node['key'] == selectedNode.data.key);
          draft.selectedNodeData = draft.diagramNodeData[idSelectedNode];
        } else {
          draft.selectedNodeData = {};
        }
      })
    })
  }

  // handle when a change is made on the Inspector
  public handleInspectorChange(changedData: any) {
    console.log(changedData);

    // prop is the parameter that changed, for example 'text', 'color' or 'loc'
    const prop = changedData.prop;
    // the new value this parameter will have
    const value = changedData.value;

    this.state = produce(this.state, draft => {
      draft.updateFromInspector = true;
      var data = draft.selectedNodeData;
      data[prop] = value;
      const key = data['key'];
      const idx = draft.diagramNodeData.findIndex(nd => nd['key'] == key);
      if (idx >= 0) {
        draft.diagramNodeData[idx] = data;
        draft.skipsDiagramUpdate = false // we need to sync GoJS data with this new app state, so do not skips Diagram update
      }
    });
  }
}
