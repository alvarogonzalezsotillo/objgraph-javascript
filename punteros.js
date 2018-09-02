
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

class PropertiesExtractor extends Extractor{
    constructor(names){
        super( function(o){
            const props = names.map(n => typeof o[n] != "undefined" ? [n,o[n]] : [] );
            const filtered = props.filter( a => a.length != 0 );
            return filtered;
        });
    }
}


class OwnPropertiesExtractor extends Extractor{
    constructor(names){
        super( function(o){
            return names.map(n => o.hasOwnProperty(n) ? [n,o[n]] : [] ).
                filter( a => a.length != 0 );
        });
    }
}

const PrototypeExtractor = new Extractor( o => [["[[prototype]]",Object.getPrototypeOf(o)]] );

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

const EnumerablePropertiesExtractor = new Extractor(
    function(o){
        const props = Object.keys(o);
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
        this._edges.push( new EdgeTo(o,name) );
    }
}

class Nominator{
    constructor(func){
        this._func = func;
    }
    nameOf(o){
        return this._func(o);
    }
}

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

class ChainedNominator extends Nominator{

    static makeFunction(nominators){
        return function(o){
            for( let i = 0 ; i < nominators ; i++ ){
                const n = nominators[i].nameOf(o);
                if( n != null ){
                    return n;
                }
            }
            return null;
        };
    }
    
    constructor(nominators){
        super(ChainedNominator.makeFunction(nominators));
    }
}

class Pointers{

    static scopeToArray(scope){
        const ret = [];
        for( let p in scope ){
            ret.push(scope[p]);
        }
        return ret;
    }

    constructor(objects,extractors,nominator,filter,maxLevel){
        this._objects = objects;
        extractors = extractors;
        for( let i = 0 ; i < extractors.length ; i++ ){
            if( typeof extractors[i] == "string" ){
                extractors[i] = new PropertiesExtractor([extractors[i]]);
            }
        }
        this._extractors = extractors;
        this._nominator = nominator || DefaultNominator;
        this._maxLevel = maxLevel || 4;
        this._filter = filter || function(o){ return typeof o != "string"; };
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


function test(){
    const scope = new function(){
        this.a = { toString: () => "a", uno: 7 };
        this.d = { toString: () => "d", uno: 8, puntero: null };
        this.c = { toString: () => "c", uno: (obj)=>obj , puntero: this.d };
        this.b = { toString: () => "b", uno: "8", puntero: this.c};
        this.a.puntero = this.b;
    }();

    const extractors = [EnumerablePropertiesExtractor];
    dotFile({scope:scope, extractors: extractors});
}

function doubleLinkedList(){
    const scope = new function(){
        class Node{
            constructor(data){
                this.data = data;
            }
            get data(){ return this._data; };
            set data(d){ this._data = d; };
            get next(){ return this._next; };
            set next(n){ this._next = n; };
            get previous(){ return this._previous; };
            set previous(p){ this._previous = p; };
        }

        class List{
            get first(){ return this._first; };
            get last(){ return this._last; };
            append(data){
                const node = new Node(data);
                node.previous = this._last;
                if( this._last ) this._last.next = node;
                this._last = node;
                if( !this._first ) this._first = node;
            }
            preppend(data){
                const node = new Node(data);
                node.next = this._first;
                if( this._first ) this._first.previous = node;
                this._first = node;
                if( !this._last ) this._last = node;
            }
        }

        this.list = new List();
        this.list.append("A");
        this.list.append("B");
        this.list.preppend("C");
        this.list.append("Soy el último");
    }();
    const extractors = ["first","last","data","next","previous"];
    
    dotFile({scope: scope, extractors: extractors});
}

function bidimensionalArray(){
    const scope = new function(){
        this.array = [];
        for( let x = 0 ; x < 5 ; x++ ){
            this.array[x] = [];
            for( let y = 0 ; y < 3 ; y++ ){
                this.array[x][y] = x+","+y;
            }
        }
        this.array.push("Hola Jaime");
    }();

    const extractors = [IndexedExtractor];
    dotFile({scope:scope, extractors: extractors});
}

function classesAndHieritance(){
    const scope = new function(){
        class Animal{
            constructor(name){
                this.name = name;
            }
            canFly(){ return false; };
        };
        class Mammal extends Animal{
            constructor(name){ super(name); }
        };
        class Bird extends Animal{
            constructor(name){ super(name); }
            canFly(){ return true; }
        };
        class Bat extends Mammal{
            constructor(name){ super(name); }
            canFly(){ return true; };
        };
        class Dog extends Mammal{
            constructor(name){ super(name); }
        }

        this.myPet = new Dog("Laika");
        this.myMonster = new Bat("Dracula");
        this.Dog = Dog;
        this.Bird = Bird;
        this.Mammal = Mammal;
        this.Bat = Bat;
        this.Animal = Animal;
    }();
    const extractors = [PrototypeExtractor,EnumerablePropertiesExtractor,new OwnPropertiesExtractor(["canFly","prototype"])];

    dotFile({scope: scope, extractors: extractors});
}

function dotFile(config){
    const scope = config.scope;
    const extractors = config.extractors;
    const out = config.out || console.log;
    const level = config.level || 100;
    const filter = config.filter;

    const objects = Pointers.scopeToArray(scope);
    const nominator = new ScopedNominator(scope);

    const g = new Pointers(objects,extractors,nominator,filter,100);

    g.toDotFile(out);
}

//test();
doubleLinkedList();
//classesAndHieritance();
//bidimensionalArray();
