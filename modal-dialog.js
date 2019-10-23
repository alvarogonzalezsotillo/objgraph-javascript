

class ModalDialog{


    
    constructor(){
        const d = document;


        function create(tag, attrs){
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

        
        this.background = create( "div", {
            style: {
                "display" : "block",
                "position": "absolute",
                "margin": "0px 0px 0px 0px",
                "padding": "0px 0px 0px 0px",
                "background" : "yellow",
                "top": "0px",
                "right": "0px",
                "left" : "0px",
                "bottom" : "0px",
                "z-index" : 10
            }
        });
    }


    eventListener(event){
        if(event.key === "Escape") {
            closeDialog(null);
        }
    }

    
    show(element,callback){
        const d = document;
        this.callback = callback;
        d.addEventListener("keydown", this.eventListener );
        this.background.appendChild(element);
        d.body.appendChild(this.background);
    }

    closeDialog(value){
        const d = document;
        d.removeEventListener("keydown", this.eventListener);
        d.body.removeChild(this.background);
        this.callback(value);
    }
    

}

function modalDialog(options, callback){
    // options IS ARRAY of {option,value}

    const d = document;
    const dialog = new ModalDialog();
    

    function create(tag, attrs){
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

    function createMenuItem(o){
        const option = o.option || o[0];
        const value = o.value || o[1];
        
        const item = create( "div", {
            style: {
            }
        });

        item.appendChild( create( "p", {
            innerHTML : option,
            onclick : (e) => dialog.closeDialog(value)
        }));

        return item;
    }



    const menu = create( "div", {
        style: {
            "display" : "block",
        }
    });

    for( const o of options ){
        const item = createMenuItem( o );
        menu.appendChild(item);
    }

    dialog.show(menu,callback);
}
