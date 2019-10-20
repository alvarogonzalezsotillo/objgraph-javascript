

function modalDialog(options, callback){
    // options IS ARRAY of {option,value}

    let d = document;

    

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
        let option = o.option || o[0];
        let value = o.value || o[1];
        
        let item = create( "div", {
            style: {
            }
        });

        item.appendChild( create( "p", {
            innerHTML : option,
            onclick : (e) => closeDialog(value)
        }));

        return item;
    }

    let background = create( "div", {
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

    for( let o of options ){
        let item = createMenuItem( o );
        console.log(item);
        background.appendChild(item);
    }

    function eventListener(event){
        if(event.key === "Escape") {
            closeDialog(null);
        }
    }

    function closeDialog(value){
        d.removeEventListener("keydown",eventListener);
        d.body.removeChild(background);
        callback(value);
    }

    d.addEventListener("keydown", eventListener );
    d.body.appendChild(background);
}
