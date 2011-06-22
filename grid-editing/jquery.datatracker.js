( function ($) {

	$.dataTracker = function ( data ) {
		if ( !this.destroy ) {
			return new $.dataTracker( data );
		}

		this.updatedItems = [];
		this.insertedItems = [];
		this.removedItems = [];

		this._array = data;

		this._makeArrayObservable( this._array );

		var that = this;
		$.each( data, function() {
			that._makeItemObservable( this );
		});
	};

	$.dataTracker.prototype = {
		_array: null,

		updatedItems: null,
		insertedItems: null,
		removedItems: null,

		destroy: function () {
			$.observable.extend( this._array, null );
		},

		// TODO: To illustrate the use of $.observable(data, { useDefault: true }), I could add
		// a "merge" function here that would merge new items into this._array.

		_makeArrayObservable: function ( array ) {
			var that = this;
			$.observable.extend( array, {
				insert: {
					before: function() {
						var items = Array.prototype.slice.call( arguments, 1 );
						$.each( items, function( unused, item ) {
							var removedIndex = $.inArray( item, that.removedItems );
							if ( removedIndex >= 0 ) {
								$.observable( that.removedItems ).remove( removedIndex );
							} else {
								if ( $.inArray( item, that.insertedItems ) < 0 ) {
									that._makeItemObservable( item );
									$.observable( that.insertedItems ).insert( that.insertedItems.length, item );
								}
							}
						} );
					}
				},
				remove: {
					before: function( index, numToRemove ) {
						numToRemove = ( numToRemove === undefined || numToRemove === null ) ? 1 : numToRemove;
						var removedItems = this.data().slice( index, index + numToRemove );
						$.each( removedItems, function( unused, item ) {
							var insertedIndex = $.inArray( item, that.insertedItems );
							if ( insertedIndex >= 0 ) {
								$.observable( that.insertedItems ).remove( insertedIndex );
							} else {
								if ( $.inArray( item, that.removedItems ) < 0 ) {
									$.observable( that.removedItems ).insert( that.removedItems.length, item );
								}
							}
						} );
					}
				},
				refresh: {
					before: function( newItems ) {
						var insertedItems = $.grep( newItems, function() {
								return $.inArray( this, this.data() ) < 0 && $.inArray( this, that.insertedItems ) < 0;
							} ),
							insertedItemsObservable = $.observable( that.insertedItems );
						insertedItemsObservable.insert.apply( insertedItemsObservable, [ that.insertedItems.length ].concat( insertedItems ) );

						var removedItems = $.grep( this.data(), function() {
								return $.inArray( this, newItems ) < 0;
							} ),
							removedItemsObservable = $.observable( that.removedItems );
						removedItemsObservable.insert.apply( removedItemsObservable, [ that.removedItems.length ].concat( removedItems ) );
					}
				}				
			});
		},

		_makeItemObservable: function( item ) {
			var that = this;
			$.observable.extend( item, {
				before: function() {
					if ( $.inArray( item, that.insertedItems ) < 0 &&
						$.inArray( item, that.updatedItems ) < 0 ) {
						$.observable( that.updatedItems ).insert( that.updatedItems.length, item );
					}
				}
			});
		}
	};
} )( jQuery )
