console.log("Cargando objGraph.editor.js");

class objGraphEditor {
    constructor(container) {
        this.container = container;
        this.buildGUI();
    }

    buildGUI() {
        const d = window.document;
        this.codeEditor = d.createElement("textarea", { style: "background: red;" });
        this.graphContainer = d.createElement("div");
        this.initCytoscape(this.graphContainer);

        this.controls = d.createElement("div");
        this.evalButton = d.createElement("button", { value: "Evaluar" });
        this.evalButton.onclick = (e) => this.executeCodeEditor();
        this.controls.appendChild(this.evalButton);


        this.container.appendChild(this.codeEditor);
        this.container.appendChild(this.graphContainer);
        this.container.appendChild(this.controls);
    }


    checkReturn(exports){
        if( exports == null || typeof(exports) == "undefined" || exports.scope == null || typeof(exports.scope) == "undefined" ){
            
            this.codeEditor.value += "\n// MISSING module.exports.scope . EXAMPLE:";
            this.codeEditor.value += objGraph.examples()[2];
            return false;
        }
        return true;
    }


    executeCodeEditor() {
        const editor = this.codeEditor;

        const code = editor.value;
        const fun = new Function(
            "const module = {exports: {scope: null} };\n" +
            code +
            "\nreturn module.exports;");
        const exports = fun();

        if( !this.checkReturn(exports) ){
            return;
        }


        if (!exports.extractors) {
            exports.extractors = [];
        }





        const config = {
            scope: exports.scope,
            extractors: exports.extractors,
            filter: exports.filter
        };

        console.log("Creating graph.");
        const objgraph = objGraph.createObjGraph(config);
        console.log("Graph created.");

        function updateCytoscape(cytoscape) {
            objgraph.toCytoscape(cytoscape);
            cytoscape.layout({
                name: "breadthfirst",
                directed: true,
                avoidOverlap: true,
                nodeDimensionsIncludeLabels: true,
                spacingFactor: 0.5,
                maximalAdjustments: 100
            });

            console.log("Position of v0");
            let position = cytoscape.$("#v0").position();
            console.log(position)

        }
        updateCytoscape(this.cytoscape);


    }


    initCytoscape(container) {
        this.cytoscape = cytoscape({
            container: container,
            boxSelectionEnabled: false,
            autounselectify: true,

            style: [
                {
                    selector: 'node',
                    style: {
                        'content': 'data(label)',
                        'text-opacity': 0.5,
                        'text-valign': 'center',
                        'text-halign': 'right',
                        'background-color': '#11479e',
                        width: 'label',
                        height: 'label',
                        shape: 'rectangle',
                        'padding': '50',
                        'border-width': '1px',
                        'padding-relative-to': 'min',
                        'text-valign': 'center',
                        'text-halign': 'center',
                    }
                },

                {
                    selector: 'edge',
                    style: {
                        content: 'data(label)',
                        'curve-style': 'bezier',
                        'width': 4,
                        'target-arrow-shape': 'triangle',
                        'line-color': '#9dbaea',
                        'target-arrow-color': '#9dbaea',
                        'text-rotation': 'autorotate',
                    }
                }
            ],
        });
    }

    initMxgraph(container) {
        // Checks if the browser is supported
        if (!mxClient.isBrowserSupported()) {
            // Displays an error message if the browser is not supported.
            mxUtils.error('Browser is not supported!', 200, false);
        }
        else {
            // Disables the built-in context menu
            mxEvent.disableContextMenu(container);

            // Creates the graph inside the given container
            var graph = new mxGraph(container);
            this.mxgraph = graph;

            graph.addListener(mxEvent.MOVE_CELLS, function (e) {
            });

            // Enables rubberband selection
            new mxRubberband(graph);

            // Changes the default vertex style in-place
            var style = graph.getStylesheet().getDefaultVertexStyle();
            style[mxConstants.STYLE_PERIMETER] = mxPerimeter.RectanglePerimeter;
            //style[mxConstants.STYLE_GRADIENTCOLOR] = 'white';
            style[mxConstants.STYLE_PERIMETER_SPACING] = 6;
            style[mxConstants.STYLE_ROUNDED] = true;
            //style[mxConstants.STYLE_SHADOW] = true;

            style = graph.getStylesheet().getDefaultEdgeStyle();
            //style[mxConstants.STYLE_ROUNDED] = true;
        }



    }


}