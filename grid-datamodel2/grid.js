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
		type: null,
		rowTemplate: null,
		editable: []
	},
	_create: function() {
		var that = this;
		that._columns();
		that._rowTemplate();
		that.element.addClass( "ui-widget" );
		that.element.find( "th" ).addClass( "ui-widget-header" );
		that.element.delegate( "tbody > tr", "click", function( event ) {
			if ( that.options.selectMode ) {
				var selectedItem = $( this ).tmplItem();
				if ( that.selectedItem !==  selectedItem) {
					if ( that.selectedItem ) {
						$( that.selectedItem.nodes ).removeClass( "grid-selected-row" )
					}
					$( selectedItem.nodes ).addClass( "grid-selected-row" )
					$.setField( that, "selectedItem", selectedItem );
				}
				that._trigger( "select", event, { // So have both a select event and a generic fieldChanged event for selectedItem.
					selectedItem: selectedItem
				});
			}
		});
		that._updateSource(that.options.source, true);
		$( that ).bind( "changeField", function( event, field, value ) {
			if ( field === "source" ) {
				that._updateSource(that.source);
			}
		});
		$( that.options ).bind( "changeField", function( event, field, value ) {
			if ( field === "source" ) {
				that._updateSource(that.options.source, true);
			}
		});
	},
	refresh: function() {
		var tbody = this.element.find( "tbody" ).empty(),
			template = this.options.rowTemplate,
			linkOptions = $.link.defaults.nomap.form.to;
				
		$.tmpl( template, this._source, { rendered: function( tmplItem ){
			$.link( tmplItem.nodes[0], tmplItem.data, linkOptions );
		}}).appendTo( tbody );

		tbody.find( "td" ).addClass( "ui-widget-content" );
	},
		
	_updateSource: function(newSource, setViaOptions) {
		if ( newSource !== this._source ) {
			if ( this._source && this._arrayChangeHandler ) {
				$([ this._source ]).unbind( "changeArray", this._arrayChangeHandler );
				this._arrayChangeHandler = null;
			}

			// doesn't cover generating the columns option or generating headers when option is specified
			this._source = newSource || null;

			if ( this._source ) {
				var that = this;
				this._arrayChangeHandler = function () {
					that.refresh();
				};
				$([ this._source ]).bind( "changeArray", this._arrayChangeHandler );
			}

			this.refresh();

			$.setField( setViaOptions ? this : this.options, "source", this._source );
		}
	},
	
	_setOption: function( key, value ) {
		this._super( "_setOption", key, value );
		$.setField( this.options, key, value );
	},

	_columns: function() {
		if ( this.options.columns ) {
			// TODO check if table headers exist, generate if not
			return;
		}
		this.options.columns = this.element.find( "th" ).map(function() {
			var field = $( this ).source( "field" );
			if ( !field ) {
				// generate field name if missing
				field = $( this ).text().toLowerCase().replace(/\s|[^a-z0-9]/g, "_");
			}
			return field;
		}).get()
	},

	_rowTemplate: function() {
		var options = this.options,
			template = options.rowTemplate;
		if ( !template ) {
			template = $.map( options.columns, function( field, index ) {
				return "<td" 
				+ (options.editable[ index ] ? 
						"><input name='" + field + "' value='${" + field + "}'></input>" :
						" name='" + field + "'>${" + field + "}")
				+ "</td>";
			}).join( "" );
			template = "<tr>" + template + "</tr>";
		}
		options.rowTemplate = $.template( template ); // compile the template
	}
});

})( jQuery );
