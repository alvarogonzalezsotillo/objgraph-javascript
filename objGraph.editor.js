console.log("Cargando objGraph.editor.js");

class objGraphEditor {
    constructor(container) {
        this.container = container;
        this.buildGUI();
    }

    buildGUI() {
        const d = window.document;
        this.codeEditor = d.createElement("textarea");
        this.graphContainer = d.createElement("div");
        this.graphContainer.style = "width:50%; height:80%;";

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
            this.codeEditor.value += objGraph.examples()[0];
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


        function doLayout(cytoscape){
            let layout = cytoscape.layout({
                name: "breadthfirst",
                fit: true,
                // whether to fit the viewport to the graph
                directed: false,
                // whether the tree is directed downwards (or edges can point in any direction if false)
                padding: 30,
                // padding on fit
                circle: false,
                // put depths in concentric circles if true, put depths top down if false
                grid: false,
                // whether to create an even grid into which the DAG is placed (circle:false only)
                spacingFactor: 1.75,
                // positive spacing factor, larger => more space between nodes (N.B. n/a if causes overlap)
                boundingBox: undefined,
                // constrain layout bounds; { x1, y1, x2, y2 } or { x1, y1, w, h }
                avoidOverlap: true,
                // prevents node overlap, may overflow boundingBox if not enough space
                nodeDimensionsIncludeLabels: false,
                // Excludes the label when calculating node bounding boxes for the layout algorithm
                roots: undefined,
                // the roots of the trees
                maximal: false,
                // whether to shift nodes down their natural BFS depths in order to avoid upwards edges (DAGS only)
                animate: true,
                // whether to transition the node positions
                animationDuration: 5000,
                // duration of animation in ms if enabled
                animationEasing: undefined,
                // easing of animation if enabled,
                animateFilter: function animateFilter(node, i) {
                    return true;
                },
                // a function that determines whether the node should be animated.  All nodes animated by default on animate enabled.  Non-animated nodes are positioned immediately when the layout starts
                ready: undefined,
                // callback on layoutready
                stop: undefined,
                // callback on layoutstop

            });
            layout.run();
        }
        
        function updateCytoscape(cytoscape) {
            objgraph.toCytoscape(cytoscape);
            window.setTimeout( ()=>doLayout(cytoscape) , 1000);


        }
        this.initCytoscape(this.graphContainer);
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



}
