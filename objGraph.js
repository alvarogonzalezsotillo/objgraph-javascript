
const objGraph = (function(){

    const ret = {};
    function log(s){
        //console.log(s);
    }

    class Extractor{
        constructor(func){
            this._func = func;
        }

        extract(o){
            if( !o || typeof o == "undefined" ){
                return [];
            }
            return this._func(o);
        }
    }
    ret.Extractor = Extractor;
    

    class PropertiesExtractor extends Extractor{
        constructor(names){
            super( function(o){
                const props = names.map(n => typeof o[n] != "undefined" ? [n,o[n]] : [] );
                const filtered = props.filter( a => a.length != 0 );
                log( o + " [" + names + "]:" + filtered );
                return filtered;
            });
        }
    }
    ret.PropertiesExtractor = PropertiesExtractor;
    


    class OwnPropertiesExtractor extends Extractor{
        constructor(names){
            super( function(o){
                return names.map(n => o.hasOwnProperty(n) ? [n,o[n]] : [] ).
                    filter( a => a.length != 0 );
            });
        }
    }
    ret.OwnPropertiesExtractor = OwnPropertiesExtractor;

    const PrototypeExtractor = new Extractor( o => [["[[prototype]]",Object.getPrototypeOf(o)]] );
    ret.PrototypeExtractor = PrototypeExtractor;

    const IndexedExtractor = new Extractor( function(o){
        if( !(o instanceof Array) ){
            return [];
        }
        const ret = [];
        for( let i = 0 ; i < o.length ; i++ ){
            ret.push( [i,o[i]] );
        }
        return ret;
    });
    ret.IndexedExtractor = IndexedExtractor;

    const EnumerableOwnPropertiesExtractor = new Extractor(
        function(o){
            const props = Object.getOwnPropertyNames(o);
            const obj = o;
            const ret = [];
            for( let i = 0 ; i < props.length ; i++ ){
                const p = props[i];
                try{
                    ret.push([p,o[p]]);
                }
                catch(e){
                    ret.push([p,e.toString()]);
                }
            }
            return ret;
        }
    );
    ret.EnumerableOwnPropertiesExtractor = EnumerableOwnPropertiesExtractor;

    const ToStringExtractor = new Extractor(
        function(o){
            if( o.toString && !o.__skipToStringExtractor ){
                return [["toString", { __skipToStringExtractor: true, toString: function(){ return o.toString() } }]];
            }
            return [];
        }
    );
    ret.ToStringExtractor = ToStringExtractor;
    
    const EnumerablePropertiesExtractor = new Extractor(
        function(o){
            let props = Object.keys(o);
            if( typeof(o) == "string" ){
                props = ["length"]; 
            }
            const obj = o;
            const ret = [];
            for( let i = 0 ; i < props.length ; i++ ){
                const p = props[i];
                if( p == "__skipToStringExtractor" ){
                    continue;
                }
                try{
                    ret.push([p,o[p]]);
                }
                catch(e){
                    ret.push([p,e.toString()]);
                }
            }
            return ret;
        }
    );
    ret.EnumerablePropertiesExtractor = EnumerablePropertiesExtractor;
    

    class EdgeTo{
        constructor(obj,name){
            this._obj = obj;
            this._name = name;
        }
        get obj(){
            return this._obj;
        }
        get name(){
            return this._name;
        }
    }

    class AdjacencyList{
        constructor(obj){
            this._obj = obj;
            this._edges = [];
        }
        
        get obj(){
            return this._obj;
        }

        get edges(){
            return this._edges.slice(0);
        }

        edgeTo(o,name){
            if( typeof o == "undefined" ){
                return;
            }
            if( this._edges.find( e => e.name == name) ){
                return;
            }
            this._edges.push( new EdgeTo(o,name) );
        }
    }
    ret.AdjacencyList = ret.AdjacencyList;

    class Nominator{
        constructor(func){
            this._func = func;
        }
        nameOf(o){
            return this._func(o);
        }
    }
    ret.Nominator = Nominator;

    const DefaultNominator = new Nominator( function(o){
        if( o == null ){
            return "null";
        }
        if( typeof o == "undefined" ){
            return "undefined";
        }
        if( typeof o == "function" ){
            if( o.name != "" ){
                return "function:" + o.name;
            }
            return "anonymous function";
        }
        if( Object.prototype.hasOwnProperty.call(o,"constructor") && typeof o.constructor == "function" ){
            return "prototype of:" + o.constructor.name;
        }

        let toString = null;
        let toStringError = null;
        try{
            toString = String(o);
        }
        catch(e){
            toStringError = e.toString();
        }

        if (typeof o === 'string' || o instanceof String || o.__skipToStringExtractor ){
            return toString;
        }
        
        if( typeof o == "object" ){
            if( toString && o.hasOwnProperty("toString") && typeof o.toString == "function" ){
                return o.constructor.name + ":" + o.toString();
            }
            else{
                return o.constructor.name;
            }
        }

        return toString;
    });
    ret.DefaultNominator = DefaultNominator;

    class ScopedNominator extends Nominator{

        static makeFunction(scope){
            return function(o){
                for( let p in scope ){
                    if( scope[p] === o ){
                        return p;
                    }
                }
                return DefaultNominator.nameOf(o);
            };
        }
        
        constructor(scope){
            super( ScopedNominator.makeFunction(scope) );
        }
    };
    ret.ScopedNominator = ScopedNominator;


    
    class ObjGraph{

        static scopeToArray(scope){
            const ret = [];
            for( let p in scope ){
                ret.push(scope[p]);
            }
            return ret;
        }

        constructor(objects,extractors,nominator,filter,maxLevel){
            this._objects = objects;
            log( "ObjGraph: objects:" + objects );
            extractors = extractors.map( function(e){
                if( typeof e == "string" ){
                    return new PropertiesExtractor([e]);
                }
                else{
                    return e;
                }
                
            });
            this._extractors = extractors;
            this._nominator = nominator || DefaultNominator;
            this._maxLevel = maxLevel || 4;

            const defaultFilter = o => true; 
            this._filter = filter  || defaultFilter;

        }

        get objects(){
            return this._objects;
        }

        get extractors(){
            return this._extractors;
        }

        get nominator(){
            return this._nominator;
        }

        get filter(){
            return this._filter;
        }

        get graph(){
            if( this._graph ){
                return this._graph;
            }
            this._graph = [];
            this.objects.forEach( o => this.addToGraph(this._graph,o,0) );
            return this._graph;
        }

        
        addToGraph(graph,o,level){
            log( "addToGraph:" + o + " -- " + level );
            if( level > this._maxLevel ){
                return;
            }
            
            if( typeof o == "undefined" ){
                return;
            }
            
            const g = this._graph;

            const findOrInsert = function(o){
                for( let i = 0 ; i < g.length ; i++ ){
                    if( g[i].obj === o ){
                        return null;
                    }
                }
                const ret = new AdjacencyList(o);
                g.push( ret );
                return ret;
            };

            const list = findOrInsert(o);

            const includeSubproperties = !this.filter || this.filter(o);
            log( "addToGraph: includeSubproperties:" + includeSubproperties );


            if( list && includeSubproperties ){
                const newObjects = [];
                this.extractors.map( function(e){
                    e.extract(o).forEach( function(nameAndTo){
                        if( nameAndTo ){
                            const name = nameAndTo[0];
                            const to = nameAndTo[1];
                            list.edgeTo(to,name);
                            newObjects.push(to);
                        }
                    });
                });
                newObjects.forEach(no => this.addToGraph(graph,no,level+1) );
            }
        }

        dump(out){
            const g = this.graph;
            const n = this.nominator;
            out("Graph:");
            out("  Nodes:" + g.length );

            g.forEach( function(list){
                out("    Node:" + n.nameOf(list.obj) );
                list.edges.forEach( function(edge){
                    out( "      " + edge.name + ": " + n.nameOf(edge.obj) );
                });
            });
        }

        toMxGraph(mxgraph){
            const g = this.graph;
            const n = this.nominator;
            const parent = mxgraph.getDefaultParent();

            const find = function(o){
                for( let i = 0 ; i < g.length ; i++ ){
                    if( g[i].obj === o ){
                        return i;
                    }
                }
                return null;
            };

            const vertex = g.map(function(list){
                const label = n.nameOf(list.obj);
                const w = 20+label.length*7;
                const h = 20;
                const v = mxgraph.insertVertex(parent,null,label,0,0,w,h);
                return v;
            });


            for( let i = 0 ; i < g.length ; i++ ){
                const list = g[i];
                const fromVertex = vertex[i];
                log("from:" + list );
                const from = list.obj;
                list.edges.forEach( function(edge){
                    const to = edge.obj;
                    const toIndex = find(to);
                    const toVertex = vertex[toIndex];
                    const label = edge.name;
                    mxgraph.insertEdge(parent,null,label,fromVertex,toVertex);
                });
            }
            
        }

        toDotFile(out){
            const g = this.graph;
            const n = this.nominator;

            const find = function(o){
                for( let i = 0 ; i < g.length ; i++ ){
                    if( g[i].obj === o ){
                        return i;
                    }
                }
                return null;
            };

            
            out("digraph{");
            for( let i = 0 ; i < g.length ; i++ ){
                out( "  node" + i + " [ label=\"" + n.nameOf(g[i].obj) + "\"];");
            }

            for( let i = 0 ; i < g.length ; i++ ){
                const from = g[i].obj;
                for( let j = 0 ; j < g[i].edges.length ; j++ ){
                    const to = g[i].edges[j].obj;
                    const toIndex = find(to);
                    const label = g[i].edges[j].name;
                    out( "  node" + i + " -> node" + toIndex + " [ label=\"" + label  + "\"];");
                }
            }
            


            out("}");
        }
    }
    ret.ObjGraph = ObjGraph;

    function createObjGraph(config){
        const scope = config.scope;
        const extractors = config.extractors;
        const out = config.out || log;
        const level = config.level || 5;
        const filter = config.filter;

        log("createObjGraph: extractors:" + extractors );
        
        with(objGraph){
            let objects;
            let nominator;
            if( Array.isArray(scope) ){
                objects = scope;
            }
            else{
                objects = ObjGraph.scopeToArray(scope);
                nominator = new ScopedNominator(scope);
            }
            const g = new ObjGraph(objects,extractors,nominator,filter,level);
            return g;
        }
    }
    ret.createObjGraph = createObjGraph;

    return ret;
})();

if( typeof module == "undefined" ){
    module = {};
}

module.exports = objGraph;

