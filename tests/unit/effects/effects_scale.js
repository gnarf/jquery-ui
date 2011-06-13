(function( $ ) {
	module( "effect.scale: Scale Effect" );

	asyncTest( "Position set properly", function() {
		var test = $( ".testScale" ),
			queue = $({});

		function run( position, v, h, vo, ho ) {
			queue.queue(function( next ) {
				var css = {
						position: position
					},
					effect = {
						effect: "scale",
						mode: "effect",
						percent: 200,
						origin: [ vo, ho ],
						complete: complete,
						duration: 100
					},
					target = {},
					relative = position === "relative";

				css[ h ] = 100;
				css[ v ] = 100;
				target[ h ] = h === ho ? css[ h ] : ho == "center" ? css[ h ] - 35 : css[ h ] - 70;
				target[ v ] = v === vo ? css[ v ] : vo == "middle" ? css[ v ] - 35 : css[ v ] - 70;
				if ( relative && h == "right" ) {
					target[ h ] += 70;
				}
				if ( relative && v == "bottom" ) {
					target[ v ] += 70;
				}
				QUnit.reset();
				test = $( ".testScale" ).css( css ).effect( effect );

				function complete() {
					var desc = position + " ("+v+","+h+") - origin: ("+ho+","+vo+")";
					equal( parseInt( test.css( h ), 10 ), target[ h ], "Horizontal Position Correct " + desc );
					equal( parseInt( test.css( v ), 10 ), target[ v ], "Vertical Position Correct " + desc );
					next();
				}
			});
		}

		function suite( position ) {
			run( position, "top", "left", "top", "left" );
			run( position, "top", "left", "middle", "center" );
			run( position, "top", "left", "bottom", "right" );
			run( position, "bottom", "right", "top", "left" );
			run( position, "bottom", "right", "middle", "center" );
			run( position, "bottom", "right", "bottom", "right" );
		}

		suite( "absolute" );
		suite( "relative" );

		$.offset.initialize();
		if ( $.offset.supportsFixedPosition ) {
			suite( "fixed" );
		}

		queue.queue(function() {
			start();
		});
	});

})( jQuery );
