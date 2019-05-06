console.log("Cargando objGraph.editor.js");

class objGraphEditor {
    constructor(container) {
        this.container = container;
        this.buildGUI(this.container);
    }

    buildGUI(container) {
        const d = window.document;

        function applyStyle(elem,style){
            if( typeof style != "string" ){
                for( var s in style ){
                    elem.style[s] = style[s];
                }
            }
            else{
                elem.style = style;
            }
        }
        
        function create(tag, attrs){
            const ret = d.createElement(tag);
            for( var attr in attrs ){
                if( attr == "style" ){
                    applyStyle(ret,attrs["style"]);
                }
                else{
                    ret[attr] = attrs[attr];
                }
            }
            return ret;
        }
        
        function addRow(container, label, component){
            const row = d.createElement("row");
            const labelC = d.createElement("label");
            labelC.for = component;
            labelC.innerHTML = label;
            row.appendChild(labelC);
            row.appendChild(component);
            container.appendChild(row);
        }

        const self = this;
        const h = "90%";
        
        
        this.codeEditor = create("textarea",{
            style: {
                display:"inline-block",
                width: "48%",
                height: `${h}`,
                background: "#222222",
                color:"#aaaaaa"
            }
        });
   
        this.verticalSeparator = create("div", { style: `display:inline-block;width:1px;height:${h};background:red;overflow:visible;position:absolute;z-index:1;`});

        this.buttonViewCode = create("input",{
            style: "width: 100px; height: 8%; margin:50px -50px 0px -50px;top:40%;position:absolute",
            type: "button",
            value: "→",
            onclick : function(){
                self.codeEditor.style.width = "98%";
                self.graphContainer.style.width = "1%";
            }
        } );

        this.buttonViewBoth = create("input",{
            style: "width: 100px; height: 8%; margin:50px -50px 0px -50px;top:50%;position:absolute",
            type: "button",
            value: "↔",
            onclick : function(){
                self.codeEditor.style.width = "48%";
                self.graphContainer.style.width = "48%";
            }
        } );

        this.buttonViewGraph = create("input",{
            style: "width: 100px; height: 8%; margin:50px -50px 0px -50px;top:60%;position:absolute",
            type: "button",
            value: "←",
            onclick : function(){
                self.codeEditor.style.width = "1%";
                self.graphContainer.style.width = "98%";
            }
        } );

        this.evalButton = create("input", {
            style: "margin:50px -50px 0px -150px;bottom:5%;position:absolute",
            type: "button",
            value: "Evaluar",
            onclick: (e) => self.executeCodeEditor()
        
        });


        this.verticalSeparator.appendChild(this.buttonViewCode);
        this.verticalSeparator.appendChild(this.buttonViewBoth);
        this.verticalSeparator.appendChild(this.buttonViewGraph);
        this.verticalSeparator.appendChild(this.evalButton);
        
        this.graphContainer = create("div", {style : `display:inline-block;width:48%;height:${h};`});

        this.controls = d.createElement("div");

        this.enumerablePropertiesCheck = d.createElement("input");
        this.enumerablePropertiesCheck.type = "checkbox";
        addRow(this.controls, "Todas las propiedades enumerables", this.enumerablePropertiesCheck );

        this.toStringCheck = d.createElement("input");
        this.toStringCheck.type = "checkbox";
        addRow(this.controls, "Valor de <code>toString()</code>", this.toStringCheck );
     
        this.otherPropertiesText = d.createElement("input");
        this.otherPropertiesText.type = "text";
        addRow(this.controls, "Otras propiedades, separadas por coma", this.otherPropertiesText );

        this.prototypeCheck = d.createElement("input");
        this.prototypeCheck.type = "checkbox";
        addRow(this.controls, "Herencia (<code>prototype</code>, <code>[[prototype]]</code> y <code>constructor</code>)", this.prototypeCheck );

        


        container.appendChild(this.codeEditor);
        container.appendChild(this.verticalSeparator);
        container.appendChild(this.graphContainer);
        container.appendChild(this.controls);

        this.codeMirrorEditor = CodeMirror.fromTextArea(this.codeEditor);
        console.log(this.codeMirrorEditor);
        applyStyle(this.codeMirrorEditor.display.wrapper,{
            display:"inline-block",
            width: "48%",
            height: `${h}`,
        });

        
        this.buttonViewCode.click();
    }


    checkReturn(exports){
        if( typeof(exports) == "undefined" || exports.scope == null || typeof(exports.scope) == "undefined" ){
            
            this.codeEditor.value += "\n// MISSING objGraph.scope . EXAMPLE:";
            this.codeEditor.value += objGraph.examples()[2];

            this.codeMirrorEditor.getDoc().setValue( this.codeEditor.value );
            
            return false;
        }
        return true;
    }


    executeCodeEditor() {
        const editor = this.codeEditor;

        const code = editor.value;
        const fun = new Function(
            `
             const objGraph = {scope: null };
             const window = "disabled";
             const document = "disabled";
             ${code}
             return objGraph;
            `
        );
        const exports = fun();

        if( !this.checkReturn(exports) ){
            return;
        }

        this.buttonViewBoth.click();


        if (!exports.extractors || !Array.isArray(exports.extractors)) {
            exports.extractors = [];
        }

        if(this.enumerablePropertiesCheck.checked ){
            exports.extractors.push(objGraph.EnumerablePropertiesExtractor);
        }

        if(this.prototypeCheck.checked ){
            exports.extractors.push(objGraph.PrototypeExtractor);
            exports.extractors.push("prototype");
            exports.extractors.push( new objGraph.OwnPropertiesExtractor(["constructor"]) );
        }

        if(this.toStringCheck.checked ){
            exports.extractors.push(objGraph.ToStringExtractor);
        }

        this.otherPropertiesText.value.
            split(/[\s,]+/).
            forEach( p => exports.extractors.push(p) );

        const config = {
            scope: exports.scope,
            extractors: exports.extractors,
            filter: exports.filter
        };

        const objgraph = objGraph.createObjGraph(config);
 
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
                animate: false,
                // whether to transition the node positions
                animationDuration: 200,
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
            doLayout(cytoscape);
            //window.setTimeout( ()=>doLayout(cytoscape) , 0);


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
                        'text-opacity': 1,
                        'text-valign': 'center',
                        'text-halign': 'right',
                        'background-color': 'lightblue',
                        'font-size': '40px',
                        width: 'label',
                        height: 'label',
                        shape: 'rectangle',
                        'padding': '25',
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
                        'arrow-scale' : 2,
                        'width': 4,
                        'font-size': '30px',
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
