
if( typeof require != "undefined" ){
    var objGraph = require("./objGraph");
}


function test(){
    const scope = new function(){
        this.a = { toString: () => "a", uno: 7 };
        this.d = { toString: () => "d", uno: 8, puntero: null };
        this.c = { toString: () => "c", uno: (obj)=>obj , puntero: this.d };
        this.b = { toString: () => "b", uno: "8", puntero: this.c};
        this.a.puntero = this.b;
    }();

    with(objGraph){
        const extractors = [EnumerablePropertiesExtractor];
        dotFile({scope:scope, extractors: extractors});
    }
    
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

    with(objGraph){
        const extractors = ["first","last","data","next","previous"];
        dotFile({scope: scope, extractors: extractors});
    }
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

    with(objGraph){
        const extractors = [IndexedExtractor];
        dotFile({scope:scope, extractors: extractors});
    }
}

function itself(){
    const scope = objGraph;

    with(objGraph){
        const extractors = [PrototypeExtractor,"prototype"];
        dotFile({scope:scope, extractors: extractors});
    }
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

    with(objGraph){
        const extractors = [PrototypeExtractor,EnumerablePropertiesExtractor,new OwnPropertiesExtractor(["canFly","prototype"])];
        dotFile({scope: scope, extractors: extractors});
    }
}


function dotFile(config){
    const scope = config.scope;
    const extractors = config.extractors;
    const out = config.out || console.log;
    const level = config.level || 100;
    const filter = config.filter;

    with(objGraph){
        createObjGraph(config).toDotFile(out);
    }
}

    //test();
    //doubleLinkedList();
    //classesAndHieritance();
    //bidimensionalArray();
    itself();

