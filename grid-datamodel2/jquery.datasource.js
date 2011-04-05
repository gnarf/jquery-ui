(function ($) {

    $.fn.extend({
        dataSource: function (options) {
            // TODO -- I pick off the first element here, following a pattern in jquery.validate.js.
            // Is there a preferred pattern here?
            return jQuery.dataSource(this[0], options);
        }
    });

    $.dataSource = function (targetArray, options) {
        if (options) {
            var currentDataSource = targetArray.__dataSource__;
            if (currentDataSource) {
                currentDataSource.destroy();
            }

            options = $.extend({}, options, { targetArray: targetArray });

            var dataSource;
            if (options.factory) {
                // For extensibility, defer to a factory function that will produce a dataSource 
                // instance implementing the dataSource API.
                dataSource = options.factory(options);
            } else {
                dataSource = options.inputArray ? new LocalDataSource(options.inputArray, options) : new RemoteDataSource(options);
                // TODO -- dataSource should be a function so its not serializable.
            }

            targetArray.__dataSource__ = dataSource;
        }

        return targetArray.__dataSource__;
    };

    $.dataSource.oDataSettings = {
        resultsFilter: function (data) {
            this.totalCount = data.d.__count;
            return data.d.results;
        },

        urlMapper: function (path, queryParams, sortProperty, sortDir, filter, skip, take, includeTotalCount) {
            var questionMark = (path.indexOf("?") < 0 ? "?" : "&");
            for (param in queryParams) {
                path = path.split("$" + queryParam).join(queryParams[param]);
            }
            path += questionMark + "$format=json" +
                // TODO -- Without inlineCount, the form of the AJAX result changes and resultsFilter breaks.
                // (includeTotalCount ? "&$inlinecount=allpages" : "") +
                "&$inlinecount=allpages" +
                "&$skip=" + (skip || 0) +
                (take !== null && take !== undefined ? ("&$top=" + take) : "");

            if (sortProperty) {
                path += "&$orderby=" + sortProperty + (sortDir && sortDir.toLowerCase().indexOf("desc") === 0 ? "%20desc" : "");
            }
            if (filter) {
                filter = Object.prototype.toString.call(filter) === "[object Array]" ? filter : [ filter ];
                $.each(filter, function (index, filterPart) {
                    path +=
                        "&$filter=";
                    var filterValue = typeof filterPart.filterValue === "string" ? ("'" + filterPart.filterValue + "'") : filterPart.filterValue;
                    path += filterPart.filterOperator === "Contains" ?
                        ("substringof(" + filterValue + "," + filterPart.filterProperty + ")") : 
                        (filterPart.filterProperty + filterPart.filterOperator + filterValue);
                    // TODO -- Build this out properly.
                });
            }
            return path;
        }
    }

    function DataSource (options) {
        if (!options) {
            return;
        }

        this.itemsArray = options.targetArray || [];
        var self = this;
        this._arrayChangeHandler = function (change) {
            self._handleArrayChange(change);
        };
        $([ this.itemsArray ]).bind("changeArray", this._arrayChangeHandler);

        this._applyOptions(options);
    };

    DataSource.prototype = {
        _refreshingHandler: null,
        _refreshedHandler: null,

        _sortProperty: null,  // TODO -- Generalize these to [ { property: ..., direction: ... } ].
        _sortDir: null,
        _filter: null,
        _skip: null,
        _take: null,
        _includeTotalCount: false,

        itemsArray: [],
        totalCount: 0,

        destroy: function () {
            if (this.itemsArray) {
                delete this.itemsArray.__dataSource__;
                this.itemsArray.unbind("changeArray", this._arrayChangeHandler);
                this.itemsArray = null;
            }
        },

        option: function (option, value) {
            this._applyOption(option, value);
            return this;
        },

        options: function (options) {
            this._applyOptions(options);
            return this;
        },

        refresh: function (options) {
            if (options) {
                var hasDataSourceOptions;
                for (optionName in options) {
                    if (optionName !== "all") {
                        hasDataSourceOptions = true;
                        break;
                    }
                }
                if (hasDataSourceOptions) {
                    // _applyOptions trounces all the old query options, so only call if we really have options here.
                    this._applyOptions(options);
                }
            }
            $(this).trigger("refreshing");
            if (this._refreshingHandler) {
                this._refreshingHandler();
            }
            var self = this;
            this._refresh(options, function () {
                $(self).trigger("refreshed");
                if (self._refreshedHandler) {
                    self._refreshedHandler();
                }
            });
            return this;
        },

        _applyOption: function (option, value) {
            switch (option) {
                case "filter":
                    this._setFilter(value);
                    break;

                case "sort":
                    this._setSort(value);
                    break;

                case "paging":
                    this._setPaging(value);
                    break;

                case "refreshing":
                    this._refreshingHandler = value;
                    break;

                case "refreshed":
                    this._refreshedHandler = value;
                    break;

                default:
                    throw "Unrecognized option '" + option + "'";
            }
        },

        // N.B.  Null/undefined option values will unset the given option.
        _applyOptions: function (options) {
            options = options || {};

            var self = this;
            $.each([ "filter", "sort", "paging", "refreshing", "refreshed" ], function (index, optionName) {
                self._applyOption(optionName, options[optionName]);
            });
        },

        _handleArrayChange: function (change) {
            throw "'_handleArrayChange' is a pure virtual function";
        },

        _processFilter: function (filter) {
            var filterProperty = filter.property,
                filterValue = filter.value,
                filterOperator;
            if (!filter.operator) {
                filterOperator = "==";
            } else {
                var operatorStrings = {
                        "<": ["<", "islessthan", "lessthan", "less", "lt"],
                        "<=": ["<=", "islessthanorequalto", "lessthanequal", "lte"],
                        "==": ["==", "isequalto", "equals", "equalto", "equal", "eq"],
                        "!=": ["!=", "isnotequalto", "notequals", "notequalto", "notequal", "neq", "not"],
                        ">=": [">=", "isgreaterthanorequalto", "greaterthanequal", "gte"],
                        ">": [">", "isgreaterthan", "greaterthan", "greater", "gt"]
                    },
                    lowerOperator = filter.operator.toLowerCase();
                for (op in operatorStrings) {
                    if ($.inArray(lowerOperator, operatorStrings[op]) > -1) {
                        filterOperator = op;
                        break;
                    }
                }

                if (!filterOperator) {
                    // Assume that the filter operator is one that the data source recognizes intrinsically.
                    filterOperator = filter.operator;
                    // throw "Unrecognized filter operator '" + filter.operator + "'.";
                }
            }

            return {
                filterProperty: filterProperty,
                filterOperator: filterOperator,
                filterValue: filterValue
            };
        },

        _refresh: function (options, completed) {
            throw "'_refresh' is a pure virtual function";
        },

        _setFilter: function (filter) {
            throw "'_setFilter' is a pure virtual function";
        },

        _setPaging: function (options) {
            options = options || {};
            this._skip = options.skip;
            this._take = options.take;
            this._includeTotalCount = !!options.includeTotalCount;
        },

        _setSort: function (options) {
            options = options || {};
            this._sortProperty = options.property;
            this._sortDir = options.direction;
        }
    };

    function LocalDataSource (inputArray, options) {
        DataSource.apply(this, [ options ]);

        this._inputItemsArray = inputArray;

        var inputDataSource = $([ this._inputItemsArray ]).dataSource();
        if (inputDataSource) {
            var self = this;
            this._inputArrayChangeHandler = function () {
                // TODO -- Rather than directly refreshing here on an input array change, you can imagine 
                // raising a "resultsStale" event when the data source encounters changes that would require 
                // the client to "refresh" to reapply the query to the input data.
                // This would keep the app author the flexibility to control when they reapply local queries 
                // (so items don't disappear when edited) without coupling their edit/refresh logic.
                self.refresh();
            };

            $([ this._inputItemsArray ]).bind("changeArray", this._inputArrayChangeHandler);
        }
    };

    LocalDataSource.prototype = $.extend({}, new DataSource(), {
        _inputItemsArray: [],
        _inputArrayChangeHandler: null,

        destroy: function () {
            DataSource.prototype.destroy.apply(this);

            if (this._inputArrayChangeHandler) {
                $([ this._inputItemsArray ]).unbind("changeArray", this._inputArrayChangeHandler);
                this._inputArrayChangeHandler = null;
            }
        },

        _applyQuery: function () {
            var items = this._inputItemsArray;
            var self = this;

            var filteredItems;
            if (this._filter) {
                filteredItems = $.grep(items, function (item, index) { 
                    return self._filter(item);
                });
            } else {
                filteredItems = items;
            }

            var sortedItems;
            if (this._sortProperty) {
                var isAscending = (this._sortDir || "asc").toLowerCase().indexOf("asc") === 0;
                sortedItems = filteredItems.slice().sort(function (item1, item2) {
                    var propertyValue1 = self._normalizePropertyValue(item1, self._sortProperty),
                        propertyValue2 = self._normalizePropertyValue(item2, self._sortProperty);
                    if (propertyValue1 == propertyValue2) {
                        return 0;
                    } else if (propertyValue1 > propertyValue2) {
                        return isAscending ? 1 : -1;
                    } else {
                        return isAscending ? -1 : 1;
                    }
                });
            } else {
                sortedItems = filteredItems;
            }

            var skip = this._skip || 0,
                pagedItems = sortedItems.slice(skip);
            if (this._take) {
                pagedItems = pagedItems.slice(0, this._take);
            }
            var totalCount = this._includeTotalCount ? sortedItems.length : undefined;

            return { items: pagedItems, totalCount: totalCount };
        },

        _createFilterFunction: function (filter) {
            var self = this;
            if (Object.prototype.toString.call(filter) === "[object Array]") {
                var comparisonFunctions = $.map(filter, function (subfilter) {
                    return createFunction(subfilter);
                });
                return function (item) {
                    for (var i = 0; i < comparisonFunctions.length; i++) {
                        if (!comparisonFunctions[i](item)) {
                            return false;
                        }
                    }
                    return true;
                };
            } else {
                return createFunction(filter);
            }

            function createFunction (filter) {
                var processedFilter = self._processFilter(filter),
                    filterProperty = processedFilter.filterProperty,
                    filterOperator = processedFilter.filterOperator,
                    filterValue = processedFilter.filterValue;

                var comparer;
                switch (filterOperator) {
                    case "<": comparer = function (propertyValue) { return propertyValue < filterValue; }; break;
                    case "<=": comparer = function (propertyValue) { return propertyValue <= filterValue; }; break;
                    case "==": comparer = function (propertyValue) { return propertyValue == filterValue; }; break;
                    case "!=": comparer = function (propertyValue) { return propertyValue != filterValue; }; break;
                    case ">=": comparer = function (propertyValue) { return propertyValue >= filterValue; }; break;
                    case ">": comparer = function (propertyValue) { return propertyValue > filterValue; }; break;
                    case "Contains": comparer = function (propertyValue) { return propertyValue.indexOf(filterValue) >= 0; }; break;
                    default: throw "Unrecognized filter operator.";
                };

                return function (item) {
                    // Can't trust added items, for instance, to have all required property values.
                    var propertyValue = self._normalizePropertyValue(item, filterProperty);
                    return comparer(propertyValue);
                };
            };
        },

        _handleArrayChange: function (change) {
            if (change.isInternalChange) {
                return;
            }

            switch (change.change) {
            case "add":
                // change.newIndex is with repect to itemsArray (our output array).  We ignore it here
                // since there is no meaningful mapping onto _inputItemsArray.
                $.changeArray.apply(null, [ this._inputItemsArray, "push" ].concat(change.newItems));
                break;

            case "remove":
                var self = this;
                $.each(change.oldItems, function () {
                    $.changeArray(self._inputItemsArray, "splice", $.inArray(this, self._inputItemsArray), 1);
                });
                break;

            case "reset":
            case "move":
            case "replace":
                throw "Array change operation '" + change.change + "' is not supported by this data source.";
                break;

            default:
                console.log("Unrecognized 'changeArray' event args.");
                break;
            }
        },

        _normalizePropertyValue: function (item, property) {
            return item[property] || "";
        },

        _refresh: function (options, completed) {
            var self = this;
            if (options && !!options.all) {
                var inputDataSource = $([ this._inputItemsArray ]).dataSource();
                if (inputDataSource) {
                    // If the input array is bound to a data source, refresh it as well.
                    inputDataSource.refresh({
                        all: true,
                        completed: function () {
                            completeRefresh();
                        }
                    });
                }
            } else {
                completeRefresh();
            }

            function completeRefresh() {
                var results = self._applyQuery();
                self.totalCount = results.totalCount;

                // Manually trigger "setArray"/"changeArray" so that we can piggy-back "isInternalChange".
                // In our "changeArray" handlers, we'll distinguish client-initiated changes from self-inflicted
                // changes in this way.
                var eventArguments = [ { change: "reset" } ];
                $([ self.itemsArray ]).trigger("setArray", eventArguments);
                Array.prototype.splice.apply(self.itemsArray, [ 0, self.itemsArray.length ].concat(results.items));
                $([ self.itemsArray ]).trigger({ type: "changeArray", isInternalChange: true }, eventArguments);
                // TODO -- Rework $.changeArray in such a way that we can piggy-back isInternalChange as above.

                if (options && options.completed && $.isFunction(options.completed)) {
                    options.completed();
                }
                completed();
            };
        },

        _setFilter: function (filter) {
            this._filter = (!filter || $.isFunction(filter)) ? filter : this._createFilterFunction(filter);
        }
    });

    function RemoteDataSource (options) {
        DataSource.apply(this, [ options ]);

        this._urlMapper = options.urlMapper || function (path, queryParams) {
            return path + queryParams;
        };
        this._path = options.path;
        this._queryParams = options.queryParams;
        this._resultsFilter = options.resultsFilter;
    };

    RemoteDataSource.prototype = $.extend({}, new DataSource(), {
        _urlMapper: null,
        _path: null,
        _queryParams: null,
        _resultsFilter: null,

        _handleArrayChange: function (change) {
            if (change.isInternalChange) {
                return;
            }

            // TODO -- This is where we would develop an SPI that allows for pushing changes back to the server.
            // This could be done by logging changes and POSTing during some $().dataSource().commit().
            // It could also directly call $.ajax to issue a POST per array or property change.
            switch (change.change) {
            case "add":
                console.log("Array 'add' at index " + change.newIndex + " of " + change.newItems.toString() + ".");
                break;

            case "remove":
                console.log("Array 'remove' at index " + change.oldIndex + " of " + change.oldItems.toString() + ".");
                break;

            case "reset":
                console.log("Array 'reset'.");
                break;

            case "move":
                console.log("Array 'move' from index " + change.oldIndex + " of " + change.oldItems.toString() + " to index " + change.newIndex + " of " + change.newItems.toString() + ".");
                break;

            case "replace":
                console.log("Array 'replace' from index " + change.oldIndex + " of " + change.oldItems.toString() + " to index " + change.newIndex + " of " + change.newItems.toString() + ".");
                break;

            default:
                console.log("Unrecognized 'changeArray' event args.");
                break;
            }
        },

        _refresh: function (options, completed) {
            var self = this,
                queryString = this._urlMapper(this._path, this._queryParams, this._sortProperty, 
                    this._sortDir, this._filter, this._skip, this._take, this._includeTotalCount);
            $.ajax({
                dataType: "jsonp",
                url: queryString,
                jsonp: "$callback",
                success: function (data) {
                    var newItems = self._resultsFilter ? self._resultsFilter(data) : data;
                    // _resultsFilter has the option of setting this.totalCount.
                    $.changeArray.apply(null, [ self.itemsArray, "splice", 0, self.itemsArray.length ].concat(newItems));
                    completed();
                }
            });
        },

        _setFilter: function (filter) {
            if (!filter) {
                this._filter = null;  // Passing null/undefined means clear filter.
            } else if (Object.prototype.toString.call(filter) === "[object Array]") {
                var self = this;
                this._filter = $.map(filter, function (subfilter) {
                    return self._processFilter(subfilter);
                });
            } else {
                this._filter = [ this._processFilter(filter) ];
            }
        }
    });
})(jQuery);
