function log(s){
    //console.log(s);
}

log("Cargando objGraph.editor.js");

class objGraphEditor {
    constructor(container,samples) {
        this.samples = samples ? samples : objGraph.examples();
        this.container = container;
        this.separatorEnabled = true;
        this.headerSeparator = "// A partir de aquí, el código que crea el grafo de objetos y configura extractores de propiedades";
        this.footerSeparator = "// Reservado para la configuración mediante GUI";
        this.buildGUI(this.container);
    }


    lineOfSeparator(str){
        const doc = this.codeMirrorEditor.getDoc();
        for( let l = doc.lineCount()-1 ; l >= 0 ; l -= 1 ){
            const line = doc.getLine(l);
            if( line.includes( str ) ){
                return l;
            }
        }
        return -1;
    }


    markCodeMirror(){
        const doc = this.codeMirrorEditor.getDoc();
        const beginOfFooter = this.lineOfSeparator(this.footerSeparator);
        const endOfHeader = this.lineOfSeparator(this.headerSeparator);
        

        for( let i = 0 ; i < doc.lineCount() ; i++ ){
            if( i <= endOfHeader || i >= beginOfFooter ){
                this.codeMirrorEditor.addLineClass(i,"background","fondo-rayado");
            }
            else{
                this.codeMirrorEditor.removeLineClass(i,"background","fondo-rayado");
            }
        }
    }


    updateGuiExtractorsCode(){
        const endOfHeader = this.lineOfSeparator(this.headerSeparator);
        const beginOfFooter = this.lineOfSeparator(this.footerSeparator);
        log( `endOfHeader:${endOfHeader}  beginOfFooter:${beginOfFooter}`);
        this.separatorEnabled = false;
        try{
            const doc = this.codeMirrorEditor.getDoc();
            let userCode = "";
            let ini = endOfHeader+1;
            let end = beginOfFooter-1;
            for( let line = ini; line <= end ; line++ ){
                let theLine = doc.getLine(line);
                log( `line:${line} theLine:${theLine}`);
                userCode += theLine
                if( line != ini && line < end-1 ){
                    userCode += "\n";
                }
            }
            this.fillWithSample(userCode);
        }
        finally{
            this.separatorEnabled = true;
        }
    }
    
    codeMirrorBeforeChange(cm,change){
        
        const inHeader = (c) => {
            const endOfHeader = this.lineOfSeparator(this.headerSeparator);
            if( endOfHeader == -1 ){
                return false;
            }
            return c.to.line <= endOfHeader || c.from.line <= endOfHeader;
        };
        
        const inFooter = (c) => {
            const beginOfFooter = this.lineOfSeparator(this.footerSeparator);
            if( beginOfFooter == -1 ){
                return false;
            }
            return c.to.line >= beginOfFooter || c.from.line >= beginOfFooter;
        };
        
        if( !this.separatorEnabled ){
            log("beforeChange: sin habilitar"  );
            return;
        }
        
        if ( inHeader(change) || inFooter(change) ){
            log("beforeChange: cancelo el cambio" );
            change.cancel();
        }
    }

    computeContents(userCode){
        return `
// El grafo se realiza de los objetos en scope, con las propiedades de extractors
const graph = {
  scope: [],
  extractors: []
}; 

// Sandbox parcial
const window = "Deshabilitado"; const document = "Deshabilitado";
const eval = "Deshabilitado"; const Function = "Deshabilitado";

${this.headerSeparator}

${userCode}

${this.footerSeparator}
${this.guiExtractorsCode()}
        `;
    }

    fillWithSample(code){
        this.separatorEnabled = false;
        const doc = this.codeMirrorEditor.getDoc();
        doc.setValue( this.computeContents(code) );
        this.markCodeMirror();
        this.separatorEnabled = true;
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


        

        const showSamplesMenu = (samples)=>{
            const options = samples.map( (e) => { return { option: e.name, value: e.code} } );
            modalDialog(options, (code) => this.fillWithSample(code) );
            return create("p");
        }


        const self = this;
        const h = "90%";
        
        

        this.codeMirrorEditor = new CodeMirror(container,{
            mode : "javascript",
            lineNumbers : true,
            autofocus : true,
        });
        const cmWrapper = this.codeMirrorEditor.display.wrapper;


        this.fillWithSample(`graph.scope.push("Objeto para el grafo");` );

        
        this.codeMirrorEditor.on('beforeChange',this.codeMirrorBeforeChange.bind(this));

        applyStyle(cmWrapper,{
            display:"inline-block",
            width: "48%",
            height: `${h}`,
            "z-index" : 0
        });


        

        
        this.verticalSeparator = create("div", { style: `display:inline-block;width:1px;height:${h};background:red;overflow:visible;position:absolute;z-index:1;`});

        this.buttonViewCode = create("input",{
            style: "width: 100px; height: 8%; margin:50px -50px 0px -50px;top:40%;position:absolute",
            type: "button",
            value: "→",
            onclick : function(){
                cmWrapper.style.width = "98%";
                self.graphContainer.style.width = "1%";
            }
        } );

        this.buttonViewBoth = create("input",{
            style: "width: 100px; height: 8%; margin:50px -50px 0px -50px;top:50%;position:absolute",
            type: "button",
            value: "↔",
            onclick : function(){
                cmWrapper.style.width = "48%";
                self.graphContainer.style.width = "48%";
            }
        } );

        this.buttonViewGraph = create("input",{
            style: "width: 100px; height: 8%; margin:50px -50px 0px -50px;top:60%;position:absolute",
            type: "button",
            value: "←",
            onclick : function(){
                cmWrapper.style.width = "1%";
                self.graphContainer.style.width = "98%";
            }
        } );

        this.evalButton = create("input", {
            style: "margin:50px -50px 0px -150px;bottom:20px;position:absolute",
            type: "button",
            value: "Evaluar",
            onclick: (e) => self.executeCodeEditor()
            
        });

        
        this.sampleButton = create("input", {
            style: "margin:50px -50px 0px -260px;bottom:20px;position:absolute",
            
            type: "button",
            value: "Ejemplos",
            onclick : (evt) =>{
                showSamplesMenu(this.samples);
            }
        });

        this.extractorsButton = create("input", {
            style: "margin:50px -50px 0px -385px;bottom:20px;position:absolute",
            type: "button",
            value: "Extractores",
            onclick : function(evt){
                if( self.controls.style.display != "inline-block" ){
                    self.controls.style.display = "inline-block";
                }
                else{
                    self.controls.style.display = "none";
                }
            }
        });

        


        this.verticalSeparator.appendChild(this.buttonViewCode);
        this.verticalSeparator.appendChild(this.buttonViewBoth);
        this.verticalSeparator.appendChild(this.buttonViewGraph);
        this.verticalSeparator.appendChild(this.evalButton);
        this.verticalSeparator.appendChild(this.sampleButton);
        this.verticalSeparator.appendChild(this.extractorsButton);
        
        this.graphContainer = create("div", {style : `display:inline-block;width:48%;height:${h};`});

        this.controls = create( "div",{
            style: {
                display: "none",
                overflow: "visible",
                position: "absolute",
                "z-index": 1,
                "margin-left" : "-400px"
            }
        });

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

        [this.enumerablePropertiesCheck, this.toStringCheck, this.otherPropertiesText, this.prototypeCheck].forEach(
            (a) =>  a.onchange = (e) =>{
                this.updateGuiExtractorsCode();
            }
        );


        container.appendChild(this.verticalSeparator);
        container.appendChild(this.graphContainer);
        container.appendChild(this.controls);


        
        this.buttonViewCode.click();
    }


