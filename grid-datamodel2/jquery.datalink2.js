/*!
 * jQuery Data Link Plugin
 * http://github.com/jquery/jquery-datalink
 *
 * Copyright Software Freedom Conservancy, Inc.
 * Dual licensed under the MIT or GPL Version 2 licenses.
 * http://jquery.org/license
 */

 // LOOK at doing clear separation: container/query - set of objects - paths to bound nodes
(function($, undefined){

var fnSetters = {
		value: "val",
		html: "html",
		text: "text"
	},

	setFieldEvent = "setField",
	changeFieldEvent = "changeField",
	setArrayEvent = "setArray",
	changeArrayEvent = "changeArray",

	getEventArgs = {
		pop: function ( arr, args ) {
			if ( arr.length ) {
				return { change: "remove", oldIndex: arr.length - 1, oldItems: [ arr[arr.length - 1 ]]};
			}
		},
		push: function ( arr, args ) {
			return { change: "add", newIndex: arr.length, newItems: [ args[ 0 ]]};
		},
		reverse: function ( arr, args ) {
			if ( arr.length ) {
				return { change: "reset" };
			}
		},
		shift: function ( arr, args ) {
			if ( arr.length ) {
				return { change: "remove", oldIndex: 0, oldItems: [ arr[ 0 ]]};
			}
		},
		sort: function ( arr, args ) {
			if ( arr.length ) {
				return { change: "reset" };
			}
		},
		splice: function ( arr, args ) {
			var index = args[ 0 ];
			var numToRemove = args[ 1 ];
			var elementsToAdd = args.slice( 2 );
			if ( numToRemove <= 0 ) {
				if ( elementsToAdd.length ) {
					return { change: "add", newIndex: index, newItems: elementsToAdd };
				}
			} else {
				var elementsToRemove = arr.slice( index, numToRemove );
				if ( elementsToAdd.length ) {
					var move = elementsToAdd.length === elementsToRemove.length &&
						$.grep( elementsToAdd, function ( elementToAdd, index ) {
							return elementToAdd !== elementsToRemove[ index ];
						}).length === 0;
					if ( move ) {
						return { change: "move", oldIndex: index, oldItems: elementsToRemove, newIndex: index, newItems: elementsToAdd };
					} else {
						return { change: "replace", oldIndex: index, oldItems: elementsToRemove, newIndex: index, newItems: elementsToAdd };
					}
				} else {
					return { change: "remove", oldIndex: index, oldItems: elementsToRemove };
				}
			}
		},
		unshift: function ( arr, args ) {
			return { change: "add", newIndex: 0, newItems: [ args[ 0 ]]};
		},
		move: function ( arr, args ) {
			var numToMove = arguments[ 1 ];
			if ( numToMove > 0 ) {
				var fromIndex = arguments[ 0 ], 
					toIndex = arguments[ 2 ], 
					elementsToMove = arr.splice( fromIndex, numToMove );
				return { change: "move", oldIndex: fromIndex, oldItems: elementsToMove, newIndex: toIndex, newItems: elementsToMove };
			}
		}
	},
	
	arrayOperation = {
		"add": function( target, value ) {
			target.push( value[0] ); // Todo - use concat or iterate, for inserting multiple items
		}
	};

function wrapObject( object ) {
	return object instanceof jQuery ? object : $.isArray( object ) ? $( [object] ) : $( object ); // Ensure that an array is wrapped as a single array object
}

function addBinding( map, from, to ) {
			
	function setJqObject( object, type ) {
		var attrType = type + "Attr",
			jqObject = wrapObject( object ), 
			firstOb = jqObject[0];
		if ( firstOb ) { 
			var isHtml = firstOb.nodeType, 
				path = map && map[ type ];
			if ( isHtml ) {
				var defaults = $.link.defaults;
				if ( !map ) {
					map = defaults.nomap[ firstOb.nodeName.toLowerCase() ];
					map = map && map[ type ] || {};
					path = map[ type ];
				}
				jqObject = path ? jqObject.find( path ): jqObject;
				firstOb = jqObject[0];
				if ( firstOb ) { 
					defaults = defaults.merge[ firstOb.nodeName.toLowerCase() ];
					defaults = defaults && defaults[ type ] || {};
					map[ attrType ] = map[ attrType ] || defaults[ attrType ] || "text";
					map.twoWay = map.twoWay || defaults.twoWay;
				}
			} else if ( path ) {

			// Need to bind at all levels in path, not just changes in leaf object...
//				path.replace( /^(?:(.*)\.)?(\w*)$/, function( all, objectPath, attr ) {
//					jqObject = objectPath ? $( jqObject.map( function() { // Need to bind at all levels in path, not just changes in leaf object...
//						return eval( "this." + objectPath ); 
//					})) : jqObject;
//					map[ attrType ] = attr;
//				});
				map[ attrType ] = path;
			} 
		}
		return jqObject;
	}

	map = typeof map === "string" ? { from: map } : map;
	var index = 0, fromObj = setJqObject( from, "from" ), // index can be the level of path at which a binding is added. Add at each value, if there are multiple segments in the from path.
		toObj = setJqObject( to, "to" ),
		firstFromObj = fromObj[0];
	if ( firstFromObj ) { 
		if ( $.isArray( firstFromObj )) {
			fromObj.bind( changeArrayEvent, function( ev, changed ) {
				arrayOperation[ ev.change ]( toObj[0], ev.newItems );	
			});
		} else {
			fromObj.bind( firstFromObj.nodeType ? "change" : "changeField", function( ev, changed ) {
				var thisMap = map || { toAttr: changed, fromAttr: changed  },
					convert = thisMap.convert,
					value = eval( "ev.target." +  thisMap.fromAttr ); 
			
				value = convert ? convert( value, ev.target, toObj ) : value;
				if ( value !== undefined ) {
					setValue( toObj, thisMap.toAttr, thisMap.toCss, value ); 
				}
			});
		}
	}
	return map;
}

function setValue( target, field, css, value ) {
	var object= target[0];
	if ( object.nodeType ) {
		if ( css ) { 
			target.css( css, value );
		} else {
			var setter = fnSetters[ field ];
			if ( setter ) {
				target[setter]( value );
			} else {
				target.attr( field, value );
			}
		}
	} else {
		target.setField( field, value );
	}
}
		
$.extend({
	link: function( to, from, maps, options ) {
		
		maps = $.isArray( maps ) ? maps : [ maps || null ];
		for ( var i=0, l=maps.length; i<l; i++ ) {
			var map = maps[ i ];
			map = addBinding( map, from, to );
			if ( map && map.twoWay ) {
				map = { 
					convert: map.convertBack,
					from: map.to,
					to: map.from,
					fromAttr: map.toAttr
				}
				addBinding( map, to, from );
			}
		}
	},
	setField: function( target, field, value ) {
		if ( target.nodeType ) {
			var setter = fnSetters[ field ] || "attr";
			$(target)[setter](value);
		} else {
			var parts = field.split(".");
			parts[1] = parts[1] ? "." + parts[1] : "";

			var $this = $( target ),
				args = [ parts[0], value ];

			$this.triggerHandler( setFieldEvent + parts[1] + "!", args );
			if ( value !== undefined ) {
				target[ field ] = value;
			}
			$this.triggerHandler( changeFieldEvent + parts[1] + "!", args );
		}
	},
	
	// operations: pop push reverse shift sort splice unshift move 
	changeArray: function( target, operation ) {
		var eventArgs, args = $.makeArray( arguments ), ret, $this;
		
		args.splice(0, 2);
		
		if ( eventArgs = getEventArgs[ operation ]( target, args )) {
			$this = $( [target] ); // Ensure that an array is wrapped as a single array object
			
			$this.triggerHandler( setArrayEvent + "!", eventArgs );
			
			ret = operation === "move" ?
				target.splice( args[ 2 ], 0, target.splice( args[ 0 ], args[ 1 ])) :
				target[ operation ].apply( target, args );
			
			$this.triggerHandler( changeArrayEvent + "!", eventArgs );
			return ret;
		} 
		return null;
	}
});

function formConvert( value, source, targetJqObject ) {
	targetJqObject.each( function(){ 
		var self = $( this );
		value = source[self.attr("name")];
		if (this.value === undefined ) {
			self.text( value );
		} else {
			self.val( value );
		}

	});
} 

function formConvertBack( value, source, targetJqObject ) {
	targetJqObject.setField( source.name, value );
} 

$.link.defaults = {
	nomap: {
		form: {
			from: { 
				from: "[name]",
				fromAttr: "value",
				twoWay: true,
				convert: formConvertBack, 
				convertBack: formConvert
			},
			to: { 
				to: "[name]",
				toAttr: "value",
				twoWay: true,
				convertBack: formConvertBack, 
				convert: formConvert
			}
		}
	},
	merge: {
		input: {
			from: {
				fromAttr: "value"
			},
			to: { 
				toAttr: "value",
				twoWay: true
			}
		}
	}
};

$.fn.extend({
	link: function( from, maps, options ) {
		$.link( this, from, maps, options  );
		return this;
	},
	setField: function( field, value ) {
		return this.each( function() {
			$.setField( this, field, value );
		});
	}
//	,
//	changeArray: function( operation ) { // For the moment, don't support this form, since need to apply to whole array and not to each member of array.
//		return this.each( function() {
//			$.changeArray( this, operation );
//		});
//	}
});

// TODO INVESTIGATE THIS

var special = $.event.special;

$.each( "setArray changeArray".split(' '), function ( i, name ) {
	$.fn[ name ] = function ( filter, fn ) {
		if ( arguments.length === 1 ) {
			fn = filter;
			filter = null;
		}
		return fn ? this.bind( name, filter, fn ) : this.trigger( name );
	}

	special[ name ] = {
		add: function ( handleObj ) {
			var old_handler = handleObj.handler;
			handleObj.handler = function( event, change ) {
				var data = handleObj.data,
				attrName = change ? change.change : null;  // TODO -- attrChange vestiges that I don't know enough to remove.
				if ( !change || !data || data === attrName || $.inArray( attrName, data ) > -1 ) {
					$.extend( event, change );
					// todo: support extra parameters passed to trigger as
					// trigger( 'attrChange', [ <change>, extra1, extra2 ]).
					old_handler.call( this, event );
				}
			}
		}
	}
});

})( jQuery );

