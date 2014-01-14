/// <reference path="~/Assets/Scripts/Libs/jquery-1.8.3-vsdoc.js" />
/// <reference path="../Libs/jquery.dirtyforms.js"/>
/// <reference path="~/Assets/Scripts/Libs/knockout-2.2.0.js" />

var tileGrid = function($) {
    var $container = $("#TileContainer");
    var $panel = $('#ContentPanel');
    var $budgetSwitch = $('#budgetSwitch');
    var $toolBar = $('#toolbar');
    var $search = $(".ad-search");
    var model = new ViewModel();
    var advCommonNameItems = [], marketplaceItems = [], proposalStatuses = [], flightRanges = [], budgetItems = [];

    function ViewModel() {
        var self = this;

        self.items = ko.observableArray([]);
        self.budgetType = ko.observable("gross");
        self.lastSortOrder = ko.observable("ModifiedOn");
        self.lastSortDirection = ko.observable("desc");

        self.init = function() {
            self.populateItems();
        };

        self.addItems = function(itemsToAdd) {
            if (itemsToAdd) {
                for (var i = 0; i < itemsToAdd.length; i++) {
                    var item = itemsToAdd[i];
                    addComputedPropertiesToDeal(item);
                    self.items.push(item);
                }
            }
        };

        self.onItemAdded = function(itemToAdd) {
            if (itemToAdd && itemToAdd.nodeType == 1) {
                $container.isotope("appended", $(itemToAdd));
            }
        };

        self.setItems = function(itemsToSet) {
            $container.isotope("remove", $container.find("div.item"));
            self.items.removeAll();

            self.addItems(itemsToSet);
        };

        self.populateItems = function(criteria, callback) {
            var url = window.ajaxUrls.homepageDataUrl;
            var $loadingIndicator = $("#Loading"), $statusLine = $("#StatusLine");

            if (criteria && !criteria.retainFilters) {
                var searchString = "<a href='#' class='search-reset' title='Reset search'>X</a>&nbsp;&nbsp;&nbsp;<span>Search by ";
                if (criteria.name && $.trim(criteria.name).length > 0) {
                    var name = criteria.name.replace(/^\"|\"$/g, "");
                    url += "?nm=" + encodeURIComponent(name);
                    searchString += "deal or RFP name containing '" + name + "'";
                }
                searchString += ".</span>";
                $statusLine.html(searchString);
            } else {
                $statusLine.html("");
            }

            $container.css("visibility", "hidden");
            $loadingIndicator.show();

            var ajax = $.ajax({
                url: url.indexOf("?") < 0 ? addSearchCriteria(url) : url,
                dataType: 'json',
                type: 'get',
                cache: false
            });

            ajax.fail(function(xhr, textStatus, errorThrown) {
                $loadingIndicator.hide();
                window.onerror(errorThrown, 'homeIsotope.js', null, 'Sorry! There was an error loading the deals.\n A log has been created for it, please contact application support.');
            });

            ajax.done(function(data) {
                if (!data || !data.Items) {
                    window.onerror("Empty data model.", 'homeIsotope.js', null, 'Sorry! There was an error loading the deals.\n A log has been created for it, please contact application support.');
                    return;
                }

                var itemLength = data.Items.length;

                model.setItems(data.Items);

                if (itemLength === 0) {
                    $statusLine.html("<a href='#' class='search-reset' title='Reset search'>X</a>&nbsp;&nbsp;&nbsp;<span>No results found.</span>");
                    $("#ui-accordion-1-panel-1 .ad-search-scroll-container").hide();
                } else {
                    $("#ui-accordion-1-panel-1 .ad-search-scroll-container").show();
                }

                if (criteria && criteria.retainFilters) {
                    setTimeout(function() {
                        initFilters();
                        changeSortOrder();
                    }, 3);
                } else {
                    initFilters();
                    changeSortOrder();
                }

                setTimeout(function() {
                    $container.css("visibility", "visible");
                    $loadingIndicator.hide();
                }, 5);

                if (callback) {
                    callback();
                }
            });

            ajax.always(function() {
                updateTotals();
            });
        };

        function addSearchCriteria(url) {
            var params = "dsid=3", searchString = "";
            var includeDrafts = $("#IncludeDrafts").is(":checked");

            if (includeDrafts) {
                params += "&dsid=2";
            } else {
                searchString += " without drafts,";
            }

            var dateRegEx = /^\d{2}\/\d{2}\/\d{4}$/;
            var startDate = $("#StartDate").val();
            var endDate = $("#EndDate").val();
            var searchDateVerb = " created", hasStartDate = false, hasEndDate = false;

            if ($("#DateRange").select2("val") == "Created") {
                if (startDate && startDate.match(dateRegEx)) {
                    params += "&cd1=" + encodeURIComponent(startDate);
                    hasStartDate = true;
                }
                if (endDate && endDate.match(dateRegEx)) {
                    params += "&cd2=" + encodeURIComponent(endDate);
                    hasEndDate = true;
                }
            } else {
                if (startDate && startDate.match(dateRegEx)) {
                    params += "&md1=" + encodeURIComponent(startDate);
                    hasStartDate = true;
                }
                if (endDate && endDate.match(dateRegEx)) {
                    params += "&md2=" + encodeURIComponent(endDate);
                    hasEndDate = true;
                }
                searchDateVerb = includeDrafts ? " modified" : " submitted";
            }
            if (startDate && endDate) {
                searchString += searchDateVerb + " between " + startDate + " and " + endDate + ",";
            } else if (startDate) {
                searchString += searchDateVerb + " created on " + startDate + " or later,";
            } else if (endDate) {
                searchString += searchDateVerb + " created on " + startDate + " or earlier,";
            }

            var flightStartDate = $("#FlightStartDate").val();
            var flightEndDate = $("#FlightEndDate").val();
            var restrictedByFlights = false;

            if (flightStartDate && flightStartDate.match(dateRegEx)) {
                params += "&fds=" + encodeURIComponent(flightStartDate);
                restrictedByFlights = true;
            }
            if (flightEndDate && flightEndDate.match(dateRegEx)) {
                params += "&fde=" + encodeURIComponent(flightEndDate);
                restrictedByFlights = true;
            }

            if (restrictedByFlights) {
                searchString += " restricted by a flight date range,";
            }

            var name = $.trim($("#Name").val());

            if (name.length > 0) {
                params += "&nm=" + encodeURIComponent(name);
                searchString += " restricted by the name '" + name + "',";
            }

            var selectedAdvertisers = $("#CommonAdvertiser").select2("val");

            if (selectedAdvertisers.length > 0) {
                searchString += " restricted by " + selectedAdvertisers.length + " advertiser common name(s),";
            }

            $.each(selectedAdvertisers, function(index, value) {
                if (value) {
                    params += "&cnid=" + encodeURIComponent(value);
                }
            });

            var selectedAEs = $("#AccountExecutive").select2("val");

            if (selectedAEs.length > 0) {
                searchString += " restricted by " + selectedAEs.length + " account executive(s),";
            }

            $.each(selectedAEs, function(index, value) {
                if (value) {
                    params += "&aeid=" + encodeURIComponent(value);
                }
            });

            var selectedBuyingAgencies = $("#BuyingAgency").select2("val");

            if (selectedBuyingAgencies.length > 0) {
                searchString += " restricted by " + selectedBuyingAgencies.length + " advertiser buying agency(ies),";
            }

            $.each(selectedBuyingAgencies, function(index, value) {
                if (value) {
                    params += "&agid=" + encodeURIComponent(value);
                }
            });

            var selectedMediaTypes = $("#MediaType").select2("val");

            if (selectedMediaTypes.length > 0) {
                searchString += " restricted by " + selectedMediaTypes.length + " media type(s),";
            }

            $.each(selectedMediaTypes, function(index, value) {
                if (value) {
                    params += "&mtid=" + encodeURIComponent(value);
                }
            });

            var selectedMarketplaces = $("#Marketplace").select2("val");

            if (selectedMarketplaces.length > 0) {
                searchString += " restricted by " + selectedMarketplaces.length + " marketplace(s),";
            }

            $.each(selectedMarketplaces, function(index, value) {
                if (value) {
                    params += "&mpid=" + encodeURIComponent(value);
                }
            });

            var selectedStatuses = $("#ProposalStatus").select2("val");

            if (selectedStatuses.length > 0) {
                searchString += " restricted by " + selectedStatuses.length + " status(es),";
            }

            $.each(selectedStatuses, function(index, value) {
                if (value) {
                    params += "&psid=" + encodeURIComponent(value);
                }
            });

            updateStatusLine(searchString);

            if (params.length === 0) {
                return url;
            }

            return url + "?" + params;
        }

        function addComputedPropertiesToDeal(item) {
            item.budgetType = ko.computed(function() {
                if (self.budgetType() === "gross" && parseFloat(item.GrossTotal) > 0) {
                    return "gross";
                }
                if (self.budgetType() === "net" && parseFloat(item.NetTotal) > 0) {
                    return "net";
                }
                if (parseFloat(item.GrpTotal) > 0) {
                    return "grp";
                }
                return self.budgetType();
            });
        }
    }

    function updateStatusLine(searchString) {
        if (searchString && searchString.length > 0) {
            var splitPhrase = ", restricted by", searchArray = searchString.substr(0, searchString.length - 1).split(splitPhrase);
            searchString = "";
            for (var searchIndex = 0; searchIndex < searchArray.length; searchIndex++) {
                if (searchIndex > 0) {
                    searchString += searchIndex == 1 ? splitPhrase : ",";
                }
                searchString += searchArray[searchIndex];
            }
            $("#StatusLine").html("Showing Deals" + searchString + ". <span style='color: #aaa;'>Go to the 'Search and Filter' panel to modify the search criteria.</span>")
                .prop("title", $("#StatusLine").text());
        } else {
            $("#StatusLine").html("");
        }
    }

    function updateTotals() {
        var $items = $container.find("div.isotope-item");
        var count = $items.length;
        var visibleCount = $items.not(".isotope-hidden").length;

        if (count === visibleCount) {
            $("#resultCount").text("(Results: " + count + ")");
        } else {
            $("#resultCount").text("(Results: " + visibleCount + "/" + count + ")");
        }
    }

    function getMediaIcon(budgetType) {
        switch (budgetType.toUpperCase()) {
        case "DIGITAL":
            return window.imageUrl + "digital-sprite.png";
        case "PRINT":
            return window.imageUrl + "print-sprite.png";
        case "TELEVISION":
            return window.imageUrl + "tv-sprite.png";
        default:
            return window.imageUrl + "multimedia.png";
        }
    }

    function getStatusClassName(status) {
        switch (status) {
        case "Actively Working":
            return "actively";
        case "Committed Budget":
            return "committed";
        case "Hold":
            return "hold";
        case "Order":
            return "order";
        case "Prospecting":
            return "prospecting";
        case "Tentatively Working":
            return "tentatively";
        default:
            return "";
        }
    }

    function getCanvasHeight() {
        return $(window).innerHeight() - $('#ad-navigation-menu').outerHeight() - $('#global-messaging').outerHeight() - $toolBar.outerHeight();
    }

    function openRfp(id, url) {
        window.open(url); //, "RFP" + id
        window.focus();
    }

    function initFilters() {
        var $advFilter = $search.find("#AdvertiserFilter");
        var $marketplaceContainer = $search.find(".marketplacefilterbox");
        var $statusContainer = $search.find(".statusfilterbox");
        var $budgetContainer = $search.find("#BudgetRange");
        var $flightContainer = $search.find("#FlightRange");

        advCommonNameItems = [];
        marketplaceItems = [];
        proposalStatuses = [];
        flightRanges = [];
        budgetItems = [];

        $search.find(".ad-search-filter-content").addClass("display_hidden");

        $advFilter.empty().parent().find(".select2-search-choice").remove();
        $marketplaceContainer.empty();
        $statusContainer.empty();

        if ($budgetContainer.html().length > 0) $budgetContainer.rangeSlider("destroy");
        if ($flightContainer.html().length > 0) $flightContainer.rangeSlider("destroy");

        for (var j = 0; j < model.items().length; j++) {
            var item = model.items()[j];

            if (item !== "undefined") {
                if ($.isNumeric(item.CommonAdvertiserId) && item.CommonAdvertiser != '') {
                    if ($.grep(advCommonNameItems, function(e) { return e.CommonAdvertiserId == item.CommonAdvertiserId; }).length == 0) {
                        advCommonNameItems.push({ commonAdvertiserId: item.CommonAdvertiserId, commonAdvertiserName: item.CommonAdvertiser });
                    }
                }

                if ($.isNumeric(item.MarketPlaceId) && item.MarketPlace != '') {
                    if ($.grep(marketplaceItems, function(e) { return e.marketplaceId == item.MarketPlaceId; }).length == 0) {
                        marketplaceItems.push({ marketplaceId: item.MarketPlaceId, marketplaceName: item.MarketPlace });
                    }
                }

                if ($.isNumeric(item.ProposalStatusId) && item.ProposalStatus != '') {
                    if ($.grep(proposalStatuses, function(e) { return e.statusId == item.ProposalStatusId; }).length == 0) {
                        proposalStatuses.push({ statusId: item.ProposalStatusId, statusName: item.ProposalStatus });
                    }
                }

                if (!isNaN(item.GrossTotal) && item.budgetType() != '') {
                    if (item.budgetType().toLowerCase().indexOf('grp') == -1) {
                        var budgetItemTotal;

                        if (model.budgetType() === 'net') {
                            budgetItemTotal = parseFloat(item.NetTotal);
                        } else {
                            budgetItemTotal = parseFloat(item.GrossTotal);
                        }

                        if ($.inArray(budgetItemTotal, budgetItems) < 0) {
                            budgetItems.push(budgetItemTotal);
                        }
                    }
                }

                if (item.FlightStart != null && item.FlightStart != undefined && item.FlightStart != '' && item.FlightEnd != null && item.FlightEnd != undefined && item.FlightEnd != '') {
                    var start = $.fn.parseJsonDate(item.FlightStart);
                    var end = $.fn.parseJsonDate(item.FlightEnd);

                    if (!flightRanges.contains(start)) {
                        flightRanges.push(start);
                    }

                    if (!flightRanges.contains(end)) {
                        flightRanges.push(end);
                    }
                }
            }
        }

        if (advCommonNameItems.length > 1) {
            $advFilter.parent().show();
            advCommonNameItems.sort(function(item1, item2) {
                if (item1.commonAdvertiserName < item2.commonAdvertiserName) {
                    return -1;
                }
                if (item1.commonAdvertiserName > item2.commonAdvertiserName) {
                    return 1;
                }
                return 0;
            });
            $.each(advCommonNameItems, function(key, value) {
                if ($("#AdvertiserFilter option[value='" + value.commonAdvertiserId + "']").length == 0) {
                    $advFilter.append($("<option></option>").prop("value", value.commonAdvertiserId).text(value.commonAdvertiserName));
                }
            });
            $advFilter.trigger("change");
            $advFilter.off("change").on("change", function() {
                $container.isotope({
                    filter: generateFilter
                });
                changeSortOrder();
                updateTotals();
            });
        } else {
            $advFilter.parent().hide();
            $advFilter.trigger("change");
            $advFilter.off("change");
        }

        if (marketplaceItems.length > 1) {
            $(".marketplacefilterbox").parent().show();
            marketplaceItems.sort(function(item1, item2) {
                if (item1.marketplaceId == 0) { // multiple goes on the bottom
                    return 1;
                }
                if (item1.marketplaceId < item2.marketplaceId) {
                    return -1;
                }
                if (item1.marketplaceId > item2.marketplaceId) {
                    return 1;
                }
                return 0;
            });
            marketplaceItems.splice(0, 0, { marketplaceId: -1, marketplaceName: "Select All" });
            var marketplaceId = 0;
            $.each(marketplaceItems, function(key, value) {
                var chMarketPlace = $("<input type='checkbox' id='marketplacefilter" + marketplaceId + "' checked='checked' style='cursor: pointer;'>").prop("value", value.marketplaceId);
                var lblMarketPlace = $("<label class='checkbox-text checkbox-text:hover' for='marketplacefilter" + marketplaceId++ + "' style='cursor: pointer;'></label>").text(value.marketplaceName);

                $marketplaceContainer.append(chMarketPlace).append(lblMarketPlace);
            });
            $marketplaceContainer.off("change").on("change", " > :input", function() {
                setCheckBoxStatus($marketplaceContainer, this);
                $container.isotope({
                    filter: generateFilter
                });
                changeSortOrder();
                updateTotals();
            });
        } else {
            $(".marketplacefilterbox").parent().hide();
            $marketplaceContainer.off("change");
        }

        if (proposalStatuses.length > 1) {
            $(".statusfilterbox").parent().show();
            proposalStatuses.sort(function(item1, item2) {
                if (item1.statusId < item2.statusId) {
                    return -1;
                }
                if (item1.statusId > item2.statusId) {
                    return 1;
                }
                return 0;
            });
            proposalStatuses.splice(0, 0, { statusId: -1, statusName: "Select All" });
            var statusId = 0;
            $.each(proposalStatuses, function(key, value) {
                var chStatus = $("<input type='checkbox' id='statusfilter" + statusId + "' checked='checked' style='cursor: pointer;'>").prop("value", value.statusId);
                var lblStatus = $("<label class='checkbox-text checkbox-text:hover' for='statusfilter" + statusId++ + "' style='cursor: pointer;'></label>").text(value.statusName);

                $statusContainer.append(chStatus).append(lblStatus);
            });
            $statusContainer.off("change").on("change", " > :input", function() {

                setCheckBoxStatus($statusContainer, this);

                $container.isotope({
                    filter: generateFilter
                });
                changeSortOrder();
                updateTotals();
            });
        } else {
            $(".statusfilterbox").parent().hide();
            $statusContainer.off("change");
        }

        if ($budgetContainer.data("uiRangeSlider")) {
            $budgetContainer.rangeSlider('destroy');
        }

        if (budgetItems.length > 1) {
            $(".slider-label-budget").parent().show();
            budgetItems.push(-1);
            budgetItems.sort(function(a, b) { return a - b; });
            $budgetContainer.rangeSlider(
                { step: 1 },
                { range: { min: 0, max: budgetItems.length - 1 } },
                { bounds: { min: 0, max: budgetItems.length - 1 } },
                { defaultValues: { min: 0, max: budgetItems.length - 1 } },
                { formatter: function(val) { return formatCurrency(budgetItems[val]); } },
                { wheelMode: "scroll", wheelSpeed: 1 });
            $budgetContainer.off("userValuesChanged").on("userValuesChanged", function() {
                $(this).rangeSlider("resize");
                $container.isotope({
                    filter: generateFilter
                });
                changeSortOrder();
                updateTotals();
            });
        } else {
            $(".slider-label-budget").parent().hide();
            $budgetContainer.off("userValuesChanged");
        }

        if ($flightContainer.data("uiRangeSlider")) {
            $flightContainer.rangeSlider('destroy');
        }

        if (flightRanges.length > 2) {
            $(".slider-label-flight").parent().show();
            flightRanges.push(-1);
            flightRanges.sort(function(a, b) { return a - b; });
            $flightContainer.rangeSlider(
                { step: 1 },
                { range: { min: 0, max: flightRanges.length - 1 } },
                { bounds: { min: 0, max: flightRanges.length - 1 } },
                { defaultValues: { min: 0, max: flightRanges.length - 1 } },
                { formatter: function(val) { return formatSliderDate(flightRanges[val]); } },
                { wheelMode: "scroll", wheelSpeed: 1 });
            $flightContainer.off("userValuesChanged").on("userValuesChanged", function() {
                $(this).rangeSlider("resize");
                $container.isotope({
                    filter: generateFilter
                });
                changeSortOrder();
                updateTotals();
            });
        } else {
            $(".slider-label-flight").parent().hide();
            $flightContainer.off("userValuesChanged");
        }

        $search.find(".ad-search-filter-content").removeClass("display_hidden");
    }

    function setCheckBoxStatus($inputcontainer, checkbox) {
        if (checkbox.value === '-1') {
            $inputcontainer.find("input").prop('checked', checkbox.checked);
            return;
        }

        var allcheckboxes = $inputcontainer.find("input[value != -1]").length;
        var allchecked = $inputcontainer.find("input:checked[value != -1]").length;

        $inputcontainer.find("input:checkbox[value = -1]").prop('checked', allcheckboxes == allchecked);
    }

    function changeSortOrder() {
        var values = $("#SortOrder").select2("val").split("-");
        if (values.length != 2) return;

        model.lastSortOrder(values[0]);
        model.lastSortDirection(values[1]);

        $container.isotope({
            sortBy: model.lastSortOrder(),
            sortAscending: model.lastSortDirection() == "asc"
        });

        $("#ContentPanel").scrollTop(0);
    }

    function formatCurrency(number) {
        if (number == null) return "";
        if (number == -1) return "GRP";

        var p = number.toFixed(0).split(".");

        return $.trim(["$", p[0].split("").reverse().reduce(function(acc, num, i) {
            return num + (i && !(i % 3) ? "," : "") + acc;
        }, " "), p[1]].join(""));
    }

    function formatSliderDate(data) {
        if (data == -1) return "DRAFT";

        return $.fn.getDateToStringShort(data);
    }
    
    
    function init() {
        // Initialize controls and events
        var options = {
            jumpToPlaceholder: 'Enter ID or name...',
            jumpToMask: function(event) {
                var idVal = $(this).val();
                // fire callback on Return
                if (event.keyCode === 13 && idVal.length > 0) {
                    options.jumpToCallback();
                }
            },
            jumpToCallback: function() {

                var term = $.trim(search.jumpTo.val());

                if (term.match(/^\d+(\-\d+(\-[A-Za-z][0-9]?)?)?$/)) {
                    $.ajax({
                        url: window.ajaxUrls.rfpIdUrl + '?compositeId=' + encodeURIComponent(term),
                        dataType: 'json',
                        async: false,
                        cache: false
                    }).fail(function() {
                        alert("RFP could not be opened");
                    }).done(function(result) {
                        if (result && result.DealId) {
                            var redirectUrl = window.ajaxUrls.dealViewUrl;
                            if (result.ProposalId) {
                                openRfp(result.DealId + "_" + result.ProposalId, redirectUrl + "/" + result.DealId + "/" + result.ProposalId);
                            } else {
                                openRfp(result.DealId, redirectUrl + "/" + result.DealId);
                            }

                            search.jumpToClear();
                        } else {
                            search.jumpToError();
                        }
                    });
                } else if (term.length > 0) {
                    model.populateItems({
                        name: term,
                        jumpTo: true
                    });
                    search.jumpToClear();
                }
            }
        };

        var search = $('.ad-navigation-menu').adSalesNavigation(options);
        $(".ad-navigation-sub-inner-menu a").removeAttr("target");

        setDefaultSearchDates();

        $container.on("click", ".tile-content", function() {
            var id = $(this).find("[data-id]").attr("data-id");
            if (id && !isNaN(id)) {
                var url = window.ajaxUrls.dealViewUrl + "/" + id;
                openRfp(id, url);
            }
            return false;
        });

        $(window).on('resize', function() {
            var canvasHeight = getCanvasHeight();
            $panel.height(canvasHeight);
            $('.slimScrollDiv').height(canvasHeight);

            var scrollableHeight = Math.max(($panel.outerHeight() / $panel.get(0).scrollHeight) * $panel.outerHeight(), 30);
            $('.slimScrollBar').height(scrollableHeight);
        });

        $(".select2-control").select2({
            minimumResultsForSearch: 12
        });

        $("#CommonAdvertiser").select2({
            placeholder: "Search by Advertiser Common Name",
            multiple: true,
            minimumInputLength: 2,
            ajax: {
                url: window.ajaxUrls.commonAdvertisersUrl,
                quietMillis: 100,
                data: function(term) {
                    return {
                        name: term,
                        take: 8
                    };
                },
                results: function(data) {
                    var lowerCaseResults = [];
                    $.each(data, function(index, result) {
                        lowerCaseResults.push({ id: result.Id.toString(), text: result.Name });
                    });
                    return { results: lowerCaseResults };
                }
            }
        });

        $("#BuyingAgency").select2({
            placeholder: "Search by Buying Agency",
            multiple: true,
            minimumInputLength: 2,
            ajax: {
                url: window.ajaxUrls.buyingAgenciesUrl,
                quietMillis: 100,
                data: function(term) {
                    return {
                        name: term,
                        take: 8
                    };
                },
                results: function(data) {
                    var lowerCaseResults = [];
                    $.each(data, function(index, result) {
                        lowerCaseResults.push({ id: result.Id.toString(), text: result.FormattedName });
                    });
                    return { results: lowerCaseResults };
                }
            }
        });

        $("#global-messaging").on("click", ".search-reset", function() {
            clearSearch();
            model.populateItems();
            return false;
        });

        $("#SortOrder").on("change", function() {
            changeSortOrder();
        });

        $('.refresh-button').click(function() {
            model.populateItems({
                retainFilters: true
            });
            return false;
        });

        $('.home-grid').on("hover", function() {
            $(".home-tiles").switchClass("home-tiles", "home-tiles-inactive", 100);
            return false;
        });

        $('.home-grid').on("mouseout", function() {
            $(".home-tiles-inactive").switchClass("home-tiles-inactive", "home-tiles", 100);
            return false;
        });


        $budgetSwitch.on("change", function() {
            clearFilters();
        });

        $budgetSwitch.buttonset();

        $("#IncludeDrafts").on("change", function() {
            if ($(this).is(":checked")) {
                $("#ModifiedOn").text("Modified");
            } else {
                $("#ModifiedOn").text("Submitted");
            }
            $("#ModifiedOn").trigger("change");
        });

        $("#ad-search-search").on("click", function() {
            model.populateItems(null);
            return false;
        });

        $("#ad-search-clear").on("click", function() {
            clearSearch();
            model.populateItems();
            return false;
        });

        $("#ad-search-filter-clear").on("click", function() {
            clearFilters();
            return false;
        });


        ko.applyBindings(model);
        model.init();

        $container.isotope({
            animationEngine: 'jquery',
            itemSelector: '.item',
            layoutMode: 'fitRows',
            getSortData: {
                modified: function($elem) {
                    var data = $elem.find('.tile-content').data("modified");
                    if (data != undefined) {
                        return $.fn.parseJsonDate(data);
                    }
                    return data;
                },
                advertiser: function($elem) {
                    return $elem.find('.tile-content').data("advertiser");
                },
                budget: function($elem) {
                    var type = $elem.find('.tile-content').data("budgettype");
                    if (type.indexOf("grp") == -1) {
                        return parseFloat($elem.find('.tile-content').data("budget" + type)) + 100000000000.0;
                    } else {
                        return parseFloat($elem.find('.tile-content').data("budget" + type));
                    }
                },
                flightstart: function($elem) {
                    var data = $elem.find('.tile-content').data("start");
                    if (data != undefined) {
                        return $.fn.parseJsonDate(data);
                    }
                    return new Date(2100, 0, 1);
                },
                flightend: function($elem) {
                    var data = $elem.find('.tile-content').data("end");
                    if (data != undefined) {
                        return $.fn.parseJsonDate(data);
                    }
                    return new Date(2000, 0, 1);
                },
                id: function($elem) {
                    return parseInt($elem.find('.tile-content').data("id"), 10);
                },
                mediatype: function($elem) {
                    return $elem.find('.tile-content').data("mediatype");
                }
            }
        });
    }

    function setDefaultSearchDates() {
        var startDate = new Date(), endDate = new Date();
        startDate.setDate(startDate.getDate() - 90);
        $("#StartDate").val(("0" + (startDate.getMonth() + 1)).slice(-2) + "/" + ("0" + startDate.getDate()).slice(-2) + "/" + startDate.getFullYear());
        $("#EndDate").val(("0" + (endDate.getMonth() + 1)).slice(-2) + "/" + ("0" + endDate.getDate()).slice(-2) + "/" + endDate.getFullYear());
    };

    function clearSearch() {
        $("#jumpToId").val("");
        $("#DateRange").select2("val", "ModifiedOn");
        $("#IncludeDrafts").prop("checked", true).trigger("change");
        $("#StartDate").val("");
        $("#EndDate").val("");
        $("#FlightStartDate").val("");
        $("#FlightEndDate").val("");
        $("#Name").val("");
        $("#CommonAdvertiser").select2("data", null);
        $("#AccountExecutive").select2("data", null);
        $("#BuyingAgency").select2("data", null);
        $("#MediaType").select2("data", null);
        $("#Marketplace").select2("data", null);
        $("#ProposalStatus").select2("data", null);

        setDefaultSearchDates();
    };

    function clearFilters() {
        if (!$("#ui-accordion-1-panel-1 .ad-search-scroll-container .field").is(":visible")) {
            return;
        }
        setTimeout(function() {
            initFilters();
            $container.isotope({
                filter: generateFilter
            });
            updateTotals();
        }, 3);
    };

    function generateFilter() {
        var $tileContent = $(this).find(".tile-content");

        var $advertiserFilter = $search.find("#AdvertiserFilter");

        if ($advertiserFilter.is(":visible")) {
            var advertiserCommonNames = [];
            $.each($advertiserFilter.select2("val"), function(index, value) {
                advertiserCommonNames.push(parseInt(value, 10));
            });
            if (advertiserCommonNames.length > 0 && $.inArray(parseInt($tileContent.data("advertiserid"), 10), advertiserCommonNames) < 0) {
                return false;
            }
        }

        var $marketplaceFilter = $search.find(".marketplacefilterbox");

        if ($marketplaceFilter.is(":visible")) {
            var marketplaces = [];
            $marketplaceFilter.find("input:checked").each(function() {
                if (!isNaN(this.value)) {
                    marketplaces.push(parseInt(this.value, 10));
                }
            });
            if (marketplaces.length === 0 || $.inArray($tileContent.data("marketplaceid"), marketplaces) < 0) {
                return false;
            }
        }

        var $statusFilter = $search.find(".statusfilterbox");

        if ($statusFilter.is(":visible")) {
            var statuses = [];
            $statusFilter.find("input:checked").each(function() {
                if (!isNaN(this.value)) {
                    statuses.push(parseInt(this.value, 10));
                }
            });
            if (statuses.length === 0 || $.inArray($tileContent.data("statusid"), statuses) < 0) {
                return false;
            }
        }

        var budgetGrossValue = parseInt($tileContent.data("budgetgross"), 10);
        var budgetNetValue = parseInt($tileContent.data("budgetnet"), 10);
        var budgetType = model.budgetType();
        var isGrpTile = $tileContent.data("budgettype").indexOf("grp") > -1;

        var $budgetRange = $search.find("#BudgetRange");

        if ($budgetRange.is(":visible") && $budgetRange.data("uiRangeSlider")) {
            var minBudgetValue = budgetItems[$budgetRange.rangeSlider("min")];
            var maxBudgetValue = budgetItems[$budgetRange.rangeSlider("max")];

            if (minBudgetValue > -1 && isGrpTile) {
                return false;
            }

            if (!isGrpTile) {
                if (budgetType == 'gross') {
                    if (budgetGrossValue < minBudgetValue || budgetGrossValue > maxBudgetValue) {
                        return false;
                    }
                } else if (budgetType == 'net') {
                    if (budgetNetValue < minBudgetValue || budgetNetValue > maxBudgetValue) {
                        return false;
                    }
                }
            }
        }

        var $flightRange = $search.find("#FlightRange");

        if ($flightRange.is(":visible") && $flightRange.data("uiRangeSlider")) {
            var startDate = flightRanges[$flightRange.rangeSlider("min")];
            var endDate = flightRanges[$flightRange.rangeSlider("max")];
            var rfpStartDate = $tileContent.data("start");
            var rfpEndDate = $tileContent.data("end");

            if (rfpStartDate != undefined && rfpStartDate != '' && rfpEndDate != undefined && rfpEndDate != '') {
                var flightStart = $.fn.parseJsonDate(rfpStartDate);
                var flightEnd = $.fn.parseJsonDate(rfpEndDate);

                if ((flightStart.valueOf() < startDate.valueOf() || flightStart.valueOf() > endDate.valueOf()) &&
                    (flightEnd.valueOf() < startDate.valueOf() || flightEnd.valueOf() > endDate.valueOf())) {
                    return false;
                }
            } else if (startDate != -1) {
                return false;
            }
        }

        return true;
    };

    init();
   

        return {
            getMediaIcon: getMediaIcon,
            getStatusClassName: getStatusClassName
        };
    }

(jQuery);