    checkReturn(exports){
        if( exports == null || typeof(exports) == "undefined" || exports.scope == null || typeof(exports.scope) == "undefined" ){
            log("Sin exports");
            let example = this.codeMirrorEditor.getDoc().getValue() + "\n// MISSING graph.scope . EXAMPLE:";
            example += objGraph.examples()[2];
            example += "\n" + this.lineSeparator;

            this.lineSeparatorEnabled = false;
            this.codeMirrorEditor.getDoc().setValue( example );
            this.lineSeparatorEnabled = true;
            
            return false;
        }
        return true;
    }


    guiExtractorsCode(){
        let ret = "";

        if( !this.prototypeCheck ){
            return ret;
        }
        
        if(this.prototypeCheck.checked ){
            ret += 'graph.extractors.push(objGraph.PrototypeExtractor)\n';
            ret += 'graph.extractors.push("prototype");\n';
            ret += 'graph.extractors.push(new objGraph.OwnPropertiesExtractor(["constructor"]));\n';
        }

        if(this.toStringCheck.checked ){
            ret += 'graph.extractors.push(objGraph.ToStringExtractor);\n';
        }

        if(this.enumerablePropertiesCheck.checked) {
            ret += 'graph.extractors.push(objGraph.EnumerablePropertiesExtractor)';
        }

        this.otherPropertiesText.value.
            split(/[\s,]+/).
            forEach( p => {if( p != "" ) ret += `graph.extractors.push("${p}");\n`} );

        if( ret != "" ){
            ret = "if( !Array.isArray(graph.extractors) ) graph.extractors = [];\n" + ret;
        }
        
        return ret;
    }


    executeCodeEditor() {

        function evaluator(code){
            let ret = {};
            try{
                // UTILIZO UN EVAL DENTRO DE UNA FUNCIÓN PARA RETRASAR EL PARSEO DEL code, Y
                // ASÍ CONSEGUIR LA LÍNEA REAL DE ERROR (SI NO, SALE LA DEL eval/Function)
                let f = new Function(`return Function(\`${code}; return graph;\` )();`);
                ret.value = f();
            }
            catch(err){
                // CHROME Y FIREFOX
                ret.error = err;
                ret.message = err.message;
                ret.stack = err.stack;

                // FIREFOX
                ret.columnNumber = err.columnNumber;
                ret.lineNumber = err.lineNumber;
                ret.errorLine = code.split("\n")[err.lineNumber-1];

            }

            return ret;
        }


        
        const editor = this.codeMirrorEditor;


        const code = editor.getValue();

        log(code);
        
        const results = evaluator(code);
        if( results.error ){
            alert(results.stack);
            return;
        }
        const exports = results.value;

        if( !this.checkReturn(exports) ){
            return;
        }

        this.buttonViewBoth.click();


        if (!exports.extractors || !Array.isArray(exports.extractors)) {
            exports.extractors = [];
        }


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
                spacingFactor: 1.50,
                // positive spacing factor, larger => more space between nodes (N.B. n/a if causes overlap)
                boundingBox: undefined,
                // constrain layout bounds; { x1, y1, x2, y2 } or { x1, y1, w, h }
                avoidOverlap: true,
                // prevents node overlap, may overflow boundingBox if not enough space
                nodeDimensionsIncludeLabels: true,
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
            //layout.run();
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
                        'padding-relative-to': 'max',
                        'text-valign': 'center',
                        'text-halign': 'center',
                    }
                },

                {
                    selector: 'edge',
                    style: {
                        content: 'data(label)',
                        'curve-style': 'bezier',
                        'control-point-step-size': 200,
                        'arrow-scale' : 20,
                        'width': 10,
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
