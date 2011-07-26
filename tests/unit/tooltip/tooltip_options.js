(function( $ ) {

module( "tooltip: options" );

test( "content: default", function() {
	var element = $( "#tooltipped1" ).tooltip().tooltip( "open" );
	same( $( "#" + element.attr( "aria-describedby" ) ).text(), "anchortitle" );
});

test( "content: return string", function() {
	var element = $( "#tooltipped1" ).tooltip({
		content: function() {
			return "customstring";
		}
	}).tooltip( "open" );
	same( $( "#" + element.attr( "aria-describedby" ) ).text(), "customstring" );
});

test( "content: return jQuery", function() {
	var element = $( "#tooltipped1" ).tooltip({
		content: function() {
			return $( "<div>" ).html( "cu<b>s</b>tomstring" );
		}
	}).tooltip( "open" );
	same( $( "#" + element.attr( "aria-describedby" ) ).text(), "customstring" );
});

asyncTest( "content: sync + async callback", function() {
	expect( 2 );
	var element = $( "#tooltipped1" ).tooltip({
		content: function( response ) {
			setTimeout(function() {
				same( $( "#" + element.attr("aria-describedby") ).text(), "loading..." );

				response( "customstring2" );
				setTimeout(function() {
					same( $( "#" + element.attr("aria-describedby") ).text(), "customstring2" );
					start();
				}, 13 );
			}, 13 );
			return "loading...";
		}
	}).tooltip( "open" );
});

test( "items", function() {
	expect( 2 );
	var element = $( "#qunit-fixture" ).tooltip({
		items: "#fixture-span"
	});

	var event = $.Event( "mouseenter" );
	event.target = $( "#fixture-span" )[ 0 ];
	element.tooltip( "open", event );
	same( $( "#" + $( "#fixture-span" ).attr( "aria-describedby" ) ).text(), "title-text" );

	// make sure default [title] doesn't get used
	event.target = $( "#tooltipped1" )[ 0 ];
	element.tooltip( "open", event );
	same( $( "#tooltipped1" ).attr( "aria-describedby" ), undefined );

	element.tooltip( "destroy" );
});

test( "tooltipClass", function() {
	expect( 1 );
	var element = $( "#tooltipped1" ).tooltip({
		tooltipClass: "custom"
	}).tooltip( "open" );
	ok( $( "#" + element.attr( "aria-describedby" ) ).hasClass( "custom" ) );
});


asyncTest( "hide/show ui effect", function() {
	expect( 4 );

	// part 1 - simple ui effect name
	var element = $( "#tooltipped1" ).tooltip({
			show: "testEffect",
			hide: "testEffect"
		}),
		currentState;

	function openClose() {

		currentState = "show";
		element.tooltip( "open" );

		currentState = "hide";
		element.tooltip( "close" );

	}

	$.effects.effect.testEffect = function( options, next ) {
		equal( options.mode, currentState, "Effect mode is current state" );

		// perform a simple show/hide
		$( this )[ options.mode ]();
		next();
	};

	openClose();

	// part 2 - ui effect with options
	element.tooltip( "destroy" );
	element.tooltip({
		show: {
			effect: "testEffectOptions",
			option: "show",
			duration: 0
		},
		hide: {
			effect: "testEffectOptions",
			option: "hide",
			duration: 0
		}
	});

	$.effects.effect.testEffectOptions = function( options, next ) {
		equal( options.mode, options.option, "Effect options passed correctly" );

		// perform a simple show/hide
		$( this )[ options.mode ]();
		next();
	};

	openClose();

	delete $.effects.effect.testEffect;
	delete $.effects.effect.testEffectOptions;
	element.tooltip( "destroy" );
	element.queue( start );

});

asyncTest( "hide/show - base jQuery function", function() {
	expect( 2 );

	// part 1 - simple ui effect name
	var element = $( "#tooltipped1" ).tooltip({
			show: "testIn",
			hide: "testOut"
		}),
		currentState;

	function openClose() {

		currentState = "show";
		element.tooltip( "open" );

		currentState = "hide";
		element.tooltip( "close" );

	}

	$.fn.testIn = function( duration, easing, callback ) {
		equal( currentState, "show", "Opening widget called correct function" );
		return this.show();
	};

	$.fn.testOut = function( duration, easing, callback ) {
		equal( currentState, "hide", "Closing widget called correct function" );
		return this.hide();
	};

	openClose();
	delete $.fn.testIn;
	delete $.fn.testOut;
	element.tooltip( "destroy" );
	element.queue( start );
});

}( jQuery ) );
