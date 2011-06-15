/*
 * Grid
 * 
 * Depends on:
 * tmpl
 * datastore
 * 
 * Optional:
 * extractingDatasource
 */
(function( $ ) {

$.widget( "ui.grid", {
	options: {
		columns: null,
		rowTemplate: null
	},
	_create: function() {
		var that = this;
		
		this._columns();
		this._rowTemplate();
		this.element.addClass( "ui-widget" );
		this.element.find( "th" ).addClass( "ui-widget-header" );
		this.element.delegate( "tbody > tr", "click", function( event ) {
			that._trigger( "select", event, {
				selected: this
			});
		});
		$(this.options.source).bind("datasourceresponse", function() {
			that.refresh();
		});
		this._changeHandlerKey = ("gridDataChangeHandler" + Math.random()).replace( /\D/g, "" );
		this._itemForElKey = ("gridItemData" + Math.random()).replace( /\D/g, "" );
		var arrayChangeHandler = function( event, data ) {
			that._handleArrayChange( data );
		};
		$( [ this.options.source.toArray() ] )
			.bind( "arrayChange", arrayChangeHandler )
			.data( this._changeHandlerKey, arrayChangeHandler );
	},
	_destroy: function() {
		var array = $( [ this.options.source.toArray() ] );
		array.unbind( "arrayChange", array.data( this._changeHandlerKey ) );
	},
	_handleArrayChange: function( eventData ) {
		switch ( eventData.change ) {
			case "insert":
				var that = this,
					newItemEls = $.map( eventData.items, function( item ) {
						return that._createElForItem( item )[0];
					} );
				var tbody = this._getItemsParent();
				if ( eventData.index === 0 ) {
					$( newItemEls ).prependTo( tbody );
				} else {
					$( newItemEls ).insertAfter( tbody.children().eq( eventData.index - 1 ) );
				}
				break;

			case "remove":
				var tbody = this._getItemsParent();
				for (var i = 0; i < eventData.items.length; i++) {
					var itemEl = tbody.children().eq( eventData.index );
					this._disposeItemEl( itemEl );
					itemEl.remove();
				}
				break;

			case "move":
				var tbody = this._getItemsParent();
				var itemEls = tbody.children().eq( eventData.oldIndex )
					.nextUntil(":gt(" + eventData.oldIndex + eventData.items.length - 1 + ")").andSelf();
				// TODO: There's gotta be a better jQuery for the above.

				itemEls.detach();
				if ( eventData.newIndex === 0 ) {
					itemEl.prependTo( tbody );
				} else {
					itemEl.insertAfter( tbody.children().eq( eventData.newIndex - 1 ) );
				}
				break;

			case "refresh":
				this.refresh();
				break;
		}
	},
	_handleFieldChange: function( item, eventData ) {
		var that = this,
			itemEls = this._getItemsParent().children().filter( function() {
				return that.getDataForItem( this ) === item;
			} );
		$.each( itemEls, function() {
			that._disposeItemEl( $( this ) );
			$( this ).replaceWith( that._createElForItem( item ) );
		} );
	},
	_createElForItem: function( item ) {
		var that = this,
			fieldChangeHandler = function( event, data ) {
				that._handleFieldChange( event.target, data );
			};
		$( item ).bind( "propertyChange", fieldChangeHandler );
		return $.tmpl( this.options.rowTemplate, item )
			.data( this._itemForElKey, item )
			.data( this._changeHandlerKey, fieldChangeHandler )
			.find( "td" ).addClass( "ui-widget-content" ).end();
	},
	_getItemsParent: function() {
		return this.element.find( "tbody" );
	},
	_disposeItemEl: function( itemEl ) {
		$( this.getDataForItem( itemEl ) ).unbind( "propertyChange", itemEl.data( this._changeHandlerKey ) );
	},
	refresh: function() {
		// TODO this code assumes a single tbody which is not a safe assumption
		var tbody = this._getItemsParent(),
			template = this.options.rowTemplate,
			that = this;

		$.each( tbody.children(), function () {
			// TODO: Reuse item elements from here whose items are still in our array.
			that._disposeItemEl( $( this ) );
		} );

		tbody.empty();

		// TODO try to replace $.each with passing an array to $.tmpl, produced by this.items.something()
		// TODO how to refresh a single row?
		var that = this;
		$.each( this.options.source.toArray(), function( itemId, item ) {
			// TODO use item.toJSON() or a method like that to compute values to pass to tmpl
			that._createElForItem( item ).appendTo( tbody );
		});
		this._trigger("refresh");
	},
	getDataForItem: function ( itemEl ) {
		return $( itemEl ).data( this._itemForElKey );
	},
	getViewItems: function() {
		return this._getItemsParent().children();
	},
	
	_columns: function() {
		if ( this.options.columns ) {
			// TODO this code assumes any present th is a column header, but it may be a row header
			if ( !this.element.find( "th" ).length ) {
				// TODO improve this
				var head = this.element.find("thead");
				$.each( this.options.columns, function(index, column) {
					$("<th>").attr("data-field", column).text(column).appendTo(head)
				});
			}
			return;
		}
		this.options.columns = this.element.find( "th" ).map(function() {
			var field = $( this ).data( "field" );
			if ( !field ) {
				// generate field name if missing
				field = $( this ).text().toLowerCase().replace(/\s|[^a-z0-9]/g, "_");
			}
			return field;
		}).get();
	},

	_rowTemplate: function() {
		if ( this.options.rowTemplate ) {
			return;
		}
		var template = $.map( this.options.columns, function( field ) {
			return "<td>${" + field + "}</td>";
		}).join( "" );
		template = "<tr>" + template + "</tr>";
		this.options.rowTemplate = template;
	}
});

})( jQuery );
